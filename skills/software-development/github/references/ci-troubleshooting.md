# CI Troubleshooting Quick Reference

Common CI failure patterns and how to diagnose them from the logs.

## Reading CI Logs

1. Resolve the PR's full `headRefOid` with `gh pr view <PR> --repo <OWNER/REPO> --json headRefOid,statusCheckRollup`, then read `gh run view <RUN_ID> --repo <OWNER/REPO> --json headSha,event,status,conclusion,jobs` to identify the failed job and step. If `gh run list --commit <SHA>` returns empty, retry with the full SHA and inspect `gh pr checks` plus recent candidate runs; an abbreviated SHA or a PR merge-ref run can make a narrow filter miss relevant CI. Compare the run event and SHA before using its result. For several independent PRs, collect their checks together and compare run SHAs and events; a passing PR run does not prove the later base-branch push uses identical source, dependencies or workflow conditions.
2. Fetch logs for the failed job with `gh run view --job <JOB_ID> --repo <OWNER/REPO> --log-failed`. When a verifier prints a large generated diff, redirect the log to a scratch file and search for the step command, mismatch paths and error with bounded context. Do not flood the conversation with whole bundles, source maps or recursive dependency searches; they hide the actionable failure and waste review context.
3. Diagnose completed failures as soon as they appear, even while unrelated matrix jobs remain pending. Fetch the failed job's logs and classify the failing phase before polling again; repeated unchanged check lists cannot explain an already-red job. For a slow running job, inspect its active step rather than treating duration as a failure.
4. If tool output was truncated and saved, search the saved file instead of fetching the same full log again. Read only the relevant ranges, then inspect the verifier and affected source files.
5. If the check rollup contains only DCO or another lightweight check, inspect recent workflow runs with `gh run list --repo <OWNER/REPO> --branch <HEAD_BRANCH> --limit 10`, then inspect candidate runs' `headSha,event,status,conclusion,jobs` and match them to the current PR. A completed run with `conclusion: action_required` has stopped at a workflow approval gate; it does not mean tests ran. Check the run URL and API/UI approval status to identify the gate. Approve only if authorized and permitted; otherwise report the exact run link and the maintainer approval needed. Repeated polling cannot clear this gate, and a green DCO is not evidence that Actions executed.

```bash
# With gh
gh run view <RUN_ID> --repo <OWNER/REPO> --log-failed

# With curl — download and extract
curl -sL -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/actions/runs/<RUN_ID>/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip && unzip -o ~/.hermes/cache/scratch/ci-logs.zip -d ~/.hermes/cache/scratch/ci-logs
```

## Common Failure Patterns

### Test Failures

**Signatures in logs:**
```
FAILED tests/test_foo.py::test_bar - AssertionError
E       assert 42 == 43
ERROR tests/test_foo.py - ModuleNotFoundError
```

**Diagnosis:**
1. Find the test file and line number from the traceback
2. Use `read_file` to read the failing test
3. Compare the failing assertion with the intended contract and inspect fixture prerequisites before deciding whether source or test is wrong. For routing mocks, distinguish target dispatch calls from auxiliary session/workspace lookups; assert method and payload separately when those lookups are allowed. For security-sensitive changes, follow `systematic-debugging`'s implementation rules before adding compatibility fallbacks: an omitted resolver in a mock does not establish that production may safely omit validation.
4. Look for `ModuleNotFoundError` — usually a missing dependency in CI

**Common fixes:**
- Update assertions or fixtures only after establishing the intended contract; do not loosen security checks or inflate call counts merely to turn the test green
- Add missing dependency to requirements.txt / pyproject.toml
- Fix flaky test (add retry, mock external service, fix race condition)

---

### Configuration / Verifier Contract Drift

1. Identify the exact failed verifier command and assertion location. Read both
   the expected contract and the actual configuration printed by the failure;
   passing typechecks or bundle-diff checks do not establish that this verifier
   passed. Report downstream test/build steps skipped after the failure as not run.
2. Inspect history for both files together with
   `git log -n 5 -p <BASE_SHA> -- <CONFIG_PATH> <VERIFIER_PATH>` to locate a change
   that removed or changed configuration while leaving its verifier unchanged.
   Use the actual base revision, not an unrefreshed remote-tracking name.
