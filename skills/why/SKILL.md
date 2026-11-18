---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or checking historical intent before modifying existing code. Queries git history, GitHub PRs/issues, and available MCP evidence, separating proven facts from inference. Use how for runtime behavior."
---

# Why

Investigate the motivation and intent behind code. The companion `how` skill answers what the code does and how it works; `why` answers what forces led to its shape so you do not accidentally delete deliberate safeguards or repeat past mistakes.

## Operating Posture

Operate as a **careful, cautious, and precise investigator**. Separate proven facts from inference. Read `references/epistemics.md` for the confidence framework and phrasing guide.

## Step 1. Understand the Target and Question

Identify the target (code block, pattern, feature, or design decision) and the question (rationale, tradeoff, motivating edge case, external constraint, or dead-code check). If ambiguous, state your interpretation briefly and proceed.

## Step 2. Establish the Code Anchor

Build inline seed context before spawning investigators:
- File paths, line ranges, and key symbols
- `git blame -L <start>,<end> <file>`
- `git log --oneline -20 -- <file>` and `git log --follow -p -n 5 -- <file>`
- Extract PR numbers (`#1234`) and fetch PR bodies/reviews via `gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews` (and `gh issue view` for linked issues).

## Step 3. Parallel Investigation (`invoke_subagent`)

List which evidence categories actually exist in this environment (always include **Source control** via `git` / `gh`; add **Issue tracker**, **Docs/Wiki**, or local workspace/docs artifacts only when relevant and accessible). Skip unavailable or provably irrelevant categories explicitly with a one-line reason.

For single-commit trivial targets where the PR description already provides the complete answer, answer directly after confirming broader searches would be redundant.

Otherwise, fan out read-only investigators via `invoke_subagent`:
- Use `TypeName="scout"` when `git` / `gh` / `run_command` is needed (tool-enforced no file edits) or `TypeName="research"` for pure file reading (≤5 concurrent).
- Pass each investigator `references/investigator-prompt.md` + `references/source-playbook.md` (if defensive code, check retry/timeout/guard/OOM history) + the code anchor + the question.

## Step 4. Synthesize & Present

Synthesize findings following `references/epistemics.md` and `references/synthesizer-prompt.md` (synthesize directly in the main model or with `Model="pro"` for complex multi-source synthesis). Keep the confidence separation intact:
- **What We Found** (verified git/PR/source facts)
- **What We Can Reasonably Infer**
- **What We Don't Know / Sources Consulted** (including skipped sources and why)
- If `why` is a precursor to editing code, end with a **Preserve / Change / Avoid / Risk** constraint set.

## Pitfalls

- **Recency bias**: The most recent commit may just be a patch on top of an older invariant. Trace back through renames and original PRs.
