---
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for 'architect this', 'design this', or non-trivial multi-file work where jumping straight to code risks locking in the wrong shape."
---

# Architect

Sketch types, function signatures, and module boundaries with `not implemented` bodies and pseudocode first. Explore at least two distinct structural shapes, screen against red flags, then implement against the chosen contract.

## Workflow Phases

1. **Ground** (`how` / `why`)
2. **Sketch** (2+ distinct candidates)
3. **Agree** (pause when user asks or design forks exist)
4. **Implement** (against the sketch)
5. **Scrap** (redesign if implementation friction piles up)

## Phase A: Ground the Problem

Build a real mental model of every system the new code touches. Run `how` over the relevant subsystems. If the design changes existing ownership, layering, or safeguards, also run `why` on the existing shape so historical rationale becomes an explicit constraint. (Skip only for genuinely greenfield standalone code.)

## Phase B: Sketch (Design It Twice)

Generate **at least two structurally distinct candidate shapes** (whole-shape alternatives, not minor tweaks inside one shape). For complex designs, fan out 2 parallel `invoke_subagent` planners (`TypeName="scout"` or `TypeName="research"` with distinct architectural mandates) using `references/runner-prompt.md` + Phase A grounding artifacts.

Screen every candidate against `references/design-red-flags.md` before choosing:
- Assume the next contributor sees only opened files and copies the nearest example—prefer designs where local changes remain globally safe.
- Compare interface depth: prefer the design that hides more complexity behind a smaller, clearer public surface.
- Synthesize one winning sketch and fill the "Synthesis decision" section in `references/rationale-template.md`.

## Phase C: Agree

- If the design has unresolved product forks or the user asked to review before coding (or via `grill-me`), surface the synthesized sketch and confirm before editing production files.
- For high-risk designs, optionally run `interrogate` on the sketch before implementing.

## Phase D: Implement Against the Sketch

Replace `not implemented` bodies and pseudocode with real code. Treat the sketch as the contract: if an implementation function suddenly needs unexpected parameters or bypasses, stop and inspect whether the sketch is flawed, a requirement was missed, or scope is creeping.

## Phase E: Scrap When the Architecture Is Wrong

If implementation produces a pattern of friction the sketch cannot absorb—repeated workarounds across callers, `any`/type casts to force compilation, surprise locks for supposedly unshared state, or callers needing internal rules—**stop patching and scrap the sketch**:
1. Re-ground with `how` over what exists.
2. Subtract unnecessary layers before adding new ones.
3. Redesign from the true constraints (Phase B) rather than stacking patches.

## Outputs

Write caller usage first and derive types from it (one file of types/signatures for small work; module map + types for larger work), alongside a concise rationale shaped per `references/rationale-template.md`.
