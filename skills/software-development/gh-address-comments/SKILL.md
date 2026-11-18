---
name: gh-address-comments
description: Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate if not logged in.
metadata:
  short-description: Address comments in a GitHub PR review
---

# PR Comment Handler

Guide to find the open PR for the current branch and address its comments with gh CLI. Run all `gh` commands with elevated network access.

Prereq: ensure `gh` is authenticated (for example, run `gh auth login` once), then run `gh auth status` (include workflow/repo scopes) so `gh` commands succeed.

## 1) Inspect comments needing attention
- Run scripts/fetch_comments.py which will print out all the comments and review threads on the PR

## 2) Ask the user for clarification
- Number all the review threads and comments and provide a short summary of what would be required to apply a fix for it
- Ask the user which numbered comments should be addressed

## 3) If user chooses comments (or authorizes addressing PR feedback)
- Apply fixes for the selected comments, run affected checks, and push (ensure branch is not `DIRTY` before expecting CI to rerun).
- Reply on the original thread / comment using UTF-8 **without BOM** (e.g., via Node `execFileSync` or UTF-8 no-BOM console encoding on Windows), citing the fix commit SHA and verification result.
- **Explicitly resolve each addressed review thread**: replying alone leaves `isResolved=false` and keeps blocking merge. Use `resolveReviewThread`:
  `gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{id isResolved}}}' -F id=<thread_node_id>`
- For top-level maintainer questions (even when no code change is needed), post a concise factual reply citing exact file/line behavior.

Notes:
- If gh hits auth/rate issues mid-run, prompt the user to re-authenticate with `gh auth login`, then retry.
