# Multi-Model Agent Workflow (`Hermes` × `Magpie`)

**English** | [简体中文](./README.md)

This repository contains the model routing setup, guardrail rules, and 20 bundled agent skills I use for full-stack TypeScript, React Native (Expo), iOS (Swift), and embedded C++ work.

It grew out of two failures I hit repeatedly:
1. **Wasting frontier quota on file-grepping chores.** Letting a slow, expensive reasoning model spend 30 turns scanning a repo burns through a 5-hour quota window in an afternoon, while routing every subagent to a single free tier causes rate-limit stalls.
2. **Multi-agent write collisions.** I once spawned 7 concurrent subagents to fix a mobile chat UI and its 7 locale files at the same time. They stepped on each other's props and state assumptions so badly that I had to revert the entire branch.

The fix is simple: keep one high-context architect model in the main window for design decisions and coupled edits, fan out read-only reconnaissance across three fast model families on separate provider pools, and use a different model family to blind-review the final `git diff`.

![Multi-Model Routing and Quota Isolation Architecture](./assets/model-routing.svg)

---

## Quick start (works out of the box)

All 20 skills are bundled directly under [`skills/`](./skills) with their scripts, reference tables, and upstream MIT / Apache-2.0 licenses ([`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)). Clone the repo and run the installer for your agent:

```bash
git clone https://github.com/dreamfarer-space/multi-model-agent-workflow.git
cd multi-model-agent-workflow

# 1. Install all 20 bundled skills (supports: hermes | claude | cursor | agents)
bash scripts/install-skills.sh --target hermes
# For Claude Code: bash scripts/install-skills.sh --target claude
# For Cursor:      bash scripts/install-skills.sh --target cursor

# 2. Configure Magpie routing groups (work / edit / review / duty)
bash scripts/setup-magpie-groups.sh

# 3. Apply Hermes model routing (see configs/hermes-config.example.yaml)
hermes config set model.default antigravity/gemini-4-argon
hermes config set delegation.model group/work
hermes config set auxiliary.compression.model minimax-code/MiniMax-M3.1-Flash
hermes config set auxiliary.review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.reasoning_effort high
```

---

## How the 5 model roles are split

Full benchmark tables (separating measured model-card scores from third-party estimates) are in [`docs/benchmarks-2026-11.md`](./docs/benchmarks-2026-11.md).

| Role | Model / Route | Verified Benchmark Strength | Why it sits here |
| :--- | :--- | :--- | :--- |
| **1. Lead Architect** | `antigravity/gemini-4-argon`<br>(`model.default`) | DeepSWE v1.1 `77.9%`<br>GraphWalks 128K `99.7%`<br>Roboflow Vision `87.5%` | Best at cross-file call-graph recall, React UI (1702 Elo), screenshot inspection, and math/control derivations. Its first-token latency is 15–20s, so keep it off repetitive file searches. Runs on an isolated Google AI Ultra pool (resets every 5h). |
| **2. Subagent Swarm** | `group/work`<br>(`routing=rotate, stays=turn`) | DeepSeek-V4.1-Flash (`190 tok/s`)<br>MiniMax-M3.1-Flash (`166 tok/s`)<br>Gemini-3.8-Flash (`130 tok/s`) | Rotates new subagents across three independent providers so 4-way parallel reconnaissance finishes in ~3 minutes without hitting single-account rate limits. `stays=turn` keeps all tool calls inside a subagent sticky to the model it started on. `workbuddy/hy4free` sits in `fallback_providers`. |
| **3. Locale & Prose** | `antigravity/gemini-3.8-flash`<br>(`group/edit`) | LMArena Vision (Chinese/Diagrams) #1<br>LiveCodeBench `89.5%` | Pinned to Google AI Pro accounts in Magpie, using 0% of the Ultra account's Argon quota. Handles single-pass multi-locale sync (`locales/*.ts`) and PR descriptions. |
| **4. Compression** | `minimax-code/MiniMax-M3.1-Flash`<br>(`auxiliary.compression`) | LOCA-Bench 256K `60.3%` (#1 retrieval)<br>524K max output | Compacts long sessions without dropping `file:line` anchors or falsified hypotheses. |
| **5. Blind Review & Escalation** | Review: `codex/gpt-6.1-sol:high`<br>Escalation: `claude-opus-5-5` | Sol: DeepSWE `75.2%`, MultiChallenge `82.0%`<br>Opus 5.5: SWE-bench Pro `89.9%` | Sol comes from a different model family than Gemini/DeepSeek and reviews only the brief + `git diff` + test output. Scarce Opus 5.5 capacity is saved for single-turn surgical help when a bug survives two fix attempts. |

---

## The 5-stage workflow

![Five-Stage Engineering Pipeline](./assets/pipeline.svg)

Background notes and sources are in [`docs/power-user-patterns.md`](./docs/power-user-patterns.md).

1. **Recon and pre-code gate (`grill-me`)**: Send 3–5 `group/work` subagents to trace the codebase and return **at most 50 lines each with `file:line`**. Resolve open design choices with recommended options and list `Out of Scope` files before writing code. Never ask the user for facts you can read from the repo.
2. **Single-writer execution and Two-Strike Reset**: Keep tightly coupled UI, store, and navigation edits under one writer (`Argon`), and run multi-locale updates in one `Gemini 3.8 Flash` task. Model state with discriminated unions (`typescript-best-practices`), keep comments strictly to `// WHY:` guardrails, and **stop after 2 failed fix attempts** to record the falsified hypothesis rather than stacking a 3rd blind patch.
3. **3-layer verification**:
   - **Layer 1**: Verify concurrent/reconnection state machines with headless randomized tests or compile `.tla` specs into Mermaid statecharts via `statechart`.
   - **Layer 2**: Run `check` and `test`, then use `blast-radius` to prove the load-bearing safety assumption with real execution (marking untested callers `UNPROVEN`). Check performance numbers against `benchmark-checklist`.
   - **Layer 3**: Feed worst-case realistic data (`break-ui`), verify layout bounds (`uiautomator dump` or `getBoundingClientRect`), and inspect light/dark screenshots.
4. **Cleanup and 2-stage blind review**: Run `simplify-code` if needed, then pass the self-contained brief + `git diff` + test output to `GPT-6.1-Sol (high)` to check **Stage 1: Spec Compliance (`Missing / Extra / Misunderstood`)** before **Stage 2: Concurrency & Code Quality**.
5. **Lint-as-Memory and `LLM Wiki`**: Turn recurring bug classes into static checks so future regressions fail at `check` time, and update `index.md` in the wiki.

---

## Bundled skills and licenses

Every bundled skill in [`skills/`](./skills) includes its upstream license file and attribution in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md):

- **MIT License**: `rigorous-dev`, `grill-me` (Matt Pocock), `improve-codebase-architecture` (Matt Pocock + Lauren Tan), `typescript-best-practices` / `blast-radius` / `statechart` / `benchmark-checklist` (Lauren Tan, `cursor/plugins/pstack`), `vercel-react-native-skills` (Vercel), `animate-expo` / `break-ui` / `mobile-native` / `write-swift` / `emil-design-eng` (Emil Kowalski), `subagent-driven-development` (Jesse Vincent), `simplify-code` / `agent-merge-conflict-arbiter` / `llm-wiki` (Nous Research), `humanizer` (Siqi Chen / `@blader`).
- **Apache License 2.0**: `impeccable` (Paul Bakaus), `frontend-design` (Anthropic).
