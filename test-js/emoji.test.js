import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '@babel/parser';
import { transformEmoji } from '../js/emoji.js';

function statuses(result) {
  return result.report.map(({ emoji, status, reason, icon }) => ({ emoji, status, reason, icon }));
}

test('full HTML documents respect body keep directives and root attributes', () => {
  const source = '<!doctype html><html lang="en" title="🔍"><body data-vibe-keep><p>🔍</p></body></html>';
  const result = transformEmoji(source, { format: 'html' });
  assert.equal(result.code, source);
  assert.deepEqual(result.report.map(r => r.reason), ['attribute', 'keep-subtree']);
});

test('capitalized JSX components are not classified as intrinsic text-only tags', () => {
  const source = 'const v = <><Title>🔍</Title><Code>⭐</Code></>;';
  const result = transformEmoji(source, { format: 'jsx' });
  assert.equal(result.report.filter(r => r.status === 'replaced').length, 2);
  assert.doesNotThrow(() => parse(result.code, { plugins: ['jsx'] }));
});

test('reports escaped emoji in dynamic JSX attributes without changing them', () => {
  const source = 'const v=<div title={ok ? "\\u{1F50D}" : ""}/>;';
  const result = transformEmoji(source, { format: 'jsx' });
  assert.equal(result.code, source);
  assert.equal(result.report.length, 1);
  assert.equal(result.report[0].emoji, '🔍');
  assert.equal(result.report[0].reason, 'attribute');
});

test('preserves JSX numeric entity semantics beside a replaced emoji', () => {
  const source = 'const view = <span>&#128; 🔍</span>;';
  const result = transformEmoji(source, { format: 'jsx' });
  const ast = parse(result.code, { plugins: ['jsx'] });
  const children = ast.program.body[0].declarations[0].init.children;
  assert.equal(children[0].expression.value, '\u0080 ');
  assert.equal(children[1].openingElement.name.name, 'svg');
});

test('replaces mapped HTML text while preserving adjacent entities and skipping attributes', () => {
  const source = '<button title="🔔">&amp; 🔍 Search</button>';
  const result = transformEmoji(source, { format: 'html' });

  assert.match(result.code, /^<button title="🔔">&amp; <svg /);
  assert.match(result.code, /class="less-vibe-icon"/);
  assert.match(result.code, /width="1em" height="1em"/);
  assert.match(result.code, /stroke="currentColor" stroke-width="2"/);
  assert.match(result.code, /role="img" aria-label="Search" focusable="false"/);
  assert.match(result.code, /<path d="M21 21l-4\.35-4\.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0"><\/path><\/svg> Search<\/button>$/);
  assert.deepEqual(statuses(result), [
    { emoji: '🔔', status: 'skipped', reason: 'attribute', icon: 'bell' },
    { emoji: '🔍', status: 'replaced', reason: undefined, icon: 'search' },
  ]);
});

test('replaces a numeric HTML emoji entity without rewriting adjacent entities', () => {
  const source = '<p>&#x1F50D;&nbsp;&amp;</p>';
  const result = transformEmoji(source, { format: 'html' });

  assert.doesNotMatch(result.code, /&#x1F50D;/);
  assert.match(result.code, /<\/svg>&nbsp;&amp;<\/p>$/);
  assert.equal(result.report[0].emoji, '🔍');
  assert.equal(result.report[0].offset, 3);
});

test('recognizes valid numeric HTML emoji entities without a semicolon', () => {
  const result = transformEmoji('<p>&#128269 Search</p>', { format: 'html' });
  assert.match(result.code, /^<p><svg /);
  assert.match(result.code, /<\/svg> Search<\/p>$/);
});

test('rewrites direct JSX string expressions with safe string escaping', () => {
  const source = 'const view = <button>{"🔍 & \\\"go\\\""}</button>;';
  const result = transformEmoji(source, { format: 'jsx' });

  assert.match(result.code, /<svg[^>]+strokeWidth="2"[^>]+className="less-vibe-icon"/);
  assert.match(result.code, /<path d="[^"]+" \/><\/svg>\{" & \\\"go\\\""\}/);
  assert.doesNotThrow(() => parse(result.code, { sourceType: 'module', plugins: ['jsx'] }));
  assert.equal(result.report[0].status, 'replaced');
});

test('preserves TSX syntax while replacing direct render text', () => {
  const source = 'const view = (name: string) => <div>👤 {name}</div>;';
  const result = transformEmoji(source, { format: 'tsx' });

  assert.match(result.code, /name: string/);
  assert.match(result.code, /aria-label="User"/);
  assert.doesNotThrow(() => parse(result.code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }));
});

test('treats unknown family, skin-tone, flag, and keycap graphemes atomically', () => {
  const source = '<p>👨‍👩‍👧‍👦 👍🏽 🇲🇾 1️⃣</p>';
  const result = transformEmoji(source, { format: 'html' });

  assert.equal(result.code, source);
  assert.deepEqual(result.report.map(({ emoji, status }) => ({ emoji, status })), [
    { emoji: '👨‍👩‍👧‍👦', status: 'unmapped' },
    { emoji: '👍🏽', status: 'unmapped' },
    { emoji: '🇲🇾', status: 'unmapped' },
    { emoji: '1️⃣', status: 'unmapped' },
  ]);
});

