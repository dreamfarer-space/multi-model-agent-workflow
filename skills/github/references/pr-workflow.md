# GitHub Pull Request Workflow

Complete guide for managing the PR lifecycle. Each section shows the `gh` way first, then the `git` + `curl` fallback for machines without `gh`.

## Prerequisites

- Authenticated with GitHub (see this skill's `references/auth.md`)
- Inside a git repository with a GitHub remote

### Quick Auth Detection

```bash
# Determine which method to use throughout this workflow
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  # Ensure we have a token for API calls
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python "${GITHUB_SKILL_DIR:-${ANTIGRAVITY_PLUGIN_DIR:-$HOME/.gemini/config/plugins/workflow}/skills/github}/scripts/git-credential-token.py")
    fi
  fi
fi
echo "Using: $AUTH"
```

### Extracting Owner/Repo from the Git Remote

Many `curl` commands need `owner/repo`. Extract it from the git remote:

```bash
# Works for both HTTPS and SSH remote URLs
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
echo "Owner: $OWNER, Repo: $REPO"
```

---

## 1. Branch Creation

This part is pure `git` — identical either way:

```bash
# Make sure you're up to date
git fetch origin
git checkout main && git pull origin main

# Create and switch to a new branch
git checkout -b feat/add-user-authentication
```

Branch naming conventions:
- `feat/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code restructuring
- `docs/description` — documentation
- `ci/description` — CI/CD changes

### Follow-up changes after an earlier PR

Before committing or pushing a follow-up, read the earlier PR with
`gh pr view NUMBER -R OWNER/REPO --json state,mergedAt,baseRefName,headRefName,headRefOid`.
An existing local branch or upstream tracking ref does not establish that its PR
is still open. If it is open, use its actual head and base. If it is merged,
fetch the upstream remote and create a fresh branch from the current target:
`git switch -c FIX_BRANCH UPSTREAM_REMOTE/BASE`. Preserve local work first;
cherry-pick only the new fix commits, not the merged feature series. This is
especially important after a squash merge, because old feature commit IDs may
remain outside the upstream history despite their changes being present.

Before pushing, inspect `git log --oneline UPSTREAM_REMOTE/BASE..HEAD` and
`git diff --stat UPSTREAM_REMOTE/BASE...HEAD` for only the intended increment.
Create the follow-up with explicit upstream repository, fork head and base;
read back its state, head SHA, files and body. Pushing to the old merged head
branch does not reopen or update the merged PR.

## 2. Making Commits

Use the agent's file tools (`write_file`, `patch`) to make changes, then commit:

```bash
# Stage specific files
git add src/auth.py src/models/user.py tests/test_auth.py

# Commit with a conventional commit message
git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Add auth middleware for protected routes
- Add unit tests for auth flow"
```

Commit message format (Conventional Commits):
```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`

## 3. Pushing and Creating a PR

### Push the Branch (same either way)

```bash
git push -u origin HEAD
```

### Push pitfall: stale fork + workflow files

A push to a fork is rejected with `refusing to allow an OAuth App to create or
update workflow ... without 'workflow' scope` when the pushed delta touches
`.github/workflows/` — which happens whenever the fork's main is behind
upstream, because the branch then carries upstream's workflow commits. The
restriction also applies to `gh repo sync` and the `merge-upstream` API. Fixes:
sync the fork first (the web **Sync fork** button needs no token scopes), or
run `gh auth refresh -s workflow` once (device flow). Compare
`git ls-remote fork refs/heads/main` with upstream before pushing.

### Create the PR

**With gh:**

```bash
# Write the reviewed Markdown to pr-body.md with the file tools first.
gh pr create \
  --repo UPSTREAM_OWNER/REPO \
  --head FORK_OWNER:BRANCH \
  --base main \
  --title "feat: add JWT-based user authentication" \
  --body-file pr-body.md
```

Options: `--draft`, `--reviewer user1,user2`, `--label "enhancement"`, `--base develop`

**With git + curl:**

```bash
BRANCH=$(git branch --show-current)

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$OWNER/$REPO/pulls \
  -d "{
    \"title\": \"feat: add JWT-based user authentication\",
    \"body\": \"## Summary\nAdds login and register API endpoints.\n\nCloses #42\",
    \"head\": \"$BRANCH\",
    \"base\": \"main\"
  }"
