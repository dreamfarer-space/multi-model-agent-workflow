# Repository documentation

## When to Use

Use when writing or auditing README, bilingual project introductions, CONTRIBUTING, Issue Forms, contributor setup instructions, or repository policy documentation. Follow `pr-workflow.md` for branch, CI and merge mechanics. For README work, apply the specialized sequence below in addition to the shared evidence and delivery gates.

## 1. Collect evidence before drafting

Inspect the current branch and worktree, then read the repository's instructions, README, package manifest, lockfile, build/test configuration, workflows and existing security/release documentation. Preserve unrelated work; create a dedicated branch before editing.

Build a compact fact sheet for the writer and reviewer:

- Supported runtime versions and the locked install command.
- Real script names, prerequisites, executable/environment overrides and whether checks are local, opt-in, paid or CI-only.
- Source files versus committed generated artifacts; identify shared imports that also require regeneration.
- How tests are discovered and how their environment is selected.
- Style observed in representative files from each language/subtree.
- Translation sources and any key/type linkage between languages.
- CI matrices, allowed-failure jobs and actual merge gates.
- Existing release/security procedures to link rather than duplicate.

Do not infer rules from names: a `.client.test.tsx` suffix need not select a DOM environment; inspect the runner configuration and per-file directives. Count discovered tests using the runner or configured glob, not directory entries, because fixture directories inflate totals. Prefer omitting volatile counts from evergreen prose unless they help a contributor.

Inspect host JavaScript and browser TypeScript separately before describing style; repositories can deliberately use semicolons in one subtree and omit them in another. Do not invent a formatter, lint gate, Conventional Commits enforcement or global executable requirement from convention alone.

## README and bilingual rewrite sequence

1. **Freeze the documentation scope.** Read all README language variants and repository instructions before drafting. Identify aliases that must remain identical, the existing navigation, screenshots and links. For a maintainer-facing improvement rather than an explicitly requested rewrite, give both writer and assembler a preservation contract: retain existing sections and wording, and add only justified navigation, summaries or answers. Inspect the assembled diff for deleted sections before review; model-generated assembly can silently discard useful source text. Permit corrections when source evidence warrants them rather than treating zero deletions as the objective. Keep writer/reviewer intermediates outside the checkout; do not expand a documentation PR into implementation changes.
2. **Prepare a source-backed fact sheet.** Attach source paths to installation commands, supported clients, security boundaries and experimental features. Compare manifest versions with registry dist-tags only when making a current-release claim; distinguish the published package from unreleased HEAD. Do not copy stale summaries over newer source: separate read-only file previews from upload capability elsewhere, and connection establishment fallback from recovery after an established transport fails. Record unresolved conflicts instead of calling the sheet an unquestionable source of truth.
3. **Parallelize independent preparation, then serialize assembly.** Give Gemini the evidence and existing prose to draft copy; give DeepSeek the same evidence to design hierarchy, navigation and Markdown layout. Require explicit model invocation rather than relying on inherited subagent identity. Save raw responses with returned model metadata. Layout and copy may run concurrently, but final assembly depends on both; GPT review depends on the assembled final files.
4. **Keep bilingual drafts aligned.** Draft the primary language first, then translate corresponding sections. For long outputs, split at section boundaries and save each response before assembly; inspect completion status and the final section so truncation cannot masquerade as a complete draft. Preserve identifiers, commands, versions and relative paths verbatim. Use a section-to-section checklist rather than requiring equal line counts or identical prose length.
5. **Optimize the entry page, not the feature count.** Preserve useful existing branding and screenshots; order the page around what it is, how to install it and how to connect. Add a TOC, client table or FAQ only when each reduces a real reading burden. Prefer a compact client/status/entry table to a wide cross-product capability matrix, because wide matrices are hard to read on mobile and tempt unsupported blanket claims. Link detailed compatibility, protocol and deployment guides rather than reproducing them.
6. **Review evidence and rendering separately.** Give GPT the assembled files plus supporting source excerpts, with high reasoning explicitly requested. Check experimental/beta labels, self-hosted versus hosted service boundaries, terminal privileges and exact installation commands. Reconcile findings against source, then review substantive revisions again. Validate layout mechanically: local Markdown/HTML targets must exist, TOC anchors must resolve to actual headings, fences and HTML wrappers must balance, and required alias READMEs must be byte-identical. Compare bilingual section coverage and link destinations, allowing intentional localized documentation targets; do not use equal link counts alone as proof of parity.
7. **Deliver only the verified patch.** Inspect `git diff --check`, `git diff --stat` and the complete staged diff. Run any configured documentation checks; do not add UI/text assertion tests merely for a prose change. Follow the fork/branch/PR workflow, then read back the PR's base/head and changed-file list. Report the PR URL and checks actually run; distinguish a drafted, reviewed or locally committed document from a submitted PR.

