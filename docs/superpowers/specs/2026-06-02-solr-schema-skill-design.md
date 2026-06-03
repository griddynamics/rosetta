# Design: `solr-schema` skill

**Date:** 2026-06-02
**Status:** Approved (design); pending spec review
**Location:** `skills/solr/solr-schema/`

## Problem

The Solr skill bundle has three skills — `solr-query`, `solr-extending`, `solr-semantic-search` — none of which ingest an existing Solr schema/config and audit or advise on it. All three repeatedly defer field-type design, analyzer chains, and synonyms to a **`solr-schema`** skill that does not exist. There are 8 dangling references to it, and the eval runner already accepts `--skill schema` (resolving `solr-schema/` + `evals/cases/schema/`) with no target on disk.

### The 8 dangling cross-references

1. `solr-query/SKILL.md:10` — "For analyzer chains, synonyms, and field type design, see the **solr-schema** skill."
2. `solr-query/SKILL.md:124` — analyzer term-stream debugging → "see solr-schema skill"
3. `solr-query/SKILL.md:128` — index/query analyzer asymmetry → "See solr-schema skill"
4. `solr-query/references/09-function-spatial.md:191` — field setup "is in solr-schema territory"
5. `solr-extending/SKILL.md:84` — custom analyzer/tokenizer/filter → "covered by `solr-schema` skill"
6. `solr-extending/references/06-plugin-wiring.md:17` — analyzer/tokenizer/filter "see solr-schema skill"
7. `solr-semantic-search/references/01-architecture.md:244` — "Schema design for the catalog itself: covered by `solr-schema` skill (forthcoming)."
8. `evals/runner/run_evals.py` — `--skill schema` choice + `repo_root / "solr-schema"` + `--skill all` concat list entry.

## Goal

Create `solr-schema`, a **two-mode** skill — equal weight:

- **Mode A — Audit:** user pastes `managed-schema` and/or `solrconfig.xml` (or supplies a running-Solr URL) → structured review → findings as `severity → finding → why → fix`.
- **Mode B — Design:** user describes a domain → recommendations for field types, analyzer chains, docValues/stored choices, synonym strategy, and a `managed-schema` fragment.

Both modes draw on the same reference knowledge (diagnostic vs generative). Targets **Apache Solr 9.x**, flags Solr 10 deltas. Vendor-neutral examples (generic `title_t`, `brand_s`, product-catalog framing) — consistent with the de-auto-parts conventions in the rest of the bundle.

## Non-goals (explicit boundaries in SKILL.md)

- Query construction / debugging → `solr-query`
- Custom plugin/component code → `solr-extending`
- Tagging/graph semantic-search architecture → `solr-semantic-search`
- Multi-language / per-language field strategy — **deliberately excluded** from this skill's scope.

## Structure

```
skills/solr/solr-schema/
├── SKILL.md              ← router; two modes (audit / design); anti-pattern quick-table; Solr 10 deltas; boundaries
└── references/
    ├── 01-field-types.md              string vs text_general vs text_en; tokenizers + filter chains; when to use each
    ├── 02-analyzer-asymmetry.md       index vs query analyzers; detecting divergence; the #1 audit finding
    ├── 03-docvalues-stored-indexed.md the triad; useDocValuesAsStored; facet/sort/function/group needs; over-storing
    ├── 04-synonyms.md                 SynonymGraphFilter + FlattenGraphFilter; index vs query placement; synonyms.txt vs managed
    ├── 05-solrconfig-review.md        caches vs heap; autoCommit/softCommit; schemaFactory; luceneMatchVersion; URP chains; handler defaults
    ├── 06-anti-patterns.md            consolidated catalog + Solr 9.x→10 deprecations/migration flags
    ├── 07-live-inspection.md          /schema, /analysis, /admin/luke when only a URL is available (no XML files)
    └── 08-schemaless-managed-api.md   field-guessing/schemaless pitfalls; Schema REST API for runtime changes
```

Reference files stay in the sibling depth band (~150–500 lines each).

## SKILL.md design

- **Frontmatter `description`** triggers on: managed-schema/schema.xml, solrconfig.xml, fieldType/analyzer/tokenizer/filter, docValues/stored/indexed, synonyms, "audit/review my schema", "design field types for…", analyzer asymmetry, schemaless, Schema API.
- **Mode selector** at the top so the shared trigger resolves to audit vs design.
- **Audit checklist (the spine of Mode A)**, findings ordered by severity:
  1. Field-type misuse (string used for full-text; text where exact-match needed)
  2. Analyzer asymmetry (index vs query divergence) → `02`
  3. Missing `docValues` on facet/sort/function/group fields → `03`
  4. Over-storing (`stored=true` on large unused fields)
  5. `uniqueKey` / required-field / `copyField` sanity
  6. Synonym placement errors (query-time multi-word breaking phrase/mm) → `04`
  7. solrconfig: commit strategy, cache sizing vs heap, `schemaFactory`, `luceneMatchVersion` → `05`
  8. Version-compat landmines (Solr 9→10 removed/deprecated) → `06`
  - URL-only (no files) → pivot to `07`.
- **Router table** (topic → reference), matching the sibling SKILL.md pattern.
- **Solr 10 deltas** section.

## Evals

- New `evals/cases/schema/` with **~40 cases across 8 files** (one per reference area, ~5 each), matching the sibling JSON format exactly: `id`, `category`, `difficulty`, `prompt`, `asserts` (`must_contain` / `must_match_regex` / `must_not_contain` / `max_length_chars`), `notes`.
- Representative cases:
  - `brand_s` faceting with `docValues="false"` → assert `docValues`, `reindex`.
  - Index has SynonymGraphFilter, query doesn't; multi-word synonym misses → assert `index`, `query`, `asymmetr`.
  - One-line: Solr 10 change breaking `TrieIntField` → assert `Point`, `removed`.

## Wiring (resolves the dangling references)

1. **`check-setup.sh`** — add `solr-schema:8` to the `SKILLS` list (verifies 8 reference files).
2. **`evals/runner/run_evals.py`** — `--skill schema` already present; verify `schema` path resolves and `--skill all` concat list includes `solr-schema`.
3. **`evals/README.md`** — flip the "schema (planned)" line to present tense with the 40-case count.
4. **`solr-semantic-search/references/01-architecture.md:244`** — change "forthcoming"/"(planned)" wording to present tense.
5. **`skills/solr/README.md`** — add `solr-schema` to the tree, the skills list, and the "When to read what" table.
6. **Reciprocal back-links** — `solr-schema/SKILL.md` links back to the other three skills (making the cross-refs bidirectional). The existing 6 doc references resolve automatically once the directory exists.

## Verification

- `check-setup.sh` reports `solr-schema` present with 8 references.
- `run_evals.py --skill schema --lint-only` discovers `cases/schema/` and lints all cases (valid JSON, well-formed asserts).
- All eval JSON parses; SKILL.md frontmatter has valid `name: solr-schema` + `description`.
- Tree-wide grep: zero remaining "forthcoming"/"(planned)" for solr-schema; zero auto-parts residue in new content.
- No dangling `solr-schema` reference left unresolved.

## Out of scope / future

- Multi-language field strategy (could be a later reference or its own skill).
- A dedicated `solr-schema` MLX/local-eval baseline run (manual, not part of this work).
