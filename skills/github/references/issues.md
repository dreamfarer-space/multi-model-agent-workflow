# GitHub Issues Management

Create, search, triage, and manage GitHub issues. Each section shows `gh` first, then the `curl` fallback.

## Prerequisites

- Authenticated with GitHub (see `references/auth.md` in this skill)
- Inside a git repo with a GitHub remote, or specify the repo explicitly

### Setup

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python "${GITHUB_SKILL_DIR:-${ANTIGRAVITY_PLUGIN_DIR:-$HOME/.gemini/config/plugins/workflow}/skills/github}/scripts/git-credential-token.py")
    fi
  fi
fi

REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

---

## 1. Viewing Issues

**With gh:**

```bash
gh issue list
gh issue list --state open --label "bug"
gh issue list --assignee @me
gh issue list --search "authentication error" --state all
gh issue view 42
```

**With curl:**

```bash
# List open issues
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?state=open&per_page=20" \
  | python -c "
import sys, json
for i in json.load(sys.stdin):
    if 'pull_request' not in i:  # GitHub API returns PRs in /issues too
        labels = ', '.join(l['name'] for l in i['labels'])
        print(f\"#{i['number']:5}  {i['state']:6}  {labels:30}  {i['title']}\")"

# Filter by label
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?state=open&labels=bug&per_page=20" \
  | python -c "
import sys, json
for i in json.load(sys.stdin):
    if 'pull_request' not in i:
        print(f\"#{i['number']}  {i['title']}\")"

# View a specific issue
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  | python -c "
import sys, json
i = json.load(sys.stdin)
labels = ', '.join(l['name'] for l in i['labels'])
assignees = ', '.join(a['login'] for a in i['assignees'])
print(f\"#{i['number']}: {i['title']}\")
print(f\"State: {i['state']}  Labels: {labels}  Assignees: {assignees}\")
print(f\"Author: {i['user']['login']}  Created: {i['created_at']}\")
print(f\"\n{i['body']}\")"

# Search issues
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/search/issues?q=authentication+error+repo:$OWNER/$REPO" \
  | python -c "
import sys, json
for i in json.load(sys.stdin)['items']:
    print(f\"#{i['number']}  {i['state']:6}  {i['title']}\")"
```

### Checking whether a symptom already has a report

1. Freeze the repository from the supplied URL and the symptom's direction:
   which client performs the action, which system should receive it, and what
   is missing. Use `--repo OWNER/REPO` explicitly; a similarly named fork or
   companion project is a separate search scope.
2. Batch a few distinct searches with
   `gh issue list --repo OWNER/REPO --state all --limit 100 --search 'SYMPTOM' --json number,title,state,url,body`.
   Search the action, missing result and component separately before trying
   more synonyms. With `gh api search/issues`, add `repo:OWNER/REPO is:issue`
   because that endpoint also returns pull requests. Deduplicate by URL; do
   not spend successive rounds permuting nearly identical phrases.
3. Read plausible matches with
   `gh issue view ISSUE_URL --json url,title,state,body,comments` before choosing
   another search. Generic titles and broad token matches require body inspection.
   Compare action, destination, version and lifecycle; a disconnect report or a
   reverse-direction visibility failure is adjacent evidence until the report
   establishes the same symptom. If a result limit is reached, paginate or narrow
   the query before implying complete coverage.
4. Widen to the companion repository only when the symptom crosses that boundary
   or the first scope lacks a match. Keep each report attributed to its repository.
   If release applicability matters, retrieve the applicable release metadata;
   default-branch code and a reporter's word “latest” do not identify the installed
   build. An issue being closed alone does not prove a fix reached that build.
5. Stop when read reports support an exact match or a bounded negative conclusion.
   Inspect source only when it resolves a material ambiguity. Fetch each relevant
   file once at a fixed revision and inspect nearby definitions and callers from
   that copy instead of repeatedly fetching the whole file for individual lines.
6. Reply briefly in Chinese: exact match found, related report only, or no match
   found in the searched scope; include direct links and the one relevant difference.
   Do not require identical titles to call a symptom a match, and do not describe
   speculative behavior as common or confirmed. Offer a distinguishing check only
   when needed; keep inferred root causes and workarounds explicitly unverified.