```

The response JSON includes the PR `number` — save it for later commands.

To create as a draft, add `"draft": true` to the JSON body.

### Prepare an evidence-backed PR body

1. Resolve the actual base and proposed head, then collect
   `git diff --name-status BASE_SHA...HEAD_SHA` and the relevant source excerpts.
   Read the linked issue's acceptance criteria before choosing `Closes`: use an
   ordinary issue reference when this PR implements only part of the requested
   scope, because closing keywords can prematurely close the remaining work.
2. Build one evidence bundle for the writer and reviewer. For each check, record
   the exact command, tested SHA and working-tree state, package, output artifact
   and result. Label untouched-base runs, isolated-PR runs and combined-feature
   workspace runs separately. Record emulator/device actions separately from
   typechecks, test counts and production resource exports. An export verifies
   bundling, not an installed application or an exercised streaming session.
3. Have the assigned writer draft from that bundle; give the assigned reviewer
   the bundle as well as the intact draft. Reconcile reported evidence gaps
   against the source and logs before accepting the prose. If evidence remains
   unavailable, remove or qualify the claim; deleting the reviewer's prefatory
   caveat does not resolve the gap.
4. Inspect the complete final Markdown for invented test commands, device/API
   versions, test additions and file totals. Derive totals from the actual diff
   and runner output rather than from model agreement. Lead with the behavior
   change, retain only engineering detail useful to reviewers, and keep planned
   acceptance checks explicitly pending. Save the reviewed body with file tools.
5. Submit with explicit repository, base and fork head using `--body-file`.
   Read back `url,state,isDraft,baseRefName,headRefName,headRefOid,title,body,files`
   with `gh pr view NUMBER -R OWNER/REPO --json ...`; compare the body with the
   reviewed file and the head with the pushed commit. Check CI independently.
   Finish with the PR link, actual verification and any remaining limitation.

### Publish a PR with visual evidence

1. Recover the current delivery state before continuing an existing task:
   inspect `git status --short`, `git diff --stat`, `git diff --cached --stat`,
   branch/remotes and existing PRs. Read the live PR template, contribution
   policy and relevant design sections before interpreting "latest rules";
   verify cited paths and headings exist. Stage only reviewed source and tests,
   keeping screenshots outside the checkout; inspect `git diff --cached --name-status` and
   `git diff --cached --check` before committing, because generated renderers
   or temporary fixtures can be mixed into otherwise relevant directories.
2. Run the affected packages' canonical checks from the repository working
   directory. Save the command, package identity and output for each result.
   Calculate any combined test total from those outputs. Keep typechecks,
   emulator observations and model reviews as separate evidence; record the
   actual returned model identity when attributing a review.
3. Select screenshots that each demonstrate a distinct acceptance criterion,
   then inspect the actual pixels of every selected image. Exclude or redact
   private names, paths and secrets before staging. For login or device-pairing
   QR codes, mask the complete code with an opaque cover or coarse mosaic and
   inspect the exported pixels before delivery; a filename containing
   `mosaiced` does not establish redaction. Upload only the redacted output as
   a GitHub attachment; keep both original and redacted screenshots out of Git.
   Inspect existing branch changes for accidentally committed originals; removing
   a file in a later commit does not remove it from earlier commits. Demonstrate filled forms
   with fictitious values. Caption only visible behavior: a picker screenshot proves the selection UI appears, while a
   successful upload requires execution or server evidence. Describe fixtures
   and mocked services explicitly instead of calling them production end-to-end
   verification.
4. Do NOT commit image files into the git repository (to avoid repo bloat).
   Instead, embed images directly into the PR description markdown via GitHub's
   attachment upload mechanism (or drag-and-drop/paste into GitHub PR UI).
   For this user, publish in the PR description by default; use the exact PR's
   comment thread when explicitly requested, following the comment-delivery
   procedure below. Never create a separate Issue or Issue comment as an image
   archive or temporary upload target, and do not substitute an asset branch or Release. If upload cannot be completed, keep
   inspected images outside the repository and disclose the incomplete gallery.
   Only commit and push the reviewed code/test changes. If external image links
   are used, verify each URL returns a successful response and image content type.
5. Write a concise PR body to a Markdown file: concrete problem and resulting
   behavior, relevant implementation choices, actual validation and limits.
   For portrait mobile screenshots, default to a two-column HTML table with short
   captions and `<img width="280">`; add rows only for distinct evidence. An odd
   final image can occupy a centered `colspan="2"` cell while retaining the
   same width. If the user reports missing detail or incomplete images, inspect
   source bounds, attachment availability and rendered size separately. Switch
   dense full-screen evidence to one captioned Markdown image per row at the PR
   content width, preserving aspect ratio and complete controls; do not force
   three portrait images across a row. Desktop screenshots do not inherit the
   mobile width. Derive physical-device versus emulator captions from capture
   provenance, never from resolution, status bars or the screenshot's appearance. Keep blank
   lines around HTML tables and preserve caption-to-image order. Mark retained
   user-provided problem screenshots as pre-fix evidence; do not imply current
   branch, device or Light/Dark acceptance from them. Before submission, extract
   every image URL and its caption from the complete draft and compare them with
   the saved media manifest. Reject a before/after pair sharing the same URL or
   identical file bytes; use a single post-fix image when no failure capture is
   available. Then compare the actual final images at the intended rendered size:
   different URLs or hashes do not prove a visible behavior difference. For an
   image-loading repair, select a failure capture containing the visible error
   and a repaired capture containing recognizable decoded image content inside
   the message bubble. Do not substitute a text-only chat or infer success from
   the absence of an error. If the relevant component is too small, use Pillow
   `Image.open(source).crop((left, top, right, bottom)).save(output)` with bounds
   derived from that source image; preserve the complete component, its caption
   and the context needed to assess the state. Inspect every exported crop again
   for clipping, privacy and legibility; never composite successful content into
   the application screenshot. Record client entry point, runtime revision and
   emulator versus physical-device provenance for each capture, because different
   clients can exercise different attachment-loading paths. Label an original user
   failure and a later test-fixture success as separate observations when the
   fixture or client differs; do not imply they replay the identical attachment.
   If the user says a comparison is indistinguishable, inspect the saved gallery's
   exact assets, replace the unsuitable images and captions, and follow the
   gallery-refresh readback procedure; changing captions alone cannot repair
   missing visual evidence.
   Submit with `--body-file` and explicit repository, fork head and base.
6. Read back the exact PR with
   `gh pr view NUMBER -R OWNER/REPO --json url,state,headRefOid,baseRefName,headRefName,title,body,files`.
   Match its head to the pushed commit, inspect its files and gallery URLs,
   and check CI independently. If checking the rendered gallery, distinguish
   visible rendering from HTTP asset availability. Finish with a short chat
   report containing the PR link, commit and verified checks; keep the full
   gallery in the PR unless the user asks to see it in chat.

### Deliver visual evidence in an authorized PR comment

1. Read `gh pr view NUMBER -R OWNER/REPO --json state,mergedAt,mergeCommit,headRefOid,body` and current comments before writing. If delivery was conditional on no intervening implementation change, fetch the target base and compare the affected files at the tested revision, merge result and current base; a clean local worktree does not establish unchanged upstream behavior. Keep existing screenshots only when their provenance and affected UI remain applicable; otherwise recapture or label them as earlier evidence.
2. Reuse the inspected files and saved native attachment mapping. An unattached URL returning 404 can require binding to saved GitHub content; do not conclude the upload failed or print authenticated response headers. Save stable attachment URLs, never cookies or signed redirect URLs. Inspect each actual image and caption before publication.
3. Write a short gallery with environment and observed states to a repository-external Markdown file. Publish once with `gh pr comment NUMBER -R OWNER/REPO --body-file PATH`. Preserve the existing PR description unless the user also requested its update. Do not create a new PR, resurrect a merged branch or make a code commit for this media-only delivery.
4. Retain the returned comment URL and read that exact resource with `gh api repos/OWNER/REPO/issues/comments/COMMENT_ID`. Compare its complete body and author with the intended payload, extract every attachment URL from that read-back, then GET with redirects and verify media content. A HEAD 302 establishes only a redirect; authenticated access does not establish public rendering. Check rendered images separately and report only what was verified. After an uncertain response, inspect existing matching comments before retrying to prevent duplicates.
5. Finish with the verified comment link and a brief description of the gallery added; do not repeat the image table or implementation report in chat unless requested.

### Browser handoff for PR attachments

1. Read the live PR and resume the saved media manifest first. Separate CLI
   authentication from browser authentication: successful `gh auth status` does
   not establish that the controlled browser is logged in. Prefer a verified
   native upload route already available; use the browser description editor
   when browser upload is needed. Try the installed `gh attach` extension
   before touching browser settings: inspect `gh attach --help` for the installed
   interface and pass file paths positionally with `-R OWNER/REPO`; a PR number
   and `-f` are not attachment arguments. The extension may use an authenticated
   token route or browser cookies; do not assume browser login is its only path.
   If a batch or structured-output invocation fails without a clear authentication
   error, retry one inspected file with
   `gh attach -v "IMAGE_PATH" -R OWNER/REPO` and persist any returned stable URL
   immediately. A successful single-file retry is a usable upload result, not
   proof that verbose mode fixed authentication. If the extension explicitly
   cannot resolve a usable cookie source but `gh` is authenticated, try the
   direct native attachment recipe below before requesting browser login or
   changing profiles. CLI token authentication and browser-cookie authentication
   are independent; an unavailable cookie source does not establish that the
   token upload route is blocked. Resume only missing files using the working
   route. Do not extract session cookies through CDP
   or pass them in command-line arguments to work around an upload error; keep
   credential handling in the supported authentication or vault flow.
2. Attach through the supported user-browser route and inspect the exact target
   tab before changing browser settings or closing windows. Read the current
   tool contract before assuming how it attaches. Verify the PR URL, a positive
   account indicator for the intended user, and an available description editor.
   Treat an empty page, a title, or absence of a login link as inconclusive.
   If textareas and file inputs are absent, inspect the current URL and visible
   page text for a signed-out state or the wrong page before trying new selectors.
   Open the authorized editor first, then resolve its actual file input. Require
   a nonzero CDP node ID before `DOM.setFileInputFiles`; selector result `0`
   means no node was found and cannot accept a file upload.
3. If browser startup or attachment fails, inspect its actual error before
   restarting. Verify that the browser version supports the proposed debugging
   directory and flags before interrupting an existing session. Stop only
   task-owned processes; broad browser-operation permission is not a reason to
   repeatedly kill all browser processes. Do not cycle through copied profiles
   or assume copied cookie files preserve authentication. Report an observed
   signed-out state without asserting a particular encryption cause unless
   separate evidence establishes it.
4. When login is genuinely required, use the available credential-vault flow
   according to its current contract. If user interaction remains necessary,
   identify the exact controlled window and request only that login step; never
   request credentials in chat or type them through ordinary browser input.
   Preserve existing authorization for upload and PR editing so successful login
   resumes delivery without another approval round. Retain inspected media and
   its manifest while paused; do not create unrelated public comments or ping a
   maintainer merely because the requested upload is blocked.
5. Upload into the PR description, persist returned attachment URLs, save the
   preserved body and perform the motion-evidence verification below. If this
   route ends blocked or is abandoned, restore browser policies and automation
   settings to their recorded original values and close only task-owned windows.
   Remove a temporary authenticated profile only after its browser has stopped
   and the profile is no longer needed for the pending user handoff. Report
   verified cleanup separately from pending cleanup; do not leave configuration
   restoration as an unexecuted promise hidden behind successful code delivery.

### Add motion evidence to an existing PR

1. Read the current PR body and recover already uploaded media before adding
   files. Preserve its implementation summary, validation history, screenshots
   and maintainer edits; adding a recording does not justify regenerating the
   entire description. Reuse the gallery manifest and existing attachment URLs
   after an interruption instead of uploading the same files again.
2. Inspect the recording for the intended interactions and private content
   throughout the clip, including intermediate screens. Use screenshots for
   visible states and an inspected clip or execution evidence for animation,
   accordion transitions, scrolling and session navigation. Do not label a
   recording full-length or high-definition without checking the source.
3. Discover the installed extension with `gh attach --help`. The demonstrated
   upload interface accepts PNG, GIF and MP4 files:
   `gh attach "PATH/demo.mp4" -R OWNER/REPO --json href,name`.
   Upload each selected file and persist its returned mapping immediately, using
   the same authorized repository-context and resume rules as the gallery flow.
   Keep media outside Git; no source commit or push is needed for this update.
4. Add concise Chinese captions to the existing visual-evidence section. Keep
   portrait screenshots in the established two-column gallery. If a GIF preview
   accompanies an MP4, put the optional preview in a `<details>` block and link
   the stable MP4 attachment as the recording; neither a preview nor a set of
   still images substitutes for a requested video. Do not generate extra formats
   unless they add useful evidence. Submit the complete preserved body with
   `gh pr edit NUMBER -R OWNER/REPO --body-file PATH`.
5. Read back the exact saved body, compare it with the intended Markdown and
   extract its attachment URLs programmatically. Reconcile the selected-file
   count and captions, then GET each URL with redirects: expect `image/png`,
   `image/gif` or `video/mp4` as appropriate and verify the returned media matches
   the selected file. Inspect rendering or playback separately before claiming
   those checks passed; HTTP 200 and the correct MIME type prove availability
   only. Finish with the PR link and a brief statement of the media added and
   any unverified boundary; leave individual attachment URLs in the PR.

### Direct native attachment upload when an extension is unavailable or lacks authentication

Use this as an optional upload recipe, not a documented stable GitHub REST API.
The raw-byte POST has returned a native attachment URL in actual use; public
availability and PR rendering still require the separate verification below.

1. Inspect the selected image for privacy first. Resolve the repository context
   with `gh api repos/OWNER/REPO --jq .id`; use the intended authorized repository,
   and retain which context produced each attachment.
2. In a repository-external Python script, obtain the token with
   `subprocess.check_output(['gh', 'auth', 'token'], text=True).strip()` and keep
   it in process memory. Build query parameters with `urllib.parse.urlencode`:
   `name`, `content_type`, `repository_id`. POST the actual image bytes to
   `https://uploads.github.com/user-attachments/assets?<query>` using
   `urllib.request.Request`, with `Authorization: Bearer <token>`,
   `Accept: application/json`, the correct image `Content-Type` and byte
   `Content-Length`. Resolve the attachment URL from `data.get('href') or
   data.get('url')`; both response fields have been handled by a working uploader.
   Require a nonempty HTTPS attachment URL before marking that file uploaded;
   never record a missing URL as a success. Never print the token,
   request headers, cookies or signed redirect URLs.
