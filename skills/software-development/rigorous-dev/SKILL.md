---
name: rigorous-dev
description: "Use when fixing bugs or building features rigorously."
version: 2.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [debugging, tdd, verification, code-review, tla-plus, workflow]
    related_skills: [systematic-debugging, test-driven-development, requesting-code-review, github, grill-me, simplify-code, impeccable, vercel-react-native-skills, animate-expo, break-ui, mobile-native, emil-design-eng, write-swift, typescript-best-practices, blast-radius, statechart, benchmark-checklist]
---

# Rigorous Development Workflow (`/rigorous-dev`)

## When to Use

Use when fixing bugs, adding features, or running a multi-agent engineering workflow that requires root-cause reproduction, anti-regression tests, real verification evidence, and independent review.

## Routing Table — Load on Demand

| Scenario | Load Reference / Skill |
|---|---|
| Permissive schema validation, normalized tool payloads, streaming blocks | `references/schema-normalization.md` |
| Python test isolation (`sys.modules`, native extensions, CWD) | `references/python-test-isolation.md` |
| Reactive UI linkage & state synchronization | `references/reactive-ui-linkage.md` |
| Ambiguous requirements or open design forks | `skill_view("grill-me")` |
| Cross-module blast radius audit | `skill_view("blast-radius")` |
| Performance claims & benchmarks | `skill_view("benchmark-checklist")` |
| Complex concurrent state / TLA+ counterexamples | `skill_view("statechart")` |
| UI stress testing (long text, empty/huge lists, bounds) | `skill_view("break-ui")` |

## Hard Rules

1. **Reproduce, Lock Scope & Edit Safely**
   - Verify local repository branch/status and compare against upstream `main` before editing (`git log <upstream>..HEAD --oneline`, `git diff --name-status <upstream>...HEAD`). Before classifying local `docs/` or site commits as project bugs, check whether they belong to a separately maintained companion site repository.
   - Read actual implementation and trace the exact root cause before proposing a fix. Never guess file contents or ask the user for facts readable from code.
   - **Two-strike reset rule**: If two consecutive fix attempts on the same issue fail, stop patching in place, record the falsified hypothesis, and re-plan from root cause.
   - **No same-turn multi-patch on one file**: Never emit multiple `patch` tool calls against the same file in a single turn (cap same-turn `patch` calls at ≤3 across different files). For >3 edits in one file, apply them sequentially across turns or consolidate neighboring hunks into one verified replacement. Pass real line breaks (never double-escaped `\\n`), inspect the returned diff immediately after any approximate/context-aware match, and run syntax/typechecks before continuing.

2. **Behavioral Regression Tests, Type Discipline & Build Budgets**
   - Protect recurring failures with behavioral regression tests (breaking observable behavior must fail; refactoring internals must pass).
   - Model mutually exclusive states with discriminated unions; parse untrusted inputs at boundaries; establish idempotency/retry contracts before retrying stateful operations.
   - Enforce environment and hot-path boundaries (e.g., client-only bundles, embedded non-blocking render loops) and only write `// WHY:` comments explaining non-obvious invariants or platform quirks.

3. **Context Hygiene, Subagent Budgets & Worktree Isolation**
   - **Main-session tool budget**: Once root cause and target interfaces are locked in the main session, delegate independent module implementation, regression test authoring, and batch verification scripts to `delegate_task` (`group/work`) rather than running >30 `read_file`/`patch` calls solo in the root session. Do not bypass `delegate_task` with ad-hoc `terminal` HTTP scripts (`curl`/`fetch` to the local gateway) when subagents can execute the task.
   - **Hard subagent execution bounds**: Cap concurrent subagents at **≤5 per batch** (never fragment locale sync or coupled edits into >5 parallel writers). Every `delegate_task` prompt must state explicit caps: **≤25 tool calls, ≤8 target files, and ≤50 lines of summary (`file:line` + verified findings)**, returning immediately once its assigned scope is covered.
   - **Worktree verification**: Keep one writer per worktree. After a writer subagent finishes, run `git -C <repo> worktree list --porcelain` and inspect `git diff` / `git show` before integrating changes.

4. **Mandatory Real Execution & UI Geometry Evidence**
   - Never claim completion from static inspection alone. Run the project's actual build, typecheck, and test suite sequentially *after* all edits finish and *before* committing/pushing.
   - Select UI guidance by target (`vercel-react-native-skills` / `animate-expo` for RN, `mobile-native` for Web, `write-swift` for Swift). Verify DOM/native bounds and inspect actual screenshots with `vision_analyze`.

5. **Role Separation, Two-Stage Review & Pre-Delivery 3-Point Gate**
   - **Model roles**: Argon leads architecture, coupled core edits, and visual alignment; `group/work` (`DeepSeek Flash` / `MiniMax Flash` / `Gemini Flash`) handles read-only audits and independent module/test work; `Gemini 3.8 Flash` handles prose and single-task locale sync; `GPT-6.1 sol` (`high`) performs two-stage independent review; `Opus 5.5` is reserved for bounded deadlock escalation.
   - **Two-stage independent review**: Supply a self-contained brief + real `git diff` + test output to verify **Stage 1: Spec Compliance (`Missing` / `Extra` / `Misunderstood`)** before **Stage 2: Code Quality & Concurrency Safety**.
   - **Pre-delivery 3-point sanity gate**:
     1. **Default-on UX**: Any new user-facing resilience, normalization, or recovery config option defaults to the enabled state out of the box (while preserving low-level function defaults if required by callers/tests).
     2. **Upstream language match**: PR title, body, and comments match the target repository's primary language (English for English-language upstream repos, Chinese for Chinese-language repos).
     3. **Remote CI verification**: After opening or updating a PR, check `gh pr checks` and resolve any newly triggered CI failure before reporting completion.