## 2. Creating Issues

### Evidence-first submission sequence

1. **Discover policy and existing reports.** Read the repository's contribution
   instructions and issue templates. Search open and closed reports with
   `gh issue list --repo OWNER/REPO --state all --search 'distinctive symptom'`;
   read plausible matches with `gh issue view NUMBER --repo OWNER/REPO --comments`.
   Prefer adding new evidence to an exact existing report instead of creating a
   duplicate; if a distinct report is justified, state how its scope differs.
2. **Collect a bounded evidence bundle before drafting.** Record the user's
   exact symptom and available environment details. For API failures, include the
   exact model/endpoint, HTTP status, and sanitized response. Mark unavailable
   details as unknown; do not turn 'camera and photos do not work' into a report
   of crashes, permission alerts, or a particular picker failure without evidence.
   Qualifiers such as 'may' do not make invented symptoms acceptable. Separate the
   affected installed version from versions read in repository manifests; a source
   build number or latest tag does not identify the user's installation. Attribute
   related reports rather than presenting their environment as personally tested.
   Do not broaden one failed request to 'all calls fail' or claim a control request
   succeeded without its saved request and response. Keep platform and frequency
   fields within the evidence: distinguish user-reported recurrence from a measured
   reproduction, and do not expand a single-platform report to every platform from
   shared code alone. Use the log section only for captured, sanitized output;
   put constructed protocol payloads in a separate illustrative-example section
   with an explicit label. Never supply invented timing, model or task-result
   values as execution evidence. Keep account identifiers and credentials private.
3. **Inspect version-matched source only as needed.** Save relevant files and
   inspect narrow function ranges, rather than repeatedly fetching the same file
   for individual symbols. Link source at a commit or version. Distinguish installed
   behavior from newer default-branch code. Stop once the symptom and useful
   localization are established; submitting a reproducible issue does not require
   reverse-engineering the entire provider.
4. **Separate observations from hypotheses.** Structure the report as symptom,
   reproduction, expected/actual behavior, environment, and optional investigation
   clues. A `disabled` field being retained can establish a source observation;
   a `-disabled` suffix or 404 alone does not establish account eligibility or
   upstream field values. Ordinary family/effort grouping is not automatically a
   second defect. Recommend filtering only when unavailability semantics are
   supported; do not propose stripping a suffix to force a request onto another
   model or deduplicating by display name without protocol evidence.
5. **Draft and review from the same intact artifact.** Use Gemini for repository
   prose and GPT-6.1 sol with high reasoning for review, as required by SKILL.md.
   Give both the evidence bundle, source excerpts/links, and exact draft. A review
   model's prose is not a source of new facts. If it reports missing code blocks
   or identifiers, inspect and repair the input artifact before accepting the
   review; do not publish a rewrite based on corrupted input.
6. **Build the payload as a file.** Write `issue-body.md` with the file-writing
   tool; construct model API JSON from that file in a saved script. Avoid
   `python -c "...Markdown..."` and inline double-quoted shell payloads: Bash
   evaluates backticks even inside apparent Python string literals. If this
   happens, regenerate the file from original text with a safe write, then repeat
   review; a zero exit code does not show the Markdown survived. Before submission,
   check that model IDs, code fences, request examples, and the observed error are
   intact and that every factual claim has evidence.
7. **Submit and read back the exact issue.** Run `gh issue create --body-file`,
   then `gh issue view ISSUE_URL --json url,title,body,state,author`. Compare the
   remote title/body with the intended artifact, not only whether the URL exists.
   Correct any corruption with `gh issue edit ISSUE_URL --body-file issue-body.md`
   and read back again. Report the verified link and a short symptom summary;
   keep unconfirmed root-cause claims tentative in chat too.

### Integration reports: missing task status or execution details

1. **Reproduce a minimal child task before expanding source inspection.** Use
   harmless work with a recognizable result, record the actual agent/runtime and
   host versions, and observe both the running state and completion. Separate the
   user's reported missing UI from states independently observed. A completed
   parent tool call does not establish that each child succeeded or that its
   details reached the host.