### README header badges and localized navigation

Use this focused recipe when the requested change is limited to the README's opening links and badges; preserve the rest of the document.

1. Read every language variant's header and record each link's destination before editing. Keep required alias READMEs identical; retain localized guide destinations and existing service language parameters rather than replacing all links with the primary-language URLs.
2. Separate navigation by purpose. A reusable layout is a centered text row for language selection, a row of document/client badges, and a row of package/deployment/download badges. Bold the current language. Treat this as a layout option selected for the task, not a mandatory redesign for every README.
3. Within a badge row, use a consistent badge style and rendered height; for a compact header, 20px is a useful starting point. Preserve established service badges, and match adjacent badges to them. Avoid mixing bare text links and badge images within the same visual group when that causes baseline mismatch. Use brand colors and available logo identifiers without implying official affiliation or certification.
4. Verify image URLs and click destinations separately. Fetch each distinct badge URL with redirects, confirm a nonempty SVG/image response, and inspect any embedded error text; HTTP 200 can still carry an error badge. Check dynamic package/download badges against the intended package and preserve per-language parameters.
5. After pushing, inspect the exact branch's GitHub-rendered header for image loading, row spacing, alignment and narrow-width wrapping. An SVG response or matching height attributes proves asset availability or declared dimensions, not visual alignment in GitHub. If rendered inspection was not performed, describe only the URL/content and source checks actually completed; do not claim baseline mismatch was conclusively eliminated.
6. Keep the PR body proportional to the patch: a short explanation of the new grouping, synchronized language files and actual verification is usually enough. Leave detailed color inventories and the design-option discussion out of the delivery reply.

### License files, badges and GitHub detection

Use this sequence when a README needs a license badge or GitHub does not display the repository's license.

1. **Establish the existing license before editing.** Read root and relevant package manifests, existing license texts and any third-party notices. A package-level MIT license is evidence for that package; do not infer it covers every subtree or replace differing component licenses. When the repository's established project-wide license is clear, reuse its exact text and copyright attribution for a missing root file. If project-wide licensing remains ambiguous, complete the read-only diagnosis and clarify before assigning a license.
2. **Prepare the file and badge as separate changes.** Put the established project license in a conventional root `LICENSE` when appropriate, preserving component notices. Add a badge linked to that actual file and synchronize the existing language variants using the header recipe above. Preserve required identical aliases. A static `License-MIT` badge displays the author's chosen label; it does not inspect the repository or establish GitHub recognition.
3. **Verify the source and asset.** Compare the new root text with its established source, inspect the full staged diff including newly added files, and check badge click targets and image content. Use `git diff --cached --check` after staging so a new license file is covered; an unstaged `git diff` omits untracked files. Report URL/content checks separately from GitHub-rendered alignment.
4. **Verify GitHub recognition at the correct publication stage.** After an authorized default-branch merge, inspect `gh api repos/OWNER/REPO/license --jq '.license.spdx_id'` and, when display is in scope, the actual repository page. An unmerged PR or a file visible on a feature branch does not establish the default repository's detected license. Describe a pending PR as adding the license file and badge; avoid promising immediate sidebar placement, file-header display or cache refresh. Do not claim GitHub only scans the root or that one missing file is the proven sole cause without evidence; the conventional root file is a reliable discovery location, while detection depends on recognizable content and the current published repository state.
5. **Keep delivery concise.** For a file-and-badge patch, state the established license, synchronized documents, checks actually performed and PR status. Avoid separate lengthy sections for cause, changes and repeated PR metadata when a short report suffices.

