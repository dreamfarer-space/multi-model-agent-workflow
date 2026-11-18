# Gemini-backed GitHub bots

## When to Use

Use when building, migrating or debugging an issue-labeling or PR-review bot that calls a self-hosted Gemini gateway from GitHub Actions.

## Naming

For this user, call the model service Gemini in bot names, workflow titles, review comments and repository documentation. Do not name the backend implementation in user-facing text.

## Prefer a single HTTP call over an agent CLI

A direct Chat Completions request with `response_format: {"type": "json_object"}` is the most reliable shape for automation: no npm or CLI install, no tool catalogue to disable, no SSE stream to break, and the GitHub token never leaves the Python process. Agent CLIs need extra work to prove that the outbound `tools` array is empty, and their streaming protocol can fail against gateways that return an HTML WAF page with HTTP 200 (symptom: `stream closed before response.completed`).

Verify the gateway before writing code: POST a trivial prompt to `/v1/chat/completions`, then repeat with `response_format` and with `"/v1/responses"`, and finally through the public HTTPS hostname, because an Actions runner never uses loopback. A model id echoed back by the server can differ from the requested alias; trust HTTP 200 plus non-empty `choices[0].message.content`.

## Context budget and latency

Measure latency with a small real issue and PR before sizing review requests; large prompts can exceed a gateway's deadline non-linearly. Split reviewable files into bounded batches instead of shrinking one global prompt until later files disappear. Start near 22k characters per batch and `max_tokens` near 2500, tune against real responses, then merge findings and summaries before publishing. Track every file's disposition and distinguish included diffs, truncated content, unsupported files and failed batches; a file merely listed in the prompt is not proof it was reviewed.

Budget allocation matters even before batching: draining a fixed budget in repository order silently marks every later file as "not reviewed". Rank source before tests before docs, smaller diffs first, and state omissions explicitly in the review body.

## Stale base is not trusted code

For bots whose maintained implementation lives on the default branch, make `pull_request_target` check out `github.event.repository.default_branch`, not `github.event.pull_request.base.sha`. The recorded PR base can predate a provider migration and select obsolete bot code. Read the PR's actual head/base through the API for review identity and stale-result checks; keep that identity separate from the trusted checkout used to execute the bot.

Cancel superseded runs for PR reviews (`concurrency: cancel-in-progress: true`) so rapid pushes do not queue duplicate reviews; keep publishing deduplicated on head SHA plus base SHA/ref.

Fail-closed has limits: when the model key is absent, skip with a warning instead of failing the check, and drop only individual findings whose line is not a known added line rather than failing the whole review. A missing credential should never look like a code defect.

## Untrusted input and write boundaries

For `pull_request_target`, run only base-branch code, read PR content through the GitHub API, and never execute PR code. Treat issue and PR text as data: state this in the system prompt, wrap the payload as JSON, and still validate every returned label against the labels that actually exist and every comment location against added lines parsed from the patch. Publish reviews as `event: COMMENT`, dedupe on head SHA plus base SHA/ref, and re-read head, base and state immediately before writing. Add `edited` to PR triggers so retargeting a branch re-reviews. After applying labels, read the issue back and fail if a label is missing.

## Secrets

Create a dedicated gateway token per bot so it can be revoked alone; store it only as an Actions secret and delete the previous provider's secret after migration. Fetch the token for local verification over SSH and never echo it into logs.

## Verification ladder

Unit tests for write boundaries (stub GitHub, never call the network), then a real dry run against the live gateway for one small issue and one small PR, then a real Actions run that must be confirmed by re-reading the issue labels and the posted review. A green workflow step alone does not prove the label or comment landed.
