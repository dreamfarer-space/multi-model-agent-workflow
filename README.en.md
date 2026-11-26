<div align="center">

<img src="./assets/hero.svg" alt="Multi-Model Agent Workflow" width="100%">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Bundled Skills](https://img.shields.io/badge/Skills-33%20Bundled-success.svg?style=flat-square)](./skills)
[![Works with](https://img.shields.io/badge/Works%20with-Google%20Antigravity-orange.svg?style=flat-square)](#quickstart)
[![Language](https://img.shields.io/badge/Language-English%20%7C%20%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-lightgrey.svg?style=flat-square)](./README.md)

<p>A native <b>Google Antigravity</b> engineering workflow plugin: 5-stage hard gates, write-stripped scout / advisor / reviewer subagents, Neon High advisor &amp; blind audit, and 33 curated skills.</p>

**English** · [简体中文](./README.md) · [Model Benchmarks](./docs/benchmarks-2026-11.md) · [Engineering Patterns](./docs/power-user-patterns.md) · [Legacy Hermes Archive](./docs/legacy-hermes.md)

</div>

---

Prompt reminders alone fail on large codebases in two predictable ways:

First, mixing reconnaissance and coupled edits in one thread burns flagship context while concurrent writers trample the same files.

Second, self-review suffers from confirmation bias: the same model and chat thread that wrote a patch routinely overlooks skipped requirements, unrequested scope additions, and hollow mock tests.

This repository packages the constraints directly into Antigravity's native plugin structure:
1. **Tool-level isolation & `PreToolUse` hard hooks**: The lead model (`Gemini 4 Hydrogen (High)`) owns planning and coupled core edits; [`agents/scout.md`](./agents/scout.md) physically strips `edit_file` / `write_file`; root [`hooks.json`](./hooks.json) + [`scripts/guard-hook.mjs`](./scripts/guard-hook.mjs) parse actual command invocations before execution to hard-block AI `Co-Authored-By`, `@codex review`, bare `git push --force`/`+ref`, UTF-8/UTF-16 BOM or stray control characters in `--body-file` / `gh api -F body=@file`, and `node:vm`/`eval`/`new Function` in tests (without false positives on read-only `gh` or local temp paths).
2. **S/M/L task tiering + 5-stage hard-gated pipeline (Stage 0 – Stage 4)**: Single-file docs/config tweaks take the S-tier fast lane; M/L work runs the full gate — ground with `how` + `why` + `architect` (consult read-only [`agents/advisor.md`](./agents/advisor.md) on forks/deadlocks), build with `systematic-debugging` + `test-value` + `correct`, verify before push with `interrogate` and read-only [`agents/reviewer.md`](./agents/reviewer.md) (pinned to `Gemini 4 Neon (High)`, switching to a heterogeneous model such as `claude-opus-5-5-high` when the lead session itself is Neon High on high-risk edits).
3. **Ready-to-use plugin + automated verification/sync**: The repository root is a valid plugin (`plugin.json` + `hooks.json` + `rules/AGENTS.md` + `agents/` + 33 flat `skills/`), backed by cross-platform [`scripts/verify-plugin.mjs`](./scripts/verify-plugin.mjs) and non-destructive [`scripts/sync-workflow.mjs`](./scripts/sync-workflow.mjs).

<div align="center">
  <img src="./assets/model-routing.svg" alt="Antigravity native subagent isolation architecture" width="100%">
</div>

---

## Quickstart

### Option 1: Clone directly as an Antigravity global plugin (Recommended)

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git ~/.gemini/config/plugins/workflow
```

### Option 2: Install via script (also exports skills to other tools)

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git
cd multi-model-agent-workflow

# Install full Antigravity plugin (preserves existing local rules/AGENTS.md unless FORCE_RULES=1)
bash scripts/install-skills.sh --target antigravity

# Or use cross-platform Node sync (works on Windows PowerShell, preserves local private rules)
node scripts/sync-workflow.mjs --to-local

# Run automated plugin, SVG bounds, sanitization, and guard-hook behavioral checks
node scripts/verify-plugin.mjs

# Or export the 33 flat skills to another skill directory:
# bash scripts/install-skills.sh --target claude   # ~/.claude/skills
# bash scripts/install-skills.sh --target cursor   # ~/.cursor/skills
# bash scripts/install-skills.sh --target agents   # ~/.agents/skills
```

> Historical `Hermes Agent × Magpie` routing configs have been archived in [`docs/legacy-hermes.md`](./docs/legacy-hermes.md).

---

## Antigravity Model & Subagent Roles

| Role | Recommended Model / Entrypoint | Scope & Guardrails |
| :--- | :--- | :--- |
| **Lead (Plan / Execute)** | `Gemini 4 Hydrogen (High)`<br>`/plan` · `/grill-me` · `/boost` | Requirement convergence, two-skeleton `architect` sketches, coupled core edits, final acceptance; never >30 solo file reads/edits in the main thread. |
| **Static Read-Only Scout** | `invoke_subagent(TypeName="research")` | Pure static file reading and cross-directory symbol lookup (no network, no terminal); returns `≤50` lines with `file:line` citations. |
| **Read-Only + CLI Scout** | `invoke_subagent(TypeName="scout")`<br>([`agents/scout.md`](./agents/scout.md)) | Grants `read_file`, `run_command`, `manage_task`, `search_web` with write tools physically omitted; runs `why`, `how`, and Phase 1 bug reproductions. |
| **Parallel Build & Verification** | `invoke_subagent(TypeName="self", Workspace="share" \| "branch")`<br>`run_workflow` | Independent modules, regression tests, and staged Python workflows (**≤5 concurrent**); waits on system wakeup instead of polling loops. |
| **Technical Advisor** | `swarm` (`gemini-4-neon-high`)<br>Fallback: `invoke_subagent(TypeName="advisor", Model="pro")` | Brief must instruct `read_file` [`agents/advisor.md`](./agents/advisor.md) first: strictly read-only architectural trade-offs, high-risk second opinions, and deadlock reframing; kills worker immediately after advice. |
| **Pre-Push 4-Dimension Blind Audit** | `swarm` (`gemini-4-neon-high`; switches to a heterogeneous model e.g. `claude-opus-5-5-high` when lead is Neon High on high-risk edits)<br>Fallback: `invoke_subagent(TypeName="reviewer", Model="pro")` | Brief must instruct `read_file` [`agents/reviewer.md`](./agents/reviewer.md) first: no chat history — receives only scope, full `git diff`, and test outputs; kills worker immediately after verdict. |
| **Deadlock Escalation** | `claude-opus-5-5` | Single-turn surgical escalation if two consecutive fix attempts fail. |

See [Model Benchmarks (2026-11)](./docs/benchmarks-2026-11.md) for measured metrics and role rationale.

---

## Five-Stage Hard-Gated Pipeline (Stage 0 – Stage 4)

<div align="center">
  <img src="./assets/pipeline.svg" alt="Five-stage hard-gated engineering pipeline" width="100%">
</div>

Enforced in [`rules/AGENTS.md`](./rules/AGENTS.md) and unpacked in [Engineering Patterns](./docs/power-user-patterns.md):

1. **Stage 0 · Scope & Grounding**: Check target `AGENTS.md` and upstream baseline, **never branch directly in the main workspace** (use an isolated `git worktree`); ground with `how` and `why` before touching safeguards, sketch two distinct shapes with `architect`, and lock decisions + `Out of Scope` with `grill-me` / `ask_question`.
2. **Stage 1 · Locate, Implement & Guard**: Build a tight failing loop first with `systematic-debugging` (or throwaway `spike`); follow `test-value` (**strict ban on `node:vm` / `eval` / `new Function` in tests**); fix recurring mistake classes at the highest effective level with `correct` (Architecture → Types → Lint → Behavioral Tests → Docs); trim accidental complexity with `simplify-codebase`.
3. **Stage 2 · Local Gates & Pre-Push Audit**: Fetch and rebase onto upstream, rebuild artifacts, and run local checks/tests sequentially; run `blast-radius` (to at least Level 4 executed script proof) on shared protocol/contract edits and `interrogate` (only command-proven findings survive) on high-risk L-tier concurrency/auth/lock/state-machine edits, passing that proof to `reviewer`; trigger read-only `reviewer` whenever ≥2 source files or state-machine/permission/security/IPC/redaction paths change.
4. **Stage 3 · Clean PR Delivery**: Follow repository templates (`yeet` / `github`), write `--body-file` in **BOM-free UTF-8**, match the repo's primary language, never add AI `Co-Authored-By` trailers or unsolicited review bots, and keep screenshots redacted and out of source branches.
5. **Stage 4 · Post-Push CI & Review Loop**: Inspect `gh pr view --json mergeStateStatus` immediately (rebase if `DIRTY` so CI isn't skipped), shepherd `gh pr checks` + `gh-fix-ci`, and resolve feedback via `gh-address-comments` by replying in-thread and executing GraphQL `resolveReviewThread`, cleaning up branches with `--delete-branch` after merge.

---

<details>
<summary><b>Bundled 33 Antigravity skills and license reference</b></summary>
<br>

All skills live flat under [`skills/`](./skills). See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for full upstream attribution and license terms.

| Stage / Domain | Directory | Purpose | Source & License |
| :--- | :--- | :--- | :--- |
| **Stage 0 · Grounding & Design** | `how` | Codebase walkthroughs producing an onboarding-grade mental model | MIT (Adapted) |
| | `why` | Git/PR/issue archaeology separating proven facts from inference | MIT (Adapted) |
| | `architect` | Sketch two distinct type/signature skeletons before implementing | MIT (Adapted) |
| | `grill-me` | Frontier-round decision interview with recommended options | MIT (`rafaumeu` / `mattpocock` / Hermes) |
| **Stage 1 · Build, Test & Guard** | `systematic-debugging` | 4-phase root-cause debugging with tight red/green loops | MIT (`obra/superpowers` / Hermes) |
| | `spike` | Disposable feasibility prototypes before real implementation | MIT (`gsd-build/get-shit-done`) |
| | `test-value` | Evaluates test discrimination and feedback cost | MIT (`tt-a1i`) |
| | `correct` | Eliminates repeat agent mistakes at highest leverage level | MIT (Adapted) |
| | `simplify-codebase` | Evidence-backed removal of dead code and accidental complexity | MIT (`simplify-codebase contributors`) |
| | `security-best-practices` | Language-specific security audit for Python / JS / TS / Go | Apache-2.0 (`OpenAI / Codex`) |
| | `typescript-best-practices` | Discriminated unions, branded types, Zod boundary parsing | MIT (`cursor/plugins/pstack`) |
| | `codebase-inspection` | Inspects codebase LOC, languages, and ratios with `pygount` | MIT (`Nous Research`) |
| | `localization` | Locale catalog translation, review, and Android/iOS resource checks | MIT (`Nous Research`, sanitized) |
| | `node-inspect-debugger` | Debugs Node.js processes via `--inspect` and CDP CLI | MIT (`Nous Research`) |
| | `python-debugpy` | Debugs Python via `pdb` REPL and `debugpy` DAP | MIT (`Nous Research`) |
| **Stage 2 · Proof & Verification** | `interrogate` | Adversarial probers break changes; only executed repros survive | MIT (Adapted) |
| | `blast-radius` | Cross-module blast radius audit and 5-level evidence ladder | MIT (`cursor/plugins/pstack`) |
| | `statechart` | (Optional Stage 0 heavy weapon) Compiles TLA+ specs for brand-new concurrent locks/protocols | MIT (`cursor/plugins/pstack`) |
| | `benchmark-checklist` | 7-point gate against unverified performance claims | MIT (`cursor/plugins/pstack`) |
| **Stage 3 & 4 · PR & CI Loop** | `yeet` | Stage, commit, push, and open/update GitHub PRs cleanly | Apache-2.0 (`OpenAI / Codex`, sanitized) |
| | `github` | `gh` CLI hub for issues, reviews, repos, auth, and releases | MIT (`Nous Research`, sanitized) |
| | `gh-fix-ci` | Inspects failing GitHub Actions checks and builds fix plans | Apache-2.0 (`OpenAI / Codex`) |
| | `gh-address-comments` | Replies to PR threads and resolves them via GraphQL | Apache-2.0 (`OpenAI / Codex`) |
| | `github-pr-assessment` | Evaluates PR changes, check status, and merge likelihood | MIT (`Nous Research`, sanitized) |
| **UI & Multiplatform** | `react-native-skills` | React Native / Expo rendering, layout, and native patterns | MIT (`vercel-labs/agent-skills`) |
| | `animate-expo` | Reanimated motion guardrails and UI-thread gestures | MIT (`emilkowalski/skills`) |
| | `break-ui` | Stress-tests UI layouts with worst-case strings and list bounds | MIT (`emilkowalski/skills`) |
| | `mobile-native` | Fixes mobile web `:hover` stickiness, `100dvh`, and input zoom | MIT (`emilkowalski/skills`) |
| | `emil-design-eng` | UI polish, transition timing, and interaction craftsmanship | MIT (`emilkowalski/skills`) |
| | `impeccable` | Typography, contrast, hierarchy, and anti-template guidance | Apache-2.0 (`pbakaus/impeccable`) |
| | `gemini-frontend-design` | Polished web UI design across layout, color, typography, motion | Apache-2.0 (`Google Gemini`) |
| **Docs & Knowledge** | `humanizer` | Strips 34 common AI writing patterns and filler phrases | MIT (`blader/humanizer`, sanitized) |
| | `llm-wiki` | Maintains incremental knowledge bases (`raw/`, `concepts/`, `index.md`) | MIT (`Nous Research`) |

</details>

---

<details>
<summary><b>Plugin and repository layout</b></summary>
<br>

```text
.
├── plugin.json                        # Antigravity plugin manifest
├── hooks.json                         # PreToolUse hard-guardrail hooks
├── rules/
│   └── AGENTS.md                      # S/M/L tiering + 5-stage hard-gated workflow rules (sanitized)
├── agents/
│   ├── advisor.md                     # Strictly read-only technical advisor
│   ├── reviewer.md                    # Strictly read-only 4-dimension auditor
│   └── scout.md                       # Write-stripped read-only + CLI scout
├── skills/                            # 33 flat Antigravity engineering skills
│   ├── architect/
│   ├── correct/
│   ├── gh-address-comments/
│   ├── how/
│   ├── interrogate/
│   ├── react-native-skills/
│   ├── test-value/
│   ├── why/
│   └── ...
├── scripts/
│   ├── guard-hook.mjs                 # PreToolUse redline blocker (supports optional .privacy-denylist.json)
│   ├── verify-plugin.mjs              # Manifest, frontmatter, SVG bounds, sanitization & hook self-tests
│   ├── sync-workflow.mjs              # Cross-platform whitelist sync (preserves local private rules)
│   └── install-skills.sh              # Installer (Antigravity / Claude / Cursor / .agents / Hermes)
├── docs/
│   ├── benchmarks-2026-11.md          # Benchmarks & model role rationale
│   ├── power-user-patterns.md         # Stage 0–4 engineering gates breakdown
│   └── legacy-hermes.md               # Archived Hermes × Magpie migration notes
├── assets/
│   ├── hero.svg
│   ├── model-routing.svg
│   └── pipeline.svg
├── README.md
├── README.en.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

</details>

---

## License

New plugin configurations, rules, diagrams, and documentation in this repository are released under the [MIT License](./LICENSE). Bundled third-party projects inside `skills/` remain under their original **MIT** or **Apache 2.0** licenses. See individual skill directories and the root [Third-Party Notices](./THIRD_PARTY_NOTICES.md) for details.