3. Persist each successful file-to-URL mapping immediately in a repository-external
   JSON manifest before starting the next upload; saving only after the whole loop
   loses usable URLs when a later request fails. Include source path, caption and
   repository context, validate the HTTPS attachment URL, and resume only missing
   entries. Save the preserved Markdown with file tools and submit those stable
   URLs into the PR description with `--body-file`; read the exact remote body
   back and compare the complete text with the intended file. An unbound attachment
   may return not found; bind and verify before retrying or changing repository
   context. A successful POST alone does not establish public delivery.
4. Extract the stable attachment URLs from the exact saved remote body and
   reconcile their set and caption mapping with the selected-file manifest;
   derive the expected count from that manifest rather than hard-coding a gallery
   size. Verify public attachments with an unauthenticated redirected GET, for
   example `urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})`.
   Do not reuse the upload's Authorization header: redirect handling can forward
   it to the asset host, exposing the token and causing an otherwise public
   download to fail. If an authenticated download failed, retry the same saved
   stable URL without Authorization before uploading a replacement. Do not attach
   a GitHub token to arbitrary asset/CDN requests; private delivery requires its
   supported authentication route and must not be described as public access.
   Require a successful final status, the expected media Content-Type and nonzero
   bytes; compare `hashlib.sha256(downloaded).digest()` with the selected local
   file's digest to establish that each URL serves the intended attachment.
   Inspect the rendered gallery separately: matching bytes establish availability
   and identity, not browser rendering or UI acceptance. Use the existing
   gallery-repair procedure if verification fails; report an unresolved gallery
   rather than promoting upload acceptance to success.

### Refresh an existing PR gallery after UI changes

1. Read the live `body,headRefOid` and save the original body outside the checkout.
   Preserve maintainer edits, issue links and existing validation sections. Fetch
   the actual PR head and confirm the emulator is running its intended bundle;
   a local branch name or a successful screenshot command does not establish
   the displayed revision. Do not change application code merely to refresh images.
2. Navigate to each selected state with the target device explicitly selected.
   After every navigation or modal action, inspect the current UI hierarchy or
   screen before issuing the next dependent tap; coordinates from a previous
   page can silently capture the wrong state. Capture with
   `adb -s SERIAL exec-out screencap -p` to a repository-external PNG. If cropping
   system status/navigation bars, derive the bounds from the current capture's
   dimensions and visible insets rather than reusing fixed pixel offsets from
   another device; preserve app controls and evidence needed to assess the result.
   Cropping bars is presentation cleanup, not privacy verification. Visually
   inspect every final image for the intended page, visible setting values,
   stale loading/error overlays and privacy before assigning captions; checking
   PNG dimensions alone is insufficient. Recapture mislabeled or stale states.
