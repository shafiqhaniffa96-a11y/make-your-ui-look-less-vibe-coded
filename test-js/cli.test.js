import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../js/cli.js', import.meta.url));

async function fixture(css) {
  const dir = await mkdtemp(join(tmpdir(), 'less-vibe-css-'));
  const input = join(dir, 'input.css');
  await writeFile(input, css);
  return { dir, input };
}

function invoke(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('writes cleaned CSS to -o and emits a JSON report', async () => {
  const { dir, input } = await fixture('.card { border-left: 4px solid red }');
  const output = join(dir, 'output.css');
  const report = join(dir, 'report.json');
  const result = invoke([input, '-o', output, '--report', report]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(output, 'utf8'), '.card { border-left: 0 }');
  const data = JSON.parse(await readFile(report, 'utf8'));
  assert.equal(data.candidateCount, 1);
  assert.equal(data.changed, true);
});

test('--check finds candidates, exits 1, and writes no files', async () => {
  const { dir, input } = await fixture('.card { border-left: 4px solid red }');
  const output = join(dir, 'output.css');
  const report = join(dir, 'report.json');
  const result = invoke([input, '--check', '-o', output, '--report', report]);
  assert.equal(result.status, 1);
  await assert.rejects(access(output));
  await assert.rejects(access(report));
  assert.match(result.stdout, /1 candidate/);
});

test('--check exits 0 when there are no candidates', async () => {
  const { input } = await fixture('.card { color: red }');
  assert.equal(invoke([input, '--check']).status, 0);
});

test('refuses to overwrite the input file', async () => {
  const { input } = await fixture('.card { color: red }');
  const result = invoke([input, '-o', input]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must be different/i);
});

test('refuses a report path that aliases the input or output', async () => {
  const { dir, input } = await fixture('.card { color: red }');
  const output = join(dir, 'output.css');
  let result = invoke([input, '-o', output, '--report', input]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /paths must be different/i);
  result = invoke([input, '-o', output, '--report', output]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /paths must be different/i);
});

test('returns a useful nonzero parser error', async () => {
  const { input } = await fixture('.card {');
  const result = invoke([input, '-o', `${input}.out`]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unclosed block/);
});
