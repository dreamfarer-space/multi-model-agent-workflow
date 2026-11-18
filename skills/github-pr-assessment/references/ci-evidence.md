# Establish CI evidence for a PR

Use this recipe when checks are missing, stale, blocked or inconsistent with the PR page. Keep the target repository, PR URL and full head SHA together throughout the investigation.

## 1. Establish identity before interpreting status

```bash
gh pr view N -R BASE_OWNER/REPO --json url,state,headRefOid,headRefName,headRepositoryOwner,baseRefOid,baseRefName,isDraft,mergeable,mergeStateStatus,statusCheckRollup
gh pr checks N -R BASE_OWNER/REPO
```

For local validation, also inspect `git remote -v`, `git status --short` and `git rev-parse HEAD`. Match the local revision to the PR before quoting its test results. Re-establish identity when switching repositories or resuming from incomplete history; similar branch names and previously inspected files do not identify the active task.

## 2. Resolve missing or stale checks

```bash
gh run list -R BASE_OWNER/REPO --branch HEAD_BRANCH --limit 30 --json databaseId,headSha,event,status,conclusion,url
gh run view RUN_ID -R BASE_OWNER/REPO --json headSha,event,status,conclusion,url,jobs
gh api repos/BASE_OWNER/REPO/commits/HEAD_SHA/check-suites --jq '{total_count,suites:[.check_suites[] | {id,head_sha,status,conclusion,app:.app.slug,latest_check_runs_count}]}'
```

- Match runs to the current PR revision; widen the run search or paginate when the initial listing is insufficient. A branch filter is discovery, not proof of association.
- If a run uses a synthetic pull-request merge SHA, inspect the run's PR association and merge commit parents before discarding it as an old head. A different SHA alone does not establish staleness.
- Query the fork with the same commands when upstream results are empty or comments cite fork CI. Base and fork repositories can have different suites for the same commit. Zero suites in one repository is not a global absence of CI.
- Distinguish check suites from executed jobs: queued third-party suites with zero check runs do not show tests running or passing. Filter API output to relevant status fields instead of dumping app permissions and repository metadata.
- Read the relevant workflow at the tested revision when event or branch filters explain why no run was created. Do not modify workflow files merely to diagnose a missing run.
- When matching runs, suites and checks are all absent after inspecting the base repository and fork, report “no matching CI run was found for the current head at the time of inspection.” Do not infer registration delay, contributor approval or future execution from absence alone. A combined commit status of `pending` with an empty `statuses` array does not establish that a workflow is running. Complete this diagnostic pass once; repeat only for new evidence or an explicitly requested wait, rather than repeatedly listing unchanged runs.

## 3. Diagnose the actual gate or failure

- For `action_required`, open the run details with `gh run view RUN_ID -R BASE_OWNER/REPO` or inspect its API details. Report contributor approval only when the details establish that cause; the conclusion name alone does not specify every possible action.
- For a failed run, inspect jobs and `gh run view RUN_ID -R BASE_OWNER/REPO --log-failed`; name the failed step and distinguish a test assertion from setup, infrastructure or permission failure.
- Keep old runs visibly separate. Attribute an old timeout or failure to its revision and explicit run evidence; do not infer an expiry mechanism from its age alone.
- Avoid empty commits or repeated pushes to resolve an approval gate; new revisions can invalidate approval without addressing the underlying requirement.

### Generated bundles and base-branch fixes

1. Read the failed step's complete relevant diff and the workflow/build script at
   the tested revision. Distinguish source changes from generated module-comment
   paths, whitespace and line endings; a filename match in logs is not a cause.
2. Reproduce the exact failed command at the pinned PR head in a disposable
   worktree, with the workflow's cwd, dependency versions and build mode. For
   bundlers, check both repository-root and package-directory entry points when
   they are supported: relative source comments can depend on the process cwd,
   and wrappers can indent them. Inspect existing normalization rules before
   proposing a source-level repair.
3. If a newer base commit appears to fix the mismatch, inspect its actual patch.
   Test head-plus-base in a second disposable worktree, preserving an exact-head
   result for comparison. Record both input SHAs and the integrated revision;
   never merge the base into the user's active branch merely to assess the PR.
4. Rerun the failed build and tracked-artifact comparison on that integrated
   state. If they pass, conclude only that integration removes the reproduced
   bundle mismatch. Jobs skipped after the original failure remain unverified
   until separately executed; do not promise that updating the base makes all
   CI green.

## 4. Report only what the evidence supports

Lead with the current outcome, then give the relevant run link, revision, validation scope and remaining action in concise Chinese. Count tests from actual summaries; reconcile conflicting counts from execution output before stating a total. If the local revision changed after testing, label those results as previous-revision validation until rerun.

Use separate claims for Git compatibility, local tests, hosted CI and maintainer review. `MERGEABLE` establishes Git compatibility. Awaiting approval establishes that the workflow has not supplied a passing result. Neither warrants “no code defects,” “all checks green,” or a promise that approval will make CI pass or the PR merge.
