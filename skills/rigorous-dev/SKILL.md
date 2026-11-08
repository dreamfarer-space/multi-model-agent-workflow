---
name: rigorous-dev
description: "Use when fixing bugs or building features rigorously."
version: 1.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [debugging, tdd, verification, code-review, tla-plus, workflow]
    related_skills: [systematic-debugging, test-driven-development, requesting-code-review, github, grill-me, simplify-code, impeccable, vercel-react-native-skills]
---

# Rigorous Development Workflow (`/rigorous-dev`)

## When to Use

Use when fixing bugs, adding features, or running a multi-agent engineering workflow that requires root-cause reproduction, anti-regression tests/lints, real verification evidence, and independent review. Load `systematic-debugging`, `test-driven-development`, `requesting-code-review`, `github`, `grill-me`, `simplify-code`, `impeccable`, or `vercel-react-native-skills` via `skill_view` whenever deeper step-by-step guidance is needed.

## Hard Rules

1. **Reproduce, Lock Scope & Grill Before Coding**
   - Verify local repository branch/status and compare against upstream `main` before editing.
   - Read the actual implementation and reproduce or trace the exact root cause before proposing a fix. Never guess at file contents, and never ask the user for facts that can be read from the codebase.
   - For ambiguous or multi-branch features, use `grill-me` to resolve open design decisions with recommended options first, and explicitly lock `Out of Scope` files/modules and build/capacity budgets before writing code.
   - **Two-strike reset rule**: if two consecutive fix attempts on the same issue fail, stop patching in place, record the falsified hypothesis, and re-plan from root cause rather than stacking a third speculative patch.

2. **Lint-as-Memory, Headless State Verification & Build Budgets**
   - **Lint-as-Memory**: Every bug fix or feature must add an executable regression test or static check/lint rule (e.g., banning raw `#hex` colors outside theme tokens, duplicate nested `KeyboardInset`, locale key mismatches, or forbidden imports in client/hot-path files) so `check` fails immediately if any agent reintroduces the pattern.
   - **Headless Simulation & TLA+ Before Emulator UI**: Decouple state-machine logic (reconnection, selection sync, polling races, approvals) from UI components and verify randomized action sequences in headless unit tests or the TLA+ model checker (`java -XX:+UseParallelGC -cp "$TLA2TOOLS_JAR" tlc2.TLC`) before launching an emulator.
   - **Filepath Boundaries & Build Budgets**: Enforce environment and hot-path boundaries (such as client-only bundles or embedded render/ISR hot loops that must not block or allocate) and assert size/row/memory budgets in automated checks.
   - **Comments Policy (`// WHY:` Only)**: Never write AI slop comments that restate what the next line does; only write comments explaining non-obvious platform quirks, protocol invariants, or why a guard must not be removed (`// WHY: ...`).

3. **Context Hygiene & Safe Worktree Parallelism**
   - Offload broad codebase searches, log grepping, and multi-module read-only audits to `delegate_task` (`group/work`) subagents, requiring each child to return a concise summary (`file:line` + verified findings, ≤50 lines) so the main session context stays clean.
   - When splitting independent workstreams across subagents (`delegate_task`), rely on `delegation.worktree_isolation: true` so each child works in an isolated git worktree without stepping on sibling changes.

4. **Mandatory Real Execution & UI Geometry Evidence**
   - Never claim completion from static inspection alone. Run the project's actual build, typecheck, and test suite (or `hermes verify`) and capture real command output as proof.
   - For React Native / Web UI changes, follow `vercel-react-native-skills` and `impeccable` (stick to theme tokens, no ad-hoc magic numbers), and verify layout via UI hierarchy `bounds` (`uiautomator dump`) or DOM `getBoundingClientRect` before capturing final screenshots.

5. **Role Separation, Two-Stage Review & Safe Delivery**
   - Follow the configured roles: Argon leads architecture, coupled edits, and visual alignment;
     DeepSeek Flash, MiniMax Flash, and Gemini Flash share ordinary worker tasks via `group/work`;
     Gemini Flash handles writing and multi-locale sync in a single pass; GPT-6.1 sol reviews actual
     diffs and execution evidence with high reasoning. Reserve scarce Opus capacity for a bounded
     difficult escalation. Explicit task assignments override these defaults.
   - Independent review receives a self-contained brief + real `git diff` + test output (never relying on developer self-reports) and checks **Stage 1: Spec Compliance (`Missing` / `Extra` unrequested changes / `Misunderstood`)** before **Stage 2: Code Quality & Concurrency Safety** (use `simplify-code` when cleanup is needed).
   - Never auto-merge PRs or push to shared branches (`main`) without explicit user confirmation.
