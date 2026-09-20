import { parse as parseJavaScript } from '@babel/parser';
import { parse, parseFragment } from 'parse5';
import { DEFAULT_EMOJI_ICONS } from './icons.js';

const EXCLUDED_ELEMENTS = new Set(['script', 'style', 'pre', 'code', 'textarea', 'svg']);
const UNSUITABLE_ELEMENTS = new Set(['title', 'option']);
const EMOJI_SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });
const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const FLAG = /^\p{Regional_Indicator}{2}$/u;
const KEYCAP = /^[0-9#*]\uFE0F?\u20E3$/u;
const PATH_DATA = /^(?=.*[Mm])[MmZzLlHhVvCcSsQqTtAa0-9eE+\-.,\s]+$/;
const CLASS_NAMES = /^[A-Za-z_][A-Za-z0-9_-]*(?:\s+[A-Za-z_][A-Za-z0-9_-]*)*$/;
const HTML_ENTITY = /&(?:#(?:x[\dA-Fa-f]+|\d+);?|[A-Za-z][A-Za-z\d]+;)/g;

function normalizeEmoji(value) {
  return value.replace(/\uFE0F/g, '');
}

function isEmoji(value) {
  return EXTENDED_PICTOGRAPHIC.test(value) || FLAG.test(value) || KEYCAP.test(value);
}

function emojiSegments(value) {
  return [...EMOJI_SEGMENTER.segment(value)].filter(({ segment }) => isEmoji(segment));
}

function decodeEntity(entity) {
  const fragment = parseFragment(entity);
  const text = fragment.childNodes?.[0];
  return text?.nodeName === '#text' ? text.value : entity;
}

function decodedHtmlText(raw) {
  let decoded = '';
  const positions = [];
  let rawIndex = 0;

  function appendLiteral(text, start) {
    decoded += text;
    for (let index = 0; index < text.length; index += 1) {
      positions.push({ start: start + index, end: start + index + 1 });
    }
  }

  for (const match of raw.matchAll(HTML_ENTITY)) {
    appendLiteral(raw.slice(rawIndex, match.index), rawIndex);
    const value = decodeEntity(match[0]);
    decoded += value;
    for (let index = 0; index < value.length; index += 1) {
      positions.push({ start: match.index, end: match.index + match[0].length });
    }
    rawIndex = match.index + match[0].length;
  }
  appendLiteral(raw.slice(rawIndex), rawIndex);
  return { decoded, positions };
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function validateIcon(icon, emoji) {
  if (!icon || typeof icon !== 'object' || Array.isArray(icon)) {
    throw new TypeError(`Icon for ${emoji} must be an object`);
  }
  if (typeof icon.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(icon.name)) {
    throw new TypeError(`Icon name for ${emoji} is invalid`);
  }
  if (icon.label !== undefined && (typeof icon.label !== 'string' || icon.label.length === 0)) {
    throw new TypeError(`Icon label for ${emoji} must be a non-empty string`);
  }
  if (!Array.isArray(icon.paths) || icon.paths.length === 0 || icon.paths.some((path) => typeof path !== 'string' || !PATH_DATA.test(path))) {
    throw new TypeError(`Icon path data for ${emoji} is invalid`);
  }
  return { name: icon.name, label: icon.label ?? icon.name, paths: [...icon.paths] };
}

function prepareOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Options must be an object');
  }
  const format = options.format;
  if (!['html', 'jsx', 'tsx'].includes(format)) {
    throw new TypeError('format must be html, jsx, or tsx');
  }
  if (options.dryRun !== undefined && typeof options.dryRun !== 'boolean') {
    throw new TypeError('dryRun must be a boolean');
  }
  const strokeWidth = options.strokeWidth ?? 2;
  if (typeof strokeWidth !== 'number' || !Number.isFinite(strokeWidth) || strokeWidth <= 0 || strokeWidth > 20) {
    throw new TypeError('strokeWidth must be a finite number greater than 0 and at most 20');
  }
  const className = options.className ?? 'less-vibe-icon';
  if (typeof className !== 'string' || !CLASS_NAMES.test(className)) {
    throw new TypeError('className must contain valid CSS class names');
  }
  if (options.icons !== undefined && (!options.icons || typeof options.icons !== 'object' || Array.isArray(options.icons))) {
    throw new TypeError('icons must be an object');
  }
  const custom = options.icons ?? {};

  const icons = new Map();
  for (const [emoji, icon] of Object.entries({ ...DEFAULT_EMOJI_ICONS, ...custom })) {
    const graphemes = [...EMOJI_SEGMENTER.segment(emoji)];
    if (graphemes.length !== 1 || !isEmoji(graphemes[0].segment)) {
      throw new TypeError(`Icon key ${emoji} must be one emoji grapheme`);
    }
    icons.set(normalizeEmoji(emoji), validateIcon(icon, emoji));
  }
  return { format, dryRun: options.dryRun === true, strokeWidth, className, icons };
}

function renderIcon(icon, options, jsx) {
  const classAttribute = jsx ? 'className' : 'class';
  const widthAttribute = jsx ? 'strokeWidth' : 'stroke-width';
  const linecapAttribute = jsx ? 'strokeLinecap' : 'stroke-linecap';
  const linejoinAttribute = jsx ? 'strokeLinejoin' : 'stroke-linejoin';
  const common = `xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" ${widthAttribute}="${options.strokeWidth}" ${linecapAttribute}="round" ${linejoinAttribute}="round" role="img" aria-label="${escapeAttribute(icon.label)}" focusable="false" ${classAttribute}="${escapeAttribute(options.className)}"`;
  const paths = icon.paths.map((path) => jsx ? `<path d="${path}" />` : `<path d="${path}"></path>`).join('');
  return `<svg ${common}>${paths}</svg>`;
}

function addEmojiReports(value, baseOffset, reason, options, report) {
  for (const { segment, index } of emojiSegments(value)) {
    const icon = options.icons.get(normalizeEmoji(segment));
    report.push({
      emoji: segment,
      status: 'skipped',
      reason,
      ...(icon ? { icon: icon.name } : {}),
      offset: baseOffset + index,
    });
  }
}

function processRawText(raw, absoluteStart, context, options, edits, report) {
  const { decoded, positions } = decodedHtmlText(raw);
  for (const { segment, index } of emojiSegments(decoded)) {
    const first = positions[index];
    const last = positions[index + segment.length - 1];
    if (!first || !last) continue;
    const start = absoluteStart + first.start;
    const end = absoluteStart + last.end;
    const icon = options.icons.get(normalizeEmoji(segment));
    if (context.reason) {
      report.push({ emoji: segment, status: 'skipped', reason: context.reason, ...(icon ? { icon: icon.name } : {}), offset: start });
    } else if (!icon) {
      report.push({ emoji: segment, status: 'unmapped', offset: start });
    } else {
      report.push({ emoji: segment, status: 'replaced', icon: icon.name, offset: start });
      edits.push({ start, end, replacement: renderIcon(icon, options, context.jsx) });
    }
  }
}

function htmlAttributeOffset(source, location, value) {
  if (!location) return 0;
  const raw = source.slice(location.startOffset, location.endOffset);
  const index = raw.indexOf(value);
  return location.startOffset + Math.max(index, 0);
}

function transformHtml(source, options, edits, report) {
  const root = parse(source, { sourceCodeLocationInfo: true });

  function visit(node, context) {
    if (node.nodeName === '#text' && node.sourceCodeLocation) {
      const { startOffset, endOffset } = node.sourceCodeLocation;
      processRawText(source.slice(startOffset, endOffset), startOffset, { reason: context.reason, jsx: false }, options, edits, report);
      return;
    }

    if (node.tagName) {
      const ownKeep = node.attrs?.some((attribute) => attribute.name.toLowerCase() === 'data-vibe-keep');
      const ownExcluded = EXCLUDED_ELEMENTS.has(node.tagName.toLowerCase());
      const ownUnsuitable = UNSUITABLE_ELEMENTS.has(node.tagName.toLowerCase());
      const reason = context.reason ?? (ownKeep ? 'keep-subtree' : ownExcluded ? 'excluded-element' : ownUnsuitable ? 'unsuitable-element' : undefined);
      for (const attribute of node.attrs ?? []) {
        const location = node.sourceCodeLocation?.attrs?.[attribute.name];
        addEmojiReports(attribute.value, htmlAttributeOffset(source, location, attribute.value), 'attribute', options, report);
      }
      for (const child of node.childNodes ?? []) visit(child, { reason });
      if (node.content) visit(node.content, { reason });
      return;
    }

    for (const child of node.childNodes ?? []) visit(child, context);
  }

  visit(root, {});
}

function jsxName(node) {
  return node?.type === 'JSXIdentifier' ? node.name : '';
}

function jsxAttributeValue(attribute) {
  if (!attribute.value) return null;
  if (attribute.value.type === 'StringLiteral') return attribute.value.value;
  if (attribute.value.type === 'JSXExpressionContainer') {
    const expression = attribute.value.expression;
    if (expression.type === 'StringLiteral') return expression.value;
    if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) return expression.quasis[0].value.cooked ?? expression.quasis[0].value.raw;
  }
  return null;
}

