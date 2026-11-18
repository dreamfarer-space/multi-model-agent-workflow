# Comparing two competing translation catalogs

For adjudicating two PRs (or a PR vs. a maintained catalog) that translate the
same source. Deliverable: a review artifact the user signs off before any bulk
edit.

## 1. Build the pair table

For every key present in either side: key, English source, translation A,
translation B, and flags. Derive flags programmatically before any LLM pass:

- identical text (skip),
- punctuation/whitespace/variant-character-only difference (classify as
  same-meaning without an LLM),
- key present on one side only (its own section — usually the real coverage
  story),
- known-term drift (e.g. source word rendered as two different target terms).

Store as TSV/JSON rows; one row per key keeps later verification trivial.

## 2. Classify differing pairs with parallel delegates

Three categories, one vocabulary across all chunks:

1. **Same meaning** — register/word-choice differences only.
2. **Meaning differs** — one side says something the source does not.
3. **Suspected mistranslation** — plain error in one side (wrong sense, wrong
   referent, invented content).

Split rows into even chunks (200 rows max per child), write each to its own
TSV file, and spawn one delegate per file with: the file path, the exact output
path and row count, the category definitions, and the rule to judge against the
ENGLISH source (both translations can be wrong). Non-vision text children are
enough and cheaper.

## 3. Verify before building the deliverable

Child summaries are self-reports. Programmatically confirm: output files exist,
row counts match, key order matches the input chunks, category labels are from
the agreed vocabulary. Spot-check a handful of verdicts against the source
text yourself, including at least one per category.

## 4. Assemble the spreadsheet

One workbook (xlsx via openpyxl), in the user's language:

1. **概览** — counts per category and per side, methodology in one paragraph.
2. **差异对照** — all differing rows sorted by severity (suspected
   mistranslation first, then meaning-differs, then same-meaning), frozen
   header, autofilter, one verdict column.
3. **仅单侧有** — keys only one side translates, split by side with per-side
   totals.

Column widths sized to content; wrap long translation cells. The point is
triage: the user should be able to read sheet 2 top-down and decide.