### Verify GitHub-rendered navigation

After pushing, open the exact branch's README blob page and inspect its rendered Markdown article. A local slug checker is a preflight, not final proof: simple punctuation-stripping rules miss GitHub behavior, duplicate headings and Unicode details.

1. Extract explicit TOC links separately from GitHub's automatically inserted heading permalinks; counting every `a[href^="#"]` overcounts the TOC.
2. Decode each fragment and resolve it against both the literal ID and `user-content-` plus the fragment. GitHub can put the ID on a sibling `a.anchor` rather than on the `h2`/`h3`; empty heading IDs do not mean navigation is broken.
3. Check all TOC targets in the rendered article, then click a representative Chinese fragment and confirm both the URL hash and the target's viewport position after scrolling. Inspect table/header text in the same rendered page.
4. Preserve heading punctuation unless there is an actual navigation defect; GitHub may already omit that punctuation from the generated anchor.

A DOM-only target check for a loaded article can use:

```javascript
const article = document.querySelector('article.markdown-body');
const links = [...article.querySelectorAll('a[href^="#"]')]
  .filter(a => !a.classList.contains('anchor'));
const missing = links.filter(a => {
  const id = decodeURIComponent(a.getAttribute('href').slice(1));
  return !document.getElementById(id)
    && !document.getElementById('user-content-' + id);
});
```

Select the actual TOC container when asserting its entry count; the broad selector above is only a fragment-target check. Confirm that the article has loaded and contains the expected branch content before interpreting empty results as success.

### UTF-8 model requests on Windows

For multilingual copy sent to an OpenAI-compatible gateway, prefer Python JSON serialization and `urllib.request` over shell-inline JSON, because shell/native-command encoding can alter Chinese before it reaches the model. Use the configured endpoint and exact requested model identifier; do not infer routing from the returned prose. A minimal request shape is:

```python
payload = json.dumps({
    "model": model_id,
    "messages": [{"role": "user", "content": prompt}],
    "max_tokens": token_budget,
    "stream": False,
}).encode("utf-8")
req = urllib.request.Request(endpoint, data=payload, headers=headers)
with urllib.request.urlopen(req, timeout=180) as response:
    result = json.load(response)
# Save returned model, finish_reason and message content with the draft.
```

Load credentials through the configured secure mechanism when required; a successful local probe without authentication is not a portable authentication policy. Use the provider-supported reasoning control for GPT review and retain it with request evidence.

## Personal-profile sequence

Use this for the special `OWNER/OWNER` repository whose README appears on a GitHub user's profile, including style-inspired redesigns and contribution animations.