3. Upload the inspected files as GitHub-native attachments. Where a local
   attachment extension is present, discover its invocation with `gh attach --help`;
   the demonstrated interface is `gh attach IMAGE_PATH -R OWNER/REPO`; when
   supported by that extension, add `--json href,name` to retain a structured
   file-to-URL mapping instead of parsing prose. Treat this
   as an installed extension capability, not a guaranteed built-in command;
   otherwise use the PR description's browser upload flow. Store the returned
   mapping from state/local file to stable attachment URL. For a batch, save each
   successful result immediately to a repository-external JSON manifest, including
   the source path, intended caption, repository context and returned URL. Reuse
   an existing successful upload of the same selected file, including a discovery
   upload made before the batch; resume only missing entries after an interruption,
   because restarting the whole batch creates duplicate attachments. Compare the
   manifest's selected-file count with the intended gallery before publishing.
   Persist these URLs in the PR description before judging public availability: an uploaded but
   unreferenced attachment can return not found until the description is saved.
   If an initial availability check fails, save and read back the intended
   gallery first, then retry those same URLs instead of immediately uploading
   duplicate files. After binding, GET each URL with redirects enabled, verify
   image content and compare it with the selected image; follow the rendering
   checks below separately. Do not retry already successful uploads just because
   another image failed.   If particular attachments still return not found after
   binding, first make a bounded retry of those same saved URLs. If they remain
   unavailable, re-upload only those inspected files through an authorized
   repository context, persist the replacement mapping immediately, and replace
   only their gallery entries. For a fork PR, use the intended upstream or the
   authenticated user's head repository when authorized; record which context
   produced the working replacement rather than treating either context as an
   inherently reliable fallback. A successful retry establishes a usable
   replacement, not the cause of the original failure.
   Verify the replacement URLs extracted from the saved remote PR body rather
   than only from the local draft, because a successful edit or local check does
   not prove which gallery GitHub actually stored.
4. Replace only the selected gallery URLs and affected captions in the saved
   current body. Preserve the layout unless the requested repair concerns
   legibility or completeness; in that case, use a single-image-per-row layout
   and verify the final rendered size. Do not rewrite
   implementation prose, insert new test totals, or claim CI was rechecked as
   a side effect of uploading images. Publish with
   `gh pr edit NUMBER -R OWNER/REPO --body-file PATH`, then read the exact body
   back and compare it with the intended document. Count the selected images
   programmatically and check every caption-to-URL mapping; preserve unrelated
   content and reconcile concurrent body edits before replacing them.
5. Verify the rendered gallery separately from attachment availability, and
   read the head again to identify any version change during the update. Finish
   with the PR link, the verified gallery update and any remaining limitation;
   leave the image table and design explanation in the PR. Report CI status
   only if independently fetched for the current head.

### Repair missing or broken PR images

1. Read the current PR body and relevant comments, then extract every gallery
   URL. If revising for current policy, first read the live template and design
   rules and verify citation paths and headings. Record the head SHA so a
   description-only repair can be distinguished from code changes. GET every
   exact URL with redirects enabled; record final status, content type and
   whether the bytes decode as an image. Check pinned paths only for legacy
   repository URLs; native attachments have no repository path. A local PNG or
   a public repository does not establish that the published URL works.
2. Inspect each selected source image for complete screen/dialog bounds,
   including bottom action buttons, then inspect the actual rendered PR in the
   browser. Distinguish source clipping, unreadable thumbnail sizing and broken
   attachments before choosing recapture, layout change or replacement upload;
   a failed asset request alone does not prove the original upload failed. For
   each gallery image, inspect `complete`, `naturalWidth` and `currentSrc` in the
   DOM, including any GitHub image-proxy URL. Scroll each selected image into view
   and allow a bounded load retry before interpreting zero natural dimensions,
   because lazy loading can leave off-screen assets pending. Require
   `complete === true`, `naturalWidth > 0` and `naturalHeight > 0` for each image
   before claiming browser loading succeeded, then inspect its actual rendered
   size for readability. An `<img>` tag in returned HTML establishes markup
   presence only; HTTP availability and browser rendering are separate results.
   If the browser check times out or images remain pending, retain that unknown
   result in the final report; an initial 302 from a separate request cannot
   override missing rendering evidence. If direct assets load but the gallery fails, inspect the markup
   and proxy response before blaming DNS or regional access.
3. Correct the evidenced problem in the existing gallery and publish the
   intact body with `gh pr edit NUMBER -R OWNER/REPO --body-file PATH`.
   If using GitHub-native attachments, obtain URLs from the completed upload
   flow rather than constructing IDs or treating a plausible upload endpoint
   as proof. Verify each returned URL with a redirected GET; a HEAD result
   alone does not establish whether the image body can be loaded. Keep signed
   redirect query strings out of reports and use the stable attachment URL.
   For this user, migrate legacy repository screenshots to GitHub-native
   attachments; a functioning raw/blob/CDN URL does not satisfy their rule
   against committing PR screenshots. Do not create an asset branch or release
   to host them. Compare each downloaded replacement against the selected
   redacted image using decoded pixels or a content hash, so HTTP success cannot
   silently substitute another screenshot. Preserve caption-to-URL mapping and
   update stale references in relevant existing user-authored comments without
   changing unrelated discussion. Edit an existing issue comment with
   `gh api --method PATCH repos/OWNER/REPO/issues/comments/COMMENT_ID -F body=@COMMENT_FILE`,
   then read that exact endpoint back and compare its body. A working replacement
   proves an alternative delivery path, not a diagnosis of the original failure
   or access from another network.
4. Read back the edited body and any edited comments, compare them with the
   intended files, and recheck every rendered image. Repository `blob` links and
   local chat attachments can provide interim access, but label the PR gallery
   unresolved until it renders. When chat delivery is requested, inspect the
   actual images for privacy first and use the media channel; avoid repeating
   the full technical report alongside the gallery.
5. If cleaning legacy asset storage is within scope, distinguish removing a
   branch ref from rewriting history or purging cached objects. Before deleting
   a ref, verify it is the dedicated obsolete asset branch and is not the PR
   head; afterward use `git ls-remote REMOTE refs/heads/ASSET_BRANCH` to verify
   the ref is absent. Never infer historical erasure from deletion. For a claim
   that the PR contains no screenshot commits, inspect all PR-introduced commits,
   not just the final diff: fetch the actual base/head, use
   `git log --name-status BASE..HEAD` and inspect suspicious blobs regardless of
   extension. State the inspected scope; this does not establish a repository-wide
   purge. Do not rewrite unrelated history as part of a gallery repair.
