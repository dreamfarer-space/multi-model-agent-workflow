#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = process.env.PLUGIN_ROOT || path.resolve(__dirname, '..');

function loadPrivacyDenylist(overrideList) {
  if (Array.isArray(overrideList)) {
    return overrideList.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  const candidates = [
    process.env.WORKFLOW_PRIVACY_DENYLIST_PATH,
    process.env.PLUGIN_DATA ? path.join(process.env.PLUGIN_DATA, 'privacy-denylist.json') : null,
    path.join(PLUGIN_ROOT, '.privacy-denylist.json'),
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(parsed?.patterns)) {
        return parsed.patterns.filter((item) => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      // Ignore malformed optional local denylist to avoid breaking tool execution.
    }
  }
  return [];
}

function splitCommandSegments(commandLine) {
  const segments = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < commandLine.length; i += 1) {
    const ch = commandLine[i];
    const next = commandLine[i + 1];

    if (quote) {
      current += ch;
      if (ch === '\\' && quote === '"' && i + 1 < commandLine.length) {
        current += next;
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if ((ch === '&' && next === '&') || (ch === '|' && next === '|')) {
      if (current.trim()) segments.push(current.trim());
      current = '';
      i += 1;
      continue;
    }

    if (ch === '|' || ch === ';' || ch === '\n' || ch === '\r') {
      if (current.trim()) segments.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) segments.push(current.trim());
  return segments;
}

function extractFlagFilePaths(segment, flagPattern) {
  const paths = [];
  const regex = new RegExp(`(?:^|\\s)${flagPattern}(?:=|\\s+)(?:"([^"]+)"|'([^']+)'|(\\S+))`, 'g');
  let match;
  while ((match = regex.exec(segment)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3];
    if (raw && raw !== '-') paths.push(raw);
  }
  return paths;
}

function extractBodyFilePaths(segment) {
  return extractFlagFilePaths(segment, '(?:--body-file|-F)');
}

function extractCommitFilePaths(segment) {
  return extractFlagFilePaths(segment, '(?:--file|-F)');
}

function stripPathFlagValues(segment) {
  return segment.replace(
    /(?:^|\s)(?:-C|--body-file|--file|-F)(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)/g,
    ' ',
  );
}

function hasUtf8Bom(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(3);
    const bytesRead = fs.readSync(fd, buf, 0, 3, 0);
    return bytesRead === 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  } finally {
    fs.closeSync(fd);
  }
}

function isTestFilePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (/(?:^|\/)scripts\/(?:guard-hook|verify-plugin|sync-workflow)\.mjs$/i.test(normalized)) {
    return false;
  }
  return (
    /(?:^|\/)__tests__\//i.test(normalized) ||
    /(?:^|\/)tests?\/.*\.(?:[cm]?[jt]sx?|py|go)$/i.test(normalized) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(normalized) ||
    /(?:^|\/)test_[^/]+\.py$/i.test(normalized) ||
    /_test\.(?:py|go)$/i.test(normalized)
  );
}

function findDynamicEvalViolation(sourceText) {
  if (
    /\b(?:from\s+['"](?:node:)?vm['"]|require\(\s*['"](?:node:)?vm['"]\s*\)|import\(\s*['"](?:node:)?vm['"]\s*\))/.test(
      sourceText,
    )
  ) {
    return 'node:vm import/require is forbidden in test files; extract pure functions and import them directly.';
  }
  if (/\bnew\s+Function\s*\(/.test(sourceText) || /(?:^|[^\w.$])Function\s*\(/.test(sourceText)) {
    return 'Function(...) / new Function(...) is forbidden in test files; extract pure functions and test them directly.';
  }
  if (
    /(?<![.\w$])eval\s*\(/.test(sourceText) ||
    /\b(?:globalThis|window|self)\.eval\s*\(/.test(sourceText) ||
    /\(\s*0\s*,\s*eval\s*\)\s*\(/.test(sourceText)
  ) {
    return 'eval(...) is forbidden in test files; extract pure functions and test them directly.';
  }
  return null;
}

function findPrivacyMatch(text, denylist) {
  for (const pattern of denylist) {
    if (text.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

export function evaluateHookPayload(payload, options = {}) {
  const toolCall = payload?.toolCall ?? {};
  const toolName = String(toolCall.name ?? '').toLowerCase();
  const args = toolCall.args ?? {};
  const cwd = typeof payload?.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : process.cwd();
  const denylist = loadPrivacyDenylist(options.privacyDenylist);

  if (toolName === 'run_command') {
    const commandLine = String(args.CommandLine ?? args.commandLine ?? '');
    if (!commandLine.trim()) return { decision: 'allow' };

    const segments = splitCommandSegments(commandLine);
    const hasGitCommit = segments.some((seg) => /\bgit(?:\.exe)?\b[\s\S]*\bcommit\b/i.test(seg));
    const hasGh = segments.some((seg) => /\bgh(?:\.exe)?\b/i.test(seg));
    const hasGhPrOrIssue = segments.some((seg) => /\bgh(?:\.exe)?\b[\s\S]*\b(?:pr|issue)\b/i.test(seg));

    // Catch Co-Authored-By anywhere in a command containing `git commit` (inline, PowerShell here-string, bash heredoc, --trailer).
    if (hasGitCommit && /\bCo-Authored-By\s*[:=]/i.test(commandLine)) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: AI Co-Authored-By trailers are forbidden in git commits.',
      };
    }

    // Catch @codex review anywhere in a command invoking gh CLI (including piped stdin `... | gh pr comment -F -`).
    if (hasGh && /@codex\s+review\b/i.test(commandLine)) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: triggering @codex review on GitHub PRs/Issues is forbidden.',
      };
    }

    // Catch privacy leaks across piped stdin or inline args in gh pr/issue commands (ignoring path flags).
    if (hasGhPrOrIssue && denylist.length > 0 && findPrivacyMatch(stripPathFlagValues(commandLine), denylist)) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: sensitive local identifier detected in gh command.',
      };
    }

    for (const seg of segments) {
      // 1. Check git commit -F / --file message files and inline commit privacy leaks (excluding path flags).
      if (/\bgit(?:\.exe)?\b[\s\S]*\bcommit\b/i.test(seg)) {
        if (denylist.length > 0 && findPrivacyMatch(stripPathFlagValues(seg), denylist)) {
          return {
            decision: 'deny',
            reason: 'Blocked by workflow-guard: sensitive local identifier detected in git commit command.',
          };
        }
        for (const rawPath of extractCommitFilePaths(seg)) {
          const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
          if (!fs.existsSync(resolved)) continue;
          try {
            const msgText = fs.readFileSync(resolved, 'utf8');
            if (/\bCo-Authored-By\s*[:=]/i.test(msgText)) {
              return {
                decision: 'deny',
                reason: `Blocked by workflow-guard: AI Co-Authored-By trailer detected in commit message file "${rawPath}".`,
              };
            }
            if (denylist.length > 0 && findPrivacyMatch(msgText, denylist)) {
              return {
                decision: 'deny',
                reason: `Blocked by workflow-guard: sensitive local identifier detected in commit message file "${rawPath}".`,
              };
            }
          } catch {
            // Skip unreadable paths rather than blocking unrelated commands.
          }
        }
      }

      // 2. Block bare git push --force / -f or forced refspec (+branch); --force-with-lease alone is allowed.
      if (/\bgit(?:\.exe)?\b[\s\S]*\bpush\b/i.test(seg)) {
        if (/(?:\s|^)(?:--force|-f)(?=\s|$)/.test(seg)) {
          return {
            decision: 'deny',
            reason: 'Blocked by workflow-guard: bare git push --force/-f is forbidden. Use --force-with-lease instead.',
          };
        }
        if (/(?:\s|^)\+[^\s]+/.test(seg)) {
          return {
            decision: 'deny',
            reason: 'Blocked by workflow-guard: forced refspec (+ref) in git push is forbidden. Use --force-with-lease instead.',
          };
        }
      }

      // 3. Block UTF-8 BOM, @codex review, or privacy leaks inside gh pr/issue --body-file / -F files.
      if (/\bgh(?:\.exe)?\b[\s\S]*\b(?:pr|issue)\b/i.test(seg)) {
        for (const rawPath of extractBodyFilePaths(seg)) {
          const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
          if (!fs.existsSync(resolved)) continue;
          try {
            if (hasUtf8Bom(resolved)) {
              return {
                decision: 'deny',
                reason: `Blocked by workflow-guard: --body-file/-F "${rawPath}" starts with UTF-8 BOM (U+FEFF). Rewrite as BOM-free UTF-8.`,
              };
            }
            const bodyText = fs.readFileSync(resolved, 'utf8');
            if (/@codex\s+review\b/i.test(bodyText)) {
              return {
                decision: 'deny',
                reason: `Blocked by workflow-guard: triggering @codex review inside "${rawPath}" is forbidden.`,
              };
            }
            if (denylist.length > 0 && findPrivacyMatch(bodyText, denylist)) {
              return {
                decision: 'deny',
                reason: `Blocked by workflow-guard: sensitive local identifier detected in "${rawPath}".`,
              };
            }
          } catch {
            // Skip unreadable paths rather than blocking unrelated commands.
          }
        }
      }
    }

    return { decision: 'allow' };
  }

  if (toolName === 'write_file' || toolName === 'edit_file') {
    const targetPath = String(args.Path ?? args.path ?? '');
    const writtenText = String(args.Content ?? args.content ?? args.Replacement ?? args.replacement ?? '');
    if (targetPath && writtenText && isTestFilePath(targetPath)) {
      const violation = findDynamicEvalViolation(writtenText);
      if (violation) {
        return {
          decision: 'deny',
          reason: `Blocked by workflow-guard: ${violation}`,
        };
      }
    }
    return { decision: 'allow' };
  }

  return { decision: 'allow' };
}

function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  if (!raw.trim()) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  try {
    const payload = JSON.parse(raw);
    const result = evaluateHookPayload(payload);
    process.stdout.write(JSON.stringify(result));
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
