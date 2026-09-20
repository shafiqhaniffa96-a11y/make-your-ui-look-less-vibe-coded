const PLUGIN = 'make-your-ui-look-less-vibe-coded';
const BORDER_PROPS = new Set(['border-left', 'border-right']);
const PROTECTED_SELECTOR = /:(?:hover|focus(?:-visible|-within)?|active|disabled|checked|visited|target)\b|\[(?:aria-|data-(?:state|status))|(?:^|[.#_-])(?:active|selected|disabled|error|success|warning|danger|status)(?:$|[.#_:\s-])/i;
const MARK_KEEP = /\bvibe-keep\b/i;
const MARK_REMOVE = /\bvibe-remove\b/i;
const NAMED_COLORS = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));

function previousMarker(node, pattern) {
  const previous = node.prev();
  return previous?.type === 'comment' && pattern.test(previous.text);
}

function ruleHasMarker(rule, pattern) {
  return rule.nodes?.some((node) => node.type === 'comment' && pattern.test(node.text));
}

function protectedContext(rule) {
  for (let node = rule; node; node = node.parent) {
    if (node.type === 'rule' && (PROTECTED_SELECTOR.test(node.selector) || ruleHasMarker(node, MARK_KEEP))) return true;
  }
  return false;
}

function literalThinPx(value) {
  const match = /^((?:\d+(?:\.\d+)?|\.\d+))px$/i.exec(value);
  if (!match) return false;
  const width = Number(match[1]);
  return width >= 2 && width <= 8;
}

function topLevelTokens(value) {
  const tokens = [];
  let token = '';
  let depth = 0;
  for (const character of value.trim()) {
    if (/\s/.test(character) && depth === 0) {
      if (token) tokens.push(token);
      token = '';
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth < 0) return [];
    token += character;
  }
  if (token) tokens.push(token);
  return depth === 0 ? tokens : [];
}

function literalColor(value) {
  const trimmed = value.trim();
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(trimmed)) return true;
  if (/^[a-z]+$/i.test(trimmed)) return NAMED_COLORS.has(trimmed.toLowerCase());
  return /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([^{};]*\)$/i.test(trimmed) &&
    !/(?:var|url|calc|gradient)\s*\(/i.test(trimmed);
}

function borderShorthandIsCandidate(value) {
  const tokens = topLevelTokens(value);
  if (tokens.length !== 3 || !tokens.some(literalThinPx) || !tokens.some((token) => token.toLowerCase() === 'solid')) return false;
  const color = tokens.find((token) => !literalThinPx(token) && token.toLowerCase() !== 'solid');
  return Boolean(color && literalColor(color));
}

function declarationIsAmbiguous(decl) {
  const rule = decl.parent;
  let sameProperty = 0;
  let hazard = false;
  rule.each((node) => {
    if (node.type !== 'decl') return;
    const prop = node.prop.toLowerCase();
    if (prop === decl.prop.toLowerCase()) sameProperty += 1;
    if (prop.startsWith('border') && !/(?:^border-radius$|^border-(?:top|right|bottom|left)-(?:start-|end-)?radius$)/.test(prop) && node !== decl) hazard = true;
  });
  return sameProperty > 1 || hazard;
}

function solidBackground(value) {
  return literalColor(value);
}

function tallHeight(value) {
  const match = /^(\d+(?:\.\d+)?)(px|rem|em|%)$/i.exec(value.trim());
  if (!match) return false;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return unit === 'px' ? amount >= 16 : unit === '%' ? amount >= 50 : amount >= 2;
}

function pseudoRuleIsCandidate(rule) {
  const selectors = rule.selectors;
  if (!selectors?.length || selectors.some((selector) => !/::?(?:before|after)\b/i.test(selector)) || protectedContext(rule)) return false;

  const declarations = new Map();
  let duplicate = false;
  let nested = false;
  rule.each((node) => {
    if (node.type !== 'decl') {
      if (node.type !== 'comment') nested = true;
      return;
    }
    const prop = node.prop.toLowerCase();
    if (declarations.has(prop)) duplicate = true;
    declarations.set(prop, node);
  });
  const backgroundProps = [...declarations.keys()].filter((prop) => prop.startsWith('background'));
  if (nested || duplicate || backgroundProps.length !== 1 || [...declarations.values()].some((decl) => decl.important)) return false;
  const content = declarations.get('content');
  const position = declarations.get('position');
  const width = declarations.get('width');
  const height = declarations.get('height');
  const background = declarations.get('background') ?? declarations.get('background-color');
  return Boolean(
    content && /^(?:""|'')$/.test(content.value.trim()) &&
    position?.value.trim().toLowerCase() === 'absolute' &&
    width && literalThinPx(width.value.trim()) &&
    height && tallHeight(height.value) &&
    background && solidBackground(background.value)
  );
}

function report(result, node, property, removed, reason) {
  result.messages.push({
    type: 'vibe-cleaner-candidate',
    plugin: PLUGIN,
    selector: node.type === 'rule' ? node.selector : node.parent.selector,
    property,
    value: node.type === 'decl' ? node.value : undefined,
    removed,
    action: removed ? 'neutralized' : 'would-neutralize',
    reason,
    line: node.source?.start?.line,
    column: node.source?.start?.column,
  });
}

export default function lessVibe(options = {}) {
  const dryRun = options.dryRun === true;
  return {
    postcssPlugin: PLUGIN,
    Once(root, { result }) {
      root.walkRules((rule) => {
        if (pseudoRuleIsCandidate(rule)) {
          const content = rule.nodes.find((node) => node.type === 'decl' && node.prop.toLowerCase() === 'content');
          report(result, rule, 'content', !dryRun, 'decorative-pseudo-element');
          if (!dryRun) content.value = 'none';
          return;
        }

        rule.each((decl) => {
          if (decl.type !== 'decl') return;
          const property = decl.prop.toLowerCase();
          if (!BORDER_PROPS.has(property) || !borderShorthandIsCandidate(decl.value)) return;
          if (previousMarker(decl, MARK_KEEP) || ruleHasMarker(rule, MARK_KEEP)) return;
          const explicit = previousMarker(decl, MARK_REMOVE);
          if (!explicit && (protectedContext(rule) || decl.important || declarationIsAmbiguous(decl))) return;
          report(result, decl, property, !dryRun, explicit ? 'explicit-marker' : 'thin-solid-vertical-border');
          if (!dryRun) decl.value = '0';
        });
      });
    },
  };
}

lessVibe.postcss = true;
