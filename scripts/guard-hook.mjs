#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = process.env.PLUGIN_ROOT || path.resolve(__dirname, '..');

const MAX_RECURSION_DEPTH = 4;
const CO_AUTHORED_BY_RE = /(?:^|[^A-Za-z0-9_-]|\\[nrt])Co-Authored-By\s*[:=]/i;
const GIT_COMMIT_MESSAGE_LONG_RE = /^--m(?:e(?:s(?:s(?:a(?:g(?:e)?)?)?)?)?)?$/;
const GIT_COMMIT_TRAILER_LONG_RE = /^--tr(?:a(?:i(?:l(?:e(?:r)?)?)?)?)?$/;
const GIT_COMMIT_FILE_LONG_RE = /^--fil(?:e)?$/;
const PS_COMMAND_FLAG_RE = /^-c(?:md|o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?$/i;
const PS_ENCODED_FLAG_RE = /^-e(?:c|n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?$/i;
const PS_VALUE_FLAGS = new Set([
  '-executionpolicy',
  '-ep',
  '-ex',
  '-inputformat',
  '-if',
  '-outputformat',
  '-of',
  '-windowstyle',
  '-w',
  '-version',
  '-v',
  '-workingdirectory',
  '-wd',
  '-configurationname',
  '-custompipename',
  '-settingsfile',
]);

const GIT_GLOBAL_VALUE_FLAGS = new Set([
  '-c',
  '-C',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--super-prefix',
  '--config-env',
  '--exec-path',
]);

const GIT_PUSH_VALUE_FLAGS = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const GH_GLOBAL_VALUE_FLAGS = new Set(['-R', '--repo', '--hostname']);

const GH_MUTATING_ACTIONS = {
  pr: new Set(['create', 'edit', 'comment', 'review', 'close', 'reopen', 'merge', 'ready']),
  issue: new Set(['create', 'edit', 'comment', 'close', 'reopen']),
  release: new Set(['create', 'edit']),
};

const GH_FILE_PAYLOAD_FLAGS = new Set(['--body-file', '-F', '--notes-file']);
const GH_TEXT_PAYLOAD_FLAGS = new Set(['--body', '-b', '--title', '-t', '--notes', '-n', '--subject']);
const FILE_READER_COMMANDS = new Set(['cat', 'type', 'get-content', 'gc']);
const PS_FILE_WRITER_COMMANDS = new Set(['out-file', 'set-content', 'sc', 'add-content', 'ac']);
const SHELL_CONTROL_PREFIXES = new Set(['&', '!', 'then', 'do', 'else', 'elif', 'exec', 'command', 'time', 'nohup']);
const POSIX_SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ash', 'ksh']);
const PS_SHELLS = new Set(['powershell', 'pwsh']);
const PS_EVAL_COMMANDS = new Set(['iex', 'invoke-expression']);
const XARGS_VALUE_FLAGS = new Set([
  '-n',
  '-L',
  '-P',
  '-I',
  '-d',
  '-E',
  '-s',
  '-a',
  '--max-args',
  '--max-procs',
  '--replace',
  '--delimiter',
  '--arg-file',
]);
const ENV_VALUE_FLAGS = new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string']);
const SUDO_VALUE_FLAGS = new Set(['-u', '--user', '-g', '--group', '-C', '-h', '-p', '-r', '-t', '-U']);
const TIMEOUT_VALUE_FLAGS = new Set(['-k', '--kill-after', '-s', '--signal']);
const NICE_VALUE_FLAGS = new Set(['-n', '--adjustment']);
const STDBUF_VALUE_FLAGS = new Set(['-i', '--input', '-o', '--output', '-e', '--error']);
const WSL_VALUE_FLAGS = new Set(['-d', '--distribution', '-u', '--user', '--cd', '--shell-type']);

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

function normalizePathKey(resolvedPath) {
  const normalized = path.resolve(resolvedPath).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isWindowsTrailingSlashQuote(text, slashIndex, quoteStartIndex) {
  if (text[slashIndex] !== '\\' || text[slashIndex + 1] !== '"') return false;
  const after = text[slashIndex + 2];
  if (after !== undefined && !/[\s;|&)\r\n]/.test(after)) return false;
  const inside = text.slice(quoteStartIndex + 1, slashIndex + 1);
  return /^[A-Za-z]:\\/.test(inside);
}

function findPowerShellHereStringEnd(text, startIdx, quoteChar) {
  const afterOpen = text[startIdx + 2] === '\r' && text[startIdx + 3] === '\n'
    ? startIdx + 4
    : text[startIdx + 2] === '\n'
      ? startIdx + 3
      : -1;
  if (afterOpen < 0) return -1;

  const closingMarker = `${quoteChar}@`;
  let lineStart = afterOpen;
  while (lineStart <= text.length) {
    const nl = text.indexOf('\n', lineStart);
    const lineEnd = nl === -1 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd).replace(/\r$/, '');
    if (line === closingMarker) {
      return lineEnd;
    }
    if (nl === -1) break;
    lineStart = nl + 1;
  }
  return -1;
}

function parseHeredocMarkerAt(text, idx) {
  if (text[idx] !== '<' || text[idx + 1] !== '<' || text[idx + 2] === '<') return null;
  const rest = text.slice(idx + 2);
  const m = rest.match(/^(-?)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_]+))/);
  if (!m) return null;
  return {
    stripTabs: m[1] === '-',
    delim: m[2] ?? m[3] ?? m[4],
    length: 2 + m[0].length,
  };
}

