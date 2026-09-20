import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../js/emoji-cli.js', import.meta.url));
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
async function fixture(text = '<button>🔍 Search</button>', extension = 'html') {
  const dir = await mkdtemp(join(tmpdir(), 'less-vibe-icons-'));
  const input = join(dir, `input.${extension}`);
  await writeFile(input, text);
  return { dir, input, output: join(dir, `output.${extension}`), report: join(dir, 'report.json') };
}

test('CLI transforms HTML, writes report, and leaves source intact', async () => {
  const f = await fixture();
  const r = run([f.input, '-o', f.output, '--report', f.report]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(await readFile(f.output, 'utf8'), /<svg/);
  assert.equal(await readFile(f.input, 'utf8'), '<button>🔍 Search</button>');
  assert.equal(JSON.parse(await readFile(f.report, 'utf8')).report[0].status, 'replaced');
});

test('check and dry-run never write files, including requested reports', async () => {
  for (const mode of ['--check', '--dry-run']) {
    const f = await fixture();
    const r = run([f.input, mode, '-o', f.output, '--report', f.report]);
    assert.equal(r.status, mode === '--check' ? 1 : 0, r.stderr);
    await assert.rejects(access(f.output));
    await assert.rejects(access(f.report));
    assert.ok(r.stdout.length);
    const payload = JSON.parse(r.stdout);
    assert.equal(payload.changed, false);
    assert.equal(payload.wouldChange, true);
    assert.equal(payload.dryRun, true);
  }
});

test('no-write modes ignore nonexistent output folders and output aliases', async () => {
  const f = await fixture();
  const r = run([f.input, '--dry-run', '-o', join(f.dir, 'missing', 'output.html'), '--report', f.input]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).wouldChange, true);
  assert.equal(await readFile(f.input, 'utf8'), '<button>🔍 Search</button>');
});

test('check flags unmapped and skipped emoji; clean source exits zero', async () => {
  for (const [text, status] of [['<p>Hello</p>', 0], ['<p>🦄</p>', 1], ['<p title="🔍">Text</p>', 1]]) {
    const f = await fixture(text);
    const r = run([f.input, '--check']);
    assert.equal(r.status, status, r.stderr);
  }
});

test('CLI infers TSX and accepts theme configuration', async () => {
  const f = await fixture('const App = () => <button>🔍</button>;', 'tsx');
  const config = join(f.dir, 'icons.json');
  await writeFile(config, JSON.stringify({ strokeWidth: 1.5, className: 'project-icon' }));
  const r = run([f.input, '--config', config]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /className="project-icon"/);
  assert.match(r.stdout, /strokeWidth/);
});

test('CLI rejects unsafe output aliases and malformed options', async () => {
  const f = await fixture();
  for (const args of [[f.input, '-o', f.input], [f.input, '--report', f.input], [f.input, '--format', 'css'], [f.input, '--config'], [f.input, '--bogus'], [f.input, '--check', '--dry-run']]) {
    assert.equal(run(args).status, 2, args.join(' '));
  }
  assert.equal(await readFile(f.input, 'utf8'), '<button>🔍 Search</button>');
});

test('configuration cannot override format or dry-run safeguards', async () => {
  const f = await fixture();
  const config = join(f.dir, 'icons.json');
  await writeFile(config, JSON.stringify({ dryRun: false }));
  const r = run([f.input, '--check', '--config', config]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unsupported configuration/);
});

test('custom JSON mappings replace an otherwise unmapped emoji', async () => {
  const f = await fixture('<span>🦄</span>');
  const config = join(f.dir, 'icons.json');
  await writeFile(config, JSON.stringify({ icons: { '🦄': { name: 'custom', label: 'Custom icon', paths: ['M2 2L22 22'] } } }));
  const r = run([f.input, '--config', config, '-o', f.output]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(await readFile(f.output, 'utf8'), /aria-label="Custom icon"/);
  assert.doesNotMatch(await readFile(f.output, 'utf8'), /🦄/);
  assert.equal(run([f.input, '--config', config, '-o', config]).status, 2);
});
