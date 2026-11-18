---
name: correct
description: "Find mistakes agents keep repeating in a repo and make each one impossible, ordered by strength: architecture first, then types, then lint with actionable errors, then behavioral tests, and docs/AGENTS.md last."
---

# Correct

The operator keeps correcting agents in this repo for the same mistakes. Change the repo so the next agent cannot make them.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Design the repo so a change that looks right from one file is right for the whole repo.

## Find the Mistake Classes

Read recent commits, reverts, review comments, agent instruction files, and comments that explain workarounds. Group the mistakes into classes (a class counts once it has happened twice).

## Fix Each Class at the Highest Level That Works

1. **Eliminate it with architecture.** Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy.
2. **Enforce it with types so the bad state cannot be written.** If bad code still compiles, add a lint or CI check whose error message names the exact file, type, or function to use instead. If the pattern is already common, fail only when a change adds new occurrences.
3. **Test the behavior.** Fix or delete any test that still passes when the behavior it checks breaks, or that fails when only the internals change (align with `test-value`).
4. **Write docs or agent rules last, only for judgment calls.** Rules without enforcement get skipped under pressure.

## Fix and Prove

Fix the prioritized classes cleanly (one logical commit per class). Prove each new check actually fails on a real past mistake, and verify the same command runs locally and in CI. Any exception must sit on the offending line with a reason and expiry.

## Keep the Rule Table

Maintain a concise rule-to-enforcement mapping in the repo's agent instructions. When corrected on a repeat mistake, fix both the mistake and add a higher-level enforcement; drop a rule once the architecture/type system makes it impossible.

**Reply:** list each mistake class with its evidence, the enforcement level chosen, and why a higher level was or was not feasible.