6. Give any model reviewer the actual final bodies, current policy excerpts,
   image inspection results, commit/file evidence and readback results. Treat a
   review that says it lacks those sources as an evidence gap, not a compliance
   approval. Report only checks actually returned by `gh pr checks`: DCO success
   establishes sign-off status, not image privacy, rendering or test execution.
   Finish with the PR links, a brief account of the repaired gallery and any
   unverified boundary; omit a replay of model outputs and operational steps.

## Repair conflicts in an existing PR

1. Recover the exact target with
   `gh pr view NUMBER -R OWNER/REPO --json url,state,baseRefName,baseRefOid,headRefName,headRefOid,headRepository,headRepositoryOwner,body`.
   Inspect `git status`, `git remote -v`, and the branch graph before changing
   history. Identify any merge or rebase already in progress; continue that
   operation instead of starting another. Preserve unrelated working changes.
   Fetch the actual base and head remotes; do not assume `origin` is upstream
   or that the base branch is `main`. Resolve each fetched ref with
   `git rev-parse REMOTE/BRANCH` and use those full SHAs for local probes.
   Compare them with the API's `baseRefOid,headRefOid`; if they differ, refresh
   both sources and identify which snapshot each result describes before
   combining local and GitHub evidence. A local probe against a newer base
   does not verify an older API snapshot. Record the fetched remote head SHA
   before rewriting so it can be used as the push lease.

   Before changing the PR branch, read
   `gh pr view NUMBER -R OWNER/REPO --json headRefOid,baseRefOid,mergeable,mergeStateStatus,reviewDecision`
   and `gh pr checks NUMBER -R OWNER/REPO`. Re-read `UNKNOWN` after GitHub
   recomputes it. `BLOCKED` is not a conflict diagnosis: establish missing
   approval or failed-check requirements from the actual review/check evidence.
   Describe a bot's generic error as an error; do not infer a network outage or
   a code defect without logs.

   Check integration without modifying the contributor's branch. On Git versions
   supporting it, use `git merge-tree --write-tree BASE_SHA HEAD_SHA` and inspect
   the exit status and conflict output; otherwise use a temporary branch in an
   isolated worktree and merge the fetched base there. If it merges cleanly,
   do not create a repair commit merely to have a diff. Update a stale branch
   when required by repository policy or the requested outcome. An ordinary
   merge preserves existing commit IDs; rebase rewrites them, so stale comment
   references alone are not a reason to avoid an otherwise necessary merge.

   If a required clean base update is performed through GitHub, pin the
   observed head to avoid racing another contributor:
   `gh api --method PUT repos/OWNER/REPO/pulls/NUMBER/update-branch -f expected_head_sha=HEAD_SHA`.
   An accepted response means the update was requested, not completed. Read
   `headRefOid,baseRefOid,mergeable,mergeStateStatus,reviewDecision` again until
   the resulting head is known, then fetch it locally before validation. Check
   the new head's checks and workflow runs separately; an earlier green run or
   approval report cannot establish that the updated revision passed CI. Do
   not repeat the mutation while the first update is still being processed.

   For multiple PRs, first test each fetched head against its actual base.
   When they share a base and combined compatibility matters, create a temporary
   integration worktree with
   `git worktree add -b TEMP_BRANCH WORKTREE_PATH BASE_SHA`, merge the heads
   sequentially, and run the affected checks there. Directly running
   `git merge-tree --write-tree HEAD_A HEAD_B` tests those two histories; it
   does not establish that both integrate together on the latest target base.
   A clean Git merge establishes textual compatibility only; run behavior
   checks before claiming the changes work together. Remove only the temporary
   worktree/branch created for this check and preserve the original checkout.
   Record the tested base/head SHAs in the verification evidence;
   no current result guarantees compatibility with future upstream changes.
   Before resolving an old branch's conflicts, check whether upstream already
   adopted its changes. Save the original head SHA and inspect
   `git log --oneline BASE_SHA..HEAD_SHA`,
   `git cherry BASE_SHA HEAD_SHA`, and
   `git log --left-right --cherry-mark --oneline BASE_SHA...HEAD_SHA`.
   Patch-equivalent commits can reveal cherry-picks despite different commit
   IDs. Absence of a patch match does not rule out squash merges or later
   refactoring: inspect the relevant upstream implementation and regression
   coverage against the PR's original intended behavior. Use the commit range
   and source together; a three-dot diff can still show already-adopted changes
   when the original branch has not advanced.

   If all intended behavior is already present, report upstream adoption and
   the PR's actual state instead of replaying obsolete code or forcing the head
   to equal the base. Replacing a feature branch with the base discards its
   reviewable delta and can close the PR; treat that as branch replacement,
   not routine conflict repair. If only part was adopted, preserve the remaining
   behavior and remove redundant commits deliberately during integration.
   Read `state,closedAt,mergedAt,mergeCommit` after any remote update that changes
   the PR's state. A closed PR with no merge timestamp must be described as
   closed, with upstream adoption supported separately by source/history;
   never label it merged merely because its head equals the base.
2. Integrate the fetched base using the repository's merge/rebase convention.
   Inspect conflicts with `git diff --name-only --diff-filter=U` and read both
   implementations plus their callers and tests. Resolve behavior deliberately:
   retain upstream's replacement component, provider or transport when an old
   abstraction was removed, then port the feature's still-needed behavior into
   that path. Do not resurrect a deleted proxy or duplicate a new shared image
   loader just to make the old patch apply.

   For UI style conflicts, compare the conflicting properties and their component
   usage individually: preserve upstream spacing, flex sizing and inset fixes
   while retaining the feature's required controls and typography. Avoid taking
   an entire style block from one side, because adjacent properties can implement
   independent fixes. During a rebase, do not equate `ours` with the contributor's
   original branch: `ours` is the base plus already-replayed commits and `theirs`
   is the commit currently being replayed. Identify the code by behavior before
   selecting either side.

   For pnpm lockfile conflicts, reconcile package manifests first and inspect the
   repository's pinned pnpm version and install configuration. Regenerate the
   lockfile with that version using the repository's canonical install command
   (`pnpm install` when applicable), rather than manually combining dependency
   snapshots; generated resolutions must agree with the integrated manifests.
   Inspect the lockfile diff for unrelated upgrades and confirm a frozen install
   accepts it before counting dependency integration as verified. For documentation
   conflicts, preserve both still-applicable instructions and remove duplicates
   instead of selecting one whole side.

   Stage the resolved paths explicitly and, when no commit
   message edit is needed, use `GIT_EDITOR=true git rebase --continue`; repeat for
   each subsequent conflict before validating the final revision.
3. Inspect the resulting diff against the base, including surrounding call sites
   and test fixtures. For attachment changes, check session identity through
   history folding, rendering and retrieval; an added `sessionId` can be a
   required routing field. Update an exact-object assertion only after confirming
   the new contract, and keep asserting the field explicitly rather than
   weakening the assertion to hide the mismatch.