function directExpressionValue(expression) {
  if (expression.type === 'StringLiteral') return expression.value;
  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis[0].value.cooked ?? expression.quasis[0].value.raw;
  }
  return null;
}

function normalizeJsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (/[^\t ]/.test(lines[index])) lastNonEmptyLine = index;
  }

  let normalized = '';
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].replace(/\t/g, ' ');
    if (index !== 0) line = line.replace(/^ +/, '');
    if (index !== lines.length - 1) line = line.replace(/ +$/, '');
    if (!line) continue;
    normalized += line;
    if (index !== lastNonEmptyLine) normalized += ' ';
  }
  return normalized;
}

function jsxValueReplacement(value, options) {
  let replacement = '';
  let text = '';
  let hasReplacement = false;

  function flushText() {
    if (!text) return;
    replacement += `{${JSON.stringify(text)}}`;
    text = '';
  }

  for (const { segment } of EMOJI_SEGMENTER.segment(value)) {
    const icon = isEmoji(segment) ? options.icons.get(normalizeEmoji(segment)) : undefined;
    if (!icon) {
      text += segment;
      continue;
    }
    flushText();
    replacement += renderIcon(icon, options, true);
    hasReplacement = true;
  }
  flushText();
  return { replacement, hasReplacement };
}

function processJsxText(source, node, reason, options, edits, report) {
  const raw = source.slice(node.start, node.end);
  const { decoded, positions } = decodedHtmlText(raw);
  let hasMappedEmoji = false;

  for (const { segment, index } of emojiSegments(decoded)) {
    const first = positions[index];
    const last = positions[index + segment.length - 1];
    if (!first || !last) continue;
    const offset = node.start + first.start;
    const icon = options.icons.get(normalizeEmoji(segment));
    if (reason) {
      report.push({ emoji: segment, status: 'skipped', reason, ...(icon ? { icon: icon.name } : {}), offset });
    } else if (!icon) {
      report.push({ emoji: segment, status: 'unmapped', offset });
    } else {
      report.push({ emoji: segment, status: 'replaced', icon: icon.name, offset });
      hasMappedEmoji = true;
    }
  }

  if (!reason && hasMappedEmoji) {
    // Babel's JSX entity rules differ from HTML's legacy numeric-entity rules.
    // Preserve the parser's rendered value for neighbouring non-emoji text.
    const { replacement } = jsxValueReplacement(normalizeJsxText(node.value), options);
    edits.push({ start: node.start, end: node.end, replacement });
  }
}

