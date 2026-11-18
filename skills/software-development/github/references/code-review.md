# GitHub Code Review

Perform code reviews on local changes before pushing, or review open PRs on GitHub. Most of this skill uses plain `git` — the `gh`/`curl` split only matters for PR-level interactions.

## Prerequisites

- Authenticated with GitHub (see `references/auth.md` in this skill)
- Inside a git repository

### Setup (for PR interactions)

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python "${GITHUB_SKILL_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills/software-development/github}/scripts/git-credential-token.py")
    fi
  fi
fi

REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

---

## 1. Reviewing Local Changes (Pre-Push)

This is pure `git` — works everywhere, no API needed.

### Get the Diff

```bash
# Staged changes (what would be committed)
git diff --staged

# All changes vs main (what a PR would contain)
git diff main...HEAD

# File names only
git diff main...HEAD --name-only

# Stat summary (insertions/deletions per file)
git diff main...HEAD --stat
```

### Review Strategy

1. **Get the big picture first:**

```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
```

2. **Review file by file** — use `read_file` on changed files for full context, and the diff to see what changed:

```bash
git diff main...HEAD -- src/auth/login.py
```

3. **Check for common issues:**

```bash
# Debug statements, TODOs, console.logs left behind
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK\|XXX\|debugger"

# Large files accidentally staged
git diff main...HEAD --stat | sort -t'|' -k2 -rn | head -10

# Secrets or credential patterns
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"

# Merge conflict markers
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

4. **Present structured feedback** to the user.

### Review Output Format

When reviewing local changes, present findings in this structure:

```
## Code Review Summary

### Critical
- **src/auth.py:45** — SQL injection: user input passed directly to query.
  Suggestion: Use parameterized queries.

### Warnings
- **src/models/user.py:23** — Password stored in plaintext. Use bcrypt or argon2.
- **src/api/routes.py:112** — No rate limiting on login endpoint.

### Suggestions
- **src/utils/helpers.py:8** — Duplicates logic in `src/core/utils.py:34`. Consolidate.
- **tests/test_auth.py** — Missing edge case: expired token test.

### Looks Good
- Clean separation of concerns in the middleware layer
- Good test coverage for the happy path
```

---

## 2. Reviewing a Pull Request on GitHub

### View PR Details

**With gh:**

```bash
gh pr view 123
gh pr diff 123
gh pr diff 123 --name-only
```

**With git + curl:**

```bash
PR_NUMBER=123