4. Finish staging/continuing the integration and run the affected packages'
   canonical typechecks and full relevant suites on the final code. In a pnpm
   workspace, run `pnpm --filter PACKAGE check` and
   `pnpm --filter PACKAGE test` from the repository root for each affected
   package whose scripts define them. Read each affected `package.json` for
   its exact `name` and available scripts before choosing a filter; directory
   names need not match package names. Prefer
   `pnpm --filter PACKAGE --fail-if-no-match test TEST_FILE...` for focused
   runs, and inspect the runner output for the expected files and nonzero test
   count. A zero exit code with `No projects matched` means no tests ran and
   must never count as a pass. Batch related test files into one invocation
   per package. Record results by revision and suite; repeated runs of the same
   tests are not additional unique coverage. After a failing test is fixed,
   rerun its package suite. Inspect `git diff --check`, staged files, and final `git status`
   to catch unresolved entries and generated assets before pushing. Preserve
   package-specific test counts instead of carrying forward pre-integration totals.
5. Push a merge normally. For a rebased or amended branch, push with an explicit
   lease, for example
   `git push FORK_REMOTE HEAD:refs/heads/BRANCH --force-with-lease=refs/heads/BRANCH:EXPECTED_REMOTE_SHA`.
   If the lease fails, fetch and inspect the new commits before integrating;
   do not overwrite concurrent work. Resolve the final local SHA with
   `git rev-parse HEAD`.
6. Read the current PR body before editing it. After a rewrite, refresh only
   repository gallery links pinned to superseded commits; GitHub-native attachment
   URLs are independent of branch history and should be retained. Verify the
   resulting gallery URLs from the saved remote body, including each asset's HTTP
   response and image content type. Keep the captions accurate: retained screenshots
   are earlier UI evidence unless the integrated revision was actually exercised.
   Preserve known screenshot provenance: do not label emulator captures as physical
   device tests, or call a supplied image newly captured, without supporting evidence.
   Update validation claims to the checks just run. Submit the complete Markdown
   file with `gh pr edit NUMBER -R OWNER/REPO --body-file PATH`, preserving
   unrelated maintainer edits.
7. Read back the exact PR's `headRefOid,body,state,mergeable,mergeStateStatus`
   and check `gh pr checks` separately. Match `headRefOid` to the local SHA and
   verify edited links in the returned body. If mergeability is `UNKNOWN`, allow
   GitHub to recompute and re-read before asserting that conflicts are gone.
   Report the PR link, commit, actual local/remote checks and material limits;
   `MERGEABLE` establishes conflict status, not CI success or merge completion.
   If only DCO is listed, report DCO passed and keep test/build execution as
   separate evidence.   `REVIEW_REQUIRED` establishes an outstanding approval
   requirement; do not call it the sole blocker without checking other gates.
   Keep permission evidence operation-specific: a denied reviewer assignment
   does not establish that merge or auto-merge is also forbidden, and fork
   authorship alone does not establish the account's repository permissions.
   Report the known gate and any unverified permission separately. Describe
   future review or automation as pending unless a current run or documented
   repository mechanism establishes it; an @mention or resolved discussion
   does not prove a review job was queued or that approval guarantees merging.
   When also claiming review completion, paginate GraphQL
   `reviewThreads(first:100, after:CURSOR)` through `pageInfo.hasNextPage`,
   inspect `id,isResolved,isOutdated`, and count unresolved threads from the
   returned records. An outdated thread is not necessarily resolved. Report
   resolved discussions separately from formal review approval.

## Conditional contribution to someone else's PR

1. Resolve the authenticated login with `gh api user --jq .login`, then read
   `gh api repos/BASE_OWNER/BASE_REPO/pulls/NUMBER --jq '{state,maintainer_can_modify,head:{repo:.head.repo.full_name,ref:.head.ref,sha:.head.sha},base:{repo:.base.repo.full_name,ref:.base.ref,sha:.base.sha}}'`.
   Read `gh api repos/BASE_OWNER/BASE_REPO --jq .permissions` and the same
   permissions field for the returned head repository. Check the fork head,
   not merely the repository receiving the PR: pushes update the head branch.
2. Identify either direct head-repository write access or the maintainer-edit
   route through base-repository push access and `maintainer_can_modify=true`.
   Inspect applicable branch rules when access permits. Describe this as an
   eligible route until an actual authorized push succeeds; an unchanged-ref
   dry run can skip update authorization and is not conclusive. Do not create a
   probe commit, change repository settings or publish a comment just to test
   access. If access is denied or cannot be established and the user conditioned
   work on it, stop before implementation and state the precise permission gap;
   do not substitute a new fork PR.
3. Before editing or installing dependencies, read all relevant review feedback
   and compare each requested behavior with the latest head's source and tests.
   Check current base/head integration and matching CI evidence. The contributor
   or another collaborator may already have repaired the issue; avoid preparing
   a duplicate fix from stale comments. Source and test presence establish what
   is implemented and covered in code; only actual execution establishes a pass.
4. If repairs remain and the access route is established, work in an isolated
   checkout of that exact head, verify the repair, re-read the remote head for
   concurrent updates, and push normally with
   `git push HEAD_REMOTE HEAD:refs/heads/HEAD_BRANCH`. Read back the PR's
   `headRefOid` and matching checks. On a permission rejection, stop and report
   the rejected operation within the user's conditional scope. Apply the existing
   explicit-lease procedure only for authorized history rewriting.
5. If all requested behavior is already present and current verification supports
   it, finish without manufacturing a commit. Report briefly: whether an edit
   route was established, whether this session changed or pushed anything, the
   current verified checks and the remaining review gate. Attribute existing
   commits as already present unless provenance is independently established;
   `git log` author/committer fields and local reflogs do not identify the remote
   pusher or prove that the original contributor did the work.

## Address review feedback on an existing PR

1. Read the current head, submitted reviews and inline feedback before editing:
   `gh pr view NUMBER -R OWNER/REPO --json headRefOid,baseRefOid,reviews,reviewDecision,mergeable,mergeStateStatus`
   and `gh api --paginate repos/OWNER/REPO/pulls/NUMBER/comments`.
   Read the surrounding discussion as well; `gh pr view --comments` alone does
   not enumerate all inline review threads. Paginate GraphQL `reviewThreads`
   and each thread's comments when necessary. Map each unresolved finding to
   its exact path, behavior and current code; outdated line positions do not
   establish that the finding has been fixed.
2. Turn a concrete counterexample into a deterministic reproduction before
   changing the implementation. Preserve event ordering, timestamps and later
   observations: a test that only checks the rejected input can miss retained
   state corrupting the next input. Assert the visible outcome and any retained
   aggregate the feedback identifies. Run the reproduction against the failing
   implementation, then fix the cause and rerun the affected package checks.
3. Read package scripts before reporting validation. An exit-zero command using
   `--if-present` does not prove a typecheck ran; verify the script exists and
   its checker actually executed. Record runner output and unique test totals
   separately for each package, rather than reusing counts from an earlier head.
4. Commit and push the tested repair using the repository's contribution rules.
   Verify the remote head matches, check current base/head integration, and
   inspect checks plus workflow runs. Keep `action_required`, failed tests and
   missing review approval separate; a passing DCO is not test execution.
5. When review-thread replies or resolution are authorized, publish only to
   the exact addressed thread. Obtain its live opaque node ID; use GraphQL
   `addPullRequestReviewThreadReply` for a reply and
   `resolveReviewThread(input:{threadId:...})` for resolution. Include the fix
   commit and relevant evidence in an authorized reply. Resolve only after
   verifying the finding is addressed; do not blanket-resolve unrelated or
   outdated discussions. These mutations are distinct from top-level PR
   comments and formal reviews. Re-read the thread afterward.
