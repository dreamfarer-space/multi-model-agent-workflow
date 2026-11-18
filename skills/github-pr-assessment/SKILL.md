---
name: github-pr-assessment
description: "Use when judging a GitHub PR: changes, status, merge odds."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [github, gh, pull-requests, issues, merge, triage, assessment]
    category: software-development
    related_skills: [github, grounded-citations]
---

# GitHub PR / Issue Assessment

Answer read-only questions about GitHub threads, including the user's own PRs:
what a PR changes, how it relates to a linked issue, its current status, whether
it is likely to merge, and how to interpret requested interaction changes.
The bundled `github` skill covers GitHub *operations* (auth, filing issues,
changing PRs, opening/merging PRs); this skill is the read-only assessment layer
on top of it.

## When to Use

- The user points at a GitHub issue or PR and asks what it changes, how it
  works, or how it relates to another thread.
- The user asks whether a PR/fix will be merged, when it will land, or "did
  that get fixed yet?".
- The user is following a contribution or repo event and wants a status read
  plus what to watch next.
- The user asks whether a contribution follows repository conventions or wants
  feedback drafted for the PR author; assess the evidence and return a draft
  without posting when the user intends to send it.
- Use this for assessment of the user's own contribution too. Requests to edit
  code, post feedback, or open/merge PRs belong to the bundled `github` skill.
  For a combined request to explain the change, judge its value and publish
  review findings, use this assessment sequence first and then the `github`
  review workflow. Give a brief Chinese explanation of the user-visible behavior
  and a provisional value judgment before lengthy parallel review; keep feature
  usefulness separate from whether the current implementation can merge. Carry
  explicit posting authorization through to verified delivery, without treating
  that authorization as permission to repair source.
- Honor an explicit read-only scope: inspect and explain without changing code,
  switching the checkout, installing software, or posting comments.

## Procedure

### 1. Read the full thread first

Decisions live in comments, not titles.

- `gh issue view N --repo O/R --comments`
- `gh pr view N --repo O/R --comments`
- Metadata: `gh pr view N --repo O/R --json title,state,body,labels,author,createdAt,additions,deletions,changedFiles,url`
- Event timeline (labels, reviews, cross-references): `gh api repos/O/R/issues/N/timeline --jq '.[] | "\(.created_at) | \(.event) | \(.label.name // .state // "")'"`
- Prefer `gh` over web extraction for GitHub URLs: it returns complete threads
  and metadata and works regardless of which web-extract backend is configured.
- Read long threads in bounded passes; preserve the relevant maintainer comment
  and its author before interpreting intent. Batch independent metadata and
  comment reads, then follow only the evidence needed for the user's question.

### 2. Establish what the PR actually does

- Resolve `headRefOid` and `baseRefOid`, then map the PR body's claims onto real
  source at those revisions. Do not assume a matching local branch is current.
- For a focused question, use the changed-file list to select source files and
  fetch them at `headRefOid` with `gh api repos/O/R/contents/PATH?ref=HEAD_SHA`
  (raw media type). Read relevant functions and their callers before widening.
- For a whole diff, save `gh pr diff N --repo O/R` once to a scratch file and
  search/read it in bounded sections. Keep generated bundles out of the initial
  source review because they can overwhelm the capture window. `gh pr diff`
  does not accept Git-style trailing path filters; select saved diff sections
  or retrieve individual changed files through the API instead.
- Quality signals: tests included, a red-on-base proof, no unrelated churn.
- Note what the body *explicitly declares out of scope* — those disclaimers
  answer half of "does it fix the issue?".

### 2a. Check contribution conventions before drafting feedback

1. Read the target base revision's `CONTRIBUTING`, applicable `AGENTS.md`, PR
   template, title-check workflow and artifact/documentation rules. Use
   `gh api repos/O/R/contents/PATH?ref=BASE_SHA` for relevant files. Sample merged
   PRs only as supporting convention evidence; similar titles do not establish
   a mandatory policy.
2. Separate confirmed policy violations, observable omissions and optional
   improvements. Cite the actual rule for a requirement. Treat a feature branch
   as a recommendation unless policy requires it: a fork's default branch is a
   valid PR source. Recommend Conventional Commit titles when consistent with
   local practice, without inventing an enforced title or commit-message rule.