function consumeHeredocBody(text, startIdx, spec) {
  const bodyLines = [];
  let lineStart = startIdx;
  while (lineStart <= text.length) {
    const nl = text.indexOf('\n', lineStart);
    const lineEnd = nl === -1 ? text.length : nl;
    const rawLine = text.slice(lineStart, lineEnd).replace(/\r$/, '');
    const candidate = spec.stripTabs ? rawLine.replace(/^\t+/, '') : rawLine;
    if (candidate === spec.delim) {
      return {
        body: bodyLines.join('\n'),
        nextIdx: nl === -1 ? text.length : nl + 1,
      };
    }
    bodyLines.push(rawLine);
    if (nl === -1) break;
    lineStart = nl + 1;
  }
  return { body: bodyLines.join('\n'), nextIdx: text.length };
}

function isBlockOpenBrace(text, idx) {
  const prev = text[idx - 1];
  const next = text[idx + 1];
  // Never split mid-word braces such as `repos/{owner}/{repo}`, `${var}`, `@{u}`, or `{}`.
  if (prev !== undefined && !/[\s;)|&\r\n{]/.test(prev)) return false;
  if (next === '}') return false;
  if (next === undefined || /[\s\r\n]/.test(next)) return true;
  // Compact PowerShell block like `if ($true){git push -f}` contains whitespace before its closing `}`.
  const closeIdx = text.indexOf('}', idx + 1);
  if (closeIdx > idx + 1) {
    const inside = text.slice(idx + 1, closeIdx);
    return /\s/.test(inside);
  }
  return false;
}

function splitStatementsAndPipelines(commandLine) {
  const statements = [];
  let currentStages = [];
  let currentHeredocs = [];
  let pendingHeredocs = [];
  let current = '';
  let quote = null;
  let quoteStart = -1;
  let blockBraceDepth = 0;

  const flushStage = () => {
    const trimmed = current.trim();
    if (trimmed) currentStages.push(trimmed);
    current = '';
  };

  const flushStatement = () => {
    flushStage();
    if (currentStages.length > 0) {
      statements.push({ stages: currentStages, heredocs: currentHeredocs });
      currentStages = [];
      currentHeredocs = [];
    }
  };

  for (let i = 0; i < commandLine.length; i += 1) {
    const prev = commandLine[i - 1];
    const ch = commandLine[i];
    const next = commandLine[i + 1];

    if (quote) {
      current += ch;
      if (quote === '"' && ch === '\\' && next === '"' && !isWindowsTrailingSlashQuote(commandLine, i, quoteStart)) {
        current += next;
        i += 1;
      } else if (ch === quote) {
        quote = null;
        quoteStart = -1;
      }
      continue;
    }

    if (ch === '@' && (next === "'" || next === '"')) {
      const endIdx = findPowerShellHereStringEnd(commandLine, i, next);
      if (endIdx !== -1) {
        current += commandLine.slice(i, endIdx);
        i = endIdx - 1;
        continue;
      }
    }

    if (ch === '<' && next === '<' && commandLine[i + 2] === '<') {
      current += '<<<';
      i += 2;
      continue;
    }

    if (ch === '<' && next === '<') {
      const hd = parseHeredocMarkerAt(commandLine, i);
      if (hd) {
        pendingHeredocs.push(hd);
        current += commandLine.slice(i, i + hd.length);
        i += hd.length - 1;
        continue;
      }
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      quoteStart = i;
      current += ch;
      continue;
    }

    if ((ch === '&' && next === '&') || (ch === '|' && next === '|')) {
      flushStatement();
      i += 1;
      continue;
    }

    // Split on POSIX background `&` when not redirection (`>&`, `<&`, `&>`) and not leading PowerShell call `& cmd`.
    if (ch === '&' && prev !== '>' && prev !== '<' && next !== '>' && current.trim().length > 0) {
      flushStatement();
      continue;
    }

    if (ch === '{' && isBlockOpenBrace(commandLine, i)) {
      blockBraceDepth += 1;
      flushStatement();
      continue;
    }
    if (ch === '}' && blockBraceDepth > 0 && (next === undefined || /[\s;|&)\r\n}]/.test(next))) {
      const openDollarBrace = current.lastIndexOf('${');
      const closeBrace = current.lastIndexOf('}');
      if (!(openDollarBrace >= 0 && openDollarBrace > closeBrace)) {
        blockBraceDepth -= 1;
        flushStatement();
        continue;
      }
    }

    if (ch === '|') {
      flushStage();
      continue;
    }

    if (ch === ';') {
      flushStatement();
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && next === '\n') i += 1;
      if (pendingHeredocs.length > 0) {
        let cursor = i + 1;
        for (const spec of pendingHeredocs) {
          const consumed = consumeHeredocBody(commandLine, cursor, spec);
          currentHeredocs.push(consumed.body);
          cursor = consumed.nextIdx;
        }
        pendingHeredocs = [];
        flushStatement();
        i = cursor - 1;
        continue;
      }
      flushStatement();
      continue;
    }

    current += ch;
  }

  flushStatement();
  return statements;
}

function extractCommandSubstitutions(stage) {
  const subs = [];
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < stage.length; i += 1) {
    const ch = stage[i];
    const next = stage[i + 1];

    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble && ch === '\\' && i + 1 < stage.length) {
      i += 1;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = true;
      continue;
    }

    if (ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (ch === '$' && next === '(') {
      let depth = 1;
      let j = i + 2;
      let subSingle = false;
      let subDouble = false;
      while (j < stage.length && depth > 0) {
        const c = stage[j];
        if (subSingle) {
          if (c === "'") subSingle = false;
        } else if (subDouble) {
          if (c === '\\' && j + 1 < stage.length) j += 1;
          else if (c === '"') subDouble = false;
        } else if (c === "'") {
          subSingle = true;
        } else if (c === '"') {
          subDouble = true;
        } else if (c === '(') {
          depth += 1;
        } else if (c === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
        j += 1;
      }
      if (depth === 0) {
        const inner = stage.slice(i + 2, j).trim();
        if (inner) subs.push(inner);
        i = j;
      }
      continue;
    }

    if (ch === '`' && !inSingle) {
      const end = stage.indexOf('`', i + 1);
      if (end > i + 1) {
        const inner = stage.slice(i + 1, end).trim();
        if (/^[A-Za-z0-9_./\\-]+\s+\S/.test(inner)) {
          subs.push(inner);
          i = end;
        }
      }
    }
  }

  return subs;
}