6. Refresh the existing PR body only where the final implementation or verified
   checks changed. Preserve pre-fix screenshot captions and keep proposed manual
   steps labeled as a verification plan unless they were actually exercised.
   Read the saved body back. Re-fetch paginated thread states and
   `reviewDecision` separately: zero unresolved threads can coexist with
   `CHANGES_REQUESTED`. Do not dismiss the review or post an unsolicited
   maintainer ping. If reviewer contact is authorized, follow the next section;
   otherwise finish with the repair, verified checks and remaining approval gate.

## Request or correct a reviewer

1. Establish that the user authorized reviewer contact, either explicitly or
   through an explicitly invoked workflow that authorizes it. A generic merge
   repair request or a mention on another PR does not supply that authorization;
   finish the technical diagnosis and repairs, then report any approval gate
   without posting unsolicited messages. For authorized contact, read each
   target PR's current head, body, review requests and discussion:
   `gh pr view NUMBER -R OWNER/REPO --json url,headRefOid,body,reviewRequests`
   and `gh pr view NUMBER -R OWNER/REPO --comments`. Use the user's latest
   exact reviewer login across all PRs in scope. A request to contact a named
   human reviewer does not authorize triggering unrelated review bots.
2. For a correction, discover the existing matching request before creating
   another comment. List the live top-level discussion with
   `gh api --paginate repos/OWNER/REPO/issues/NUMBER/comments` and identify the
   authenticated user's request by author and body. Preserve unrelated comments,
   attachments and maintainer edits. Use returned numeric `id` for REST and
   returned opaque `node_id` for GraphQL; never derive one from the other.
   If an old comment ID returns not found, refresh this list once and select
   the actual target instead of repeatedly querying or mutating the stale ID.
   Top-level issue comments, inline review comments and submitted reviews are
   different resources; inspect the matching resource when the item is absent.
3. To assign a formal reviewer, use
   `gh pr edit NUMBER -R OWNER/REPO --add-reviewer LOGIN`, then read
   `reviewRequests` back. Remove a previously requested reviewer only when the
   correction calls for replacing that assignment; preserve other reviewers.
   Do not assume all fork contributors lack this permission. If the actual
   repository denies assignment, use an @mention comment for an authorized
   request to contact that reviewer, and state the permission limitation only
   for this operation. An @mention does not establish formal assignment.
4. Write the request to a Markdown file. Keep it focused: reviewer mention,
   current head, concrete behavior changed, addressed feedback, relevant
   validation and the review focus. Retrieve evidence for test claims or label
   them as previously reported; organizing a review request does not rerun
   tests or verify device behavior. Avoid implying reviewer approval or CI
   success from the request itself.
5. For an existing matching user-authored request, publish the corrected body
   with `gh api --method PATCH repos/OWNER/REPO/issues/comments/COMMENT_ID -F body=@COMMENT_FILE`.
   If no matching request exists, publish once with
   `gh pr comment NUMBER -R OWNER/REPO --body-file COMMENT_FILE` and retain the
   returned URL. Prefer a targeted edit over `--edit-last`, which can select
   an unrelated comment. If publication has an uncertain response, re-list
   comments and compare author/body before retrying to avoid duplicate pings.
6. Read back the exact edited or created comment with
   `gh api repos/OWNER/REPO/issues/comments/COMMENT_ID` and compare its body
   and reviewer mention with the intended file. Verify each PR separately.
   For a formal assignment, check `reviewRequests` instead. Finish with the
   links and a brief statement of whether the result is a formal request or
   an @mention; do not repeat the full change summary in chat.

## 4. Monitoring CI Status

### Check CI Status

**With gh:**

```bash
# One-shot check
gh pr checks

# Watch until all checks finish (polls every 10s)
gh pr checks --watch
```

**With git + curl:**

```bash
# Get the latest commit SHA on the current branch
SHA=$(git rev-parse HEAD)

# Query the combined status
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
  | python -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Overall: {data['state']}\")
for s in data.get('statuses', []):
    print(f\"  {s['context']}: {s['state']} - {s.get('description', '')}\")"

# Also check GitHub Actions check runs (separate endpoint)
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/check-runs \
  | python -c "
import sys, json
data = json.load(sys.stdin)
for cr in data.get('check_runs', []):
    print(f\"  {cr['name']}: {cr['status']} / {cr['conclusion'] or 'pending'}\")"
```

### Structured CI verification

For a concise all-checks result, prefer structured output rather than parsing the
human table, whose names and descriptions contain spaces:

```bash
gh pr checks NUMBER -R OWNER/REPO --json name,state,link
gh pr view NUMBER -R OWNER/REPO --json headRefOid,state,mergeable,mergeStateStatus,statusCheckRollup
```

Run check collection and PR-state readback independently rather than chaining
`gh pr checks ... && gh pr view ...`: `gh pr checks` exits with code 8 when
checks are pending, so the chain skips the head/mergeability read precisely
when that evidence is still needed. Treat code 8 as pending and inspect the
returned jobs; distinguish it from a failed check or a retrieval error.

Aggregate counts programmatically from the returned records. Do not treat
`MERGEABLE` or `CLEAN` as proof that checks passed. `statusCheckRollup` contains
both check runs and legacy commit-status contexts: the latter may have `state`
instead of `conclusion`, so filtering solely on `conclusion != SUCCESS`
misclassifies them. Prefer normalized `gh pr checks` states for the summary;
distinguish success, skipped, pending and failure instead of silently counting
skipped as passed. Identify the current head and matching run before using a
cached job ID as evidence.

Verify a stable final revision in this order:

1. Read `gh pr view NUMBER -R OWNER/REPO --json headRefOid,baseRefOid`
   and save the full head SHA. Collect structured checks and identify the run
   linked by those checks rather than reusing an earlier run ID.
2. Read `gh run view RUN_ID -R OWNER/REPO --json headSha,event,status,conclusion,jobs`.
   Match the run to that PR revision. For a `pull_request` workflow using a
   synthetic merge commit, unequal run and PR head SHAs can be expected:
   inspect `gh api repos/OWNER/REPO/pulls/NUMBER --jq .merge_commit_sha`,
   then fetch that merge ref and inspect its parents when needed. For example,
   `git fetch UPSTREAM_REMOTE refs/pull/NUMBER/merge` followed by
   `git show -s --format='%H %P' FETCH_HEAD` establishes which head the fetched
   merge contains; compare the fetched SHA with the run SHA as well. A matching
   PR number, branch name or artifact-name suffix alone does not establish
   which code a run tested. If the mapping remains unresolved, report that
   evidence gap instead of assigning the old run's result to the current head.
3. Wait for the entire matching workflow, including downstream packaging jobs:
   jobs can appear only after the main test/build job succeeds. Use bounded
   watch intervals or background execution with completion notification for
   longer waits, and provide progress updates during ongoing builds. While a
   job is running, inspect `gh run view --job JOB_ID` for step progress; logs
   may only become available after completion. A local watch timeout stops the
   observer and does not cancel or fail the remote run; resume inspecting the
   same run rather than triggering a duplicate workflow.
