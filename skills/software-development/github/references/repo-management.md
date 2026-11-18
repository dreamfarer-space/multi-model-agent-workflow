# GitHub Repository Management

Create, clone, fork, configure, and manage GitHub repositories. Each section shows `gh` first, then the `git` + `curl` fallback.

## Prerequisites

- Authenticated with GitHub (see `references/auth.md` in this skill)

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
      GITHUB_TOKEN=$(uv run python "${GITHUB_SKILL_DIR:-${HERMES_HOME:-$HOME/.hermes}/skills/software-development/github}/scripts/git-credential-token.py")
    fi
  fi
fi

# Get your GitHub username (needed for several operations)
if [ "$AUTH" = "gh" ]; then
  GH_USER=$(gh api user --jq '.login')
else
  GH_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python -c "import sys,json; print(json.load(sys.stdin)['login'])")
fi
```

If you're inside a repo already:

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

---

## 1. Cloning Repositories

Cloning is pure `git` — works identically either way:

```bash
# Clone via HTTPS (works with credential helper or token-embedded URL)
git clone https://github.com/owner/repo-name.git

# Clone into a specific directory
git clone https://github.com/owner/repo-name.git ./my-local-dir

# Shallow clone (faster for large repos)
git clone --depth 1 https://github.com/owner/repo-name.git

# Clone a specific branch
git clone --branch develop https://github.com/owner/repo-name.git

# Clone via SSH (if SSH is configured)
git clone git@github.com:owner/repo-name.git
```

**With gh (shorthand):**

```bash
gh repo clone owner/repo-name
gh repo clone owner/repo-name -- --depth 1
```

## 2. Creating Repositories

**With gh:**

```bash
# Create a public repo and clone it
gh repo create my-new-project --public --clone

# Private, with description and license
gh repo create my-new-project --private --description "A useful tool" --license MIT --clone

# Under an organization
gh repo create my-org/my-new-project --public --clone

# From existing local directory
cd /path/to/existing/project
gh repo create my-project --source . --public --push
```

**With git + curl:**

```bash
# Create the remote repo via API
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos \
  -d '{
    "name": "my-new-project",
    "description": "A useful tool",
    "private": false,
    "auto_init": true,
    "license_template": "mit"
  }'

# Clone it
git clone https://github.com/$GH_USER/my-new-project.git
cd my-new-project

# -- OR -- push an existing local directory to the new repo
cd /path/to/existing/project
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/$GH_USER/my-new-project.git
git push -u origin main
```

To create under an organization:

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/orgs/my-org/repos \
  -d '{"name": "my-new-project", "private": false}'
```

### From a Template

**With gh:**

```bash
gh repo create my-new-app --template owner/template-repo --public --clone
```

**With curl:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/template-repo/generate \
  -d '{"owner": "'"$GH_USER"'", "name": "my-new-app", "private": false}'