1. **Inspect the references and current profile.** Read each requested example's actual README and relevant assets/workflows, then the user's current profile README, contribution archive and repository instructions. Extract reusable choices such as spacing, heading hierarchy, badges and contribution grouping. Do not transfer another person's biography or accomplishments. Preserve valuable archive links and assets unless the redesign warrants changing them.
2. **Build a factual content sheet before drafting.** Verify the account with `gh api user --jq .login` and inspect public project metadata with `gh repo view OWNER/PROJECT --json nameWithOwner,url,isPrivate,description`. Check contribution links individually using `gh pr view NUMBER -R UPSTREAM/PROJECT --json author,title,state,mergedAt,url,body`. Label open work as proposed, closed unmerged work accurately, and credited adoption separately from an authored merged PR. Describe projects from their actual README/source; a project name is not evidence of implementation. Use the student's stated major and interests without upgrading interests to research experience or adding unconfirmed leisure activities.
3. **Draft and review the full profile.** Apply the shared Gemini drafting, DeepSeek layout and GPT review roles with the same fact sheet. Adapt the examples' visual language to a compact introduction, selected projects and evidence-linked contributions. Keep long technical inventories in the contribution archive when they overwhelm the entry page. Review biography, contribution status, repository visibility and asset/link targets before preparing the commit.
4. **Prepare animation infrastructure when requested.** Inspect the chosen generator's current documented action inputs, output filenames and publishing mechanism before writing YAML. Use the exact profile owner, explicit required token permissions, manual dispatch and a reasonable refresh schedule. Match README light/dark `<picture>` URLs to the actual publishing branch and generated filenames. Do not add unused generators merely because a sample workflow contains them. Confirm the workflow can be published with the current authorization; use the auth reference if GitHub rejects workflow changes rather than removing the animation silently.
5. **Commit only the reviewed scope.** Inspect the checkout and full staged diff, including YAML, before committing the README and required workflow/assets. Reuse a valid checkout or clone into a fresh task directory. Preserve existing directories on clone collisions, because they may contain unpushed work. A user's instruction to submit an already-reviewed profile authorizes completing that publication without asking again. Follow repository policy for direct push versus PR.
6. **Verify publication and animation separately.** Read back the exact remote commit and README, for example `gh api repos/OWNER/OWNER/commits/BRANCH --jq .sha` and `gh api 'repos/OWNER/OWNER/contents/README.md?ref=BRANCH'`. When manual dispatch exists, run `gh workflow run WORKFLOW -R OWNER/OWNER --ref BRANCH`, then identify that dispatch using `gh run list -R OWNER/OWNER --workflow WORKFLOW --event workflow_dispatch --json databaseId,headSha,status,conclusion,url`. Inspect the matching run with `gh run view RUN_ID -R OWNER/OWNER --json status,conclusion,url,jobs`. After success, fetch every README-referenced SVG from the output branch or raw URL and confirm nonempty SVG content. A branch listing or green run alone does not prove the image URLs work. Inspect the actual profile rendering when available; report generated assets as verified without claiming they visibly loaded if rendering was not checked.
7. **Close with a short delivery report.** Give the live profile link, commit and checked workflow result. State any remaining rendering or cache limitation plainly. Do not repeat the style analysis or claim the redesign increased the user's actual contribution history.

## Curated-directory submission sequence

Use this for awesome lists, plugin marketplaces and other generated project directories.