3. Find a comparable base push run with
   `gh run list --repo <OWNER/REPO> --branch <BASE> --limit 5`, then read its SHA,
   failed step and relevant log excerpt. Attribute the failure to the base only
   when the same assertion and actual/expected mismatch occur at that revision;
   otherwise reproduce the verifier in an isolated base checkout. An unchanged
   verifier file or a red base badge alone is insufficient evidence.
4. Establish the intended activation/configuration contract from source, policy
   and the introducing change before choosing a fix. The implementation may need
   restoration, or the verifier may be obsolete; do not delete an assertion solely
   to get green CI. A diagnosis-only request authorizes reporting the cause and
   evidence, not an unrelated source repair or review submission.
5. Refresh the current run attempt and conclusion before reporting. Approval gates
   and reruns can change a run's state without changing its ID. Keep the final
   explanation brief: concrete mismatch, evidence linking it to the base, and
   checks that remain failed or unexecuted.

---

### Lint / Formatting Failures

**Signatures in logs:**
```
src/auth.py:45:1: E302 expected 2 blank lines, got 1
src/models.py:12:80: E501 line too long (95 > 88 characters)
error: would reformat src/utils.py
```

**Diagnosis:**
1. Read the specific file:line numbers mentioned
2. Check which linter is complaining (flake8, ruff, black, isort, mypy)

**Common fixes:**
- Run the formatter locally: `black .`, `isort .`, `ruff check --fix .`
- Fix the specific style violation by editing the file
- If using `patch`, make sure to match existing indentation style

---

### Type Check Failures (mypy / pyright)

**Signatures in logs:**
```
src/api.py:23: error: Argument 1 to "process" has incompatible type "str"; expected "int"
src/models.py:45: error: Missing return statement
```

**Diagnosis:**
1. Read the file at the mentioned line
2. Check the function signature and what's being passed

**Common fixes:**
- Add type cast or conversion
- Fix the function signature
- Add `# type: ignore` comment as last resort (with explanation)

---

### Build / Compilation Failures

**Signatures in logs:**
```
ModuleNotFoundError: No module named 'some_package'
ERROR: Could not find a version that satisfies the requirement foo==1.2.3
npm ERR! Could not resolve dependency
```

**Diagnosis:**
1. Check requirements.txt / package.json for the missing or incompatible dependency
2. Compare local vs CI Python/Node version

**Common fixes:**
- Add missing dependency to requirements file
- Pin compatible version
- Update lockfile (`pip freeze`, `npm install`)

---

### Dependency Installation Fails Before Tests

1. Identify the exact failed install command, package-manager version, runner OS and error path. Separate installation failure from test results: other matrix shards passing does not prove that the failed shard ran its tests. If interpreter setup fails, read the actual runner image/version and setup action identifier from the workflow and logs; do not infer either from `ubuntu-latest` or reconstruct an action name from memory. A passing container with the same Python version verifies that container's runtime only, not the failed host shard. Treat a runner pin or matrix change as a proposed fix until it has actually executed.
2. For an isolated temporary-path, rename or downloaded-toolchain archive error, preserve the failed-run evidence and rerun only failed jobs on the same revision with `gh run rerun <RUN_ID> --repo <OWNER/REPO> --failed`. Read the new attempt with `gh run view <RUN_ID> --repo <OWNER/REPO> --json headSha,attempt,status,conclusion,jobs` and verify the failed step and dependent checks. Keep the attempt number with the evidence: rerunning reuses the run ID, so that ID alone cannot distinguish the original failure from recovery. If the rerun needs approval, follow the approval-gate procedure above.
3. Treat file locking, installation concurrency, download corruption and network causes as hypotheses unless logs or reproduction support the specific mechanism. A successful unchanged rerun supports calling the failure transient; it does not identify the exact cause. Report the observed failed step/error and the unchanged rerun outcome without turning a plausible explanation into a confirmed diagnosis. If it recurs, reproduce the workflow's install or toolchain setup, inspect the relevant cache and downloaded artifact, and check install concurrency before proposing dependency or workflow changes.
4. Update the base only when integration is needed for the requested repair, conflict resolution or repository policy. Merging a large unrelated base changes the tested revision and may introduce new approval gates; it does not verify that the original installation failure recovered.

