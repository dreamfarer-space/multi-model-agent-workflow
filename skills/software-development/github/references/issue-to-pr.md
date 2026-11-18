# GitHub Issue to Pull Request

Turn a GitHub issue into a tested, verified PR. This skill owns the end-to-end discipline — premise validation, duplicate sweeps, class-level fixes, and honest CI reporting; the sibling GitHub and development skills own their own mechanics.

## When to Use

- "Fix issue #123 and open a PR."
- "Implement this GitHub feature request."
- "Take this bug from issue to green CI."

Don't use for: reviewing an existing PR, or answering a code question with no requested change.

## Procedure

### 1. Read the live issue — body AND full thread

Use `run_command` to run `gh issue view <N> --comments`. The body is a snapshot from filing time; the newest comments carry the live state: partial fixes already merged, new root-cause analyses, maintainer decisions, or questions directed at you that change the task. Also read repository instructions (`AGENTS.md`, contribution docs) with `read_file`. Done when the currently requested behavior, non-goals, and any unanswered thread questions are known.

### 2. Sweep for existing and duplicate work

Resolve the actual upstream with `git remote -v`, fetch its default branch with `git fetch <upstream> <base>`, and record `git rev-parse <upstream>/<base>` before choosing the working baseline. Do not infer freshness from `git status` saying a branch is up to date: that compares against a local tracking ref, which may be stale or belong to the fork. Compare the requested behavior with this fetched revision and preserve unrelated local changes when choosing a branch or worktree.

Before writing anything, run `gh pr list --search "#<N>" --state all` plus at least two keyword/synonym variants of the symptom (`gh pr list --search "<subsystem> <symptom>" --state open`). Popular issues attract multiple independent fixes; building a duplicate wastes the work and the credit. Also check whether a recent commit already fixed it: `git log --oneline -20 -- <relevant files>`. Done when you know every open PR and recent commit touching this issue, or that none exist.

### 3. Validate the premise against current code — and against design intent

Reproduce the bug or demonstrate the missing behavior on the current default branch with a failing test or fixture, using `run_command` and `read_file` to trace the reported path. Then check the second question: is the "bug" actually deliberate design? Run `git log -p -S "<symbol>"` on the code the issue wants changed and read the original commit's intent — a missing link or restriction is often the feature. Challenge stale or flawed issue prose instead of implementing it blindly. Done when the root cause or feature gap is demonstrated in current code AND the change doesn't fight an intentional design.

### 4. Define acceptance and risk

List acceptance criteria, interfaces, migrations/state changes, compatibility, security/privacy, rollout, and rollback. Map every criterion to a test or explicit verification. If the user requests only part of a broader issue, record the excluded items and use `Refs #<N>` rather than an automatic closing keyword in the PR and commit messages.

For parallel implementation, assign non-overlapping file ownership and the same fetched baseline to each child. Give each child its acceptance criteria, verification commands and explicit non-goals; have the integrator own shared generated bundles. Require returned diffs or commits and real test outputs, then inspect the combined patch and run its affected checks before submission: isolated child passes do not establish that the integrated result works. Done when review has a finite contract.

### 5. Implement the smallest complete change — and fix the class

Work on an isolated branch or worktree, loading `systematic-debugging` or `test-value` when the bug class calls for them. Add regression tests first, then implement. When the fix is in hand, `grep` for the same bug shape at sibling call sites and fix the whole class in this PR — an incomplete fix that leaves known siblings broken is worse than none. Every changed line must trace to the issue; no drive-by cleanup. Done when targeted tests pass, the original failure no longer reproduces, and sibling sites are fixed or explicitly ruled out.

### 6. Prove the regression test bites (sabotage run)

Temporarily restore the old behavior of the exact function under test, run the new test, and confirm it FAILS; then restore the fix and confirm it passes. A regression test that passes with and without the fix proves nothing. Done when the test demonstrably fails on pre-fix code.

### 7. Run repository quality gates, then open the PR immediately

Run the formatter, lint, typecheck, and the repo's canonical test entrypoint on affected areas; for ≥2 source files or state/security/protocol changes, run independent review via `invoke_subagent(TypeName="reviewer", Role="Independent Pre-Push Reviewer", Prompt=...)` on the diff. Then push and open the PR right away — the PR is what dispatches CI, and CI latency is the long pole; do not sit on finished work. Route PR creation by repo rules (`yeet`, or `github` → `references/pr-workflow.md` as fallback): conventional branch/commit, body linking the issue with problem, approach, tests, risk, and exclusions. For screenshot evidence, follow the repo's visual-evidence procedure before publishing. Read the PR back and verify head SHA, base, title, and files. Done when the PR exists with the intended diff and CI is running.

### 8. Shepherd CI honestly and close the loop

Read `gh pr view <N> --repo <repo> --json headRefOid` and collect `gh pr checks <N> --repo <repo>` plus the matching workflow run. After the main test/build job passes, refresh the full check list: dependent Android, npm or extension packaging jobs may only appear at that point. Continue through required downstream jobs, inspect each terminal conclusion, and re-read the PR head before binding results to the submitted revision. Use `gh run view <run-id> --repo <repo> --json status,conclusion,jobs` to inspect a pending job's active step; use `--log-failed` after a failure. Monitor at a bounded cadence and communicate material stage changes rather than filling the session with identical full job dumps.

Distinguish failures introduced by the diff from baseline or infrastructure failures using controlled comparison. Rerun a suspected transient failure at the same head before changing code merely to retrigger CI. If execution is externally blocked, name the exact pending gate and retain its run URL; a green primary job alone does not complete the workflow.

Before final delivery, reconcile every requested item against its evidence: submitted head, actual tests, independent review of the final patch, and requested screenshots saved and rendered in the PR description. Mark missing items incomplete and continue authorized work where possible; a long implementation report cannot substitute for an omitted deliverable. Keep this user's final chat reply short: PR link, commit, verified checks/review/screenshots, and remaining gates. Store implementation detail and the captioned gallery in the PR.

A request to submit a PR ends with the verified open PR and its requested evidence, without merging or posting a separate issue update. Include the issue link in the PR body; post an issue comment only when explicitly authorized. Never say "green," "merged," or "released" without live evidence of that exact state.

## Pitfalls

- Coding before reading issue comments, sweeping for duplicate PRs, or reading current code.
- "Fixing" behavior that the original commit shows is intentional design.
- Fixing a symptom at one call site while sibling sites keep the same bug.
- Shipping a regression test that also passes without the fix.
- Opening a PR with unrun tests or unrelated formatting churn.
- Claiming the issue is delivered because a PR exists.

## Verification

- [ ] Full issue thread read; newest comment state reflected in the plan.
- [ ] Duplicate-PR sweep run with issue number + 2 keyword variants.
- [ ] Premise reproduced on current code; design intent checked via git history.
- [ ] Regression test proven to fail without the fix.
- [ ] Sibling call sites fixed or explicitly ruled out.
- [ ] Every changed line traces to the issue.
- [ ] Full CI state, including downstream packaging, checked at the submitted head; skipped, failed or blocked jobs identified separately.
- [ ] Requested review and screenshot evidence verified individually; selected screenshots render in the saved PR description.
- [ ] Final reply states the PR link, commit, actual verification and remaining limits concisely; no unsolicited issue comment or merge.