```

### Publishing a standalone static site from private sources

1. **Discover both checkouts before writing.** In each candidate directory run
   `git rev-parse --show-toplevel`, `git status --short`,
   `git remote -v`, and `git branch --show-current`. Inspect the build script
   and tracked file list. Distinguish private source, loose preview copies,
   and the actual public publishing repository; a directory name is not proof
   of its remote. Read `gh api "repos/$SITE_REPO/pages"` for the deployment
   branch/path. Once the user selects public-site-only publishing, keep all
   private-source branches local; a site push does not authorize a source push.

2. **Create an independent public history when requested.** Start from a clean
   publishing directory containing only reviewed website files, not a copy of
   the private `.git` directory. Inspect staged files for private configuration,
   credentials, local paths, and unwanted legacy pages before
   `gh repo create "$SITE_REPO" --source . --public --push`. Set the intended
   branch explicitly. Never change the application's visibility as a shortcut
   to publishing its documentation.

3. **Synchronize a complete, explicit website manifest.** Include source
   modules, runtime JavaScript, styles, content, images, vendored figure data,
   version input, and tests needed by the standalone build. Inspect imports
   and asset URLs before deciding what to copy; copying only the generator
   can leave stale runtime behavior. Adapt private-relative paths to the
   standalone layout in the publishing copy without changing unrelated app
   files. Preserve publishing-only files; do not mirror-delete the directory
   or blindly stage everything. Prefer a repeatable sync/build script over
   accumulating manual replacements.

   When syncing self-hosted fonts, include the referenced WOFF2 files and their
   redistribution licenses. Check every CSS URL, weight/style and Unicode subset
   against the copied files; Latin/Latin-ext files do not establish Chinese glyph
   coverage. Preserve license notices rather than stripping names with a blanket
   attribution replacement. Keep a publishing request scoped to the existing
   site changes; do not introduce a font migration or redesign just to push.

4. **Build and exercise the publishing checkout itself.** For a Node generator
   with these entry points, run `node build.mjs` followed by
   `node --test build.test.mjs`; otherwise use the discovered commands. Serve
   the resulting pages and inspect key interactions, imports, images, and
   project-subpath URLs. A successful private-source build does not validate
   the standalone site's adapted paths. Review `git diff --stat` and staged
   content, then commit only intended files. After staging explicit paths, run
   `git diff --cached --name-status` and `git diff --cached --check`; scan the
   staged text with `git grep --cached -n -I -i -E 'claude|co-authored-by'` and
   separately scan for known private names/paths and secrets. An unstaged tracked
   search misses newly added files; inspect binary assets separately as needed.
   Treat search exit 1 as no match and other nonzero exits as errors, not as a
   clean scan. Review matches in context: attribution, ordinary project content,
   and required third-party notices are not interchangeable. Check
   `git log -1 --format=fuller` and `git log -1 --format=%B` for the correct
   human identity and absence of unwanted AI trailers before pushing only the
   confirmed site branch.

5. **Verify source, deployment, and public content separately.** After pushing,
   compare the local HEAD with
   `gh api "repos/$SITE_REPO/commits/$SITE_BRANCH" --jq .sha`. Inspect
   `gh api "repos/$SITE_REPO/pages/builds/latest"` for branch-based Pages, or
   the exact Actions deployment run for workflow-based Pages; require the
   intended commit and successful completion, not merely a previous `built`
   status. Fetch the public page with redirects enabled and verify a changed
   content marker plus its referenced assets. HTTP 200 alone can be an old
   cached page. Report the live link, actual checks, and any unverified
   deployment state without implying broader geographic accessibility.

6. **Undo an unwanted source-branch publication narrowly.** Inspect the exact
   source remote and branch, then use
   `git push origin --delete "$SOURCE_BRANCH"` only for the branch the user
   rejected. Verify absence with
   `git ls-remote --heads origin "refs/heads/$SOURCE_BRANCH"`, checking the
   command succeeded rather than treating a network failure as absence. Keep
   local work unless local deletion was explicitly requested; do not merge,
   rewrite history, delete unrelated branches, or claim the entire private
   repository is removed. Re-read the public site's target commit and page
   to confirm the independent publication remains intact.

## 3. Forking Repositories

**With gh:**

```bash
gh repo fork owner/repo-name --clone
```

**With git + curl:**

```bash
# Create the fork via API
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo-name/forks

# Wait a moment for GitHub to create it, then clone
sleep 3
git clone https://github.com/$GH_USER/repo-name.git
cd repo-name

# Add the original repo as "upstream" remote
git remote add upstream https://github.com/owner/repo-name.git
```

### Keeping a Fork in Sync

```bash
# Pure git — works everywhere
git fetch upstream
git switch main
git merge upstream/main
git push origin main
```

**With gh (shortcut):**

```bash
gh repo sync $GH_USER/repo-name
```

## 4. Repository Information

**With gh:**

```bash
gh repo view owner/repo-name
gh repo list --limit 20
gh search repos "machine learning" --language python --sort stars
```

**With curl:**

```bash
# View repo details
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO \
  | python -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Name: {r['full_name']}\")
