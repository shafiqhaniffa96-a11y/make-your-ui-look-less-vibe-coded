#!/usr/bin/env node
import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import postcss from 'postcss';
import lessVibe from './index.js';

function usage() {
  return 'Usage: less-vibe-css <input.css> [-o output.css] [--report report.json] [--check]';
}

function parseArgs(argv) {
  const parsed = { input: undefined, output: undefined, report: undefined, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') parsed.check = true;
    else if (arg === '-o' || arg === '--output') {
      parsed.output = argv[++index];
      if (!parsed.output) throw new Error(`${arg} requires a file path`);
    } else if (arg === '--report') {
      parsed.report = argv[++index];
      if (!parsed.report) throw new Error('--report requires a file path');
    } else if (arg === '-h' || arg === '--help') parsed.help = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (!parsed.input) parsed.input = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return parsed;
}

async function pathIdentity(path) {
  const absolute = resolve(path);
  try {
    const [canonical, info] = await Promise.all([realpath(absolute), stat(absolute)]);
    return { absolute, canonical, device: info.dev, inode: info.ino };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { absolute, canonical: absolute, device: undefined, inode: undefined };
  }
}

async function assertDistinctPaths(paths) {
  const identities = await Promise.all(paths.filter(Boolean).map(pathIdentity));
  for (let left = 0; left < identities.length; left += 1) {
    for (let right = left + 1; right < identities.length; right += 1) {
      const a = identities[left];
      const b = identities[right];
      const sameName = a.absolute.toLowerCase() === b.absolute.toLowerCase() || a.canonical.toLowerCase() === b.canonical.toLowerCase();
      const sameFile = a.inode !== undefined && a.device === b.device && a.inode === b.inode;
      if (sameName || sameFile) throw new Error('Input, output, and report paths must be different');
    }
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    if (!args.input) throw new Error(usage());
    await assertDistinctPaths([args.input, args.output, args.report]);
    const css = await readFile(args.input, 'utf8');
    const result = await postcss([lessVibe({ dryRun: args.check })]).process(css, { from: args.input, to: args.output });
    const candidates = result.messages.filter((message) => message.type === 'vibe-cleaner-candidate');
    if (args.check) {
      process.stdout.write(`${candidates.length} candidate${candidates.length === 1 ? '' : 's'} found\n`);
      process.exitCode = candidates.length ? 1 : 0;
      return;
    }
    if (args.output) await writeFile(args.output, result.css);
    else process.stdout.write(result.css);
    if (args.report) {
      const payload = {
        input: resolve(args.input),
        output: args.output ? resolve(args.output) : null,
        candidateCount: candidates.length,
        changed: result.css !== css,
        candidates,
      };
      await writeFile(args.report, `${JSON.stringify(payload, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`less-vibe-css: ${error.message}\n`);
    process.exitCode = 2;
  }
}

await main();