# Get PR details
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c "
import sys, json
pr = json.load(sys.stdin)
print(f\"Title: {pr['title']}\")
print(f\"Author: {pr['user']['login']}\")
print(f\"Branch: {pr['head']['ref']} -> {pr['base']['ref']}\")
print(f\"State: {pr['state']}\")
print(f\"Body:\n{pr['body']}\")"

# List changed files
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/files \
  | python -c "
import sys, json
for f in json.load(sys.stdin):
    print(f\"{f['status']:10} +{f['additions']:-4} -{f['deletions']:-4}  {f['filename']}\")"
```

### Prepare an isolated PR checkout

Record `git status --short`, `git branch --show-current` and the repository root.
Resolve the full PR base/head SHAs from GitHub, then use a new scratch directory:

```bash
git -C "$REPO_DIR" fetch origin "pull/$PR_NUMBER/head"
git -C "$REPO_DIR" rev-parse FETCH_HEAD
# Confirm FETCH_HEAD equals the observed HEAD_SHA before continuing.
git -C "$REPO_DIR" worktree add --detach "$REVIEW_DIR" "$HEAD_SHA"
git -C "$REVIEW_DIR" diff "$BASE_SHA...$HEAD_SHA" --stat
```

Verify the remote targets the PR's base repository, fetch the base object if
needed, and pass the observed worktree path and pinned SHAs to reviewers. Run
builds with an explicit working directory. Keep the user's checkout untouched;
a checkout refusal caused by local changes is a reason to isolate, not to reset.

### Leave Comments on a PR

**General PR comment — with gh:**

```bash
gh pr comment 123 --body "Overall looks good, a few suggestions below."
```

**General PR comment — with curl:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/$PR_NUMBER/comments \
  -d '{"body": "Overall looks good, a few suggestions below."}'
```

### Leave Inline Review Comments

**Single inline comment — with gh (via API):**

```bash
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')

gh api repos/$OWNER/$REPO/pulls/123/comments \
  --method POST \
  -f body="This could be simplified with a list comprehension." \
  -f path="src/auth/login.py" \
  -f commit_id="$HEAD_SHA" \
  -F line=45 \
  -f side="RIGHT"
```

**Single inline comment — with curl:**

```bash
# Get the head commit SHA
HEAD_SHA=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments \
  -d "{
    \"body\": \"This could be simplified with a list comprehension.\",
    \"path\": \"src/auth/login.py\",
    \"commit_id\": \"$HEAD_SHA\",
    \"line\": 45,
    \"side\": \"RIGHT\"
  }"
```

### Submit a Formal Review (Approve / Request Changes)

**With gh:**

```bash
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."
gh pr review 123 --comment --body "Some suggestions, nothing blocking."
```

**With curl — multi-comment review submitted atomically:**

```bash
HEAD_SHA=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
  -d "{
    \"commit_id\": \"$HEAD_SHA\",
    \"event\": \"COMMENT\",
    \"body\": \"Review findings\",
    \"comments\": [
      {\"path\": \"src/auth.py\", \"line\": 45, \"body\": \"Use parameterized queries to prevent SQL injection.\"},
      {\"path\": \"src/models/user.py\", \"line\": 23, \"body\": \"Hash passwords with bcrypt before storing.\"},
      {\"path\": \"tests/test_auth.py\", \"line\": 1, \"body\": \"Add test for expired token edge case.\"}
    ]
  }"
```

Event values: `"APPROVE"`, `"REQUEST_CHANGES"`, `"COMMENT"`

The `line` field refers to the line number in the *new* version of the file. For deleted lines, use `"side": "LEFT"`.

---

## 3. Review Checklist

When performing a code review (local or PR), systematically check:

### Correctness
- Does the code do what it claims?
- Edge cases handled (empty inputs, nulls, large data, concurrent access)?
- Error paths handled gracefully?

### Security
- No hardcoded secrets, credentials, or API keys
- Input validation on user-facing inputs
- No SQL injection, XSS, or path traversal
- Auth/authz checks where needed

### Code Quality
- Clear naming (variables, functions, classes)
- No unnecessary complexity or premature abstraction
- DRY — no duplicated logic that should be extracted
- Functions are focused (single responsibility)

### Testing
- New code paths tested?
- Happy path and error cases covered?
- Tests readable and maintainable?

### Performance
- No N+1 queries or unnecessary loops
- Appropriate caching where beneficial
- No blocking operations in async code paths

### Documentation
- Public APIs documented
- Non-obvious logic has comments explaining "why"
- README updated if behavior changed

---

## 4. Pre-Push Review Workflow

When the user asks you to "review the code" or "check before pushing":

1. `git diff main...HEAD --stat` — see scope of changes
2. `git diff main...HEAD` — read the full diff
3. For each changed file, use `read_file` if you need more context
4. Apply the checklist above
5. Present findings in the structured format (Critical / Warnings / Suggestions / Looks Good)
6. If critical issues found, offer to fix them before the user pushes

---

## 5. PR Review Workflow (End-to-End)

When the user asks you to "review PR #N", "look at this PR", or gives you a PR URL, follow this recipe:

### Step 1: Set up environment

```bash
source "${GITHUB_SKILL_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills/software-development/github}/scripts/gh-env.sh"
# Or run the inline setup block from the top of this skill
```

### Step 2: Gather PR context

Get the PR metadata, description, and list of changed files to understand scope before diving into code.

**With gh:**
```bash
gh pr view 123
gh pr diff 123 --name-only
gh pr checks 123
```

**With curl:**
```bash
PR_NUMBER=123

# PR details (title, author, description, branch)
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER

# Changed files with line counts
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER/files
```

### Step 3: Prepare the pinned review worktree

Follow “Prepare an isolated PR checkout” above. Verify its `HEAD` equals the
current observed PR head before reading source or running checks. Use that
worktree's explicit path for every build and test command; changing a Git
command's `-C` directory does not change a following package manager's cwd.

### Step 4: Read the diff and understand changes

```bash
# Full diff against the base branch
git diff main...HEAD

# Or file-by-file for large PRs
git diff main...HEAD --name-only
# Then for each file:
git diff main...HEAD -- path/to/file.py
```

For each changed file, use `read_file` to see full context around the changes — diffs alone can miss issues visible only with surrounding code.

### Step 5: Run automated checks locally (if applicable)

```bash
# Run tests if there's a test suite
python -m pytest 2>&1 | tail -20
# or: npm test, cargo test, go test ./..., etc.

# Run linter if configured
ruff check . 2>&1 | head -30
# or: eslint, clippy, etc.
```

### Step 6: Apply the review checklist (Section 3)

Go through each category: Correctness, Security, Code Quality, Testing, Performance, Documentation.

### Step 6a: Bind findings and model polishing to evidence

1. Record repository, PR number, requested scope, full base/head SHAs and changed-file
   totals before drafting. A commit-specific changes URL may show only one commit;
   distinguish that commit from the whole PR and state which scope was reviewed.
   Use the actual PR base rather than assuming `main`.
2. For every proposed blocker, retain a commit-pinned path/line, the relevant code
   excerpt, the failing behavior or violated rule and a concrete fix. Read policy
   clauses verbatim at the applicable revision before citing section numbers.
   Count blockers and suggestions from the final findings rather than imposing a
   fixed number in the writer prompt. Request changes for supported blockers;
   a warning label alone does not make an item blocking.
3. Trace sensitive values through callers, serialization and send/receive handlers
   before alleging a log leak. A logger in an inbound handler does not establish
   that it logs an outbound authentication frame. Determine what bytes reach the
   logger, what truncation exposes and who can read that platform's logs. Do not
   confuse Android ADB with HarmonyOS HDC. Prefer removing secrets at the source;
   privacy-format flags are defense in depth, not a substitute for redaction.
4. Distinguish app-level plaintext persistence from device filesystem protection;
   `JSON.stringify` alone does not prove all system storage is unencrypted. Scope
   side-channel claims to demonstrated behavior or lack of constant-time guarantees.
   Verify signing metadata before calling a package unsigned. Recommend removing
   unwanted artifacts from the PR tree; `git rm` does not erase their history.
5. For crypto interoperability, use standalone rerunnable scripts, published vectors
   and an independent implementation such as Node crypto/OpenSSL. Preserve commands,
   runtime versions, tested SHA, assertions and actual outputs. Report exact vector
   counts and cases; passing finite vectors does not prove constant-time execution,
   rekey support, production security, device compilation or a live client connection.
6. Give Gemini the evidence bundle for prose polishing, then give GPT-6.1 sol with
   high reasoning both the polished Markdown and the same evidence. Invoke the actual
   requested models and preserve their returned metadata and artifacts. If a reviewer
   identifies missing evidence or a wrong data-flow assumption, retrieve evidence or
   qualify/remove the claim; do not revert to the earlier confident draft. If the
   review input was incomplete, fix that input rather than publishing blanket
   uncertainty over evidence that was actually collected.
7. Read the complete final Markdown before submission. Check paths, line references,
   policy quotes, counts, algorithm names and attribution; remove unresolved secret
   placeholders, invented runtime versions and claims unsupported by outputs. Describe
   Gemini as polishing when it only polished, without implying it ran independent
   tests. Keep the final text Chinese unless the user requests another language.

### Step 6b: Ground OS/SDK compatibility findings in current usage

1. Read the actual minimum/compatible SDK and target SDK fields; distinguish
   installation eligibility from the API level used for development. Identify
   APIs that require the higher minimum before recommending a lower one.
2. Retrieve the platform vendor's current installed-device API distribution.
   For HarmonyOS, start with
   `https://developer.huawei.com/consumer/cn/doc/harmonyos-releases/sdk-version-percentage`.
   If extraction misses the table, use the browser DOM to read the table and its
   adjacent cutoff/update text. Preserve the source URL, data cutoff, OS/API
   mapping and rows used; snippets alone do not establish the distribution.
3. Sum relevant rows with code. State whether percentages use the vendor's
   full denominator or a subset renormalized to the requested versions; omit
   excluded legacy versions from the main presentation. For a proposed minimum,
   sum every eligible API row rather than the share of that single version.
4. Keep installed-device shares, new-phone sales shares, cumulative upgrades
   and aggregate terminal counts separate. Do not multiply a version share by
   a differently dated or scoped total to invent installed counts. Two snapshots
   show a change between cutoffs; they do not establish an upgrade campaign as
   its cause or prove users cannot or refuse to upgrade.
5. Present the current split and implication briefly, with an official link and
   cutoff. Treat dropping older versions as a product choice unless a support
   requirement or demonstrated bug makes it blocking. Recommend a lower minimum
   conditionally until source compatibility and build/runtime evidence support
   it; a high target SDK alone is not a defect.
6. If evidence invalidates a published finding, explain the narrow correction
   and reassess the verdict. When correction is authorized, edit both the exact
   inline comment and matching review-body passage, preserve unrelated content,
   add the source, and read back both targets. A research-only follow-up does not
   itself authorize remote edits.

### Step 6c: Run model-specific parallel review

1. Resolve the exact requested model/version against the chosen runner's supported
   configurations before dispatch. Select it through a real model binding and
   retain the runner's returned model metadata with the review artifacts. Do not
   infer model identity from a task title, prose instructions or a generic dispatch
   acknowledgement; those establish work assignment, not model execution.
2. Verify the review input before dispatch: obtain the actual checkout path from
   `git rev-parse --show-toplevel`, its revision from `git rev-parse HEAD`, and
   confirm the saved diff is readable. Copy the observed path verbatim into every
   assignment; never reconstruct a personal directory or label a base checkout as
   the PR head. If source stays at the base revision, provide an explicit way to
   read the pinned head and require head-relative line references. Give every
   reviewer the same repository, full base/head SHAs, complete diff and relevant
   source/dependency context. Partition the questions across correctness,
   lifecycle and test fidelity. Ask for findings with path/line, trigger, observed
   effect and reproducible evidence. Present suspected defects as hypotheses;
   leading every reviewer with the same asserted conclusion creates correlated
   agreement rather than independent validation. Use a shared severity definition
   tied to impact; do not equate every blocker with P0 or every warning with P1.
   For dependency behavior, inspect the version pinned by the reviewed manifest
   and lockfile. An installation in a sibling checkout is evidence only after
   its version and relevant implementation match; mocks that accept a forwarded
   path do not prove the real upstream endpoint accepts it.
3. Build a per-finding evidence table from the complete returned reports: reviewer,
   actual model, reviewed SHA, finding, supporting source and reproduction status.
   Mark agreement only where reviewers independently support the same concrete
   trigger and effect; silence, a completed task or different findings do not count
   as confirmation. Reconcile each finding against the inspected revision and run
   the smallest meaningful reproduction. Merge reports of one root cause into one
   finding; missing test coverage usually supports that finding rather than
   creating a second correctness blocker. Reject unsupported lifecycle or reset
   claims even when multiple reviewers repeat them. Set severity from demonstrated
   impact, not the strongest label a reviewer supplied; configuration overwritten
   in a resolved runtime value does not alone establish persistent data deletion.
4. Keep dispatch, returned review, verified findings and published inline comments
   as separate completion states. A successful launch does not complete an
   authorized request to annotate the PR. Continue through Steps 7–8 after results
   arrive; report only the model identity and completion state actually evidenced.

### Step 6d: Probe schema defaults and layered configuration

1. Read the schema definition, merge helper and all consumers of the merged value.
   Verify the exact dependency version used by the affected host; a locally
   installed settings generation with a different API is contextual evidence,
   not proof of the target registry's behavior.
2. Execute the real schema with an absent input and record the resulting object.
   Check nested objects and arrays explicitly: a schema may synthesize
   `{ ports: [] }` or `{ backends: [] }`, so a guard for an object with zero keys
   will not recognize that subtree as defaults. Do not infer defaults solely from
   schema declarations.
3. Feed a base containing nonempty arrays, enabled flags and sibling nested fields
   through the PR's actual merge path. Assert all relevant output fields, not only
   one retained top-level URL. Prefer importing the implementation or exercising
   its public lifecycle. A copied helper is a diagnostic probe only; bind it to
   the exact source and confirm the finding through the real call path before
   claiming an integration regression.
4. Exercise absent storage, an explicit empty object, an explicit empty array,
   sparse nested overrides and a replace-then-read sequence. Trace the provider's
   actual merge/reset semantics before alleging lost resets. Distinguish a
   schema-generated empty array from the user's intentional empty array: blind
   deep merging or ignoring every empty array can break valid clearing behavior.
5. Recommend a fix that preserves the origin of the override, using a raw stored
   layer or provider metadata when available. Verify that discriminator on the
   affected provider rather than guessing its API. Reproduce the proposed fix
   against both fresh configuration and intentional clearing; nested-array loss
   and sparse-object replacement may share one merge root cause.

### Step 6e: Review filesystem authorization and upstream gateway assumptions

1. Map the trust boundary before naming a vulnerability: who can configure read
   roots, whether a remote caller can change that configuration, what the Host
   explicitly authorizes, and which authenticated roles can consume it. Classify
   an operator's deliberately broad root as a configuration hazard unless an
   unprivileged actor can expand access beyond that grant; demonstrate that
   crossing before claiming arbitrary file access or authorization bypass.
2. Trace the actual version-pinned gateway handler and file provider through to
   path resolution. Probe the real endpoint with workspace-relative paths,
   external absolute paths, and an extra root overlapping the workspace. A mock
   accepting an absolute path establishes forwarding only. If the real handler
   cannot be exercised, report its behavior as unverified rather than asserting
   that it rejects the path or that acceptance itself violates authorization.
3. Separate static containment from race resistance. Test an ancestor symlink
   whose target remains inside the granted root and one whose target escapes it;
   leaf-only `lstat` plus canonical containment can still reject static escapes.
   Missing ancestor checks are a policy or hardening finding unless a specific
   bypass is established. For a TOCTOU claim, identify the attacker who can
   replace a component, the exact check/use window and the subsequent open; an
   extra `realpath` check alone does not make the operation race-free.
4. Exercise schema differences through the real settings save/resolve lifecycle
   before alleging activation failure. UI acceptance, persisted input, runtime
   validation and startup handling are separate observations. Prefer a clearly
   surfaced rejection of invalid security configuration; do not recommend silent
   filtering merely to avoid an exception without assessing fail-closed behavior.
5. Validate proposed alternatives against the required direction and client:
   an input attachment endpoint does not automatically publish Agent-generated
   artifacts, and an image channel does not establish support for arbitrary
   files. Describe workspace output directories as a usage workaround when that
   meets the need; label other designs as proposals until their actual contracts
   and end-to-end behavior are verified. Avoid absolute claims such as zero risk.
6. Keep functional usefulness, policy compatibility and security severity separate.
   A read-only preview feature can intentionally omit directory browsing; explain
   the resulting discoverability limit without treating it as a defect unless
   browsing is required. Confirm repository scope before recommending a new
   capability or endpoint that the project's architecture may prohibit.

### Step 7: Deliver the review through the authorized route

Return findings in chat by default. A request to inspect or review a PR does
not itself authorize a public comment, reviewer contact or formal GitHub verdict.
If the user says they will send the feedback, provide copy-ready text and stop
before any remote write. For contribution-policy feedback, follow
`github-pr-assessment` to distinguish verified requirements from suggestions.

Only when GitHub submission is explicitly authorized, collect your findings and
submit them through the requested route, using inline comments where useful.
An instruction to polish and submit a formal review is sufficient authorization;
complete that route without asking again. A request to polish `pr_body` in this
context does not authorize changing the PR author's description.

For user-supplied text requested verbatim, use a submission-only path: copy the
body directly from the user's message to a UTF-8 file, without redrafting,
polishing, typo correction, whitespace cleanup or refreshed CI claims. Separate
the supplied body from the user's instruction to post it. Compare the saved text
against the original message before submission; visually similar wording is not
literal equality. Keep the original source available until remote verification
finishes. If the text contains a material stale claim, mention it separately in
chat without changing the authorized body. Use the requested review event; when
none is specified, choose the event supported by the supplied conclusion and
context rather than defaulting every review to approval.

Before posting, run `gh api user --jq .login` and confirm the requested account.
Read `headRefOid` again; if it changed, refresh affected findings before posting,
or bind a deliberately historical review to its inspected commit through the API.
Check existing reviews before retrying an ambiguous submission to avoid duplicates.

Write the final Markdown to a file and pass the file without shell interpolation:

```bash
gh pr review "$PR_NUMBER" -R "$OWNER_REPO" --request-changes --body-file "$REVIEW_FILE"
```

Choose `--approve`, `--request-changes` or `--comment` from the supported findings.
Do not claim inline comments exist unless they were actually submitted. For a
commit-bound or multi-comment review, build an explicit JSON file containing
`commit_id`, `event`, `body` and optional `comments`, then submit it with
`gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews --method POST --input "$PAYLOAD_FILE"`.
The curl example below illustrates the fields; prefer the file payload for real
Markdown to preserve literal code and newlines. For a request to annotate every
problem, build a finding-to-comment list before submission: one distinct supported
finding per comment, with its path, diff-valid line, explicit side and body. Use
integer JSON line values and `side: "RIGHT"` for new lines or `"LEFT"` for deleted
lines. Keep optional suggestions distinct from blockers; do not pad the comment
count to match a checklist. Use neutral review text under the user's account;
do not copy agent/model signatures from generic examples.

**With curl — atomic review with multiple inline comments:**
```bash
HEAD_SHA=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER \
  | python -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

# Build the review JSON — event is APPROVE, REQUEST_CHANGES, or COMMENT
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER/reviews \
  -d "{
    \"commit_id\": \"$HEAD_SHA\",
    \"event\": \"REQUEST_CHANGES\",
    \"body\": \"## Review\n\nFound 2 issues, 1 suggestion. See inline comments.\",
    \"comments\": [
      {\"path\": \"src/auth.py\", \"line\": 45, \"body\": \"🔴 **Critical:** User input passed directly to SQL query — use parameterized queries.\"},
      {\"path\": \"src/models.py\", \"line\": 23, \"body\": \"⚠️ **Warning:** Password stored without hashing.\"},
      {\"path\": \"src/utils.py\", \"line\": 8, \"body\": \"💡 **Suggestion:** This duplicates logic in core/utils.py:34.\"}
    ]
  }"
```

### Step 8: Verify an authorized submission

After an authorized write, identify the new review ID from the API response or
`gh api --paginate repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews`. Read that exact
review with `gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID` and verify
`user.login`, `state`, `commit_id`, `submitted_at`, `html_url` and complete `body`
against the intended account, tested SHA, verdict and Markdown. A `latestReviews`
summary showing only author/state/time does not verify the published text. If the
write times out, inspect existing reviews before retrying.

For verbatim submissions, compare the remote `body` to the original user-supplied
body with code, not a visual scan or semantic comparison. Preserve Unicode and
Markdown; do not strip whitespace or normalize punctuation to make equality pass.
If GitHub changes transport line endings, compare with only that documented
CRLF/LF conversion and disclose it when claiming exactness. Check any discrepancy
against the original message: matching the remote body to a local file that
already contains a transcription error is insufficient. If submission introduced
a mismatch, edit that exact review using
`gh api repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID --method PUT --input "$BODY_PAYLOAD_FILE"`,
where the JSON file contains the original `body`, then read the same review back
and repeat equality verification. Do not delete the source file or claim
“unchanged” until the comparison passes, and do not create another review to fix
the first one's wording.

For inline comments, fetch the exact review's comments with pagination:
`gh api --paginate repos/$OWNER_REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID/comments`.
Compare IDs, complete bodies and paths with the intended finding-to-comment list
and count them programmatically. If REST line/side fields are null, use the exact
review's REST `node_id` in GraphQL rather than scanning unrelated reviews:

```graphql
query($reviewId: ID!, $after: String) {
  node(id: $reviewId) {
    ... on PullRequestReview {
      state
      commit { oid }
      comments(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { databaseId path line originalLine diffSide body url }
      }
    }
  }
}
```

Invoke with `gh api graphql -f query='<query>' -f reviewId="$REVIEW_NODE_ID"`;
pass `after` only for subsequent pages and continue until `hasNextPage=false`.
Compare every intended path, line, side and complete body with the returned set;
retain comment URLs for the final report. If only `originalLine` remains, report
that historical anchor separately from a current-line anchor. Do not substitute
the latest review when another reviewer may have posted meanwhile, or treat legacy
diff `position` as a source-file line. A null REST line alone does not prove an
inline anchor failed. Read back the exact
comment after any PATCH and the exact review after any body update; scan both
for leaked placeholders and unintended attribution before claiming completion.

Put the summary in the formal review body when that is the requested route; do
not add a duplicate top-level comment unless separately authorized. Keep the final
chat report to the direct review link, account and verified verdict, plus any
material limitation. Do not replay all findings after posting. Use
`references/review-output-template.md` only to the extent it fits the task.
The following summary-comment example applies only when that separate route is
authorized.

**With gh:**
```bash
gh pr comment $PR_NUMBER --body "$(cat <<'EOF'
## Code Review Summary

**Verdict: Changes Requested** (2 issues, 1 suggestion)

### 🔴 Critical
- **src/auth.py:45** — SQL injection vulnerability

### ⚠️ Warnings
- **src/models.py:23** — Plaintext password storage

### 💡 Suggestions
- **src/utils.py:8** — Duplicated logic, consider consolidating

### ✅ Looks Good
- Clean API design
- Good error handling in the middleware layer

EOF
)"
```

### Step 9: Clean up

Preserve findings, model metadata and execution outputs outside the disposable
worktree. Inspect `git -C "$REVIEW_DIR" status --short`, identify task-generated
changes and remove only the task-owned worktree when its contents are no longer
needed. Do not use a hard reset or forced removal to bypass unexplained changes.
Compare the original checkout's branch and status with the recorded preflight;
do not switch it to a guessed default branch or delete pre-existing branches.

### Decision: Approve vs Request Changes vs Comment

- **Approve** — the inspected scope supports approval, with no confirmed blockers;
  keep optional suggestions and verification limits explicit.
- **Request Changes** — confirmed correctness, security or applicable policy issues
  warrant fixing before merge; explain each blocker with source evidence.
- **Comment** — useful observations without supported blockers, or evidence is too
  limited for a verdict. A draft PR alone does not determine the review event.