1. **Discover the current submission contract.** Read CONTRIBUTING, README submission instructions, `.github/ISSUE_TEMPLATE/`, the PR template and representative accepted submissions. Determine whether intake is an issue form or a data-entry PR before preparing files. For PR intake, also inspect the schema/parser, README generator and submission workflow; for issue intake, follow the issue recipe below. Inspect recent relevant discussions for policy changes. Treat scripts as executable constraints, not a substitute for written policy. Derive entry path, category, bilingual fields, manifest/topic requirements and repository eligibility from current sources; do not reuse remembered thresholds or schemas.
2. **Check identity and overlap before writing.** Search entries and open/closed issues and PRs by exact owner/repository, package identifier and descriptive name. Similar names alone do not establish a fork or duplicate. Inspect actual capabilities of relevant entries before making an overlap statement; describe the submitted project's verified combination of features rather than claiming competitors lack them.
3. **Give Gemini a compact evidence packet, then GPT the final draft plus evidence.** Reuse the model-evidence rules above. Include canonical repo/package identifiers, manifest, release-vs-HEAD distinction, implemented tools and source locations. Audit each interaction separately: sorting/filtering/sliders may execute locally while prompt buttons, form submission or bridge calls deliberately send messages to the model. Describe browser storage as saved/restored state with its real limits, not unconditional persistence. Remove comparative or absolute claims that cannot be substantiated.
4. **Handle screenshots in the asset owner's repository.** When local images are offered, enumerate candidates, inspect selected images for actual feature content and sensitive names, paths or credentials, and order a compact set from overview to distinct interactions. Inspect the directory's screenshot discovery code before choosing paths or a manifest; if it consumes a project-owned `screenshots.json`, put assets and that manifest in the project repository, not in the list PR. Check the live manifest schema and image URLs. Keep any companion asset PR separate and state whether its branch is merged and discoverable from the branch the directory actually reads.
5. **Validate the canonical entry with the repository's own toolchain.** Install locked dependencies using the workflow's package manager. Run the entry parser, submission gate, locale/schema tests and generator/linter stages that CI invokes. In directories using `data/plugins/*.yml`, inspect scripts such as `check-submission.mjs` and `generate-readme.mjs` before invoking them; names and supported arguments may change. Confirm the newly added entry is present in parsed output—an overall success message alone may not prove it was selected. Review both generated language rows for truncation, unwanted wrapping and factual parity.
6. **Keep generated validation artifacts out of the submission when policy requires it.** Generate locally to test, then restore only the generated changes produced by this validation, preserving unrelated user edits. Inspect `git diff --check`, the complete diff and changed-file list against upstream; a one-entry policy must not silently accumulate generated README changes or unrelated entries. Follow `pr-workflow.md` for a fresh upstream-based branch and fork synchronization.
7. **Verify each delivery target independently.** Read back the directory PR's base/head, body and files, then inspect structured CI state for its current head. Verify a companion project PR separately. Report the main PR URL, checks actually completed and any asset dependency still awaiting merge; opening either PR does not authorize merging it or prove the next marketplace build has ingested it.

### Issue-form intake recipe

Use this branch when the directory asks contributors to request inclusion through an issue. The canonical-entry generation, fork and PR checks above apply only when the submission contract actually requires a PR.

1. **Read the live form and recent accepted requests.** Retrieve the form with `gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE/FORM.yml --jq .content` and decode its base64 content. Read the required fields, title prefix, checkboxes and labels. Reproduce field labels as Markdown headings when submitting with `gh issue create`; the CLI does not automatically apply issue-form labels or form behavior. Supply labels only when the live contract requires them and they exist; read back the resulting labels rather than assuming they were applied. Search both open and closed requests with `gh issue list -R OWNER/REPO --state all --search PACKAGE --json number,title,state,url` before creating a request.
2. **Build a source-backed package fact sheet.** For npm plugins, retrieve `npm view PACKAGE dist-tags --json` and `npm view PACKAGE@VERSION version engines peerDependencies license repository dist --json`. Use `npm pack PACKAGE@VERSION --json --pack-destination SCRATCH` when the intake requires package-integrity checks, then inspect the archive's actual manifest, declared client/patch entry paths, built files and license. Keep repository HEAD and the published version distinct: a file in Git does not establish that npm includes it. Verify installation syntax from current documentation or CLI definitions; do not install or run a plugin merely to write an application.
3. **Draft a compact application using the shared model roles.** Put canonical package/repository links first, a short description next, then only useful compatibility, installation, features and demonstration links. Include source paths or URLs in the evidence packet given to Gemini and GPT. Describe manifest ranges as declared compatibility, iframe/CSP settings as concrete controls, and state restoration with its supported limits; do not turn them into universal runtime or security guarantees. If including evaluation results, link their reports and distinguish mock, API and browser suites. Keep automated verdicts and human-reviewed verdicts separate, preserve failures, and do not present a rounded pass rate from one suite as overall reliability. A reviewer given only this packet checks consistency; its approval is not independent source verification.
4. **Publish the intended document once.** Save the final UTF-8 Markdown body outside the checkout, check that the form headings and required fields match, and inspect the final assembled text after any layout pass. Submit with `gh issue create -R OWNER/REPO --title TITLE --body-file BODY.md`. An explicit request to submit authorizes this issue creation; do not add another approval round after preparing the application. If creation returns an ambiguous failure, search before retrying to avoid a duplicate.
5. **Verify and report only the attained state.** Read back the returned target with `gh issue view NUMBER -R OWNER/REPO --json url,title,body,state,author,labels` and compare its body with the intended file. Keep the final chat reply to the issue link, a brief statement that the inclusion request was submitted, and any material limitation. An open issue proves submission; acceptance, a source-list update and live marketplace inclusion require separate evidence. Describe future maintainer steps only when the target's current policy documents them.

