#!/usr/bin/env node
import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, dirname, basename } from 'node:path';
import { transformEmoji } from './emoji.js';

const usage = 'Usage: less-vibe-icons <input.html|jsx|tsx> [-o output] [--format html|jsx|tsx] [--config icons.json] [--report report.json] [--check | --dry-run]';

function parseArgs(argv) {
  const args = {};
  const values = { '-o': 'output', '--output': 'output', '--format': 'format', '--config': 'config', '--report': 'report' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '-h' || arg === '--help') args.help = true;
    else if (Object.hasOwn(values, arg)) {
      const value = argv[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} requires a value`);
      args[values[arg]] = value;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (!args.input) args.input = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (args.check && args.dryRun) throw new Error('Choose --check or --dry-run, not both');
  return args;
}

async function identity(path) {
  const absolute = resolve(path);
  try {
    const [canonical, info] = await Promise.all([realpath(absolute), stat(absolute)]);
    return { canonical, device: info.dev, inode: info.ino };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = await realpath(dirname(absolute));
    return { canonical: resolve(parent, basename(absolute)) };
  }
}

async function distinct(paths) {
  const ids = await Promise.all(paths.filter(Boolean).map(identity));
  const key = path => process.platform === 'win32' ? path.toLowerCase() : path;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (key(a.canonical) === key(b.canonical) || (a.inode !== undefined && a.inode === b.inode && a.device === b.device)) {
        throw new Error('Input, output, configuration, and report paths must be different');
      }
    }
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) return void process.stdout.write(`${usage}\n`);
    if (!args.input) throw new Error(usage);
    const inferred = extname(args.input).slice(1).toLowerCase();
    const format = args.format || (inferred === 'htm' ? 'html' : inferred);
    if (!['html', 'jsx', 'tsx'].includes(format)) throw new Error('Use --format html, jsx or tsx for supported UI source');
    const noWrite = !!(args.check || args.dryRun);
    await distinct(noWrite ? [args.input, args.config] : [args.input, args.output, args.config, args.report]);
    let config = {};
    if (args.config) {
      config = JSON.parse(await readFile(args.config, 'utf8'));
      if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('Configuration must be a JSON object');
      for (const key of Object.keys(config)) {
        if (!['icons', 'strokeWidth', 'className'].includes(key)) throw new Error(`Unsupported configuration key: ${key}`);
      }
    }
    const source = await readFile(args.input, 'utf8');
    const result = transformEmoji(source, { ...config, format, dryRun: noWrite });
    const payload = { input: resolve(args.input), format, dryRun: noWrite, changed: result.code !== source, wouldChange: result.report.some(item => item.status === 'replaced'), count: result.report.length, report: result.report };
    if (args.check || args.dryRun) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      process.exitCode = args.check && result.report.length ? 1 : 0;
      return;
    }
    if (args.output) await writeFile(args.output, result.code);
    else process.stdout.write(result.code);
    if (args.report) await writeFile(args.report, `${JSON.stringify(payload, null, 2)}\n`);
    const unresolved = result.report.filter(item => item.status !== 'replaced').length;
    if (unresolved) process.stderr.write(`less-vibe-icons: ${unresolved} emoji preserved; inspect --report or --dry-run for mappings and skipped contexts\n`);
  } catch (error) {
    process.stderr.write(`less-vibe-icons: ${error.message}\n`);
    process.exitCode = 2;
  }
}

await main();