print(f\"Description: {r['description']}\")
print(f\"Stars: {r['stargazers_count']}  Forks: {r['forks_count']}\")
print(f\"Default branch: {r['default_branch']}\")
print(f\"Language: {r['language']}\")"

# List your repos
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/user/repos?per_page=20&sort=updated" \
  | python -c "
import sys, json
for r in json.load(sys.stdin):
    vis = 'private' if r['private'] else 'public'
    print(f\"  {r['full_name']:40}  {vis:8}  {r.get('language', ''):10}  ★{r['stargazers_count']}\")"

# Search repos
curl -s \
  "https://api.github.com/search/repositories?q=machine+learning+language:python&sort=stars&per_page=10" \
  | python -c "
import sys, json
for r in json.load(sys.stdin)['items']:
    print(f\"  {r['full_name']:40}  ★{r['stargazers_count']:6}  {r['description'][:60] if r['description'] else ''}\")"
```

## 5. Repository Settings

**With gh:**

```bash
gh repo edit --description "Updated description" --visibility public
gh repo edit --enable-wiki=false --enable-issues=true
gh repo edit --default-branch main
gh repo edit --add-topic "machine-learning,python"
gh repo edit --enable-auto-merge
```

**With curl:**

```bash
curl -s -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO \
  -d '{
    "description": "Updated description",
    "has_wiki": false,
    "has_issues": true,
    "allow_auto_merge": true
  }'

# Update topics
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.mercy-preview+json" \
  https://api.github.com/repos/$OWNER/$REPO/topics \
  -d '{"names": ["machine-learning", "python", "automation"]}'
```

## 6. Branch Protection

```bash
# View current protection
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/branches/main/protection

# Set up branch protection
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci/test", "ci/lint"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1
    },
    "restrictions": null
  }'
```

## 7. Secrets Management (GitHub Actions)

**With gh:**

```bash
gh secret set API_KEY --body "your-secret-value"
gh secret set SSH_KEY < ~/.ssh/id_rsa
gh secret list
gh secret delete API_KEY
```

**With curl:**

Secrets require encryption with the repo's public key — more involved via API:

```bash
# Get the repo's public key for encrypting secrets
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/secrets/public-key

# Encrypt and set (requires Python with PyNaCl)
python -c "
from base64 import b64encode
from nacl import encoding, public
import json, sys

# Get the public key
key_id = '<key_id_from_above>'
public_key = '<base64_key_from_above>'

# Encrypt
sealed = public.SealedBox(
    public.PublicKey(public_key.encode('utf-8'), encoding.Base64Encoder)
).encrypt('your-secret-value'.encode('utf-8'))
print(json.dumps({
    'encrypted_value': b64encode(sealed).decode('utf-8'),
    'key_id': key_id
}))"

# Then PUT the encrypted secret
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/secrets/API_KEY \
  -d '<output from python script above>'

# List secrets (names only, values hidden)
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/secrets \
  | python -c "
import sys, json
for s in json.load(sys.stdin)['secrets']:
    print(f\"  {s['name']:30}  updated: {s['updated_at']}\")"
```

Note: For secrets, `gh secret set` is dramatically simpler. If setting secrets is needed and `gh` isn't available, recommend installing it for just that operation.

## 8. Releases

**With gh:**

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v2.0.0-rc1 --draft --prerelease --generate-notes
gh release create v1.0.0 ./dist/binary --title "v1.0.0" --notes "Release notes"
gh release list
gh release download v1.0.0 --dir ./downloads
```

**With curl:**

```bash
# Create a release
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/releases \
  -d '{
    "tag_name": "v1.0.0",
    "name": "v1.0.0",
    "body": "## Changelog\n- Feature A\n- Bug fix B",
    "draft": false,
    "prerelease": false,
    "generate_release_notes": true
  }'

# List releases
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/releases \
  | python -c "
import sys, json
for r in json.load(sys.stdin):
    tag = r.get('tag_name', 'no tag')
    print(f\"  {tag:15}  {r['name']:30}  {'draft' if r['draft'] else 'published'}\")"

# Upload a release asset (binary file)
RELEASE_ID=<id_from_create_response>
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=binary-amd64" \
  --data-binary @./dist/binary-amd64
```

### Workflow-driven npm releases and partial-publication recovery

1. **Discover the release contract before editing.** Read the release workflow,
   its preflight/registry helpers, package scripts, previous release body and
   assets, and commits since the previous tag. Identify the intended branch,
   required CI checks, tag trigger, registry channel, and generated bundles
   containing embedded version strings. Derive notes from the actual shipped
   diff; a feature mentioned in older notes is not proof it shipped then.

2. **Prepare the version through the protected PR path.** Update package and
   lockfile versions, regenerate version-stamped build output, and add the
   changelog section expected by preflight. Run the repository's actual build,
   freshness checks and release preflight before committing. Preserve unrelated
   work in a dedicated branch/worktree. Wait for every required PR check and
   verify the merge; do not bypass protections for a version-only change.

3. **Tag the verified release commit, not the preparation branch.** Fetch the
   merged default branch and resolve its commit with
   `git rev-parse "origin/$DEFAULT_BRANCH^{commit}"`. Inspect its manifest with
   `git show "$RELEASE_SHA:package.json"`, verify its changelog, and check whether
   the intended tag already exists locally/remotely. Fetching updates refs only;
   running Node in an older checkout still reads the older package version.
   Preserve the user's checkout by creating a disposable worktree with
   `git worktree add --detach "$RELEASE_WORKTREE" "$RELEASE_SHA"`, then run the
   discovered release preflight from that directory. If provided by this repo,
   use `node scripts/ci/release-check.mjs --tag "$TAG" --main-ref "origin/$DEFAULT_BRANCH"`.
   Require a successful preflight on that exact commit before creating/pushing
   the tag; never suppress it with `|| true` or allow a later successful command
   to mask its failure. Separate the tag mutation from the check, or use a
   fail-fast command chain. If the check reports a version mismatch, verify
   `git rev-parse HEAD` in the executing worktree and rerun from the intended
   revision before deciding whether source changes are needed.
   Create the tag explicitly against `"$RELEASE_SHA"`, then read back the remote
   tag and peel annotated tags to compare commit identity. A successful push
   alone does not verify the remote target. Never move an existing release tag
   to recover a failed publication. Locate the exact tag-triggered workflow,
   confirm its `headSha` matches the release commit, and follow its stages; do
   not create a competing manual release while it runs.

   Monitor with `gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion,headSha,jobs`.
   Use one short wait/read at a time, keeping foreground waits below a minute
   and reporting stage changes or the current blocker at least once per minute.
   After a tool timeout, read the remote run again; a local observer timing out
   does not establish a failed workflow. For a slow platform, inspect
   `jobs[].steps` and report the active step: installing an upstream dependency
   is different from testing the published package. Elapsed time alone does not
   justify a code fix, cancellation or rerun. Re-fetch the complete job list as
   stages finish because dependent verification and release jobs appear later;
   do not infer completion from a tail of successful jobs.

4. **Classify failure by the last completed external write.** Read
   `gh run view "$RUN_ID" --repo "$REPO" --log-failed`, then query
   `npm view "$PACKAGE@$VERSION" version dist.tarball dist.integrity gitHead --json --registry https://registry.npmjs.org`
   and `npm view "$PACKAGE" dist-tags --json --registry https://registry.npmjs.org`.
   A failed job can have already published the immutable package. Metadata,
   tarballs and attestations can propagate independently; retry availability
   failures with a bounded deadline, but never retry away a digest/source
   mismatch or describe every publish failure as propagation without logs.

5. **Resume idempotently without weakening verification.** Before
   `gh run rerun "$RUN_ID" --repo "$REPO" --failed`, inspect the helper to
   confirm it detects an existing version and verifies name/version, gitHead,
   exact archive contents, integrity and provenance/signatures rather than
   blindly publishing again. Reuse only an identical verified package. Keep
   the original tag/version; do not unpublish, silently bump, overwrite release
   assets, or skip verification to make the run green. If changing retry code,
   use a bounded, configurable deadline for independently lagging registry
   objects and test it; increasing a fixed timeout alone is not a verified fix.

6. **Require all downstream stages and re-read both destinations.** Continue
   the authorized release task through the repository's post-publish installation
   smoke tests and GitHub Release job; a tag push, successful preflight or a
   prediction that automation will publish does not complete the request.
   While those stages run, give progress updates and keep monitoring with the
   bounded reads above. If a concrete external gate prevents completion, report
   the exact gate and verified partial state without calling the release done.
   Verify the run conclusion, npm version,
   intended dist-tag and gitHead, then
   `gh release view "$TAG" --repo "$REPO" --json url,isDraft,isPrerelease,assets,body`.
   Compare the attached tarball's digest with the verified registry artifact.
   Parse the final complete `jobs` array to count successes, failures and skipped
   jobs if reporting totals; never carry a guessed matrix count into the final
   report. A visible package version, SHA-1 or tarball URL establishes registry
   metadata, not provenance. Inspect the registry attestation/signature metadata
   and its verification output before claiming provenance or verified signatures;
   an OIDC publish step by itself establishes the authentication route only.
   Keep the final reply to the version, Release/package links, actual verification
   and any remaining gate; include raw digests or run inventories only when the
   user requests them or an integrity issue makes them useful.
   Use REST's `published_at`, not `publishedAt`, when querying via `gh api`;
   a misspelled field yields null rather than proving an unpublished release.
   Confirm stable Latest separately with the releases/latest endpoint. Report
   the links, verified stages and unresolved limits briefly, not a replay of
   every wait or retry.

### Classified multi-platform release delivery

1. **Discover the release contract and preserve local work.** Read the previous release's exact body and asset list with `gh release view "$PREVIOUS_TAG" --repo "$REPO" --json body,assets`. Inspect the repository's build/update configuration to identify all publishing repositories and required artifacts. Record `git status --short` and the starting commit before builds; distinguish existing user edits from generated output so cleanup cannot erase unrelated work. Preserve platform grouping (edge-node roles, Windows setup/portable, Android, checksums) and use actual new-version filenames and measured sizes.

2. **Align versions before building or tagging.** Update web/desktop package versions and both lockfile root versions, Android versionName, and edge-node VERSION; increment Android versionCode while retaining the existing release signing identity. Build from the intended release commit and inspect packaged metadata, not only source version strings. Synchronize bundled Web assets before packaging Android so the APK contains the newly built UI.

3. **Build and exercise each platform's real path.** Record commands, outcomes, and test counts from execution. Inspect publishing dependencies: one failed Android job may skip an all-or-nothing publish even when Windows and edge archives succeeded. Download successful artifacts from the exact release run rather than reusing older-version binaries. Mark missing platforms explicitly unavailable; a release page/source archive is not an APK/installer, and signing failure is not a successful unsigned release. Keep local tests, remote CI, package inspection, and physical-device testing separate in the evidence.

4. **Freeze the artifact inventory and generate update metadata.** Create one machine-readable inventory of expected asset names, sizes, and SHA256 digests; derive the checksum file from precisely the distributed payloads, excluding duplicate alias executables. Generate latest.json/latest.yml and any blockmap from final binaries. Check each manifest's version, filename/URL, size, hash, and Android version_code against those binaries using the manifest's hash algorithm. Do not rebuild or rename payloads afterward without regenerating dependent metadata.

5. **Stage uploads without exposing an incomplete update.** For a source repository with an existing release tag, use `gh release create "$TAG" --repo "$REPO" --verify-tag --draft --title "$TITLE" --notes-file "$NOTES"`. Resolve the intended tag/target separately for a release-only mirror; its unrelated default branch is not proof of the source commit. Upload explicit inventory paths with `gh release upload "$TAG" 'path#platform label' --repo "$REPO"`; use bounded batches for large assets. If a batch fails, read back existing assets and retry only missing/mismatched files. Use `--clobber` only for an intentional replacement, preferably while still draft; published updater clients may cache old metadata. Include direct download links in the platform table.

6. **Verify the draft, publish, then verify the public channel.** Read `gh release view "$TAG" --repo "$REPO" --json body,assets,isDraft,isPrerelease,url` and compare names/count, labels, byte sizes, uploaded states, and server digests against the inventory in code. If a server digest is absent, download that asset and hash it locally rather than treating size as integrity proof. Normalize CRLF/LF for body comparisons. Publish only after the required inventory is complete: `gh release edit "$TAG" --repo "$REPO" --draft=false --prerelease=false --latest` for an intended stable Latest release. Apply the same gate to each mirror, allowing for metadata that explicitly references another channel. Re-read both releases and `gh api "repos/$REPO/releases/latest"`; verify the intended tag is Latest, mirrored assets have matching names/sizes/digests, and publicly downloaded latest.json/latest.yml point to available new-version payloads. A non-draft release alone does not establish Latest or functional updater delivery.

7. **Clean narrowly and report only proven outcomes.** Compare the ending worktree to the pre-build snapshot. Restore only tracked files known to have been changed by this build and remove only its enumerated generated files, using repository-rooted paths; avoid broad restore/clean commands that can destroy user work. Verify status again. Report the release links, actual validation, and any missing platform/hardware checks concisely. Say the update channel is published when verified; claim automatic installation or end-to-end device success only after observing a client perform it.

## 9. GitHub Actions Workflows

**With gh:**

```bash
gh workflow list
gh run list --limit 10
gh run view <RUN_ID>
gh run view <RUN_ID> --log-failed
gh run rerun <RUN_ID>
gh run rerun <RUN_ID> --failed
gh workflow run ci.yml --ref main
gh workflow run deploy.yml -f environment=staging
```

**With curl:**

```bash
# List workflows
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/workflows \
  | python -c "
import sys, json
for w in json.load(sys.stdin)['workflows']:
    print(f\"  {w['id']:10}  {w['name']:30}  {w['state']}\")"

# List recent runs
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs?per_page=10" \
  | python -c "
import sys, json
for r in json.load(sys.stdin)['workflow_runs']:
    print(f\"  Run {r['id']}  {r['name']:30}  {r['conclusion'] or r['status']}\")"

# Download failed run logs
RUN_ID=<run_id>
curl -s -L \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip
cd ~/.hermes/cache/scratch && unzip -o ci-logs.zip -d ci-logs

# Re-run a failed workflow
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/rerun

# Re-run only failed jobs
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/rerun-failed-jobs

# Trigger a workflow manually (workflow_dispatch)
WORKFLOW_ID=<workflow_id_or_filename>
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/workflows/$WORKFLOW_ID/dispatches \
  -d '{"ref": "main", "inputs": {"environment": "staging"}}'
```

## 10. Gists

**With gh:**

```bash
gh gist create script.py --public --desc "Useful script"
gh gist list
```

**With curl:**

```bash
# Create a gist
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/gists \
  -d '{
    "description": "Useful script",
    "public": true,
    "files": {
      "script.py": {"content": "print(\"hello\")"}
    }
  }'

# List your gists
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/gists \
  | python -c "
import sys, json
for g in json.load(sys.stdin):
    files = ', '.join(g['files'].keys())
    print(f\"  {g['id']}  {g['description'] or '(no desc)':40}  {files}\")"
```

## Quick Reference Table

| Action | gh | git + curl |
|--------|-----|-----------|
| Clone | `gh repo clone o/r` | `git clone https://github.com/o/r.git` |
| Create repo | `gh repo create name --public` | `curl POST /user/repos` |
| Fork | `gh repo fork o/r --clone` | `curl POST /repos/o/r/forks` + `git clone` |
| Repo info | `gh repo view o/r` | `curl GET /repos/o/r` |
| Edit settings | `gh repo edit --...` | `curl PATCH /repos/o/r` |
| Create release | `gh release create v1.0` | `curl POST /repos/o/r/releases` |
| List workflows | `gh workflow list` | `curl GET /repos/o/r/actions/workflows` |
| Rerun CI | `gh run rerun ID` | `curl POST /repos/o/r/actions/runs/ID/rerun` |
| Set secret | `gh secret set KEY` | `curl PUT /repos/o/r/actions/secrets/KEY` (+ encryption) |