2. **Trace one task across the integration boundaries.** Inspect the producer's
   internal events, adapter subscription/filter, serialized protocol updates,
   host history parser and UI selector in that order. Keep task/call identifiers
   correlated locally and sanitize them in public excerpts. Batch nearby source
   reads and stop once the missing boundary is localized; avoid repeated whole-file
   searches for each symbol.
3. **Check structured lifecycle support separately from summary text.** Determine
   whether start, progress and completion carry task IDs, parent relationships,
   per-child status and detail content in a format the host actually recognizes.
   A generic tool's text result can contain a useful summary while supplying none
   of the structured records required by a task panel. Conversely, an empty panel
   alone does not prove the child failed or its result was lost.
4. **Describe each source observation at its inspected revision.** An adapter
   dropping events and a host lacking a parser can both contribute, but call the
   runtime cause confirmed only when the captured path supports it. Use available
   product MCP inspection tools where relevant; obtain command-specific help
   before executing Lody commands. Configuration discovery proves configuration,
   not the appearance of a running task in the UI.
5. **Match the proposed remedy to available data.** A host parser can potentially
   recover task goals and coarse completion from generic tool inputs/results;
   full live tool history requires the adapter to forward structured lifecycle
   and detail events. Do not promise that parsing a formatted final summary can
   reconstruct an execution trace. Inspect the current extension contract before
   recommending metadata keys, event methods or status values, and present any
   untested integration changes as candidate fixes.

### Mobile camera and photo-library reports

1. **Identify the runtime before interpreting permissions.** Record iOS version,
   physical device versus simulator, installed app version/build, and whether the
   app runs in Expo Go, a development build, or a release build when available.
   Leave unknowns explicit; missing diagnostics need not block an authorized
   symptom report. Use a physical device to establish camera behavior because
   simulator camera support is not equivalent to the device's hardware.
2. **Inspect configuration and calls at the same source revision.** Check app
   configuration, dynamic config/plugins, relevant dependency versions, and the
   camera/picker functions. State only what each inspected file establishes.
   Absence of explicit `ios.infoPlist` fields or an `expo-image-picker` plugin
   entry in `app.json` does not prove the built `Info.plist` lacks those fields;
   plugin defaults and native build configuration can affect the final artifact.
3. **Keep camera and photo-library hypotheses separate.** Missing
   `NSCameraUsageDescription` can cause privacy enforcement termination when a
   camera API requiring it is accessed; confirm against the actual built plist
   and device logs before calling this the observed cause. System pickers such
   as PHPicker can select photos without photo-library read authorization, so do
   not require a permission prompt as the expected behavior or attribute every
   picker failure to `NSPhotoLibraryUsageDescription`. Check the actual API and
   library version before proposing a permission change.
4. **Keep candidate fixes conditional and testable.** Include only relevant
   configuration examples, preserve existing plugins, and label untested changes
   as candidates. Native permission configuration requires a new native build
   and installation; JavaScript reloads do not validate it, and Expo Go uses its
   own host permissions. Verify camera capture, photo selection, and attachment
   return separately if testing is available. When it is not, publish the symptom
   and bounded source clues without claiming a verified fix.

**With gh:**

Write the body to `issue-body.md` first, then submit it without shell-interpreting
its Markdown. Add labels or assignees only when requested or supported by the
repository's policy and available labels.

```bash
gh issue create --repo OWNER/REPO \
  --title 'Login redirect ignores ?next= parameter' \
  --body-file issue-body.md

# Use the exact URL returned by create:
gh issue view ISSUE_URL --json url,title,body,state,author
```

**With curl:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues \
  -d '{
    "title": "Login redirect ignores ?next= parameter",
    "body": "## Description\nAfter logging in, users always land on /dashboard.\n\n## Steps to Reproduce\n1. Navigate to /settings while logged out\n2. Get redirected to /login?next=/settings\n3. Log in\n4. Actual: redirected to /dashboard\n\n## Expected Behavior\nRespect the ?next= query parameter.",
    "labels": ["bug", "backend"],
    "assignees": ["username"]
  }'