## Issue Forms authoring

Use this sequence when creating or adapting `.github/ISSUE_TEMPLATE/`, including separate Chinese and English forms inspired by another repository. This differs from filling an existing intake form above.

1. **Read both repositories before designing.** Discover the reference repository's actual template filenames with `gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE`, then retrieve and decode the relevant files. Read the target's existing templates, contributor instructions, manifests and documented clients. Borrow the reference's structure and useful field choices, adapting module options and installation methods to verified target capabilities. A familiar product name does not establish that its forms were inspected.
2. **Establish the delivery scope and checkout.** Inspect worktree status and remotes before editing; preserve unrelated changes and use an isolated checkout when needed. For a permission question, inspect `gh api repos/OWNER/REPO --jq '.permissions'`, the intended base branch and applicable rulesets/protection. Write access permits a contribution route but does not alone establish unrestricted direct pushes. Do not invent a fork requirement when a permitted upstream branch is available; follow the existing repository workflow and authorized publication scope.
3. **Design corresponding language variants.** When both bug reports and feature requests are in scope, provide separate Chinese/English forms for each with clear language names and deterministic filenames. Keep semantic field IDs, required status, option meaning, title prefixes and labels aligned across translations. For bugs, collect observed and expected behavior, reproduction, affected component, relevant versions/environment, optional sanitized logs and context. Include a companion-plugin/integration component when requested or supported by repository evidence. Preserve supplied project names until a canonical identifier is verified. Add a plugin-name/version field with room for multiple integrations, because a host/client version alone cannot identify the failing combination. Mirror the integration category in feature forms and let reporters describe the cross-plugin scenario. For features, start with the concrete problem and desired outcome; keep implementation ideas optional. Avoid hardcoded current versions and unnecessary mandatory confirmations that increase reporting effort.
4. **Verify configuration destinations and labels.** Read the live label catalog before declaring automatic labels; creating labels is a separate mutation. Check documentation links and the actual private security reporting channel using the policy checks below. A generic `/security` page does not establish enabled private vulnerability reporting. Do not disable blank issues merely because the reference does; choose it deliberately based on the requested intake policy. Keep privacy guidance concise and relevant to logs, pairing data and screenshots.
5. **Write real UTF-8 files, then validate that exact set.** Put the final files in the target checkout before declaring implementation complete. Use file tools for multiline YAML and any validation script, then execute the script by path; shell-inline JavaScript template strings combine YAML quotes with Bash backtick substitution and can break or execute content. Use an available YAML parser to load every expected file. Fail on missing files rather than wrapping validation in an `existsSync` skip: a validator that silently skips absent inputs can report success without checking the deliverable. Extend the existing Markdown shell-quoting discipline to YAML and generated code rather than trying more escaping layers.
6. **Separate syntax, form structure and rendering checks.** YAML parsing alone proves syntax. Inspect required form metadata, supported field types, unique field IDs, dropdown options, checkbox structure, referenced labels and bilingual parity; use configured repository validators when available. Inspect `config.yml` separately because it is not a form. Run `git diff --check` and inspect the complete new-file diff after staging. Do not add application tests for a template-only patch. Check actual GitHub form rendering when available, without submitting a dummy public issue; report rendering as unverified if only local parsing/inspection ran.
7. **Deliver at the attained publication stage.** Describe the target project's form behavior rather than the source of design inspiration. Before committing, inspect all new template text and the complete proposed commit message for unsolicited reference-project attribution; inspect the intended PR title/body as well, preserving legally required notices. If the user corrects attribution after a commit already exists, inspect the affected commit messages and follow the authorized history-editing scope; removing a phrase from files alone does not remove it from history. Keep any final claim limited to the files, messages and PR fields actually inspected. Follow the authorized branch/PR workflow and read back the exact remote files after pushing. Verify PR base/head and file list when a PR was requested. Templates on a feature branch or an open PR are prepared changes; they become the repository's default issue chooser after reaching its default branch. Report changed forms, checks actually run and the PR or local file links in a short reply, without dumping all YAML or asking permission to perform already-authorized local work.

