#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    direction: null,
    localDir: process.env.ANTIGRAVITY_PLUGIN_DIR || path.join(os.homedir(), '.gemini', 'config', 'plugins', 'workflow'),
    dryRun: false,
    overwriteRules: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--to-local') opts.direction = 'to-local';
    else if (arg === '--from-local') opts.direction = 'from-local';
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--overwrite-rules') opts.overwriteRules = true;
    else if (arg === '--local-dir' && argv[i + 1]) {
      opts.localDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '-h' || arg === '--help') {
      console.log(
        [
          'Usage: node scripts/sync-workflow.mjs (--to-local | --from-local) [options]',
          '',
          'Syncs shared plugin core (agents/*.md, hooks.json, scripts/guard-hook.mjs, and public skills/)',
          'between this public repository and the local Antigravity workflow plugin without clobbering',
          'local rules/AGENTS.md or private skills.',
          '',
          'Options:',
          '  --to-local         Push public repo core files into local Antigravity plugin',
          '  --from-local       Pull shared core files from local plugin into this repo, then verify',
          '  --local-dir <dir>  Override local plugin path (default: ~/.gemini/config/plugins/workflow)',
          '  --overwrite-rules  (with --to-local) Also copy rules/AGENTS.md (off by default)',
          '  --dry-run          Print planned file operations without writing',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  if (!opts.direction) {
    console.error('Specify --to-local or --from-local (use --help for usage).');
    process.exit(1);
  }
  return opts;
}

function copyFileSafe(src, dest, dryRun) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source file: ${src}`);
  }
  if (dryRun) {
    console.log(`[dry-run] copy ${src} -> ${dest}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirClean(srcDir, destDir, dryRun) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing source directory: ${srcDir}`);
  }
  if (dryRun) {
    console.log(`[dry-run] sync dir ${srcDir} -> ${destDir}`);
    return;
  }
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
}

function isSameOrNestedPath(a, b) {
  const normA = path.resolve(a).toLowerCase();
  const normB = path.resolve(b).toLowerCase();
  if (normA === normB) return true;
  const relAB = path.relative(normA, normB);
  const relBA = path.relative(normB, normA);
  return (
    (relAB !== '' && !relAB.startsWith('..') && !path.isAbsolute(relAB)) ||
    (relBA !== '' && !relBA.startsWith('..') && !path.isAbsolute(relBA))
  );
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (isSameOrNestedPath(opts.localDir, REPO_ROOT)) {
    console.error(`Refusing to sync overlapping paths: localDir="${opts.localDir}" overlaps repo="${REPO_ROOT}".`);
    process.exit(1);
  }
  const publicSkills = fs
    .readdirSync(path.join(REPO_ROOT, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const sharedFiles = [
    'hooks.json',
    path.join('scripts', 'guard-hook.mjs'),
    path.join('agents', 'advisor.md'),
    path.join('agents', 'reviewer.md'),
    path.join('agents', 'scout.md'),
  ];

  if (opts.direction === 'to-local') {
    for (const rel of sharedFiles) {
      copyFileSafe(path.join(REPO_ROOT, rel), path.join(opts.localDir, rel), opts.dryRun);
    }
    if (opts.overwriteRules) {
      copyFileSafe(
        path.join(REPO_ROOT, 'rules', 'AGENTS.md'),
        path.join(opts.localDir, 'rules', 'AGENTS.md'),
        opts.dryRun,
      );
    }
    for (const skill of publicSkills) {
      copyDirClean(
        path.join(REPO_ROOT, 'skills', skill),
        path.join(opts.localDir, 'skills', skill),
        opts.dryRun,
      );
    }
    console.log(
      `${opts.dryRun ? '[dry-run] ' : ''}Synced ${sharedFiles.length} core files + ${publicSkills.length} public skills -> ${opts.localDir} (local rules/AGENTS.md ${opts.overwriteRules ? 'overwritten' : 'preserved'}).`,
    );
    return;
  }

  // --from-local: only pull shared core + whitelisted public skills (never private rules or private skills)
  for (const rel of sharedFiles) {
    copyFileSafe(path.join(opts.localDir, rel), path.join(REPO_ROOT, rel), opts.dryRun);
  }
  for (const skill of publicSkills) {
    const localSkillDir = path.join(opts.localDir, 'skills', skill);
    if (!fs.existsSync(localSkillDir)) {
      console.warn(`WARN  Skipped missing local skill: ${skill}`);
      continue;
    }
    copyDirClean(localSkillDir, path.join(REPO_ROOT, 'skills', skill), opts.dryRun);
  }
  console.log(
    `${opts.dryRun ? '[dry-run] ' : ''}Pulled ${sharedFiles.length} core files + ${publicSkills.length} whitelisted public skills <- ${opts.localDir}.`,
  );

  if (!opts.dryRun) {
    const verify = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'verify-plugin.mjs')], {
      stdio: 'inherit',
    });
    if (verify.status !== 0) {
      process.exit(verify.status ?? 1);
    }
  }
}

main();
