---
name: how
description: "Use for 'how does X work', code walkthroughs before changing an unfamiliar module, and placement / ownership / layering questions ('where should this live', 'which package owns this'). Produces an onboarding-grade mental model of runtime flow and state."
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem—clear enough to build a working mental model, not a line-by-line narration.

## 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore.

- **Simple** (a single module, small utility, or narrow question like "how does function X work"): read directly or spawn one `invoke_subagent(TypeName="research", Role="Codebase Explorer", Prompt=...)` (or `TypeName="scout"` if shell/git commands are needed) using `references/explainer-prompt.md` (without the explorer-findings section). Go to step 4.
- **Complex** (a subsystem spanning multiple files/packages, cross-process IPC/relay, or full architectural overview): go to step 2.

When in doubt, take the simple path.

## 2. Explore in Parallel (complex only)

Decompose the question into 2 to 4 non-overlapping angles (e.g., entry/UI, transport/IPC, state/persistence, lifecycle/cleanup). Spawn parallel `invoke_subagent` calls (`TypeName="research"` or `TypeName="scout"`, ≤5 concurrent), giving each `references/explorer-prompt.md` and its assigned angle.

## 3. Synthesize (complex only)

Once all scouts return, synthesize into a coherent walkthrough using `references/explainer-prompt.md` (optionally delegating synthesis with `Model="pro"` for large subsystems). Verify key `file:line` citations directly before presenting.

## 4. Present

Use the sections from `references/explainer-prompt.md` (dropping any that don't apply): **Overview**, **Key Concepts**, **How It Works**, **Where Things Live**, **Gotchas**.