```

### Bug Report Template

```
## Bug Description
<What's happening>

## Steps to Reproduce
1. <step>
2. <step>

## Expected Behavior
<What should happen>

## Actual Behavior
<What actually happens>

## Environment
- OS: <os>
- Version: <version>
```

### Feature Request Template

```
## Feature Description
<What you want>

## Motivation
<Why this would be useful>

## Proposed Solution
<How it could work>

## Alternatives Considered
<Other approaches>
```

## 3. Managing Issues

### Add/Remove Labels

For a label-only request, use this bounded sequence:

0. Resolve the target set before classifying. For “latest N”, honor issue URLs
   or numbers supplied in the attached list; otherwise retrieve
   `gh issue list --repo OWNER/REPO --state open --limit N --json number,title,createdAt,url,labels`
   for the default open-issues view. Use `--state all` only when the requested
   scope includes closed issues. Freeze those targets: a later all-state sample
   may contain a newer closed issue, but sampling conventions must not change
   which issues receive labels. When using REST, exclude entries containing
   `pull_request` before selecting the requested number of issues.
1. Read the exact issue's title, body, current labels and discussion with
   `gh issue view ISSUE_URL --json title,body,labels,comments,url`. In parallel,
   read the repository catalog with
   `gh label list --repo OWNER/REPO --limit 100 --json name,description`.
   Fetch the catalog once per repository and batch independent target reads;
   reuse those results throughout classification rather than querying each
   candidate label separately. If the catalog fills the requested limit,
   retrieve the remaining labels before treating it as complete.
2. Select existing labels by their descriptions. Distinguish a scoped roadmap
   or recovery-hardening task from a reproduced defect: tests and unfinished
   acceptance criteria alone do not establish `bug`. Apply area and platform
   labels only where the issue explicitly includes that component or client;
   do not equate every Desktop mention with a browser client. A priority in the
   body does not authorize creating a missing priority label. Classify a
   proposed reduction in encoding, memory or transfer overhead as enhancement
   and performance when those labels exist; add compatibility when explicit
   negotiation or old-client fallback is part of the requested behavior. A
   mention of encryption alone does not justify security: the requested change
   must actually concern a security defect or hardening. Reusing an existing
   renderer in another conversation mode is a feature integration unless the
   report establishes a regression or broken supported behavior. For sparse or
   screenshot-only reports, add an existing needs-info label when missing version,
   reproduction or diagnostic details materially prevent classification or
   investigation; record which information is missing rather than inventing a
   cause. Apply only the component labels supported by the available evidence.
   Treat the reporter's causal diagnosis as reported, not independently verified;
   missing RPC handlers, missing APIs and missing dependency packages are distinct
   explanations and must not be substituted for one another in the final rationale.
3. Resolve only actual ambiguity. If local conventions are unclear, read one
   bounded sample with
   `gh issue list --repo OWNER/REPO --state all --limit 20 --json title,labels`.
   If the issue delegates its scope to a document, inspect the relevant section
   once. Stop when the body and catalog support the choice; repeated overlapping
   lists, author history, permission probes and command-help reads add no value
   to an already clear classification. When filtering by a known label, use
   `--label 'EXACT LABEL'` rather than interpreting the label text as search syntax.
4. Save a per-target record of the initial labels and intended additions; compute
   `missing = selected - initial` before writing. Add all missing labels in one
   call with `gh issue edit ISSUE_URL --add-label 'LABEL_A,LABEL_B'`, and skip
   the mutation when that set is empty. Preserve unrelated existing labels;
   remove a label only when the requested correction covers it. Do not post a
   triage comment or assign someone as part of a label-only task.
5. Read back `gh issue view ISSUE_URL --json url,labels` once per target and
   compare the actual names with the intended additions and retained labels.
   For a batch, compare the verified target set with the requested set in code
   before claiming completion; report partial failures per issue. Stop after
   this comparison succeeds: repeated views and full event-history reads add no
   assurance to a verified label set. Retrieve label events only when auditing
   who changed a label or resolving a discrepancy, and filter the response to
   the relevant actor, event and label fields. Report one compact line per issue
   with its link and applied labels; distinguish additions from already-correct
   labels. Explain a non-obvious choice in one sentence grounded in the report,
   without repeating acceptance criteria or promoting a hypothesis to a cause.

**With gh:**

```bash
gh issue edit 42 --add-label "priority:high,bug"
gh issue edit 42 --remove-label "needs-triage"
```

**With curl:**

```bash
# Add labels
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/labels \
  -d '{"labels": ["priority:high", "bug"]}'