## 2. Check live policy separately from workflow configuration

Workflow jobs are not necessarily required checks. Inspect rulesets and any applicable branch protection:

```bash
gh api repos/OWNER/REPO/rulesets
gh api repos/OWNER/REPO/rulesets/RULESET_ID
gh api repos/OWNER/REPO/branches/BRANCH/protection
```

Distinguish required checks from advisory or allowed-failure matrix jobs. Document reduced PR matrices separately from full release/manual/nightly matrices. If API access cannot confirm a policy, state what the workflow runs rather than claiming branch protection enforces it.

Check the security channel before directing contributors there:

```bash
gh api repos/OWNER/REPO/private-vulnerability-reporting
```

Do not change repository settings merely to make a drafted sentence true. Use an existing verified private channel or obtain authorization to enable one. When enabling private reporting is authorized, use `gh api -X PUT repos/OWNER/REPO/private-vulnerability-reporting`, then GET the same endpoint and confirm `enabled: true` before documenting it. Never invent a maintainer email or suggest publishing exploit details as a fallback.

## 3. Draft with Gemini, review with GPT

For this user, have Gemini write the prose and GPT-6.1 sol review with high reasoning. Supply the fact sheet and relevant source excerpts to both. Ask the reviewer to check claims and runnable instructions, not merely grammar.

Use a contributor-oriented order: requirements and quick start; build/generated-artifact rules; tests and optional checks; local conventions; commits/PRs and gates; translations/docs; advisory automation; security; maintainer-only releases; licence. Link existing deep guides instead of copying them in full.

Keep hosted model infrastructure names out of contributor-facing descriptions of Gemini automation. Explain capabilities and trust boundaries: advisory review is not approval or a merge decision, and automated comments do not replace required checks.

For security/privacy prose, distinguish encrypted payload contents from service-visible metadata. Check the repository's threat-model or encryption guide for connection identifiers, online presence and connection timing before accepting claims such as “the server sees nothing.” Write the actual visibility boundary rather than converting encryption into a blanket privacy guarantee.

Reconcile every substantive review finding against source or the live API; a model's review is not evidence by itself. Check the final revised document against the fact sheet, and obtain a follow-up review when revisions substantially change commands, policy or scope. Do not claim GPT approved the final version if it reviewed only an earlier draft.

## 4. Validate and deliver

- Verify documented commands exist and run feasible checks; label prerequisites or untested optional paths explicitly. Do not trigger paid evaluations or releases merely to test documentation.
- Check relative links, fenced blocks and Markdown structure. Use the repository's configured documentation checker if present; an optional formatter check does not establish a repository formatting policy.
- Inspect the complete staged diff and commit metadata; commit only intended documentation changes.
- Open a focused PR describing the guide and material fact corrections, not a transcript of the drafting process.
- When merge is authorized, wait for actual required checks, address failures, merge without bypassing protections, and re-read PR state plus the document on the default branch.

After merge, GitHub's community-profile API can verify that the guide is recognized:

```bash
gh pr view NUMBER -R OWNER/REPO --json state,mergedAt,mergeCommit
gh api 'repos/OWNER/REPO/contents/CONTRIBUTING.md?ref=BRANCH'
gh api repos/OWNER/REPO/community/profile --jq '.files.contributing.url'
```

Report the guide/PR link, verified review and CI outcome, and any unresolved limitation. Do not replay every corrected draft mistake unless the user asks for the review details.