function processDirectExpression(container, value, options, edits, report) {
  for (const { segment, index } of emojiSegments(value)) {
    const icon = options.icons.get(normalizeEmoji(segment));
    if (!icon) {
      report.push({ emoji: segment, status: 'unmapped', offset: container.start + index });
      continue;
    }
    report.push({ emoji: segment, status: 'replaced', icon: icon.name, offset: container.start + index });
  }
  const { replacement, hasReplacement } = jsxValueReplacement(value, options);
  if (hasReplacement) edits.push({ start: container.start, end: container.end, replacement });
}

function transformJsx(source, options, edits, report) {
  const ast = parseJavaScript(source, {
    sourceType: 'unambiguous',
    plugins: options.format === 'tsx' ? ['jsx', 'typescript'] : ['jsx'],
  });

  function visitElement(element, parentReason) {
    const opening = element.openingElement;
    const keep = opening.attributes.some((attribute) => attribute.type === 'JSXAttribute' && jsxName(attribute.name) === 'data-vibe-keep');
    const excluded = EXCLUDED_ELEMENTS.has(jsxName(opening.name));
    const unsuitable = UNSUITABLE_ELEMENTS.has(jsxName(opening.name));
    const reason = parentReason ?? (keep ? 'keep-subtree' : excluded ? 'excluded-element' : unsuitable ? 'unsuitable-element' : undefined);

    for (const attribute of opening.attributes) {
      if (attribute.type !== 'JSXAttribute') continue;
      const value = jsxAttributeValue(attribute);
      if (value !== null) addEmojiReports(value, attribute.start, 'attribute', options, report);
      else if (attribute.value?.type === 'JSXExpressionContainer') {
        visitAttributeExpression(attribute.value.expression);
      }
    }

    for (const child of element.children) visitChild(child, reason);
  }

  function visitFragment(fragment, reason) {
    for (const child of fragment.children) visitChild(child, reason);
  }

  function visitAttributeExpression(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'StringLiteral') {
      addEmojiReports(node.value, node.start, 'attribute', options, report);
      return;
    }
    if (node.type === 'TemplateElement') {
      addEmojiReports(node.value.cooked ?? node.value.raw, node.start, 'attribute', options, report);
      return;
    }
    if (node.type === 'JSXText') {
      addEmojiReports(node.value, node.start, 'attribute', options, report);
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visitAttributeExpression);
      else if (value && typeof value === 'object' && typeof value.type === 'string') visitAttributeExpression(value);
    }
  }

  function visitChild(child, reason) {
    if (child.type === 'JSXText') {
      processJsxText(source, child, reason, options, edits, report);
      return;
    }
    if (child.type === 'JSXElement') {
      visitElement(child, reason);
      return;
    }
    if (child.type === 'JSXFragment') {
      visitFragment(child, reason);
      return;
    }
    if (child.type !== 'JSXExpressionContainer') return;
    const value = directExpressionValue(child.expression);
    if (reason) {
      addEmojiReports(value ?? source.slice(child.start, child.end), child.start, reason, options, report);
    } else if (value !== null) {
      processDirectExpression(child, value, options, edits, report);
    } else {
      visitDynamic(child.expression);
    }
  }

  function visitDynamic(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement') {
      visitElement(node);
      return;
    }
    if (node.type === 'JSXFragment') {
      visitFragment(node);
      return;
    }
    if (node.type === 'StringLiteral') {
      addEmojiReports(node.value, node.start, 'dynamic-expression', options, report);
      return;
    }
    if (node.type === 'TemplateElement') {
      addEmojiReports(node.value.cooked ?? node.value.raw, node.start, 'dynamic-expression', options, report);
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visitDynamic);
      else if (value && typeof value === 'object' && typeof value.type === 'string') visitDynamic(value);
    }
  }

  function visitNested(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement') {
      visitElement(node);
      return;
    }
    if (node.type === 'JSXFragment') {
      visitFragment(node);
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visitNested);
      else if (value && typeof value === 'object' && typeof value.type === 'string') visitNested(value);
    }
  }

  visitNested(ast.program);
}

function applyEdits(source, edits) {
  let code = source;
  const sorted = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
  let previousStart = source.length + 1;
  for (const edit of sorted) {
    if (edit.end > previousStart) throw new Error('Overlapping emoji source edits');
    code = code.slice(0, edit.start) + edit.replacement + code.slice(edit.end);
    previousStart = edit.start;
  }
  return code;
}

export function transformEmoji(source, options = {}) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const prepared = prepareOptions(options);
  const edits = [];
  const report = [];

  if (prepared.format === 'html') transformHtml(source, prepared, edits, report);
  else transformJsx(source, prepared, edits, report);

  report.sort((left, right) => left.offset - right.offset);
  return {
    code: prepared.dryRun ? source : applyEdits(source, edits),
    report,
  };
}