test('skips excluded elements, kept subtrees, attributes, and dynamic JSX expressions', () => {
  const html = '<script>🔍</script><pre>🔍</pre><div data-vibe-keep><span>🔍</span></div><p title="🔍">ok</p>';
  const htmlResult = transformEmoji(html, { format: 'html' });
  assert.equal(htmlResult.code, html);
  assert.deepEqual(htmlResult.report.map(({ status, reason }) => ({ status, reason })), [
    { status: 'skipped', reason: 'excluded-element' },
    { status: 'skipped', reason: 'excluded-element' },
    { status: 'skipped', reason: 'keep-subtree' },
    { status: 'skipped', reason: 'attribute' },
  ]);

  const jsx = 'const view = <code title="🔍">🔍</code>; const other = <div>{ok ? "🔍" : ""}</div>;';
  const jsxResult = transformEmoji(jsx, { format: 'jsx' });
  assert.equal(jsxResult.code, jsx);
  assert.deepEqual(jsxResult.report.map(({ status, reason }) => ({ status, reason })), [
    { status: 'skipped', reason: 'attribute' },
    { status: 'skipped', reason: 'excluded-element' },
    { status: 'skipped', reason: 'dynamic-expression' },
  ]);
});

test('skips HTML and JSX text-only elements that cannot contain SVG', () => {
  const html = '<title>🔍 Find</title><select><option>🔍 Find</option></select>';
  const htmlResult = transformEmoji(html, { format: 'html' });
  assert.equal(htmlResult.code, html);
  assert.deepEqual(htmlResult.report.map(({ reason }) => reason), ['unsuitable-element', 'unsuitable-element']);

  const jsx = 'const view = <><title>🔍 Find</title><option>🔍 Find</option></>;';
  const jsxResult = transformEmoji(jsx, { format: 'jsx' });
  assert.equal(jsxResult.code, jsx);
  assert.deepEqual(jsxResult.report.map(({ reason }) => reason), ['unsuitable-element', 'unsuitable-element']);
});

test('preserves JSXText whitespace semantics when an icon splits multiline text', () => {
  const source = 'const view = <div>Hello\n  🔍 world</div>;';
  const result = transformEmoji(source, { format: 'jsx' });

  assert.match(result.code, /<div>\{"Hello "\}<svg/);
  assert.match(result.code, /<\/svg>\{" world"\}<\/div>/);
});

test('processes nested JSX inside a dynamic expression without a duplicate skipped report', () => {
  const source = 'const view = <div>{ok && <span>🔍</span>}</div>;';
  const result = transformEmoji(source, { format: 'jsx' });

  assert.equal(result.report.length, 1);
  assert.equal(result.report[0].status, 'replaced');
  assert.doesNotThrow(() => parse(result.code, { sourceType: 'module', plugins: ['jsx'] }));
});

test('supports custom icons and configurable theme styling', () => {
  const result = transformEmoji('<span>🧭</span>', {
    format: 'html',
    strokeWidth: 1.5,
    className: 'brand-icon nav-icon',
    icons: {
      '🧭️': { name: 'compass', label: 'Navigate', paths: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20', 'M15 9l-2 4-4 2 2-4 4-2'] },
    },
  });

  assert.match(result.code, /class="brand-icon nav-icon"/);
  assert.match(result.code, /stroke-width="1\.5"/);
  assert.match(result.code, /aria-label="Navigate"/);
  assert.equal((result.code.match(/<path /g) ?? []).length, 2);
  assert.equal(result.report[0].icon, 'compass');
});

test('dry run reports planned replacements without changing source', () => {
  const source = '<button>🔍 Search</button>';
  const result = transformEmoji(source, { format: 'html', dryRun: true });

  assert.equal(result.code, source);
  assert.deepEqual(statuses(result), [
    { emoji: '🔍', status: 'replaced', reason: undefined, icon: 'search' },
  ]);
});

test('rejects invalid source and markup-capable icon options', () => {
  assert.throws(() => transformEmoji('const view = <div>🔍</div', { format: 'jsx' }), /Unexpected token|Unterminated JSX/);
  assert.throws(() => transformEmoji('<p>🔍</p>', {
    format: 'html',
    icons: { '🔍': { name: 'bad', paths: ['M0 0"/><script>bad()</script>'] } },
  }), /path/i);
  assert.throws(() => transformEmoji('<p>🔍</p>', { format: 'html', className: 'icon" onclick="bad()' }), /className/);
  assert.throws(() => transformEmoji('<p>🔍</p>', { format: 'html', strokeWidth: Infinity }), /strokeWidth/);
});

test('is idempotent and never reprocesses generated SVG', () => {
  const first = transformEmoji('<button>🔍</button>', { format: 'html' });
  const second = transformEmoji(first.code, { format: 'html' });

  assert.equal(second.code, first.code);
  assert.deepEqual(second.report, []);
});
