#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateHookPayload } from './guard-hook.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const failures = [];
let checksPassed = 0;

function check(label, fn) {
  try {
    fn();
    checksPassed += 1;
    console.log(`PASS  ${label}`);
  } catch (err) {
    failures.push({ label, error: err instanceof Error ? err.message : String(err) });
    console.error(`FAIL  ${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  let activeKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      activeKey = kv[1];
      const rawVal = kv[2].replace(/^['"]|['"]$/g, '').trim();
      fields[activeKey] = /^[>|][-+]?$/.test(rawVal) ? '' : rawVal;
    } else if (activeKey && /^\s+\S/.test(line)) {
      fields[activeKey] = `${fields[activeKey] ? `${fields[activeKey]} ` : ''}${line.trim()}`;
    } else if (line.trim() === '') {
      continue;
    } else {
      activeKey = null;
    }
  }
  return fields;
}

function walkFiles(dir, predicate) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (!predicate || predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

// 1. Validate plugin.json & hooks.json
check('plugin.json valid JSON and required fields', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'plugin.json'), 'utf8'));
  assert.equal(typeof manifest.name, 'string');
  assert.ok(manifest.name.length > 0);
  assert.equal(typeof manifest.version, 'string');
  assert.equal(typeof manifest.description, 'string');
});

check('hooks.json valid JSON and references existing hook scripts', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'hooks.json'), 'utf8'));
  const guard = hooks['workflow-guard'];
  assert.ok(guard && Array.isArray(guard.PreToolUse) && guard.PreToolUse.length > 0);
  for (const group of guard.PreToolUse) {
    assert.equal(typeof group.matcher, 'string');
    assert.ok(Array.isArray(group.hooks) && group.hooks.length > 0);
    for (const h of group.hooks) {
      assert.equal(h.type, 'command');
      const scriptMatch = h.command.match(/\.\/([^\s"']+)/);
      assert.ok(scriptMatch, `Expected relative script path in command: ${h.command}`);
      assert.ok(fs.existsSync(path.join(REPO_ROOT, scriptMatch[1])), `Missing hook script: ${scriptMatch[1]}`);
    }
  }
});

// 2. Validate agents/*.md frontmatter and read-only tool contract
check('agents/*.md valid frontmatter with no write tools', () => {
  const agentsDir = path.join(REPO_ROOT, 'agents');
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  assert.ok(files.includes('advisor.md') && files.includes('reviewer.md') && files.includes('scout.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm, `${file} missing YAML frontmatter`);
    assert.equal(fm.name, file.replace(/\.md$/, ''), `${file} frontmatter name mismatch`);
    assert.ok(fm.description && fm.description.length > 10, `${file} missing description`);
    assert.ok(!/\b(?:edit_file|write_file)\b/.test(fm.tools || ''), `${file} must not declare write tools`);
  }
});

// 3. Validate skills/*/SKILL.md frontmatter
check('skills/*/SKILL.md valid frontmatter matching directory names', () => {
  const skillsDir = path.join(REPO_ROOT, 'skills');
  const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  assert.ok(dirs.length >= 33, `Expected >=33 skills, found ${dirs.length}`);
  for (const dir of dirs) {
    const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), `Missing SKILL.md in ${dir.name}`);
    const fm = parseFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    assert.ok(fm, `${dir.name}/SKILL.md missing frontmatter`);
    assert.equal(fm.name, dir.name, `${dir.name}/SKILL.md frontmatter name "${fm.name}" != "${dir.name}"`);
    assert.ok(fm.description && fm.description.length > 0, `${dir.name}/SKILL.md missing description`);
  }
});

// 4. Validate SVG structure and hero.svg pill horizontal bounds
check('assets/*.svg well-formed XML and hero.svg pill bounds', () => {
  const assetsDir = path.join(REPO_ROOT, 'assets');
  const svgs = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.svg'));
  assert.ok(svgs.length >= 3);
  for (const file of svgs) {
    const text = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    assert.ok(text.trimStart().startsWith('<svg ') && text.trimEnd().endsWith('</svg>'), `${file} invalid SVG wrapper`);
    assert.ok(!/[\uFEFF]/.test(text), `${file} contains UTF-8 BOM`);
    // Verify balanced open/close tags for key elements
    for (const tag of ['svg', 'defs', 'g', 'text']) {
      const opens = (text.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) || []).length;
      const closes = (text.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(opens, closes, `${file} unbalanced <${tag}> tags (${opens} vs ${closes})`);
    }
  }

  // Check hero.svg pill text fits within rect width at conservative 0.60em monospace width
  const hero = fs.readFileSync(path.join(assetsDir, 'hero.svg'), 'utf8');
  const pillRegex =
    /<rect\s+x="(\d+)"\s+y="0"\s+width="(\d+)"[^>]*\/>\s*<text\s+x="(\d+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
  let m;
  let pillCount = 0;
  let prevRight = -1;
  while ((m = pillRegex.exec(hero)) !== null) {
    pillCount += 1;
    const rx = Number(m[1]);
    const rw = Number(m[2]);
    const tx = Number(m[3]);
    const fontSize = Number(m[4]);
    const label = m[5];
    const estWidth = label.length * fontSize * 0.6;
    const leftPad = tx - rx;
    const rightPad = rx + rw - (tx + estWidth);
    assert.ok(leftPad >= 8, `Pill "${label}" leftPad too small (${leftPad})`);
    assert.ok(rightPad >= 8, `Pill "${label}" overflows or clips right edge (rightPad=${rightPad.toFixed(1)}px)`);
    if (prevRight >= 0) {
      assert.ok(rx - prevRight >= 4, `Pill "${label}" overlaps previous pill`);
    }
    prevRight = rx + rw;
  }
  assert.ok(pillCount >= 5, `Expected >=5 hero pills, found ${pillCount}`);
});

// 5. Privacy & stale model sanitization check
check('repository sanitization (no personal paths, BOMs, or stale carbon refs)', () => {
  const files = walkFiles(REPO_ROOT, (f) => /\.(?:md|json|svg|sh|mjs)$/i.test(f));
  const forbiddenPatterns = [
    { name: 'Windows personal Users path', re: /[A-Za-z]:\\Users\\[^\\\s"'<>]+/ },
    { name: 'macOS personal Users path', re: /\/Users\/(?!<|your|alice|bob|user|username|dev)[A-Za-z0-9._-]+\// },
    { name: 'Local 123pan path', re: /123pan/i },
    { name: 'Private VPS hostname', re: /\b(?:bytevirt-cindy|vps-autopilot)\b/i },
  ];

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const buf = fs.readFileSync(file);
    assert.ok(!(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf), `${rel} contains UTF-8 BOM`);
    const text = buf.toString('utf8');

    if (rel !== 'scripts/verify-plugin.mjs') {
      for (const { name, re } of forbiddenPatterns) {
        assert.ok(!re.test(text), `${rel} matched forbidden privacy pattern: ${name}`);
      }
    }

    if (rel !== 'docs/legacy-hermes.md' && rel !== 'scripts/verify-plugin.mjs') {
      assert.ok(!/gemini-4-carbon-high/i.test(text), `${rel} still references stale gemini-4-carbon-high`);
    }
  }
});

// 6. Relative Markdown link validation in top-level & docs files
check('relative markdown links resolve to existing files', () => {
  const mdFiles = [
    'README.md',
    'README.en.md',
    'rules/AGENTS.md',
    ...fs.readdirSync(path.join(REPO_ROOT, 'docs')).map((f) => path.join('docs', f)),
  ].filter((rel) => rel.endsWith('.md'));

  const linkRe = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
  for (const rel of mdFiles) {
    const abs = path.join(REPO_ROOT, rel);
    const dir = path.dirname(abs);
    const text = fs.readFileSync(abs, 'utf8');
    let match;
    while ((match = linkRe.exec(text)) !== null) {
      const target = match[1];
      if (/^(?:https?:|mailto:|customization:|sidecar:|file:)/i.test(target)) continue;
      const resolved = path.resolve(dir, target);
      assert.ok(fs.existsSync(resolved), `${rel} has broken relative link: ${target}`);
    }
  }
});

// 7. Behavioral tests for scripts/guard-hook.mjs
check('guard-hook denies forbidden git/gh/test patterns and allows safe counterparts', () => {
  // Deny: AI Co-Authored-By (inline, heredoc, PowerShell here-string, --trailer)
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git commit -m "fix\n\nCo-Authored-By: AI <ai@example.com>"' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: "git commit -F - <<'EOF'\nfix: demo\n\nCo-Authored-By: Bot <b@x.io>\nEOF" } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: '$m = @"\nfix: ps\n\nCo-Authored-By: Bot <b@x.io>\n"@\ngit commit -m $m' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git commit -m "fix" --trailer "Co-authored-by=Bot <b@x.io>"' } },
    }).decision,
    'deny',
  );
  // Allow: searching for Co-Authored-By (alone or before a clean commit)
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git grep "Co-Authored-By"' } },
    }).decision,
    'allow',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git log --grep "Co-Authored-By:" -n 3; git commit -m "fix: clean commit"' },
      },
    }).decision,
    'allow',
  );

  // Deny: @codex review (inline & piped stdin to gh)
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'gh pr comment 42 --body "@codex review"' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'echo "@codex review" | gh pr comment 42 -F -' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload(
      {
        toolCall: { name: 'run_command', args: { CommandLine: 'echo "SECRET_LOCAL_TOKEN_XYZ" | gh pr create --title "t" -F -' } },
      },
      { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
    ).decision,
    'deny',
  );

  // Deny: bare git push --force / -f, forced refspec +main, --force-with-lease combined with --force
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push origin main --force' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git status && git push -f origin feat' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push origin +main' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push --force-with-lease --force origin main' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push -uf origin main' } },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git -C "/tmp/repo" push origin +HEAD:main' } },
    }).decision,
    'deny',
  );
  // Deny: wrapped / compound / subshell / substituted / encoded git push & git commit bypasses
  const encodedForcePush = Buffer.from('git push -f origin main', 'utf16le').toString('base64');
  for (const wrappedDangerous of [
    'bash -c "git push --force origin main"',
    'sh -lc "git push origin +main"',
    'cmd /c "git push -f origin main"',
    'powershell -NoProfile -Command "git push -f origin main"',
    'powershell -Comm "git push -f origin main"',
    'powershell git push -f origin main',
    `powershell -enc ${encodedForcePush}`,
    `powershell -en ${encodedForcePush}`,
    '(git push -f origin main)',
    'if ($true) { git push -f origin main }',
    'if ($true){git push -f origin main}',
    'if true; then git push -f origin main; fi',
    'sleep 1 & git push -f origin main',
    '$r = "$(git push -f origin main)"',
    '$g="git"; & $g push -f origin main',
    '$p="push"; git $p -f origin main',
    '$f="-f"; git push $f origin main',
    '"git push -f origin main" | iex',
    'cat <<< x\ngit push -f origin main',
    'gh pr comment 1 -F - <<< "ok"\ngit push -f origin main',
    'echo main | xargs git push -f origin',
    'timeout 60 git push -f origin main',
    'timeout -k 10 60 git push -f origin main',
    'nice -n 10 git push -f origin main',
    'stdbuf -oL git push -f origin main',
    'wsl -e git push -f origin main',
    'eval "git push -f origin main"',
    'iex "git push -f origin main"',
    'Invoke-Expression -Command "git push -f origin main"',
    'bash -c "git commit -m \'fix\\n\\nCo-Authored-By: Bot <b@x.io>\'"',
    'git commit --tra "Co-Authored-By: Bot <b@x.io>" -m "fix"',
    'gh api repos/{owner}/{repo}/issues/1/comments -f body="@codex review"',
  ]) {
    assert.equal(
      evaluateHookPayload({
        toolCall: { name: 'run_command', args: { CommandLine: wrappedDangerous } },
      }).decision,
      'deny',
      `Expected deny for wrapped dangerous command: ${wrappedDangerous}`,
    );
  }
  // Deny: combined / attached / abbreviated flags, gh api {owner}/{repo}, and <<< here-strings
  for (const shortFlagLeak of [
    'git commit -am "fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit -sm "fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit -m"fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit --m "fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit --me "fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit --m=SECRET_LOCAL_TOKEN_XYZ',
    'git commit --mess "fix SECRET_LOCAL_TOKEN_XYZ"',
    'git commit -F - <<< "fix SECRET_LOCAL_TOKEN_XYZ"',
    'gh pr comment 1 -b"host SECRET_LOCAL_TOKEN_XYZ"',
    'gh pr comment 1 -F - <<< "host SECRET_LOCAL_TOKEN_XYZ"',
    'gh api -XPATCH repos/o/r/issues/comments/1 -fbody="SECRET_LOCAL_TOKEN_XYZ"',
    'gh api repos/{owner}/{repo}/issues/1/comments -f body="SECRET_LOCAL_TOKEN_XYZ"',
  ]) {
    assert.equal(
      evaluateHookPayload(
        { toolCall: { name: 'run_command', args: { CommandLine: shortFlagLeak } } },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
      ).decision,
      'deny',
      `Expected deny for short-flag privacy leak: ${shortFlagLeak}`,
    );
  }
  // Allow: git push --force-with-lease alone, piped Select-String -f, and node -e matching old regex (git + .push + +=)
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push --force-with-lease=refs/heads/feat:abc123 origin feat' } },
    }).decision,
    'allow',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: { name: 'run_command', args: { CommandLine: 'git push origin feat | Select-String -f x' } },
    }).decision,
    'allow',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'node -e "execSync(\'git ls-files\'); count += 1; arr.push(a +b); console.log(arr)"',
        },
      },
    }).decision,
    'allow',
  );

  // Deny / Allow: --body-file, -F, gh api -F body=@file (UTF-8 BOM, UTF-16LE BOM, NUL/control chars, @codex, privacy)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-guard-test-'));
  try {
    const bomFile = path.join(tmpDir, 'bom.md');
    const utf16File = path.join(tmpDir, 'utf16le.md');
    const ctrlFile = path.join(tmpDir, 'ctrl.md');
    const cleanFile = path.join(tmpDir, 'clean.md');
    const leakFile = path.join(tmpDir, 'leak.md');
    const codexFile = path.join(tmpDir, 'codex.md');
    const userPathDir = path.join(tmpDir, 'SECRET_LOCAL_USER');
    fs.mkdirSync(userPathDir, { recursive: true });
    const cleanInUserPath = path.join(userPathDir, 'pr.md');
    const leakInUserPath = path.join(userPathDir, 'leak-commit.txt');
    fs.writeFileSync(bomFile, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('## Summary\n', 'utf8')]));
    fs.writeFileSync(utf16File, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('## 摘要\n', 'utf16le')]));
    fs.writeFileSync(ctrlFile, Buffer.from('## Summary\nBroken \x07bell control char\n', 'utf8'));
    fs.writeFileSync(cleanFile, '## Summary\nClean PR body.\n', 'utf8');
    fs.writeFileSync(leakFile, '## Summary\nLeaked SECRET_LOCAL_TOKEN_XYZ\n', 'utf8');
    fs.writeFileSync(codexFile, 'Please run @codex review on this PR.\n', 'utf8');
    fs.writeFileSync(cleanInUserPath, '## Summary\nClean content inside private temp path.\n', 'utf8');
    fs.writeFileSync(leakInUserPath, 'fix: leaked SECRET_LOCAL_TOKEN_XYZ\n', 'utf8');

    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr create --title "test" --body-file bom.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr create --title "test" -F bom.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr edit 1 --body-file utf16le.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr edit 1 --body-file ctrl.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'gh api repos/{owner}/{repo}/issues/1/comments -F body=@bom.md' },
        },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: `git commit --fil="${leakInUserPath}"` },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
      ).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'gh api -X PATCH repos/o/r/issues/comments/1 -F body=@utf16le.md' },
        },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: {
              CommandLine: `$comment = '${utf16File}'; $arg = "body=@$comment"; gh api -X PATCH repos/o/r/issues/comments/1 -F $arg`,
            },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: {
              CommandLine: `$comment = '${cleanInUserPath}'; gh api -X PATCH repos/o/r/issues/comments/1 -F "body=@$comment"`,
            },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'allow',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr comment 1 --body-file codex.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: "gh pr comment 1 -F - <<'EOF'\nPlease @codex review\nEOF" } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr create --title "test" --body-file clean.md' } },
      }).decision,
      'allow',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: { name: 'run_command', args: { CommandLine: 'gh pr edit 1 --body-file leak.md' } },
        },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
      ).decision,
      'deny',
    );
    // Allow: read-only gh commands & multi-statement scratch variables containing local username path
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: {
              CommandLine: `$scratch = '${userPathDir}'; gh pr diff 42 > "$scratch\\pr42.diff"; gh pr view 42 --json body`,
            },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'allow',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: {
              CommandLine: `$p = '${cleanInUserPath}'; node -e "console.log('${cleanInUserPath.replace(/\\/g, '/')}')" ; gh pr create --title "ok" --body-file $p`,
            },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'allow',
    );
    // Deny: resolved variable passed as inline --body or PowerShell here-string with odd apostrophe
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: {
              CommandLine: `$body = @'\ndon't leak SECRET_LOCAL_TOKEN_XYZ\n'@\ngh pr comment 1 --body $body`,
            },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
      ).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: `gh pr create --title "ok" --body-file "${cleanInUserPath}"` },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'allow',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: `git -C "${userPathDir}" commit -m "chore: clean commit"` },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_USER'] },
      ).decision,
      'allow',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: `$msg = '${leakInUserPath}'; git commit -F $msg` },
          },
        },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ', 'SECRET_LOCAL_USER'] },
      ).decision,
      'deny',
    );
    // Deny: same-command redirection / Out-File / Set-Content into gh payload file & @codex review before gh
    for (const sameCmdWrite of [
      'echo "@codex review" > generated.md; gh pr comment 1 -F generated.md',
      'echo "hello" > generated.md; gh pr edit 1 --body-file generated.md',
      'Write-Output "hi" | Out-File generated.md; gh api -X PATCH repos/o/r/issues/comments/1 -F body=@generated.md',
      'Set-Content -Path generated.md -Value "hi"; gh pr create --title "t" --body-file generated.md',
    ]) {
      assert.equal(
        evaluateHookPayload({
          cwd: tmpDir,
          toolCall: { name: 'run_command', args: { CommandLine: sameCmdWrite } },
        }).decision,
        'deny',
        `Expected deny for same-command file write into gh: ${sameCmdWrite}`,
      );
    }
    // Deny: input redirection `< file` into gh -F - (BOM / privacy)
    assert.equal(
      evaluateHookPayload({
        cwd: tmpDir,
        toolCall: { name: 'run_command', args: { CommandLine: 'gh pr comment 1 -F - < bom.md' } },
      }).decision,
      'deny',
    );
    assert.equal(
      evaluateHookPayload(
        {
          cwd: tmpDir,
          toolCall: { name: 'run_command', args: { CommandLine: 'gh pr comment 1 -F - < leak.md' } },
        },
        { privacyDenylist: ['SECRET_LOCAL_TOKEN_XYZ'] },
      ).decision,
      'deny',
    );
    // Deny: process.env variable expansion ($env:VAR / %VAR% / $VAR) resolves BOM file
    const prevEnv = process.env.WF_GUARD_TEST_TMP;
    process.env.WF_GUARD_TEST_TMP = tmpDir;
    try {
      assert.equal(
        evaluateHookPayload({
          cwd: tmpDir,
          toolCall: { name: 'run_command', args: { CommandLine: 'gh pr create --title "t" --body-file "$env:WF_GUARD_TEST_TMP/bom.md"' } },
        }).decision,
        'deny',
      );
      assert.equal(
        evaluateHookPayload({
          cwd: tmpDir,
          toolCall: { name: 'run_command', args: { CommandLine: 'gh pr create --title "t" --body-file "%WF_GUARD_TEST_TMP%\\utf16le.md"' } },
        }).decision,
        'deny',
      );
    } finally {
      if (prevEnv === undefined) delete process.env.WF_GUARD_TEST_TMP;
      else process.env.WF_GUARD_TEST_TMP = prevEnv;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Deny / Allow: dynamic execution in test files (TS/JS/Python/Go)
  const vmImportSnippet = `import vm from '${'node'}:vm';\nvm.runInNewContext('1+1');`;
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/src/parser.test.ts', Content: vmImportSnippet },
      },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'edit_file',
        args: { Path: '/repo/tests/helper.spec.js', Replacement: 'const fn = new Function("return 1");' },
      },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/parser.test.js', Content: 'const fn = Function("return 1")();' },
      },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/parser.test.js', Content: 'globalThis.eval("1+1");' },
      },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/test_parser.py', Content: 'res = eval("1+1")' },
      },
    }).decision,
    'deny',
  );
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/parser.test.js', Content: '(0, eval)("1+1");' },
      },
    }).decision,
    'deny',
  );
  // Allow: normal docs mentioning prose
  assert.equal(
    evaluateHookPayload({
      toolCall: {
        name: 'edit_file',
        args: { Path: '/repo/docs/guide.md', Replacement: 'Never use node:vm or eval() in tests.' },
      },
    }).decision,
    'allow',
  );

  // Sync script refuses overlapping repo/localDir paths
  const overlapProc = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, 'scripts', 'sync-workflow.mjs'), '--to-local', '--local-dir', REPO_ROOT],
    { encoding: 'utf8' },
  );
  assert.notEqual(overlapProc.status, 0, 'sync-workflow.mjs must refuse syncing repo onto itself');

  // Real CLI stdin/stdout contract check
  const cliPayload = JSON.stringify({
    toolCall: { name: 'run_command', args: { commandLine: 'git push --force origin main' } },
  });
  const proc = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'guard-hook.mjs')], {
    input: cliPayload,
    encoding: 'utf8',
  });
  assert.equal(proc.status, 0, `guard-hook CLI exited with ${proc.status}: ${proc.stderr}`);
  const parsedOut = JSON.parse(proc.stdout);
  assert.equal(parsedOut.decision, 'deny');
});

console.log(`\nSummary: ${checksPassed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  process.exit(1);
}
