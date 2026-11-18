# workflow — Multi-Model Engineering Workflow Plugin

Native Google Antigravity global plugin bundle for the 5-stage hard-gated engineering & PR workflow.

## Bundled Components

- **`rules/AGENTS.md`**: Always-on global rules covering Plan/Execute & subagent division (`research` / `scout` / `self` / `run_workflow` / `reviewer`), the 5-stage gated dev & PR workflow (Stage 0–4), and privacy/screenshot redlines.
- **`agents/reviewer.md`**: Strictly read-only + CLI independent pre-push auditor (`TypeName="reviewer"`) checking scope drift, security/redaction/concurrency/edge-case risks, `test-value` discrimination, and comment/suppression hygiene.
- **`agents/scout.md`**: Strictly read-only + CLI investigator (`TypeName="scout"`) with `read_file`, `run_command`, `manage_task`, and `search_web` (no file-editing tools) for bounded codebase exploration, `git`/`gh` archaeology, and Phase 1 bug reproduction.
- **`skills/`**: Installed via `bash scripts/install-skills.sh --target antigravity` (see root `README.md`).

## Role & Routing Mapping

| Role | Antigravity Native | Pi / Claude / Magpie Equivalent |
| --- | --- | --- |
| Main Lead (Plan / Execute) | `Gemini 4 Hydrogen (High)` | `antigravity/gemini-4-hydrogen` (`thinking="high"`) |
| Static Code Scout | `invoke_subagent(TypeName="research", ...)` | `subagent(agent="scout")` |
| Shell / Git / Repro Scout | `invoke_subagent(TypeName="scout", ...)` | `subagent(agent="scout")` |
| Coding / Test Worker | `invoke_subagent(TypeName="self", Workspace="inherit" \| "share" \| "branch", ...)` or `run_workflow` | `subagent(agent="worker")` |
| Independent Pre-Push Auditor | `swarm(action="add", name="reviewer", model="gemini-4-carbon-high", workspace="inherit", ...)` (fallback: `invoke_subagent(TypeName="reviewer", Model="pro", ...)`) | `subagent(agent="reviewer", model="antigravity/gemini-4-carbon")` or `/review` |
| Deadlock Escalation | `claude-opus-5-5` (single-turn targeted rescue) | `antigravity/claude-opus-5-5` |