3. Inspect changed binaries and generated files against the repository's own
   policy. Identify the specific build artifact and suggest Releases or the
   existing distribution route when appropriate; do not declare all binaries
   forbidden, since source assets and intentionally tracked bundles may belong
   in Git. Explain that deleting a file in a later commit leaves it in history;
   offer history cleanup only when repository policy, size or sensitivity
   warrants it, and never present force-pushing a shared default branch as a
   routine requirement.
4. Verify which language documents actually exist and whether they are
   maintained translations before requesting synchronization; invented README
   filenames turn useful feedback into an incorrect checklist.
5. Build any replacement PR description from observed code and attributed
   author reports. Leave unknown device, SDK, build and runtime results as
   explicit placeholders or unchecked tasks. Never pre-check tests, invent
   real-device validation, or infer successful encryption/reconnection from
   implementation files. Describe untested behavior as implemented or claimed;
   praise contribution scope without certifying correctness or security.
6. Return concise, copy-ready Chinese feedback with concrete changes and paths.
   Use a neutral contributor voice unless the user's maintainer role is known;
   do not speak as the authority deciding merge requirements. Include a full
   description template only when useful, and preserve uncertainty inside the
   copyable text itself. A request to draft feedback does not authorize posting.

### 2b. Assess a requested UI interaction change

1. Read the exact comment, current rendered controls, click handlers and relevant
   backend result fields. Stop once they establish the interaction; unrelated
   recent PRs and issue lists do not help answer a narrow UI question.
2. Distinguish placing controls together, replacing them with one state-dependent
   control, and chaining their actions. Present the interpretation as a proposal
   unless the maintainer explicitly chose it; proximity alone does not imply a
   request for automatic installation.
3. Trace each action's effects before recommending a merge: detection, discovery,
   writing configuration, installation and enabling a backend are different
   effects. A control labeled “检测” should not silently install or enable software;
   show a clear installation/configuration action when that next step is needed.
4. For one shared position, describe concrete transitions: checking → available
   with recheck; unavailable → scan/configure or install; working → temporarily
   disabled; failure → visible reason and retry; success → refreshed availability.
   Preserve a way to recheck after the user installs software elsewhere, since a
   cached unavailable result can otherwise keep offering installation forever.
5. Separate configuration success from verified availability. Check whether the
   success handler updates the displayed detection result; do not promise a green
   “检测通过” merely because a path was saved or an install endpoint returned.
6. Describe likely edit locations without guaranteeing that backend code or tests
   need no changes. Such a guarantee requires tracing the proposed behavior and
   its contracts; describe an unimplemented design as a recommendation.
7. Answer in concise Chinese: verdict first, one recommended interaction and a
   small before/after example when useful. Avoid multiple elaborate alternatives,
   decorative headings and unsolicited copy-ready replies when the user only
   asks whether controls can be combined. Return a draft reply when requested;
   drafting never authorizes posting.

### 2c. Reassess an updated PR

1. Refresh the full head/base SHAs, prior review findings and current threads.
   Compare the previously reviewed head with the current head; do not reuse a
   prior verdict or test count as current evidence.
2. Check each prior finding against its actual trigger and expected behavior.
   For configuration changes, verify both absent stored input and explicit
   clearing, then read through the real provider lifecycle; a mock's schema
   assertion alone does not prove runtime persistence or reset semantics.
3. Inspect new changes and relevant callers for regressions beyond the earlier
   findings. Report “no additional defects found in the inspected scope” with
   verification limits; avoid “all core issues solved” or “the only problem”
   unless the evidence actually supports that exhaustive claim.
4. When execution is useful, use a detached disposable worktree at the pinned
   head following the `github` skill's isolated PR checkout procedure. Keep base-integration
   experiments separate from exact-head validation and preserve the user's
   checkout. Diagnose generated-bundle failures with
   [CI evidence](references/ci-evidence.md).
5. Answer briefly in Chinese: current verdict, any supported remaining findings
   with locations, actual checks and material limits. A status reassessment does
   not itself request a new public review; distinguish the old formal verdict
   from the current technical assessment.

### 3. Compare PR against the linked issue

- Walk the issue's "Proposed Fix" / requirements list item by item against the
  diff; report coverage AND remaining gaps.