---

### Permission / Auth Failures

**Signatures in logs:**
```
fatal: could not read Username for 'https://github.com': No such device or address
Error: Resource not accessible by integration
403 Forbidden
```

**Diagnosis:**
1. Check if the workflow needs special permissions (token scopes)
2. Check if secrets are configured (missing `GITHUB_TOKEN` or custom secrets)

**Common fixes:**
- Add `permissions:` block to workflow YAML
- Verify secrets exist: `gh secret list` or check repo settings
- For fork PRs: some secrets aren't available by design

---

### Timeout Failures

**Signatures in logs:**
```
Error: The operation was canceled.
The job running on runner ... has exceeded the maximum execution time
```

**Diagnosis:**
1. Check which step timed out
2. Look for infinite loops, hung processes, or slow network calls

**Common fixes:**
- Add timeout to the specific step: `timeout-minutes: 10`
- Fix the underlying performance issue
- Split into parallel jobs

---

### Docker / Container Failures

**Signatures in logs:**
```
docker: Error response from daemon
failed to solve: ... not found
COPY failed: file not found in build context
```

**Diagnosis:**
1. Check Dockerfile for the failing step
2. Verify the referenced files exist in the repo

**Common fixes:**
- Fix path in COPY/ADD command
- Update base image tag
- Add missing file to `.dockerignore` exclusion or remove from it

---

## Auto-Fix Decision Tree

```
CI Failed
├── Test failure
│   ├── Assertion mismatch → update test or fix logic
│   └── Import/module error → add dependency
├── Lint failure → run formatter, fix style
├── Type error → fix types
├── Build failure
│   ├── Missing dep → add to requirements
│   └── Version conflict → update pins
├── Permission error → update workflow permissions (needs user)
└── Timeout → investigate perf (may need user input)
```

## Repair an Existing PR and Verify the Final Head

1. Read the target before changing anything:
   ```bash
   gh pr view <PR> --repo <OWNER/REPO> --json baseRefName,headRefName,headRefOid,statusCheckRollup
   gh pr checks <PR> --repo <OWNER/REPO>
   gh run view <RUN_ID> --repo <OWNER/REPO> --log-failed
   ```
   Match the failed run's head SHA to the PR head; an older failed run does not establish that the current revision is broken. Read the workflow command for the failing step and reproduce that command locally.
2. For committed generated artifacts, use the procedure below before changing source behavior or disabling the check.
3. Run the relevant local checks. When GPT review is requested, supply the final source/generated diff, the failed-step evidence and actual verification output; retain the returned model metadata and verdict outside the repository. Re-review substantive fixes made after that verdict. A model's approval is separate evidence from passing CI.
4. Stage explicit paths, commit and push, then read back `headRefOid` and compare it with the pushed commit. Read back the PR body after any edit as well; use a Markdown file and `gh pr edit ... --body-file <file>` to preserve code and backticks safely.
5. Inspect the new run and all its downstream jobs:
   ```bash
   gh pr checks <PR> --repo <OWNER/REPO>
   gh run view <RUN_ID> --repo <OWNER/REPO> --json headSha,status,conclusion,jobs
   gh run view --job <JOB_ID> --repo <OWNER/REPO>
   ```
   A pending check is not a failed check; `gh pr checks` returns exit code 8 when checks are pending, so inspect its rows before classifying a nonzero exit as a command failure. After pushing, an empty check list or a lone skipped bot can precede Actions registration: inspect recent branch runs and verify their head/event before choosing the run to follow. Keep CLI transport failures separate from retrieved check data; retry a failed API read with bounded backoff rather than converting it through `|| true` into a successful empty result. Parse structured run/job status and conclusion instead of grepping serialized JSON for a generic `completed`, because an individual completed job can coexist with a running workflow. Use job step status to distinguish active compilation from a completed failure. For structured step inspection, request `gh run view <RUN_ID> --repo <OWNER/REPO> --json jobs,status,conclusion` and select the target job by ID or name, then inspect its nested `steps`; `steps` is not a top-level JSON field. Reduce the result to job status and the active or failed step rather than repeatedly printing every completed setup step. If logs are unavailable until completion, stop requesting them unchanged. Use bounded waits of at most 60 seconds between reads and keep the user informed during longer builds.
