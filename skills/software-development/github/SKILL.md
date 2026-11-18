---
name: github
description: "GitHub via gh CLI: issues, reviews, repos, auth, releases, and PR workflows."
version: 3.1.0
license: MIT
platforms: [linux, macos, windows]
metadata:
  related_skills: [yeet, gh-address-comments, gh-fix-ci, github-pr-assessment]
---

# GitHub (`gh` CLI Operations Hub)

Work GitHub issues, repos, auth, releases, and PR reviews with `gh` CLI (REST/GraphQL fallback via `gh api`).

## PR Workflow Routing (Do Not Override Repo Rules)

- **Repo-specific contributing rules**: Check `AGENTS.md` / `CONTRIBUTING.md` / dedicated PR skills first (e.g., DCO `git commit -s`, required template sections, asset-publishing rules).
- **General repos (open/update PR)**: Load `yeet`.
- **Addressing PR comments & resolving threads**: Load `gh-address-comments`.
- **Debugging failing GitHub Actions CI**: Load `gh-fix-ci`.

## Routing Table — Load on Demand

| Task | Load Reference |
|---|---|
| Auth broken / token or SSH setup / `gh auth status` fails | `references/auth.md` |
| Create, triage, label, assign, or search issues | `references/issues.md` |
| Generic PR fallback details (only when not covered by repo rules / `yeet`) | `references/pr-workflow.md` |
| Review someone's PR: diffs, inline comments, formal verdict | `references/code-review.md` |
| Clone/create/fork repos, remotes, npm/GitHub releases | `references/repo-management.md` |
| README, bilingual docs, Issue Forms, personal profile, awesome lists | `references/contribution-docs.md` |

Supporting assets: `scripts/gh-env.sh`, `scripts/git-credential-token.py`, `templates/`, `references/conventional-commits.md`, `references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core Invariants (Apply to Every GitHub Task)

1. **Auth & Sync Preflight**:
   - Run `gh auth status` once per session if auth state is uncertain.
   - Before pushing a branch to a fork (`<your-fork>/*`), ensure the fork is synced or push directly to the intended branch ref (`HEAD:refs/heads/<branch>`).
2. **PR Language & Attribution**:
   - **Match the target repository's primary language**: use **English** for English-language international upstream repositories; use **Chinese** for Chinese-language repositories unless instructed otherwise.
   - **Never add AI `Co-Authored-By` trailers** or substitute an AI identity for the user's Git author.
   - **Never trigger external review bots** in PR or Issue comments unless explicitly requested.
   - Use `Closes #N` / `Fixes #N` only when the PR resolves the entire issue; use `Refs #N` when addressing a subset.
3. **Safe Markdown & Body Updates (No BOM UTF-8)**:
   - Always write PR/Issue bodies or comments to a file in **UTF-8 without BOM (`U+FEFF`)** (use file write tools or Node `fs.writeFileSync(p, text.replace(/^\uFEFF/, ''), 'utf8')`, never PowerShell default redirection) and pass `--body-file <file>`.
   - After creating or editing a PR/comment, read back `url,headRefOid,isDraft,mergeable,mergeStateStatus,body` via `gh pr view` (or comment via `gh api`) to verify the remote state matches expectations.
   - Honor `--draft` when required; do not run `gh pr ready` or `gh pr merge` without explicit user authorization.
4. **Screenshot & Media Privacy Redlines**:
   - Follow the repository's image delivery rule: never commit debug screenshots into main source branches or Issues; upload them via the repo's designated asset branch or as GitHub-native attachments in the PR description.
   - Inspect every image before upload: never expose local OS usernames, local personal paths, tokens, or unmasked login/pairing QR codes.
5. **Remote CI & Release Verification**:
   - Never claim CI passed without checking `gh pr view --json mergeStateStatus` (if `DIRTY`, rebase immediately because GitHub skips CI) and `gh pr checks` bound to the current `headRefOid`. Distinguish `pass`, `pending` (exit code 8), `skipping`, and `action_required`.
   - For tag-triggered releases (`vX.Y.Z`), verify `package.json`, lockfile, bundle, and `CHANGELOG.md` match the tag on the target commit before pushing the tag, and verify the resulting `Release` workflow run.