function tokenizeStage(stage) {
  const tokens = [];
  let current = '';
  let inToken = false;
  let quote = null;
  let quoteStart = -1;
  let hadQuote = false;

  const flush = () => {
    if (inToken) {
      tokens.push({ value: current, quoted: hadQuote });
      current = '';
      inToken = false;
      hadQuote = false;
    }
  };

  for (let i = 0; i < stage.length; i += 1) {
    const ch = stage[i];
    const next = stage[i + 1];

    if (quote) {
      if (quote === '"' && ch === '\\' && next === '"' && !isWindowsTrailingSlashQuote(stage, i, quoteStart)) {
        current += '"';
        i += 1;
      } else if (ch === quote) {
        quote = null;
        quoteStart = -1;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      quoteStart = i;
      inToken = true;
      hadQuote = true;
      continue;
    }

    if (/\s/.test(ch)) {
      flush();
      continue;
    }

    if (ch === '>' || ch === '<') {
      if (inToken && /^\d+$/.test(current)) {
        current += ch;
        if (ch === '<' && next === '<' && stage[i + 2] === '<') {
          current += '<<';
          i += 2;
        } else if (next === ch || next === '&') {
          current += next;
          i += 1;
        }
        continue;
      }
      flush();
      let op = ch;
      if (ch === '<' && next === '<' && stage[i + 2] === '<') {
        op = '<<<';
        i += 2;
      } else if (next === ch || next === '&') {
        op += next;
        i += 1;
      }
      tokens.push({ value: op, quoted: false });
      continue;
    }

    current += ch;
    inToken = true;
  }

  flush();
  return tokens;
}

function parseRedirections(tokens) {
  const args = [];
  const inputFiles = [];
  const outputFiles = [];
  const hereStrings = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (!tok.quoted && /^\d*>&\d+$/.test(tok.value)) {
      continue;
    }
    if (!tok.quoted && /^(?:\d*(?:<<<|>>?|<<?-?|>&|<&)|&>>?)$/.test(tok.value)) {
      const target = tokens[i + 1]?.value;
      if (target !== undefined) {
        if (/^(?:0?<<<)$/.test(tok.value)) {
          hereStrings.push(target);
        } else if (/^(?:0?<)$/.test(tok.value)) {
          inputFiles.push(target);
        } else if (/^(?:1?>>?|&>>?)$/.test(tok.value)) {
          outputFiles.push(target);
        }
        i += 1;
      }
      continue;
    }
    args.push(tok);
  }

  return { args, inputFiles, outputFiles, hereStrings };
}

function stripOuterSubshellParens(tokens) {
  if (tokens.length === 0) return tokens;
  const result = tokens.map((t) => ({ ...t }));
  while (result.length > 0 && !result[0].quoted && result[0].value.startsWith('(')) {
    result[0].value = result[0].value.slice(1);
    if (result[0].value === '') result.shift();
  }
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (!last.quoted && last.value.endsWith(')') && !last.value.includes('(')) {
      last.value = last.value.slice(0, -1);
      if (last.value === '') result.pop();
      else break;
    } else {
      break;
    }
  }
  return result;
}

function normalizeCommandName(rawCmd) {
  const base = path.basename(rawCmd.replace(/\\/g, '/')).toLowerCase();
  return base.replace(/\.(?:exe|cmd|bat)$/i, '');
}

function lookupEnvVar(name) {
  if (!name) return undefined;
  if (Object.prototype.hasOwnProperty.call(process.env, name)) {
    return process.env[name];
  }
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(process.env)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function resolveShellVars(raw, varMap) {
  if (!raw) return raw;
  const exact = varMap.get(raw) ?? varMap.get(raw.toLowerCase());
  if (exact !== undefined) return exact;

  let expanded = raw.replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}|\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (full, a, b) => {
    const found = lookupEnvVar(a ?? b);
    return found !== undefined ? found : full;
  });

  expanded = expanded.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (full, name) => {
    const found = lookupEnvVar(name);
    return found !== undefined ? found : full;
  });

  expanded = expanded.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (full, braced, plain) => {
    const name = braced ?? plain;
    const found =
      varMap.get(`$${name}`) ??
      varMap.get(`\${${name}}`) ??
      varMap.get(`$${name.toLowerCase()}`) ??
      varMap.get(`\${${name.toLowerCase()}}`) ??
      lookupEnvVar(name);
    return found !== undefined ? found : full;
  });

  return expanded;
}

function skipWrapperFlags(tokens, startIdx, valueFlags, options = {}) {
  let idx = startIdx;
  while (idx < tokens.length) {
    const val = tokens[idx].value;
    if (val === '--') {
      idx += 1;
      break;
    }
    if (options.stopOnExecFlag && (val === '-e' || val === '--exec')) {
      idx += 1;
      break;
    }
    if (valueFlags.has(val)) {
      idx += 2;
      continue;
    }
    if (val.startsWith('-')) {
      idx += 1;
      continue;
    }
    if (options.skipEnvAssigns && /^[A-Za-z_][A-Za-z0-9_]*=/.test(val)) {
      idx += 1;
      continue;
    }
    break;
  }
  if (options.skipDuration && idx < tokens.length) {
    idx += 1;
  }
  return idx;
}