6. Finish only after the applicable jobs for the verified head reach terminal states. Collect the complete structured check list and compute separate success, failure, skipped/cancelled and pending counts programmatically when reporting totals; count each check once and retain the failures in the opening result. Say “N passed; M failed” rather than calling the CI entirely green and appending an exception. Distinguish pass, failure and skip explicitly; a passing main test job does not prove downstream APK or package jobs passed. Do not use a query filtered to `status != completed` as the final success check: it hides completed failed, cancelled and timed-out jobs. Re-read the complete check list and workflow conclusion for each target repository, then verify the PR head stayed unchanged. `MERGEABLE` means Git can combine the branches; `BLOCKED` requires inspecting checks, reviews or protections rather than claiming merge readiness. If reporting before completion, name the pending matrix jobs per PR and preserve that uncertainty in the last sentence as well. Keep the final report to the PR link, concrete fix, actual review/check results and any remaining limitation.

## Committed Generated Bundle Drift

1. Read the verification script and package build scripts to identify source inputs, tracked outputs and the exact generator. Compare the failed output with a clean regeneration; inspect the resulting diff rather than assuming a runtime defect.
2. Run the repository's standard generator instead of editing compiled JavaScript or copying source into a bundle. Hand edits can leave duplicated modules or change initialization order, while the next canonical build overwrites them. In a monorepo, inspect whether the bundler consumes sibling packages' `dist` outputs; if so, use the canonical build that rebuilds those dependencies in order. Running only the leaf bundle script can reuse stale dependency output and leave Git clean despite a failing clean-build verifier. A clean working tree after that leaf command is not a passing artifact check; run the exact verifier after the complete build.
3. If local regeneration stays clean while CI generates a large dependency diff, compare dependency resolution before changing source or the lockfile. Read CI's Node/package-manager versions and install flags, then reproduce them in an isolated checkout with `pnpm install --frozen-lockfile` (or the repository's equivalent). Inspect resolution from the package that runs the bundler, not just the workspace root:
   ```bash
   pnpm --filter <BUNDLE_PACKAGE> exec node -p "require.resolve('zod')"
   pnpm --filter <BUNDLE_PACKAGE> why zod
   ```
   Compare resolved entry paths, installed versions, package `exports` and bundler conditions with the modules named in the generated diff. A package exposing both compatibility and current APIs can produce different bundles through different entries, even when its package name or reported version looks correct. For example, Zod's `v3` compatibility entry and `v4/classic` entry contain different implementations. Treat `require.resolve` as a diagnostic clue: verify the entry actually selected by the bundler from its output or metadata, because import/require conditions can differ. Do not infer the original author's environment from the bundle alone; state only the resolution difference the evidence establishes. If a clean lockfile install reproduces CI, regenerate with that environment and preserve the lockfile unless an actual dependency change is needed.
4. Re-run the exact artifact verifier and relevant type/test checks. Inspect generated changes for unexpected code, secrets or unrelated outputs, and commit only the outputs required by repository policy. After committing the regeneration, run the canonical generator and verifier again and check `git diff --exit-code -- <TRACKED_OUTPUTS>`; the second build must leave the committed outputs unchanged. A pre-commit diff against the old artifact is expected and is not proof of nondeterminism. Do not suppress the verifier or change expected output merely to hide drift.
5. If the drift appears inherited from the base branch, use `gh run list --repo <OWNER/REPO> --branch <BASE> --limit 5` to locate a comparable push run, then inspect its head SHA, failed step and artifact paths. Verify the same mismatch at that base revision, using a clean isolated checkout and the canonical generator when logs do not establish it. Several failed base runs or earlier passing PR checks alone are insufficient. Keep the explanation at the level established by the diff; bundle mismatch alone does not establish who edited it or how. Until the comparison is complete, report an upstream cause as a hypothesis and retain the current PR's failed status.
6. If updating the base is necessary, preserve local work, integrate the current target branch and regenerate against the integrated source. Give the reviewer both source and generated diffs; reviewing only the source omits the artifact actually shipped.
