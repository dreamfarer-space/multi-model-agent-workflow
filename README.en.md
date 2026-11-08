# Multi-Model Agent Workflow (`Hermes` × `Magpie`)

**English** | [简体中文](./README.md)

A production-grade, multi-model AI software engineering workflow designed for **Hermes Agent**, **Magpie Gateway**, **Claude Code**, and **Codex**.

This workflow solves two practical problems:
1. **Quota-Aware Model Right-Sizing**: Pair each model's verified 2026 benchmark strengths with its subscription quota mechanics—using a 5-hour-resetting frontier pool (`Gemini 4 Argon`) as the Lead Architect, a 3-family high-throughput rotation pool (`DeepSeek-V4.1-Flash` + `MiniMax-M3.1-Flash` + `Gemini-3.8-Flash`) for parallel subagents, a cross-family reasoning model (`GPT-6.1-Sol`) for blind code review, and `MiniMax-M3.1-Flash` for long-context compression.
2. **Deterministic Engineering Guardrails**: Distill battle-tested practices from Boris Cherny (Claude Code), Jesse Vincent (`obra/superpowers`), Garry Tan (`garrytan/gstack`), Matt Pocock (`grill-me`), Andrej Karpathy (`LLM Council` / `LLM Wiki`), and AI-native engineering (`Lint-as-Memory`, headless state simulation, UI geometry verification) into enforceable rules.

---

## 1. The 5-Role Model Team

See [`docs/benchmarks-2026-11.md`](./docs/benchmarks-2026-11.md) for the full benchmark breakdown.

| Role | Model / Route | Verified Benchmark Strength | Quota & Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **1. Lead Architect (Main Session)** | `antigravity/gemini-4-argon`<br>(`model.default`) | • **DeepSWE v1.1: 77.9%** (beats Opus 5.5 74.2% & Sol 75.2%)<br>• **GraphWalks 128K: 99.7%** (#1 multi-file call-graph recall)<br>• **Roboflow Vision: 87.5%** (#1 vision & OCR)<br>• **LMArena Text 1530 / Math 1542 #1** | Excels at architecture, tightly coupled multi-file edits, React UI (1702 Elo), visual screenshot inspection, and math/control-theory derivations. Because its TTFT is 15–20s, offload broad file scanning to subagents so the main session stays fast and clean. Runs on an isolated Google AI Ultra pool (resets every 5h). |
| **2. Parallel Subagent Swarm** | `group/work`<br>(`routing=rotate, stays=turn`) | • **DeepSeek-V4.1-Flash**: DeepSWE **77.0%**, Terminal-Bench 2.1 **90.6%** (~190 tok/s)<br>• **MiniMax-M3.1-Flash**: LOCA-Bench 256K **60.3% #1**, Automation-Bench **62.8% #1** (~166 tok/s)<br>• **Gemini-3.8-Flash**: LiveCodeBench **89.5%** (~130 tok/s) | Rotating across three distinct providers and model families avoids single-account rate limits, finishes 4-way parallel reconnaissance in ~3 minutes, and combines complementary blind spots. `stays=turn` keeps all tool calls within a subagent turn sticky to the model it started on. Zero-cost `workbuddy/hy4free` sits in `fallback_providers`. |
| **3. Localization & Prose Specialist** | `antigravity/gemini-3.8-flash`<br>(`group/edit`) | • **LMArena Vision (Chinese/Diagrams): #1**<br>• **130 tok/s + strong multilingual fluency** | Pinned to Google AI Pro accounts via Magpie `accountModels`, consuming **0%** of the Ultra account's Argon quota. Handles single-pass multi-locale synchronization (`locales/*.ts`), PR descriptions, and routine vision checks. |
| **4. Context Compression Specialist** | `minimax-code/MiniMax-M3.1-Flash`<br>(`auxiliary.compression`) | • **LOCA-Bench 256K: 60.3% (#1 worldwide)**<br>• **1M context / 524K max output** | Preserves exact `file:line` anchors and falsified hypotheses during long-session compaction without touching frontier quotas. |
| **5. Cross-Family Blind Reviewer & Escalation** | `codex/gpt-6.1-sol:high`<br>(`auxiliary.review`)<br>Escalation: `claude-opus-5-5` | • **GPT-6.1-Sol**: DeepSWE **75.2%**, MultiChallenge **82.0% #1**<br>• **Claude Opus 5.5**: SWE-bench Pro **89.9% #1**, Terminal-Bench 4.0 **66.4% #1** | `GPT-6.1-Sol` performs 2-stage blind review on the final `git diff`. Scarce `Opus 5.5` quota is reserved strictly for single-turn surgical escalation when a bug survives two fix attempts. |

---

## 2. The 5-Stage Engineering Pipeline

1. **Stage 1 — Parallel Recon & Pre-Code Hard Gate (`<HARD-GATE>`)**:
   - Dispatch 3–5 `group/work` subagents to map call chains and return concise summaries (**≤50 lines with `file:line`**, never raw file dumps).
   - Use `grill-me` to resolve open design branches with recommended options (never ask the user for facts discoverable in the repo) and lock `Out of Scope` files before editing.
2. **Stage 2 — Focused Execution & Two-Strike Reset**:
   - Keep tightly coupled UI/store edits under a single writer (`Argon` in the main session); never fragment coupled files or multi-locale updates across 5+ concurrent writers.
   - Follow `vercel-react-native-skills` and `impeccable` (semantic theme tokens only; no magic numbers).
   - Write `// WHY:` comments only (banning AI slop comments that restate what code does).
   - **Two-Strike Rule**: If two consecutive fix attempts fail, stop patching in place, record the falsified hypothesis, and re-plan from root cause.
3. **Stage 3 — 3-Layer Machine Verification**:
   - **Layer 1**: Headless state-machine simulation / TLA+ model checking for concurrency, reconnection, and selection state before launching an emulator.
   - **Layer 2**: Automated `check`, `test`, and bundle/capacity budget assertions.
   - **Layer 3**: UI hierarchy geometry checks (`uiautomator dump` `bounds` or DOM `getBoundingClientRect`) before final screenshot verification.
4. **Stage 4 — Simplification & 2-Stage Cross-Family Blind Review**:
   - Optional 4-agent `simplify-code` pass (`Reuse`, `Quality`, `Efficiency`, `Altitude`).
   - `GPT-6.1-Sol (high)` reviews a self-contained brief + real `git diff` + test output: **Stage 1 checks Spec Compliance (`Missing / Extra / Misunderstood`)** first; **Stage 2 checks Code Quality & Concurrency Safety**.
5. **Stage 5 — Compounding Engineering (`Lint-as-Memory` & `LLM Wiki`)**:
   - Convert recurring bug patterns into deterministic static checks/lint rules so future regressions fail fast at `check` time.

---

## 3. Quick Start

```bash
# 1. Configure Magpie routing groups (group/work, group/edit, group/review, group/duty)
bash scripts/setup-magpie-groups.sh

# 2. Apply Hermes settings (see configs/hermes-config.example.yaml)
hermes config set model.default antigravity/gemini-4-argon
hermes config set delegation.model group/work
hermes config set auxiliary.compression.model minimax-code/MiniMax-M3.1-Flash
hermes config set auxiliary.review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.model codex/gpt-6.1-sol
hermes config set auxiliary.background_review.reasoning_effort high
```

## License

MIT License
