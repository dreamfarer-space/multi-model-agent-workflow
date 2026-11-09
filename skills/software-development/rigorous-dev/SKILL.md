---
name: rigorous-dev
description: "Use when fixing bugs or building features rigorously."
version: 1.0.0
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

Use when fixing bugs, adding features, or running a multi-agent engineering workflow that requires root-cause reproduction, anti-regression tests/lints, real verification evidence, and independent review. Load `systematic-debugging`, `test-driven-development`, `requesting-code-review`, `github`, `grill-me`, `simplify-code`, `typescript-best-practices`, `blast-radius`, `statechart`, `benchmark-checklist`, `impeccable`, `emil-design-eng`, `vercel-react-native-skills`, `animate-expo`, `break-ui`, `mobile-native`, or `write-swift` via `skill_view` whenever deeper step-by-step guidance is needed.

## Hard Rules

1. **Reproduce, Lock Scope & Grill Before Coding**
   - Verify local repository branch/status and compare against upstream `main` before editing.
   - Read the actual implementation and reproduce or trace the exact root cause before proposing a fix. Never guess at file contents, and never ask the user for facts that can be read from the codebase.
   - For ambiguous or multi-branch features, use `grill-me` to resolve open design decisions with recommended options first, and explicitly lock `Out of Scope` files/modules before writing code.
   - **Two-strike reset rule**: if two consecutive fix attempts on the same issue fail, stop patching in place, record the falsified hypothesis, and re-plan from root cause rather than stacking a third speculative patch.

2. **Lint-as-Memory, Headless State Verification, Type Discipline & Build Budgets**
   - **Lint-as-Memory & Build-the-Lever**: Follow the repository's test policy and protect important recurring failures with behavioral regression tests (breaking observable behavior must fail; refactoring internals must pass), a reusable verifier script, or an existing static check. Spend new test budget on protocol, authorization, recovery, and state transitions; use typechecks and focused visual inspection for ordinary text, styling, and reversible UI changes when the project excludes those tests. Do not add source-string or layout assertions merely to satisfy a blanket test requirement.
   - **Type-System Discipline & Idempotent Operations (`typescript-best-practices`)**: Model mutually exclusive states with discriminated unions where they prevent invalid combinations; parse untrusted inputs at the boundary using the repository's existing schema library and derive types from it. Use validated branded IDs where identity confusion is a real risk. Establish each operation's retry contract before retrying: reading current state and applying a delta is insufficient when concurrent actors can race or a remote mutation may already have committed. Use the protocol's atomic transition, revision check, stable idempotency key, or exact-result recovery as appropriate; retain an unknown outcome when reconciliation is unavailable, and never replay prompts, approvals, or terminal input merely to make a workflow appear idempotent.
   - **Headless State Verification & TLA+ `statechart`**: For reconnection, polling, approvals, and other affected concurrent state, verify cancellation, late results, ownership, and recovery with focused headless scenarios before UI acceptance. Use randomized sequences or TLA+ (`statechart` for Mermaid charts and counterexample reports) when the state-space risk warrants them; do not require a model checker for routine UI work. Resolve installed runtimes from the environment and run the documented entry point rather than embedding one machine's paths. Separate diagram generation from invariant/property checks; report model bounds, omitted behavior, and unchecked rules without promising a fixed runtime or exhaustive application correctness. Replay counterexample paths against the real implementation, because a defect in the model may not exist in the product.
   - **Blast-Radius Evidence Ladder (`blast-radius`) & Benchmark Gate (`benchmark-checklist`)**: Identify the load-bearing assumption that makes a cross-module change safe and verify it through execution (marking unverified callers `UNPROVEN`). Any performance claim must pass `benchmark-checklist` (bottleneck, baseline tuning, physical ceiling, variance across runs, real workload execution).
   - **Filepath Boundaries & Build Budgets**: Enforce environment and hot-path boundaries (such as client-only bundles or ESP32 render/ISR hot loops that must not block or allocate) and assert size/row/memory budgets in automated checks.
   - **Comments Policy (`// WHY:` Only)**: Never write AI slop comments that restate what the next line does; only write comments explaining non-obvious platform quirks, protocol invariants, or why a guard must not be removed (`// WHY: ...`).

3. **Context Hygiene & Safe Worktree Parallelism**
   - Offload broad codebase searches, log grepping, and multi-module read-only audits to `delegate_task` (`group/work`) subagents, requiring each child to return a concise summary (`file:line` + verified findings, ≤50 lines) so the main session context stays clean.
   - Before parallel write tasks, verify the actual worktree isolation supported by the active runtime and pass each writer its exact repository, baseline, and file scope. A saved isolation setting or an instruction in a prompt does not prove a child has a separate worktree. Keep one writer per shared worktree, parallelize read-only investigation freely, and integrate isolated changes before running final checks.

4. **Mandatory Real Execution & UI Geometry Evidence**
   - Never claim completion from static inspection alone. Run the project's actual build, typecheck, and test suite (or `hermes verify`) and capture real command output as proof.
   - Select UI guidance by the actual target: `vercel-react-native-skills` and `animate-expo` for React Native, `mobile-native` for mobile Web/WebView, `write-swift` for Swift, and `impeccable` / `emil-design-eng` for applicable design details. Verify installed framework/compiler versions before adopting a skill's APIs. CSS viewport, hover, and input-font recipes do not apply directly to native components; Swift concurrency defaults depend on the project's compiler and settings.
   - Treat motion frequency thresholds, duration examples, easing, and scale recipes as contextual design guidance. Assess responsiveness, platform conventions, reduced-motion behavior, and existing interactions rather than banning all animation on frequently used controls or prescribing one easing everywhere. Keep continuous React Native gesture updates off per-frame React state when the installed animation stack supports UI-thread execution; do not introduce or upgrade that stack merely because a skill names it.
   - Use `break-ui` to inspect affected fields with relevant long translations, unbroken URLs, short names, empty/single/large collections, and changing numbers. Check DOM or native bounds where available, then inspect actual screenshots; geometry alone cannot prove text readability or interaction quality. Report only the platforms and states actually exercised.

5. **Role Separation, Two-Stage Review & Safe Delivery**
   - Follow the user's accepted roles: Argon leads architecture, coupled edits, and visual alignment;
     DeepSeek Flash, MiniMax Flash, and Gemini Flash share ordinary worker tasks; Gemini handles
     writing; GPT-6.1 sol reviews actual diffs and execution evidence with high reasoning. Reserve
     scarce Opus capacity for a bounded difficult escalation. Explicit task assignments override these
     defaults. Verify current model IDs and routes using `hermes-external-providers`; do not infer
     automatic task selection, session affinity, or a working HY4 fallback from a group name or a
     saved setting. Keep coupled files under one writer and locale synchronization in one task;
     parallelize independent investigation or modules rather than fragmenting shared state.
   - Independent review receives a self-contained brief + real `git diff` + test output (never relying on developer self-reports) and checks **Stage 1: Spec Compliance (`Missing` / `Extra` unrequested changes / `Misunderstood`)** before **Stage 2: Code Quality & Concurrency Safety** (use `simplify-code` when cleanup is needed).
   - Never auto-merge PRs or push to shared branches (`main`) without explicit user confirmation.