4. Once the run finishes, fetch failed logs when needed, re-read the PR checks,
   and read `headRefOid` again. If the head changed during monitoring, repeat
   the run-to-head mapping and terminal-check verification for the new head.
   Report results only for the revision actually verified; a final read of
   `MERGEABLE` / `CLEAN` cannot transfer earlier CI results to a newer commit.

### Poll Until Complete (git + curl)

```bash
# Simple polling loop — check every 30 seconds, up to 10 minutes
SHA=$(git rev-parse HEAD)
for i in $(seq 1 20); do
  STATUS=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
    | python -c "import sys,json; print(json.load(sys.stdin)['state'])")
  echo "Check $i: $STATUS"
  if [ "$STATUS" = "success" ] || [ "$STATUS" = "failure" ] || [ "$STATUS" = "error" ]; then
    break
  fi
  sleep 30
done
```

## 5. Auto-Fixing CI Failures

When CI fails, diagnose and fix. This loop works with either auth method.

### Step 1: Get Failure Details

**With gh:**

```bash
# List recent workflow runs on this branch
gh run list --branch $(git branch --show-current) --limit 5

# View failed logs
gh run view <RUN_ID> --log-failed
```

**With git + curl:**

```bash
BRANCH=$(git branch --show-current)

# List workflow runs on this branch
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs?branch=$BRANCH&per_page=5" \
  | python -c "
import sys, json
runs = json.load(sys.stdin)['workflow_runs']
for r in runs:
    print(f\"Run {r['id']}: {r['name']} - {r['conclusion'] or r['status']}\")"

# Get failed job logs (download as zip, extract, read)
RUN_ID=<run_id>
curl -s -L \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip
cd ~/.hermes/cache/scratch && unzip -o ci-logs.zip -d ci-logs && cat ci-logs/*.txt
```

### Step 2: Fix and Push

After identifying the issue, use file tools (`patch`, `write_file`) to fix it:

```bash
git add <fixed_files>
git commit -m "fix: resolve CI failure in <check_name>"
git push
```

### Step 3: Verify

Re-check CI status using the commands from Section 4 above.

### Auto-Fix Loop Pattern

When asked to auto-fix CI, follow this loop:

1. Check CI status → identify failures
2. Read failure logs → understand the error
3. Use `read_file` + `patch`/`write_file` → fix the code
4. `git add . && git commit -m "fix: ..." && git push`
5. Wait for CI → re-check status
6. Repeat if still failing (up to 3 attempts, then ask the user)

## 6. Merging

### Conditional merge after review

1. Treat an instruction to merge if the PR is sound as authorization for the
   normal review-to-merge sequence. Read the current head/base, relevant prior
   findings and source changes, formal reviews and repository merge policy.
   Reassess any changed head; an earlier approval or a green run for an older
   revision does not verify the current code.
2. Complete the stable-head CI procedure in Section 4, including downstream
   packaging. Keep Git compatibility, checks, formal approval and unresolved
   findings separate. If checks remain active, inspect only job names and active
   steps for routine polling; expand logs for a failure or unexplained stall.
   Give a meaningful progress update at least once per minute instead of
   repeatedly dumping the entire jobs/steps result.
3. If the authenticated account previously requested changes and all supported
   findings are now addressed, submit a new approval for the verified head.
   Use the formal-review submission and readback sequence in
   `references/code-review.md`; verify author, verdict, commit and full body,
   then refresh `reviewDecision`. A later comment-only review does not clear
   an earlier blocking verdict. Do not dismiss another reviewer's decision or
   use administrative bypass to make the PR mergeable.
4. Read the head again immediately before merging. Select a merge method allowed
   by repository policy and use `--match-head-commit HEAD_SHA`. If the head
   changed, review the new delta and refresh its checks before retrying. Do not
   add branch deletion or switch the user's local checkout merely to finish
   a merge; perform cleanup only when requested or required by the established
   repository workflow.
5. Read `state,mergedAt,mergeCommit,url` after the mutation and require
   `state=MERGED`, a merge timestamp and a merge commit before reporting success.
   Auto-merge enrollment is pending delivery until the merge event is verified.
   Finish briefly in Chinese with the PR link, merge commit and actual checks;
   name skipped jobs separately when material and avoid repeating the full review.

**With gh:**

```bash
# Use the repository's established allowed method; pin the inspected head.
gh pr merge NUMBER -R OWNER/REPO --merge --match-head-commit HEAD_SHA

# Use squash only when appropriate for the repository.
gh pr merge NUMBER -R OWNER/REPO --squash --match-head-commit HEAD_SHA

# Auto-merge enrollment remains pending until GitHub reports MERGED.
gh pr merge NUMBER -R OWNER/REPO --auto --squash --match-head-commit HEAD_SHA

gh pr view NUMBER -R OWNER/REPO --json state,mergedAt,mergeCommit,url
```

**With git + curl:**

```bash
PR_NUMBER=<number>
VERIFIED_HEAD_SHA=<full-head-sha-reviewed-and-checked>

# Merge the PR via API (squash), rejecting a concurrent head update
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge \
  -d "{
    \"merge_method\": \"squash\",
    \"sha\": \"$VERIFIED_HEAD_SHA\",
    \"commit_title\": \"feat: add user authentication (#$PR_NUMBER)\"
  }"

# Read back the exact PR after merging; do not infer success from HTTP acceptance.
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c 'import json,sys; p=json.load(sys.stdin); print({k:p.get(k) for k in ("state","merged","merged_at","merge_commit_sha","html_url")})'

# Branch deletion and local checkout changes are separate, optional cleanup.
```

Merge methods: `"merge"` (merge commit), `"squash"`, `"rebase"`

### Enable Auto-Merge (curl)

```bash
# Auto-merge requires the repo to have it enabled in settings.
# This uses the GraphQL API since REST doesn't support auto-merge.
PR_NODE_ID=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c "import sys,json; print(json.load(sys.stdin)['node_id'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/graphql \
  -d "{\"query\": \"mutation { enablePullRequestAutoMerge(input: {pullRequestId: \\\"$PR_NODE_ID\\\", mergeMethod: SQUASH}) { clientMutationId } }\"}"
```

## 7. Complete Workflow Example

```bash
# 1. Start from clean main
git checkout main && git pull origin main

# 2. Branch
git checkout -b fix/login-redirect-bug

# 3. (Agent makes code changes with file tools)

# 4. Commit
git add src/auth/login.py tests/test_login.py
git commit -m "fix: correct redirect URL after login

Preserves the ?next= parameter instead of always redirecting to /dashboard."

# 5. Push
git push -u origin HEAD

# 6. Create PR (picks gh or curl based on what's available)
# ... (see Section 3)

# 7. Monitor CI (see Section 4)

# 8. Merge when green (see Section 6)
```

## Useful PR Commands Reference

| Action | gh | git + curl |
|--------|-----|-----------|
| List my PRs | `gh pr list --author @me` | `curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| View PR diff | `gh pr diff` | `git diff main...HEAD` (local) or `curl -H "Accept: application/vnd.github.diff" ...` |
| Add comment | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| Request review | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| Close PR | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |
