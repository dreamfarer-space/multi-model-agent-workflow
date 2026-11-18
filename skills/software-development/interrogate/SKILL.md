---
name: interrogate
description: "Use for 'interrogate', 'adversarial review', 'challenge this', 'stress test this code', or high-risk post-implementation verification. Spawns adversarial subagents to break a change with real executed repros; only findings proven by an actual command run survive."
---

# Interrogate

Adversaries try to break a change or design. A finding survives **only when an actual command/test run proves it**. Report verified findings only; do not silently apply unrequested fixes.

## 1. Frame Scope & Intent

- Scope: what the user names, or the branch diff from merge-base with the base branch (`upstream/main` or `origin/main`) through the working tree.
- State the intent concisely in plain words from the user's request, commits, and PR description. Ask the user if the intent is ambiguous.

## 2. Fan Out Adversarial Probers (`invoke_subagent`)

Spawn 1 to 2 parallel `invoke_subagent` calls (`TypeName="self"` with `Workspace="branch"` or `"share"` for isolated executable repros, or `TypeName="reviewer"` if purely static + existing-test inspection) with this exact mandate:

> Try to break this change. **Do not modify tracked source files in the main working tree** (keep any repro script in an isolated temp/scratch path and clean up, or run read-only/in-memory test probes). Prove each finding with an actual run against the real code—a failing test, repro script, or command output demonstrating wrong behavior. Report each finding with: title, exact command run, actual printed output, and what the intent requires instead. Omit anything you did not actually execute (no style nits, naming opinions, or speculative "what ifs"). "No verified findings" is a valid outcome.

## 3. Independently Verify

For every finding reported by an adversary:
- Re-run the exact command yourself in the current repo/clean environment.
- **Keep** the finding only if the output reproduces the failure AND that failure violates the stated intent.
- **Drop** unverified, speculative, or non-reproducing claims, and merge findings that share one root cause.

## 4. Output

- **Intent**: concise restatement.
- **Verified Findings**: for each surviving finding, the exact command, observed output, and how it breaks the intent. State "No verified findings" if none survive.
- **Dropped**: count of dropped claims and why (e.g., did not reproduce, out of scope, style-only).