# Remove a label
curl -s -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/labels/needs-triage

# List available labels in the repo
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/labels \
  | python -c "
import sys, json
for l in json.load(sys.stdin):
    print(f\"  {l['name']:30}  {l.get('description', '')}\")"
```

### Assignment

**With gh:**

```bash
gh issue edit 42 --add-assignee username
gh issue edit 42 --add-assignee @me
```

**With curl:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/assignees \
  -d '{"assignees": ["username"]}'
```

### Commenting

**With gh:**

```bash
gh issue comment 42 --body "Investigated — root cause is in auth middleware. Working on a fix."
```

**With curl:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/comments \
  -d '{"body": "Investigated — root cause is in auth middleware. Working on a fix."}'
```

### Closing and Reopening

**With gh:**

```bash
gh issue close 42
gh issue close 42 --reason "not planned"
gh issue reopen 42
```

**With curl:**

```bash
# Close
curl -s -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  -d '{"state": "closed", "state_reason": "completed"}'

# Reopen
curl -s -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  -d '{"state": "open"}'
```

### Linking Issues to PRs

Issues are automatically closed when a PR merges with the right keywords in the body:

```
Closes #42
Fixes #42
Resolves #42
```

To create a branch from an issue:

**With gh:**

```bash
gh issue develop 42 --checkout
```

**With git (manual equivalent):**

```bash
git checkout main && git pull origin main
git checkout -b fix/issue-42-login-redirect
```

## Checking whether unreleased code addresses an issue

1. **Read the report and define the symptom.** Retrieve
   `gh issue view ISSUE_URL --json url,title,body,comments,state,labels`.
   Extract the reported version, exact error and affected lifecycle. Treat the
   reporter's causal explanation as a hypothesis until independently supported.
   This follow-up authorizes investigation; it does not authorize a public comment.
2. **Establish the published baseline and fresh upstream head.** Read
   `gh release list --repo OWNER/REPO --limit 20` and the relevant release with
   `gh release view TAG --repo OWNER/REPO --json tagName,targetCommitish,publishedAt,isPrerelease,url`.
   Follow repository release policy to identify the applicable stable or prerelease
   artifact; use registry metadata if that is the distribution channel. A tag
   existing locally is not proof it is the latest published version. Inspect
   `git remote -v`, discover the default branch with
   `gh repo view OWNER/REPO --json defaultBranchRef`, then fetch the identified
   upstream remote and resolve the release tag and default-branch SHA. Do not
   assume `origin` is upstream or that the checked-out feature branch is current.
3. **Inspect the bounded unpublished range.** Use
   `git log --oneline TAG..UPSTREAM/BRANCH` and
   `git diff --stat TAG..UPSTREAM/BRANCH`, then inspect full diffs for the affected
   functions and their callers. Batch independent reads. Start with the actual
   error, transport/backend and lifecycle symbols; expand only when evidence
   points elsewhere. Use `git log -G 'PATTERN' TAG..UPSTREAM/BRANCH -- PATH` or
   `git log -S 'SYMBOL' TAG..UPSTREAM/BRANCH -- PATH` as navigation aids, not proof
   that no fix exists: a repair can change ownership, teardown or dependency
   versions without naming the error. Check lockfile changes when the failing
   implementation belongs to a dependency.
4. **Inspect relevant proposals beyond main.** List current open PRs with
   `gh pr list --repo OWNER/REPO --state open --limit 100 --json number,title,url,headRefOid`;
   retrieve remaining pages if the limit is reached before claiming complete
   coverage. Search merged and closed proposals with `--state all --search`
   using both the symptom and component terms. For plausible matches, read
   `gh pr view PR_URL --json title,body,state,mergedAt,files,headRefOid,url` and
   `gh pr diff PR_URL`. Titles and changed-file lists are screening evidence;
   inspect the patch before deciding whether it handles the failing path.
   Local remote-tracking branches do not enumerate all community work.
5. **Compare behavior, not vocabulary.** Trace failure propagation and cleanup
   across the relevant call sites. For asynchronous connection failures, check
   who owns the pending operation, when handlers attach, and how replacement or
   teardown settles it. A control-channel heartbeat retry does not by itself
   prove handling of a transport socket's rejected connection promise. Absence
   of a global rejection handler also does not prove absence of local handling.
   Call an old-peer or socket-lifecycle explanation a hypothesis until code and
   reproduction/log evidence establish that chain.
6. **Classify the evidence and stop at the supported boundary.** Report a
   related change when behavior is adjacent, a candidate fix when the patch
   handles the relevant path, and a verified fix only when a targeted test or
   reproduction establishes the reported behavior at the inspected revision.
   A request about modifications can be answered from source without running a
   build; disclose that runtime resolution remains unverified. If nothing matches,
   say “No targeted fix found in the inspected release-to-head range and open
   PRs.” Do not upgrade this to “no fix or temporary branch exists anywhere.”
7. **Return a concise evidence-backed answer.** Lead with whether a relevant
   change was found. Link the few commits/PRs that explain the result and state
   the material limit. Avoid repeating the whole issue or presenting an inferred
   root cause as fact. Compute any commit/PR totals from retrieved data before
   reporting them; omit counts when they add no value.

## 4. Issue Triage Workflow

When asked to triage issues:

1. **List untriaged issues:**

```bash
# With gh
gh issue list --label "needs-triage" --state open

# With curl
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?labels=needs-triage&state=open" \
  | python -c "
import sys, json
for i in json.load(sys.stdin):
    if 'pull_request' not in i:
        print(f\"#{i['number']}  {i['title']}\")"
```

2. **Read and categorize** each issue (view details, understand the bug/feature)

3. **Apply labels and priority** (see Managing Issues above)

4. **Assign** only when assignment is authorized and the owner is clear.

5. **Comment with triage notes** only when public commenting is explicitly
   authorized; a request to categorize or label issues does not authorize a post.

## 5. Bulk Operations

For batch operations, combine API calls with shell scripting:

**With gh:**

```bash
# Close all issues with a specific label
gh issue list --label "wontfix" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {} --reason "not planned"
```

**With curl:**

```bash
# List issue numbers with a label, then close each
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?labels=wontfix&state=open" \
  | python -c "import sys,json; [print(i['number']) for i in json.load(sys.stdin)]" \
  | while read num; do
    curl -s -X PATCH \
      -H "Authorization: token $GITHUB_TOKEN" \
      https://api.github.com/repos/$OWNER/$REPO/issues/$num \
      -d '{"state": "closed", "state_reason": "not_planned"}'
    echo "Closed #$num"
  done
```

## Quick Reference Table

| Action | gh | curl endpoint |
|--------|-----|--------------|
| List issues | `gh issue list` | `GET /repos/{o}/{r}/issues` |
| View issue | `gh issue view N` | `GET /repos/{o}/{r}/issues/N` |
| Create issue | `gh issue create ...` | `POST /repos/{o}/{r}/issues` |
| Add labels | `gh issue edit N --add-label ...` | `POST /repos/{o}/{r}/issues/N/labels` |
| Assign | `gh issue edit N --add-assignee ...` | `POST /repos/{o}/{r}/issues/N/assignees` |
| Comment | `gh issue comment N --body ...` | `POST /repos/{o}/{r}/issues/N/comments` |
| Close | `gh issue close N` | `PATCH /repos/{o}/{r}/issues/N` |
| Search | `gh issue list --search "..."` | `GET /search/issues?q=...` |
