---
name: localization
description: "Use when translating, reviewing, or merging locale catalogs."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [i18n, localization, translation, locale-catalogs, terminology, zh]
    category: software-development
    related: [github, xlsx]
---

# Localization

Locale-catalog work end to end: fill missing translations, review a translation
PR or two competing catalogs, resolve catalog merge conflicts, unify terminology
across surfaces (web/desktop/mobile), and migrate hardcoded UI strings to
resources. Read `references/catalog-comparison.md` before comparing two
catalogs; read `references/chinese-terminology.md` before writing Chinese.

## When to Use

Use when the task is: translating missing locale strings, reviewing or
adjudicating translation PRs, resolving merge conflicts in locale or generated
hash files, unifying UI terminology across surfaces or language variants, or
moving hardcoded UI strings into resource bundles. Not for plain copywriting or
prose editing.

## Standing rules

- Translate against the English SOURCE VALUE, never the key name — key names go
  stale and lie (a key named `privateWorkspace` can hold "Task folder"). Always
  show the source value alongside translations in review artifacts.
- English values are load-bearing: tests, code constants, and policy copy pin
  them byte-for-byte. When a text-pinned test fails after a localization change,
  byte-compare the constant against the resource value that replaced it — the
  resource must equal the constant exactly, even if the translation "improves"
  it. Never "fix" English copy to match a nicer translation.
- Coverage claims decay: recompute coverage against the CURRENT source catalog;
  never trust a PR's stated "100%" figure.
- Before bulk-editing the user's catalogs, deliver a review artifact
  (comparison table) and wait for sign-off; on sign-off, apply decisively — the
  user delegates the fine-grained decisions once a recommendation is offered.
- Reports and deliverables in the user's language.

## 1. Catalog mechanics (before editing anything)

Typical layout: a source catalog (en), N translation catalogs (flat key→string
JSON), and a GENERATED acceptance file recording a hash of the source value each
translation was validated against (e.g. `src/locales/source-hashes.json` plus a
`scripts/generate-locale.mjs --check/--accept`-style validator).

Validator rules that bite:
- Orphan keys (translation key absent from source) FAIL the check — delete them;
  when resolving conflicts, take upstream's deletions.
- Placeholders (`{name}`, `%1$s`) must survive exactly as in the source.
- Hash mismatch means the English changed since acceptance: refresh the
  translation text, or remove it so the UI falls back. Never just update the hash.

NEVER hand-merge a generated hash file. Resolve the catalogs first, then
regenerate hashes (repo script, or sha256 of the source value for every
translated key). Regenerating without refreshing stale text silently blesses a
stale translation — diff old vs new English values first and re-review every
changed value. Keep keys that are still translated even when the UI moved on.

Match existing file style on rewrite (indent, trailing newline, `ensure_ascii=False`
for CJK) or the diff becomes the whole file and review is dead.

## 2. Fill missing translations

1. Get the gap list: source keys missing from the target catalog.
2. Bulk-draft (LLM/CLI), then run a separate glossary pass: one honorific,
   terminology per `references/chinese-terminology.md`, quote style, and dropped
   content — bulk drafts systematically truncate warnings and conditions; check
   every long source string for dropped sentences before accepting.
3. Validate (check command + placeholder comparison), then record hashes.

## 3. Compare two competing catalogs

Full recipe in `references/catalog-comparison.md` (pair table, severity
triage, parallel classification delegates, spreadsheet assembly).

## 4. Resolve catalog merge conflicts

1. Merge the base branch; conflicts concentrate in catalogs and generated hash
   files. Expect auto-merged catalogs to hide drift anyway — re-validate.
2. Per conflicted key: upstream deleted the source key → drop the translation;
   source value changed → prefer the side whose text tracks the new English (or
   re-translate); both added → pick one and normalize terms.
3. Remove orphans, regenerate hashes, run the check.
4. Re-run coverage: source keys added since the branch point are the merge's real
   translation debt — translate them in the same merge.

## 5. Unify terminology

1. Decide ONE glossary per language variant: map each SOURCE word to a target
   term. Cover concept nouns, default/preset, honorifics, quote style (zh-Hans
   `“”`, zh-Hant `「」`), and stray variant-vocabulary cleanup
   (see `references/chinese-terminology.md`).
2. Apply per key with before/after review — never blind regex across a file.
3. After bulk replacement run collision scans (duplicated target word like
   `对话对话`): sentences containing TWO source words that map to the same
   target term need hand rewrites.
4. Keep the target term where the source says a DIFFERENT concept (a legitimate
   second term like "workspace" survives unification).

## 6. Migrate hardcoded UI strings to resources

- The English resource value equals the literal it replaces, byte-identical.
- Strings produced by policy/helper maps (English→resource-id) need every
  display path routed through the map; a mapped string rendered raw is still
  untranslated.
- Trace native notification/service text separately from React/JavaScript UI;
  native surfaces read platform resources and can retain hardcoded fallback
  statuses or relative-time labels after the app catalog is translated.
- For generated Android resources, follow
  [native resource generation and validation](references/android-resources.md):
  edit the generator, inspect emitted XML, then verify native compilation.
  JavaScript/type checks alone cannot validate Android string escaping.
- Re-run existing relevant checks. Follow the repository's test policy before
  adding tests; do not add source-string, translation-presence, or layout tests
  where ordinary presentation changes are explicitly excluded from the budget.

## Pitfalls

- A translation PR that also touches components is where deleted-key bugs hide:
  grep the code tree for every key the PR removes before accepting the removal.
- Subagent classification output is a self-report: verify chunk row counts, key
  order, and category vocabulary programmatically before building deliverables,
  and spot-check a few verdicts against the source text.
- Even chunk sizes and the exact output path + row count go in each delegate's
  task text — children cannot see the conversation.
- Keep one category vocabulary across chunks (e.g. same-meaning rewrite /
  meaning differs / suspected mistranslation) or the merged statistics are
  unauditable.