function unwrapCommand(stage, varMap = new Map()) {
  const { args: rawTokens, inputFiles, outputFiles, hereStrings } = parseRedirections(tokenizeStage(stage));
  const tokens = stripOuterSubshellParens(rawTokens);

  let idx = 0;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    const resolvedVal = resolveShellVars(tok.value, varMap);
    if (!tok.quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok.value)) {
      idx += 1;
      continue;
    }
    const norm = normalizeCommandName(resolvedVal);
    if (SHELL_CONTROL_PREFIXES.has(norm)) {
      idx += 1;
      continue;
    }
    if (norm === 'env') {
      idx = skipWrapperFlags(tokens, idx + 1, ENV_VALUE_FLAGS, { skipEnvAssigns: true });
      continue;
    }
    if (norm === 'sudo') {
      idx = skipWrapperFlags(tokens, idx + 1, SUDO_VALUE_FLAGS);
      continue;
    }
    if (norm === 'xargs') {
      idx = skipWrapperFlags(tokens, idx + 1, XARGS_VALUE_FLAGS);
      continue;
    }
    if (norm === 'timeout') {
      idx = skipWrapperFlags(tokens, idx + 1, TIMEOUT_VALUE_FLAGS, { skipDuration: true });
      continue;
    }
    if (norm === 'nice') {
      idx = skipWrapperFlags(tokens, idx + 1, NICE_VALUE_FLAGS);
      continue;
    }
    if (norm === 'stdbuf') {
      idx = skipWrapperFlags(tokens, idx + 1, STDBUF_VALUE_FLAGS);
      continue;
    }
    if (norm === 'wsl') {
      idx = skipWrapperFlags(tokens, idx + 1, WSL_VALUE_FLAGS, { stopOnExecFlag: true });
      continue;
    }
    break;
  }

  if (idx >= tokens.length) return { cmd: null, rawCmd: '', args: [], inputFiles, outputFiles, hereStrings };
  const resolvedCmd = resolveShellVars(tokens[idx].value, varMap);
  return {
    cmd: normalizeCommandName(resolvedCmd),
    rawCmd: resolvedCmd,
    args: tokens.slice(idx + 1),
    inputFiles,
    outputFiles,
    hereStrings,
  };
}