- Find sibling/competing PRs: `gh pr list --repo O/R --state all --search "<keywords>" --json number,state,mergedAt,title`.

### 4. Judge merge likelihood from repo signals, not vibes

- **Core accounts and merge tempo**:
  `gh pr list --repo O/R --state merged --limit 100 --json author -q '[.[].author.login] | group_by(.) | map({a: .[0], n: length}) | sort_by(-.n)'`,
  then sample `--json createdAt,mergedAt` for the normal creation-to-merge latency.
- **Triage responsiveness**: how fast a maintainer labeled the PR (timeline).
  Fast labels mean it is on the radar; risk labels (`risk-compatibility`,
  `platform-*`, `needs-decision` style) mean a higher review bar.
- **Review fields**: `gh pr view N -R O/R --json headRefOid,baseRefOid,reviewDecision,mergeable,mergeStateStatus`.
  Treat `BLOCKED` as an aggregate gate, not a diagnosis. Read formal reviews,
  current review threads, PR checks and matching workflow runs to identify the
  actual requirement; an empty `reviewDecision` does not prove review is the
  blocker. `MERGEABLE` establishes Git compatibility only.
  If `gh pr checks` reports no checks, follow
  [CI evidence](references/ci-evidence.md): inspect matching workflow runs in
  the base repository and, when needed, the fork; verify the run's revision and
  PR association, including synthetic merge commits. A workflow awaiting
  contributor approval can finish as `action_required` without publishing test
  checks; absence of checks does not establish that CI is unconfigured.
  Confirm the requested action from the run details before attributing it to
  contributor approval. Keep previous-head successes separate from the latest
  head's evidence. A permission gate provides no evidence that tests pass or
  that the code has no defects; report local validation only when execution
  output establishes its revision, scope, count and exit status.
- **Author track record**: `gh pr list --repo O/R --author X --state all`.
- **Salvage pattern**: some repos close a good PR and land its diff as a
  maintainer commit — search commits referencing the PR number
  (`gh search commits '<number>' --repo O/R`). A closed PR then does NOT mean
  the fix failed.
- **Competing PRs**: maintainers often consolidate several rather than pick one
  wholesale; the one with fewer risk labels can move first. Separate signals
  from guesses in the answer.

### 5. Output shape (user preference)

- Chinese. For merge-likelihood questions, give the verdict first (会 / 不会 /
  说不好), then evidence bullets and the signals worth watching. For feedback
  drafting, lead with the copy-ready message and keep any explanation brief;
  do not force merge predictions or a full technical review into that task.
- Split the two claims explicitly: "the fix lands eventually" vs "this PR merges
  as-is" — different odds; answer both separately.
- After an authorized review is published, keep the Chinese chat report to a
  short explanation of the feature, whether the need is worthwhile, the supported
  merge concern, the verified publication link and material testing limits. Do
  not replay the full public review or duplicate it in a severity table. Keep
  severity and uncertainty identical to the evidence-qualified published text;
  missing integration coverage is not itself a demonstrated critical defect.
- Rough odds are fine when labeled as judgment; state plainly what is
  unknowable (maintainer choice). No fabricated precision.
- Offer a follow-up re-check — these states change in days, not weeks, in
  high-velocity repos.

## Pitfalls

- Use `gh`'s built-in `-q` / `--jq` (embedded jq) instead of piping to an
  external `jq` — no extra install, and it always matches the JSON fields you asked for.
- In a `for n in ...; do gh pr view $n ...; done` sweep, add a fallback
  (`|| gh issue view $n ...`) and keep errors visible — one bad number otherwise
  vanishes from loop output and reads as "not found".
- Saving `gh` output from bash for a native read tool: write it to your
  scratch dir with a native path (e.g. `<HERMES_HOME>/cache/scratch/` or `~/.hermes/cache/scratch/`), never
  a bare `/tmp` — under MSYS bash, `/tmp` resolves where native tools do not
  look (`cygpath -w <path>` shows the real Windows path; `$TMPDIR` can be empty
  in-session).
- Validation evidence sometimes lives only in a comment (e.g. a fork's CI run)
  while the upstream branch shows no checks — read the comments before
  concluding "untested".
