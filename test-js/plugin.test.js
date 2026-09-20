import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import cleaner from '../js/index.js';

async function run(css, options) {
  return postcss([cleaner(options)]).process(css, { from: undefined });
}

test('neutralizes explicit thin solid one-sided vertical border shorthands and reports them', async () => {
  const result = await run('.card { border-left: 4px solid #09f; color: black }');
  assert.equal(result.css, '.card { border-left: 0; color: black }');
  assert.deepEqual(result.messages.map(({ type, plugin, selector, property, removed, action }) =>
    ({ type, plugin, selector, property, removed, action })), [{
      type: 'vibe-cleaner-candidate',
      plugin: 'make-your-ui-look-less-vibe-coded',
      selector: '.card',
      property: 'border-left',
      removed: true,
      action: 'neutralized',
    }]);
});

test('dryRun preserves CSS while reporting candidates as not removed', async () => {
  const css = '.card { border-right: solid red 2px }';
  const result = await run(css, { dryRun: true });
  assert.equal(result.css, css);
  assert.equal(result.messages[0].removed, false);
});

test('preserves interactive and status selectors, full borders, unsafe values, and keep comments', async () => {
  const css = [
    '.button:hover { border-left: 4px solid red }',
    '.notice.error { border-right: 3px solid red }',
    '.framed { border: 1px solid black; border-left: 4px solid red }',
    '.wide { border-left: 9px solid red }',
    '.hairline { border-left: 1px solid red }',
    '.variable { border-left: var(--accent-width) solid red }',
    '.important { border-left: 4px solid red !important }',
    '.kept { /* vibe-keep */ border-left: 4px solid red }',
  ].join('\n');
  const result = await run(css);
  assert.equal(result.css, css);
  assert.equal(result.messages.length, 0);
});

test('preserves cascade-significant duplicate and overridden declarations without opt-in', async () => {
  const css = '.card { border-left: 4px solid red; border-left: 4px solid blue }\n.card { border-left-color: green; border-left: 4px solid red }';
  assert.equal((await run(css)).css, css);
});

test('preserves candidates alongside any other border declaration', async () => {
  const css = '.card { border-right-color: blue; border-left: 4px solid red }\n.other { border-inline-start: 1px solid; border-left: 4px solid red }\n.top { border-top: 1px solid; border-left: 4px solid red }';
  assert.equal((await run(css)).css, css);
});

test('allows border radius because it does not participate in the vertical border cascade', async () => {
  const result = await run('.card { border-radius: 8px; border-left: 4px solid red }');
  assert.equal(result.css, '.card { border-radius: 8px; border-left: 0 }');
});

test('recognizes bounded literal functional colors', async () => {
  const result = await run('.rgb { border-left: 4px solid rgb(10 20 30 / 80%) }\n.hsl { border-right: hsl(200 50% 40%) solid 3px }');
  assert.equal(result.css, '.rgb { border-left: 0 }\n.hsl { border-right: 0 }');
  assert.equal(result.messages.length, 2);
});

test('preserves CSS-wide color identifiers and variable functional colors', async () => {
  const css = '.a { border-left: 4px solid inherit }\n.b { border-left: 4px solid rgb(var(--rgb)) }\n.c { border-left: 4px solid banana }\n.d { border-left: 4px solid #12345 }';
  assert.equal((await run(css)).css, css);
});

test('neutralization prevents an earlier cascade declaration from becoming active', async () => {
  const result = await run('.card { border-left: 1px solid red }\n.card { border-left: 4px solid orange }');
  assert.equal(result.css, '.card { border-left: 1px solid red }\n.card { border-left: 0 }');
});

test('vibe-remove opts an otherwise ambiguous declaration into removal', async () => {
  const result = await run('.card { border-left-color: green; /* vibe-remove */ border-left: 4px solid red }');
  assert.match(result.css, /border-left: 0/);
  assert.match(result.css, /border-left-color: green/);
  assert.match(result.css, /vibe-remove/);
  assert.equal(result.messages[0].reason, 'explicit-marker');
});

test('neutralizes conservative empty decorative pseudo-elements, including nested at-rules', async () => {
  const css = '@media (min-width: 50rem) { .card::before { content: ""; position: absolute; width: 4px; height: 40px; background: #09f; } }';
  const result = await run(css);
  assert.match(result.css, /content: none/);
  assert.equal(result.messages[0].property, 'content');
  assert.equal(result.messages[0].selector, '.card::before');
});

test('preserves nested descendants of interactive selectors', async () => {
  const css = '.parent:hover { @media (width > 20rem) { .child { border-left: 4px solid red } } }';
  const result = await run(css);
  assert.equal(result.css, css);
});

test('a keep marker protects descendant rules', async () => {
  const css = '.outer { /* vibe-keep */ border-left: 4px solid red; .inner { border-left: 4px solid blue } }';
  const result = await run(css);
  assert.equal(result.css, css);
});

test('preserves pseudo-elements with nested nodes or conflicting background declarations', async () => {
  const css = [
    '.a::before { content:""; position:absolute; width:4px; height:40px; background:red; background-image:url(x.png) }',
    '.b::after { content:""; position:absolute; width:4px; height:40px; background:red; @media (width > 20rem) { color: blue } }',
  ].join('\n');
  assert.equal((await run(css)).css, css);
});

test('preserves pseudo-elements with meaningful content, relative position, short height, or gradients', async () => {
  const css = [
    '.a::before { content: "NEW"; position:absolute; width:4px; height:40px; background:red }',
    '.b::after { content:""; position:relative; width:4px; height:40px; background:red }',
    '.c::before { content:""; position:absolute; width:4px; height:8px; background:red }',
    '.d::after { content:""; position:absolute; width:4px; height:40px; background:linear-gradient(red, blue) }',
  ].join('\n');
  assert.equal((await run(css)).css, css);
});

test('keeps source parser errors intact', async () => {
  await assert.rejects(() => run('.card { border-left: 4px solid red;'), /Unclosed block/);
});