function recordShellAssignment(stage, varMap) {
  const setVar = (name, value) => {
    const bare = name.replace(/^\$/, '');
    varMap.set(`$${bare}`, value);
    varMap.set(`\${${bare}}`, value);
    varMap.set(`$${bare.toLowerCase()}`, value);
    varMap.set(`\${${bare.toLowerCase()}}`, value);
  };

  const psHere = stage.match(/^\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s*=\s*@(['"])\r?\n([\s\S]*?)\r?\n\2@\s*$/);
  if (psHere) {
    setVar(psHere[1], psHere[3]);
    return true;
  }

  const psAssign = stage.match(/^\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s;#|&]+))\s*$/);
  if (psAssign) {
    const rawVal = psAssign[2] ?? psAssign[3] ?? psAssign[4] ?? '';
    const val = psAssign[2] !== undefined ? psAssign[2] : resolveShellVars(rawVal, varMap);
    setVar(psAssign[1], val);
    return true;
  }

  const shAssign = stage.match(
    /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s;#|&]+))\s*$/,
  );
  if (shAssign) {
    const rawVal = shAssign[2] ?? shAssign[3] ?? shAssign[4] ?? '';
    const val = shAssign[2] !== undefined ? shAssign[2] : resolveShellVars(rawVal, varMap);
    setVar(shAssign[1], val);
    return true;
  }

  return false;
}

function recordWrittenFiles(parsed, cwd, varMap, writtenFiles) {
  for (const outPath of parsed.outputFiles) {
    const resolvedRaw = resolveShellVars(outPath, varMap);
    if (!resolvedRaw || /^(?:\/dev\/null|nul)$/i.test(resolvedRaw)) continue;
    const abs = path.isAbsolute(resolvedRaw) ? resolvedRaw : path.resolve(cwd, resolvedRaw);
    writtenFiles.add(normalizePathKey(abs));
  }

  if (parsed.cmd && PS_FILE_WRITER_COMMANDS.has(parsed.cmd)) {
    let targetPath = null;
    for (let i = 0; i < parsed.args.length; i += 1) {
      const val = parsed.args[i].value;
      const lower = val.toLowerCase();
      if (lower === '-filepath' || lower === '-path' || lower === '-literalpath') {
        targetPath = parsed.args[i + 1]?.value ?? null;
        break;
      }
      if (lower.startsWith('-filepath:') || lower.startsWith('-path:') || lower.startsWith('-literalpath:')) {
        targetPath = val.slice(val.indexOf(':') + 1);
        break;
      }
      if (val.startsWith('-')) {
        if (lower === '-value' || lower === '-encoding' || lower === '-width') i += 1;
        continue;
      }
      if (!targetPath) {
        targetPath = val;
        break;
      }
    }
    if (targetPath) {
      const resolvedRaw = resolveShellVars(targetPath, varMap);
      if (resolvedRaw) {
        const abs = path.isAbsolute(resolvedRaw) ? resolvedRaw : path.resolve(cwd, resolvedRaw);
        writtenFiles.add(normalizePathKey(abs));
      }
    }
  }
}

function extractNestedShellScript(parsed, varMap, stages = [], stageIdx = 0) {
  if (!parsed.cmd) return null;

  if (POSIX_SHELLS.has(parsed.cmd)) {
    for (let i = 0; i < parsed.args.length; i += 1) {
      const val = parsed.args[i].value;
      if (val === '-c' || (/^-[a-zA-Z]+$/.test(val) && val.includes('c'))) {
        const raw = parsed.args[i + 1]?.value ?? null;
        return raw ? resolveShellVars(raw, varMap) : null;
      }
    }
    return null;
  }

  if (parsed.cmd === 'cmd') {
    for (let i = 0; i < parsed.args.length; i += 1) {
      const lower = parsed.args[i].value.toLowerCase();
      if (lower === '/c' || lower === '/k') {
        const rest = parsed.args.slice(i + 1);
        if (rest.length === 0) return null;
        const raw = rest.length === 1 ? rest[0].value : rest.map((t) => t.value).join(' ');
        return resolveShellVars(raw, varMap);
      }
    }
    return null;
  }

  if (PS_SHELLS.has(parsed.cmd)) {
    for (let i = 0; i < parsed.args.length; i += 1) {
      const val = parsed.args[i].value;
      const lower = val.toLowerCase();
      if (PS_COMMAND_FLAG_RE.test(lower)) {
        const rest = parsed.args.slice(i + 1);
        if (rest.length === 0) return null;
        const raw = rest.length === 1 ? rest[0].value : rest.map((t) => t.value).join(' ');
        return resolveShellVars(raw, varMap);
      }
      if (PS_ENCODED_FLAG_RE.test(lower)) {
        const b64 = parsed.args[i + 1]?.value;
        if (!b64) return null;
        try {
          return Buffer.from(b64, 'base64').toString('utf16le');
        } catch {
          return null;
        }
      }
      if (lower === '-file' || lower === '-f') {
        return null;
      }
      if (PS_VALUE_FLAGS.has(lower)) {
        i += 1;
        continue;
      }
      if (val.startsWith('-')) {
        continue;
      }
      // Windows PowerShell executes positional arguments as a command when no -File flag is present.
      if (parsed.cmd === 'powershell') {
        const rest = parsed.args.slice(i);
        const raw = rest.length === 1 ? rest[0].value : rest.map((t) => t.value).join(' ');
        return resolveShellVars(raw, varMap);
      }
      return null;
    }
    return null;
  }

  if (parsed.cmd === 'eval' && parsed.args.length > 0) {
    const raw = parsed.args.length === 1 ? parsed.args[0].value : parsed.args.map((t) => t.value).join(' ');
    return resolveShellVars(raw, varMap);
  }

  if (PS_EVAL_COMMANDS.has(parsed.cmd)) {
    let startIdx = 0;
    if (parsed.args.length > 0 && PS_COMMAND_FLAG_RE.test(parsed.args[0].value.toLowerCase())) {
      startIdx = 1;
    }
    const rest = parsed.args.slice(startIdx);
    if (rest.length > 0) {
      const raw = rest.length === 1 ? rest[0].value : rest.map((t) => t.value).join(' ');
      return resolveShellVars(raw, varMap);
    }
    if (stageIdx > 0) {
      const prevStage = stages[stageIdx - 1];
      const prevTokens = tokenizeStage(prevStage);
      if (prevTokens.length === 1) {
        return resolveShellVars(prevTokens[0].value, varMap);
      }
      const prevParsed = unwrapCommand(prevStage, varMap);
      if (prevParsed.cmd && /^(?:echo|write-output|write)$/.test(prevParsed.cmd) && prevParsed.args.length > 0) {
        return resolveShellVars(prevParsed.args.map((t) => t.value).join(' '), varMap);
      }
    }
    return null;
  }

  return null;
}

function hasUnexpectedControlChars(text) {
  // Reject ASCII control characters other than HT (\x09), LF (\x0A), and CR (\x0D).
  return /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text);
}

function findPrivacyMatch(text, denylist) {
  for (const pattern of denylist) {
    if (text.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

function inspectFileBuffer(resolvedPath, displayPath, denylist, checks, writtenFiles) {
  if (writtenFiles && writtenFiles.has(normalizePathKey(resolvedPath))) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: "${displayPath}" was written via shell redirection/Out-File/Set-Content in the same command, which risks UTF-16/BOM corruption or bypasses payload inspection. Write a BOM-free UTF-8 file first via write_file or Node fs.writeFileSync, then invoke git/gh.`,
    };
  }
  if (!fs.existsSync(resolvedPath)) return null;
  let buf;
  try {
    buf = fs.readFileSync(resolvedPath);
  } catch {
    return null;
  }

  if (buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff))) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: "${displayPath}" is UTF-16 encoded (BOM detected), which causes garbled text. Rewrite as BOM-free UTF-8 without PowerShell '>' redirection.`,
    };
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: "${displayPath}" starts with UTF-8 BOM (U+FEFF). Rewrite as BOM-free UTF-8.`,
    };
  }
  if (buf.includes(0x00)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: "${displayPath}" contains NUL bytes (likely UTF-16 or binary data). Rewrite as BOM-free UTF-8.`,
    };
  }

  const text = buf.toString('utf8');
  if (hasUnexpectedControlChars(text)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: "${displayPath}" contains unexpected ASCII control characters (e.g. from PowerShell double-quoted here-string backtick escaping). Rewrite as clean UTF-8.`,
    };
  }
  if (checks.coAuthoredBy && CO_AUTHORED_BY_RE.test(text)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: AI Co-Authored-By trailer detected in commit message file "${displayPath}".`,
    };
  }
  if (checks.codexReview && /@codex\s+review\b/i.test(text)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: triggering @codex review inside "${displayPath}" is forbidden.`,
    };
  }
  if (denylist.length > 0 && findPrivacyMatch(text, denylist)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: sensitive local identifier detected in "${displayPath}".`,
    };
  }
  return null;
}

function inspectInlineText(text, denylist, checks, contextLabel) {
  if (!text) return null;
  if (checks.coAuthoredBy && CO_AUTHORED_BY_RE.test(text)) {
    return {
      decision: 'deny',
      reason: 'Blocked by workflow-guard: AI Co-Authored-By trailers are forbidden in git commits.',
    };
  }
  if (checks.codexReview && /@codex\s+review\b/i.test(text)) {
    return {
      decision: 'deny',
      reason: 'Blocked by workflow-guard: triggering @codex review on GitHub PRs/Issues is forbidden.',
    };
  }
  if (checks.controlChars && hasUnexpectedControlChars(text)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: unexpected ASCII control characters detected in ${contextLabel}. Rewrite cleanly as UTF-8.`,
    };
  }
  if (denylist.length > 0 && findPrivacyMatch(text, denylist)) {
    return {
      decision: 'deny',
      reason: `Blocked by workflow-guard: sensitive local identifier detected in ${contextLabel}.`,
    };
  }
  return null;
}

function parseGitSubcommand(args, varMap = new Map()) {
  let i = 0;
  while (i < args.length) {
    const val = resolveShellVars(args[i].value, varMap);
    if (GIT_GLOBAL_VALUE_FLAGS.has(val)) {
      i += 2;
      continue;
    }
    if (
      val.startsWith('--git-dir=') ||
      val.startsWith('--work-tree=') ||
      val.startsWith('--namespace=') ||
      val.startsWith('--super-prefix=') ||
      val.startsWith('--config-env=') ||
      val.startsWith('--exec-path=')
    ) {
      i += 1;
      continue;
    }
    if (val.startsWith('-')) {
      i += 1;
      continue;
    }
    return { subcmd: val.toLowerCase(), subArgs: args.slice(i + 1) };
  }
  return { subcmd: null, subArgs: [] };
}

function inspectGitPush(subArgs, varMap = new Map()) {
  let endOfFlags = false;
  for (let i = 0; i < subArgs.length; i += 1) {
    const val = resolveShellVars(subArgs[i].value, varMap);
    if (!endOfFlags) {
      if (val === '--') {
        endOfFlags = true;
        continue;
      }
      if (
        val === '--force' ||
        val === '-f' ||
        (/^-[a-zA-Z]{2,}$/.test(val) && val.includes('f') && !val.startsWith('-o'))
      ) {
        return {
          decision: 'deny',
          reason: 'Blocked by workflow-guard: bare git push --force/-f is forbidden. Use --force-with-lease instead.',
        };
      }
      if (GIT_PUSH_VALUE_FLAGS.has(val)) {
        i += 1;
        continue;
      }
      if (val.startsWith('-')) {
        continue;
      }
    }
    if (val.startsWith('+') && val.length > 1) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: forced refspec (+ref) in git push is forbidden. Use --force-with-lease instead.',
      };
    }
  }
  return null;
}

function inspectStdinSources(
  stages,
  targetStageIdx,
  inputFiles,
  hereStrings,
  heredocBodies,
  cwd,
  varMap,
  denylist,
  checks,
  writtenFiles,
  contextLabel,
) {
  for (const inPath of inputFiles) {
    const rawPath = resolveShellVars(inPath, varMap);
    const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
    const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
    if (denial) return denial;
  }

  for (const hs of hereStrings) {
    const expanded = resolveShellVars(hs, varMap);
    const denial = inspectInlineText(expanded, denylist, checks, contextLabel);
    if (denial) return denial;
  }

  for (let i = 0; i < targetStageIdx; i += 1) {
    const stageStr = stages[i];
    const parsed = unwrapCommand(stageStr, varMap);
    if (parsed.cmd && FILE_READER_COMMANDS.has(parsed.cmd)) {
      for (const arg of parsed.args) {
        if (arg.value.startsWith('-')) continue;
        const rawPath = resolveShellVars(arg.value, varMap);
        const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
        const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
        if (denial) return denial;
      }
      continue;
    }
    const expanded = resolveShellVars(stageStr, varMap);
    const denial = inspectInlineText(expanded, denylist, checks, contextLabel);
    if (denial) return denial;
  }

  for (const body of heredocBodies) {
    const hdDenial = inspectInlineText(body, denylist, checks, contextLabel);
    if (hdDenial) return hdDenial;
  }

  return null;
}

function extractCombinedShortFlagValue(val, targetChar, nextTokenValue) {
  if (!val.startsWith('-') || val.startsWith('--') || val.length < 2) return null;
  const idx = val.indexOf(targetChar, 1);
  if (idx < 0) return null;
  // Characters before targetChar must be ASCII option letters (e.g. -am, -sm, -aF).
  const prefix = val.slice(1, idx);
  if (!/^[a-zA-Z]*$/.test(prefix)) return null;
  const attached = val.slice(idx + 1);
  if (attached.length > 0) {
    return { value: attached, consumedNext: false };
  }
  if (nextTokenValue !== undefined) {
    return { value: nextTokenValue, consumedNext: true };
  }
  return null;
}

function inspectGitCommit(
  subArgs,
  stages,
  stageIdx,
  inputFiles,
  hereStrings,
  heredocBodies,
  cwd,
  varMap,
  denylist,
  writtenFiles,
) {
  const checks = { coAuthoredBy: true, codexReview: false, controlChars: false };
  let readsStdin = false;

  for (let i = 0; i < subArgs.length; i += 1) {
    const val = subArgs[i].value;
    if (val === '--') break;

    const eqIdx = val.indexOf('=');
    const flagPart = eqIdx > 0 ? val.slice(0, eqIdx) : val;
    const inlinePart = eqIdx > 0 ? val.slice(eqIdx + 1) : null;

    if (
      GIT_COMMIT_MESSAGE_LONG_RE.test(flagPart) ||
      GIT_COMMIT_TRAILER_LONG_RE.test(flagPart) ||
      (eqIdx > 0 && flagPart === '-m')
    ) {
      const rawArg = inlinePart !== null ? inlinePart : subArgs[i + 1]?.value;
      if (inlinePart === null && rawArg !== undefined) i += 1;
      if (rawArg !== undefined) {
        const resolved = resolveShellVars(rawArg, varMap);
        const denial = inspectInlineText(resolved, denylist, checks, 'git commit command');
        if (denial) return denial;
      }
      continue;
    }

    if (GIT_COMMIT_FILE_LONG_RE.test(flagPart) || (eqIdx > 0 && flagPart === '-F')) {
      const rawArg = inlinePart !== null ? inlinePart : subArgs[i + 1]?.value;
      if (inlinePart === null && rawArg !== undefined) i += 1;
      if (rawArg !== undefined) {
        const rawPath = resolveShellVars(rawArg, varMap);
        if (rawPath === '-') {
          readsStdin = true;
        } else {
          const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
          const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
          if (denial) return denial;
        }
      }
      continue;
    }

    const shortMsg = extractCombinedShortFlagValue(val, 'm', subArgs[i + 1]?.value);
    if (shortMsg) {
      if (shortMsg.consumedNext) i += 1;
      const resolved = resolveShellVars(shortMsg.value, varMap);
      const denial = inspectInlineText(resolved, denylist, checks, 'git commit command');
      if (denial) return denial;
      continue;
    }

    const shortFile = extractCombinedShortFlagValue(val, 'F', subArgs[i + 1]?.value);
    if (shortFile) {
      if (shortFile.consumedNext) i += 1;
      const rawPath = resolveShellVars(shortFile.value, varMap);
      if (rawPath === '-') {
        readsStdin = true;
      } else {
        const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
        const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
        if (denial) return denial;
      }
    }
  }

  if (readsStdin || stageIdx > 0 || inputFiles.length > 0 || hereStrings.length > 0 || heredocBodies.length > 0) {
    const denial = inspectStdinSources(
      stages,
      stageIdx,
      inputFiles,
      hereStrings,
      heredocBodies,
      cwd,
      varMap,
      denylist,
      checks,
      writtenFiles,
      'git commit command',
    );
    if (denial) return denial;
  }

  return null;
}

function extractFlagArg(rest, index, exactFlags, shortChar) {
  const val = rest[index].value;
  const eqIdx = val.indexOf('=');
  const flag = eqIdx > 0 ? val.slice(0, eqIdx) : val;
  const inlineVal = eqIdx > 0 ? val.slice(eqIdx + 1) : null;

  if (exactFlags.has(flag)) {
    const arg = inlineVal !== null ? inlineVal : rest[index + 1]?.value;
    return { value: arg, advance: inlineVal === null && arg !== undefined ? 1 : 0 };
  }

  if (shortChar && val.startsWith(`-${shortChar}`) && !val.startsWith('--') && val.length > 2) {
    return { value: val.slice(2), advance: 0 };
  }

  return null;
}

function inspectGhCommand(
  args,
  stages,
  stageIdx,
  inputFiles,
  hereStrings,
  commandLine,
  heredocBodies,
  cwd,
  varMap,
  denylist,
  writtenFiles,
) {
  const checks = { coAuthoredBy: false, codexReview: true, controlChars: true };
  let i = 0;
  while (i < args.length) {
    const val = args[i].value;
    if (GH_GLOBAL_VALUE_FLAGS.has(val)) {
      i += 2;
      continue;
    }
    if (val.startsWith('--repo=') || val.startsWith('--hostname=') || val.startsWith('-R=')) {
      i += 1;
      continue;
    }
    if (val.startsWith('-')) {
      i += 1;
      continue;
    }
    break;
  }
  if (i >= args.length) return null;

  const group = args[i].value.toLowerCase();
  const rest = args.slice(i + 1);

  if (group === 'pr' || group === 'issue' || group === 'release') {
    let action = null;
    for (let j = 0; j < rest.length; j += 1) {
      const val = rest[j].value;
      if (GH_GLOBAL_VALUE_FLAGS.has(val)) {
        j += 1;
        continue;
      }
      if (val.startsWith('-')) continue;
      action = val.toLowerCase();
      break;
    }
    if (!action || !GH_MUTATING_ACTIONS[group].has(action)) {
      return null;
    }

    if (/@codex\s+review\b/i.test(commandLine)) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: triggering @codex review on GitHub PRs/Issues is forbidden.',
      };
    }

    let readsStdin = false;
    for (let j = 0; j < rest.length; j += 1) {
      const fileMatch = extractFlagArg(rest, j, GH_FILE_PAYLOAD_FLAGS, 'F');
      if (fileMatch) {
        j += fileMatch.advance;
        if (!fileMatch.value) continue;
        const rawPath = resolveShellVars(fileMatch.value, varMap);
        if (rawPath === '-') {
          readsStdin = true;
        } else {
          const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
          const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
          if (denial) return denial;
        }
        continue;
      }

      const textMatch =
        extractFlagArg(rest, j, GH_TEXT_PAYLOAD_FLAGS, 'b') ??
        extractFlagArg(rest, j, new Set(), 't') ??
        extractFlagArg(rest, j, new Set(), 'n');
      if (textMatch) {
        j += textMatch.advance;
        if (!textMatch.value) continue;
        const resolved = resolveShellVars(textMatch.value, varMap);
        const denial = inspectInlineText(resolved, denylist, checks, 'gh command');
        if (denial) return denial;
      }
    }

    if (readsStdin || stageIdx > 0 || inputFiles.length > 0 || hereStrings.length > 0 || heredocBodies.length > 0) {
      const denial = inspectStdinSources(
        stages,
        stageIdx,
        inputFiles,
        hereStrings,
        heredocBodies,
        cwd,
        varMap,
        denylist,
        checks,
        writtenFiles,
        'gh command',
      );
      if (denial) return denial;
    }
    return null;
  }

  if (group === 'api') {
    let isMutating = false;
    let readsStdin = false;
    const filePayloads = [];
    const textPayloads = [];

    for (let j = 0; j < rest.length; j += 1) {
      const methodMatch = extractFlagArg(rest, j, new Set(['-X', '--method']), 'X');
      if (methodMatch) {
        j += methodMatch.advance;
        if (methodMatch.value && /^(?:POST|PATCH|PUT|DELETE)$/i.test(methodMatch.value)) {
          isMutating = true;
        }
        continue;
      }

      const inputMatch = extractFlagArg(rest, j, new Set(['--input']), null);
      if (inputMatch) {
        isMutating = true;
        j += inputMatch.advance;
        if (!inputMatch.value) continue;
        const rawPath = resolveShellVars(inputMatch.value, varMap);
        if (rawPath === '-') readsStdin = true;
        else filePayloads.push(rawPath);
        continue;
      }

      const rawFieldMatch = extractFlagArg(rest, j, new Set(['-f', '--raw-field']), 'f');
      if (rawFieldMatch) {
        isMutating = true;
        j += rawFieldMatch.advance;
        if (!rawFieldMatch.value) continue;
        const expandedRaw = resolveShellVars(rawFieldMatch.value, varMap);
        const sep = expandedRaw.indexOf('=');
        const fieldVal = sep >= 0 ? expandedRaw.slice(sep + 1) : expandedRaw;
        textPayloads.push(fieldVal);
        continue;
      }

      const fieldMatch = extractFlagArg(rest, j, new Set(['-F', '--field']), 'F');
      if (fieldMatch) {
        isMutating = true;
        j += fieldMatch.advance;
        if (!fieldMatch.value) continue;
        const expandedField = resolveShellVars(fieldMatch.value, varMap);
        const sep = expandedField.indexOf('=');
        const fieldVal = sep >= 0 ? expandedField.slice(sep + 1) : expandedField;
        if (fieldVal.startsWith('@')) {
          const rawPath = fieldVal.slice(1);
          if (rawPath === '-') readsStdin = true;
          else filePayloads.push(rawPath);
        } else {
          textPayloads.push(fieldVal);
        }
      }
    }

    if (!isMutating) return null;

    if (/@codex\s+review\b/i.test(commandLine)) {
      return {
        decision: 'deny',
        reason: 'Blocked by workflow-guard: triggering @codex review on GitHub PRs/Issues is forbidden.',
      };
    }

    for (const rawPath of filePayloads) {
      const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
      const denial = inspectFileBuffer(resolved, rawPath, denylist, checks, writtenFiles);
      if (denial) return denial;
    }
    for (const text of textPayloads) {
      const denial = inspectInlineText(text, denylist, checks, 'gh api command');
      if (denial) return denial;
    }
    if (readsStdin || stageIdx > 0 || inputFiles.length > 0 || hereStrings.length > 0 || heredocBodies.length > 0) {
      const denial = inspectStdinSources(
        stages,
        stageIdx,
        inputFiles,
        hereStrings,
        heredocBodies,
        cwd,
        varMap,
        denylist,
        checks,
        writtenFiles,
        'gh api command',
      );
      if (denial) return denial;
    }
  }

  return null;
}

function inspectCommandLine(commandLine, cwd, denylist, outerVarMap, writtenFiles, depth = 0) {
  if (!commandLine.trim() || depth > MAX_RECURSION_DEPTH) return null;

  const statements = splitStatementsAndPipelines(commandLine);
  const varMap = new Map(outerVarMap);

  for (const { stages, heredocs } of statements) {
    for (let stageIdx = 0; stageIdx < stages.length; stageIdx += 1) {
      const stage = stages[stageIdx];

      // Always inspect nested `$(...)` / backtick command substitutions, even inside assignments.
      for (const subCmd of extractCommandSubstitutions(stage)) {
        const subDenial = inspectCommandLine(subCmd, cwd, denylist, varMap, writtenFiles, depth + 1);
        if (subDenial) return subDenial;
      }

      if (stages.length === 1 && recordShellAssignment(stage, varMap)) {
        continue;
      }

      const parsed = unwrapCommand(stage, varMap);

      if (parsed.cmd === 'git') {
        const { subcmd, subArgs } = parseGitSubcommand(parsed.args, varMap);
        if (subcmd === 'push') {
          const denial = inspectGitPush(subArgs, varMap);
          if (denial) return denial;
        } else if (subcmd === 'commit') {
          const denial = inspectGitCommit(
            subArgs,
            stages,
            stageIdx,
            parsed.inputFiles,
            parsed.hereStrings,
            heredocs,
            cwd,
            varMap,
            denylist,
            writtenFiles,
          );
          if (denial) return denial;
        }
      } else if (parsed.cmd === 'gh') {
        const denial = inspectGhCommand(
          parsed.args,
          stages,
          stageIdx,
          parsed.inputFiles,
          parsed.hereStrings,
          commandLine,
          heredocs,
          cwd,
          varMap,
          denylist,
          writtenFiles,
        );
        if (denial) return denial;
      } else {
        const nestedScript = extractNestedShellScript(parsed, varMap, stages, stageIdx);
        if (nestedScript) {
          const nestedDenial = inspectCommandLine(nestedScript, cwd, denylist, varMap, writtenFiles, depth + 1);
          if (nestedDenial) return nestedDenial;
        }
      }

      recordWrittenFiles(parsed, cwd, varMap, writtenFiles);
    }
  }

  return null;
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

export function evaluateHookPayload(payload, options = {}) {
  const toolCall = payload?.toolCall ?? {};
  const toolName = String(toolCall.name ?? '').toLowerCase();
  const args = toolCall.args ?? {};
  const cwd = typeof payload?.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : process.cwd();
  const denylist = loadPrivacyDenylist(options.privacyDenylist);

  if (toolName === 'run_command') {
    const commandLine = String(args.CommandLine ?? args.commandLine ?? '');
    const denial = inspectCommandLine(commandLine, cwd, denylist, new Map(), new Set(), 0);
    return denial ?? { decision: 'allow' };
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
