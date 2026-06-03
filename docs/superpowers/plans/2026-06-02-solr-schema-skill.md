# solr-schema Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-mode (audit + design) `solr-schema` skill to the Solr bundle and wire it into the diagnostics/evals/docs so the 8 dangling `solr-schema` references resolve.

**Architecture:** Mirror the existing sibling skills exactly — a `SKILL.md` router + 8 `references/NN-*.md` files under `skills/solr/solr-schema/`, plus `evals/cases/schema/` (~40 cases, 8 files). Then update `check-setup.sh`, `evals/README.md`, one stale "forthcoming" line, and `skills/solr/README.md`.

**Tech Stack:** Markdown (SKILL.md + references), JSON (eval cases, sibling format), the existing Python eval runner (`evals/runner/run_evals.py`), bash diagnostics (`check-setup.sh`).

**Conventions (match the bundle):**
- Vendor-neutral examples only — generic `title_t`, `brand_s`, product-catalog framing. NO auto-parts terms.
- Solr **9.x** target; flag deltas conservatively (verify any 10.x claim against release notes; the well-established migration landmine is 8.x→9.x Trie→Point).
- Reference files ~150–500 lines, same depth as siblings.
- SKILL.md frontmatter must have `name: solr-schema` + a `description:` that triggers on schema/solrconfig/analyzer/docValues/synonyms/schemaless terms.

**Note on commits:** Each task ends with a commit step per standard plan format. Per the repo owner's standing rule, run the actual `git commit` only when the owner has said to commit; otherwise complete the task and leave it staged/unstaged for their go.

**Note on eval grading:** Eval cases are graded by an LLM via `run_evals.py`. Without a model endpoint we cannot grade, but we CAN lint structure with `--lint-only` and grep for required terms. "Verification" steps below use lint + grep as the automated gate; full grading against a model is an optional manual step.

---

## File Structure

**Create:**
- `skills/solr/solr-schema/SKILL.md` — router; two modes; audit checklist; anti-pattern quick-table; boundaries; Solr-10 deltas
- `skills/solr/solr-schema/references/01-field-types.md` — field type selection + analyzer chains
- `skills/solr/solr-schema/references/02-analyzer-asymmetry.md` — index vs query analyzer divergence
- `skills/solr/solr-schema/references/03-docvalues-stored-indexed.md` — the indexed/stored/docValues triad
- `skills/solr/solr-schema/references/04-synonyms.md` — synonym graph filter + placement
- `skills/solr/solr-schema/references/05-solrconfig-review.md` — caches, commits, schemaFactory, URP, luceneMatchVersion
- `skills/solr/solr-schema/references/06-anti-patterns.md` — consolidated catalog + version-compat
- `skills/solr/solr-schema/references/07-live-inspection.md` — /schema, /analysis, /admin/luke
- `skills/solr/solr-schema/references/08-schemaless-managed-api.md` — schemaless pitfalls + Schema REST API
- `skills/solr/evals/cases/schema/01-field-types.json` … `08-schemaless-managed-api.json` — ~5 cases each

**Modify:**
- `skills/solr/check-setup.sh` — add `solr-schema:8` to the `SKILLS` list
- `skills/solr/evals/README.md` — schema line present-tense + structure tree + `--skill` list
- `skills/solr/solr-semantic-search/references/01-architecture.md:244` — drop "(forthcoming)"
- `skills/solr/README.md` — add solr-schema to tree, skills list, "When to read what" table

**Verify-only (already correct):**
- `skills/solr/evals/runner/run_evals.py` — `--skill schema` choice + `repo_root / "solr-schema"` + `--skill all` concat list already include schema.

---

## Task 1: Scaffold directory + SKILL.md

**Files:**
- Create: `skills/solr/solr-schema/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run:
```bash
mkdir -p skills/solr/solr-schema/references skills/solr/evals/cases/schema
```

- [ ] **Step 2: Write `SKILL.md`**

Required content (model on `solr-query/SKILL.md`):

Frontmatter:
```markdown
---
name: solr-schema
description: This skill should be used when auditing or designing an Apache Solr schema or solrconfig — reviewing an existing managed-schema/schema.xml or solrconfig.xml, or designing field types, analyzer chains, and synonyms for a new collection. It diagnoses field-type misuse, index-vs-query analyzer asymmetry, missing docValues on facet/sort/function fields, over-storing, synonym placement errors, commit/cache misconfiguration, and version-compat landmines; and it recommends field types, analyzers, docValues/stored/indexed choices, and synonym strategy. Use when the user mentions managed-schema, schema.xml, solrconfig.xml, fieldType, tokenizer/filter/analyzer, docValues/stored/indexed, synonyms, "review/audit my schema", "design field types for…", analyzer asymmetry, schemaless, or the Schema REST API. Targets Solr 9.x; flags Solr 10 differences where relevant.
---
```

Body sections (in order):
1. **Intro** — what it does; that it has two modes; boundaries: query work → `solr-query`; plugin code → `solr-extending`; tagging architecture → `solr-semantic-search`.
2. **Two modes** — "Mode A — Audit" (paste managed-schema/solrconfig or give a URL) and "Mode B — Design" (describe a domain).
3. **How to use this skill** — router table (topic → reference), one row per reference 01–08 (copy the exact filenames/titles from this plan's File Structure).
4. **Audit checklist** — the 8-point severity-ordered spine from the spec (field-type misuse; analyzer asymmetry → `02`; missing docValues → `03`; over-storing; uniqueKey/required/copyField sanity; synonym placement → `04`; solrconfig commits/caches/schemaFactory/luceneMatchVersion → `05`; version-compat → `06`). Note: URL-only → pivot to `07`.
5. **Anti-patterns quick-table** — 6–8 highest-value rows (push-back items), each linking to the relevant reference.
6. **Solr 10 deltas** — short; conservative; note Trie fields are already gone as of 9.0 and to verify 10.x specifics against release notes.

- [ ] **Step 3: Verify frontmatter + structure**

Run:
```bash
head -4 skills/solr/solr-schema/SKILL.md | grep -E '^name: solr-schema' && \
head -4 skills/solr/solr-schema/SKILL.md | grep -E '^description:' && echo "frontmatter OK"
grep -c '`0[1-8]-' skills/solr/solr-schema/SKILL.md   # router rows reference all 8 files
```
Expected: "frontmatter OK"; the count is ≥ 8.

- [ ] **Step 4: Commit** (only on owner's go)

```bash
git add skills/solr/solr-schema/SKILL.md
git commit -m "feat(solr-schema): scaffold skill router (SKILL.md, two modes)"
```

---

## Tasks 2–9: Reference + eval pairs (one per area)

Each task writes one reference file and its ~5-case eval file, lints the eval JSON, greps the reference for required terms, and commits. Do them in order 01→08.

For every eval JSON, use the sibling object shape exactly:
```json
{ "id": "...", "category": "...", "difficulty": "easy|medium|hard",
  "prompt": "...", "asserts": { "must_contain": [...], "must_match_regex": [...],
  "must_not_contain": [...], "max_length_chars": N }, "notes": "..." }
```
File content is a top-level JSON array of such objects.

---

### Task 2: `01-field-types.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/01-field-types.md`
- Create: `skills/solr/evals/cases/schema/01-field-types.json`

- [ ] **Step 1: Write the eval cases** (`01-field-types.json`, 5 cases, `"category": "field-types"`)

1. *"A field holds product titles for full-text search but is defined as a `string` (StrField). What's wrong and what type should it be?"* → must_contain: `text`, `tokeniz`; must_match_regex: `text_general|text_en|TextField`.
2. *"When should a field be `string`/StrField instead of a `text_*` type? One sentence."* → must_match_regex: `exact|not tokeniz|facet|sort|id|identifier`.
3. *"Name the core filters in a typical English full-text analyzer chain (text_en). List at least three."* → must_contain: `LowerCase`; must_match_regex: `Stop|Stem|Porter|Snowball|PossessiveEnglish|KeywordMarker`.
4. *"One-line: which tokenizer does text_general use by default?"* → must_contain: `StandardTokenizer`; max_length_chars: 60.
5. *"A schema uses `TrieIntField` for a numeric field. The index is being upgraded from Solr 8 to 9. What must change?"* → must_contain: `Point`; must_match_regex: `IntPointField|Point.*field|removed`.

- [ ] **Step 2: Lint the eval file**

Run: `python3 -c "import json; json.load(open('skills/solr/evals/cases/schema/01-field-types.json')); print('JSON OK')"`
Expected: "JSON OK"

- [ ] **Step 3: Write `01-field-types.md`**

Must cover (concrete Solr 9.x facts):
- StrField (not tokenized; exact match, facet, sort, id) vs TextField (tokenized full-text).
- `text_general` (StandardTokenizer + LowerCaseFilter + StopFilter [+ SynonymGraph at index]) vs `text_en` (adds EnglishPossessiveFilter, KeywordMarkerFilter, PorterStem/Snowball).
- Numeric Point fields (IntPointField/LongPointField/DoublePointField/DatePointField); **Trie\* removed in Solr 9.0** → migrate to Point.
- `multiValued`, `copyField` (e.g. into a catch-all `text` field), `omitNorms`.
- Decision table: exact-match/id/facet → string; full-text → text_*; numeric/range → Point; boolean → BoolField.
- Include one concrete `<fieldType>` + `<field>` example using `title_t` (text_en) and `brand_s` (string).

- [ ] **Step 4: Verify reference covers required terms**

Run:
```bash
grep -qiE 'StrField|string field' skills/solr/solr-schema/references/01-field-types.md && \
grep -qiE 'text_en|text_general' skills/solr/solr-schema/references/01-field-types.md && \
grep -qiE 'PointField' skills/solr/solr-schema/references/01-field-types.md && echo "01 OK"
```
Expected: "01 OK"

- [ ] **Step 5: Commit** (only on owner's go)

```bash
git add skills/solr/solr-schema/references/01-field-types.md skills/solr/evals/cases/schema/01-field-types.json
git commit -m "feat(solr-schema): add 01-field-types reference + evals"
```

---

### Task 3: `02-analyzer-asymmetry.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/02-analyzer-asymmetry.md`
- Create: `skills/solr/evals/cases/schema/02-analyzer-asymmetry.json`

- [ ] **Step 1: Write the eval cases** (`02-analyzer-asymmetry.json`, 5 cases, `"category": "analyzer-asymmetry"`)

1. *"`title_t` has SynonymGraphFilter in its index analyzer but not its query analyzer. A user searches a multi-word synonym and gets no results. Why?"* → must_contain: `index`, `query`; must_match_regex: `asymmetr|differ|only.*index`.
2. *"Which endpoint shows the index-time vs query-time token streams for a value, to confirm an analyzer mismatch?"* → must_contain: `/analysis`.
3. *"A field stems at index time (PorterStem) but the query analyzer has no stemmer. What's the symptom?"* → must_match_regex: `miss|no match|won'?t match|fewer`.
4. *"True/False: index and query analyzers for a fieldType must be identical."* → must_match_regex: `[Ff]alse`; notes: they may differ intentionally (e.g., query-time-only synonyms), but unintended divergence causes misses.
5. *"Where should SynonymGraphFilter usually go to avoid multi-word query-time graph problems, and what filter must accompany it?"* → must_contain: `index`, `FlattenGraph`.

- [ ] **Step 2: Lint** — `python3 -c "import json;json.load(open('skills/solr/evals/cases/schema/02-analyzer-asymmetry.json'));print('JSON OK')"` → "JSON OK"

- [ ] **Step 3: Write `02-analyzer-asymmetry.md`**

Must cover:
- index vs query analyzer roles; how mismatches cause silent zero-result/missed matches (this is the content `solr-query:124,128` defers here).
- Reading `/solr/<c>/analysis/field?analysis.fieldname=title_t&analysis.fieldvalue=…&analysis.query=…` to diff the two streams.
- Common asymmetries: query-time-only synonyms; one-sided stemming; WordDelimiterGraph config mismatch; differing stopword sets.
- Multi-word synonyms: SynonymGraphFilter at index time + FlattenGraphFilter; why query-time multi-word synonyms interact badly with `mm`/phrase/`sow`.
- The fix patterns + when asymmetry is intentional.

- [ ] **Step 4: Verify** — `grep -qiE 'index' && grep -qiE 'query' && grep -qiE '/analysis' && grep -qiE 'SynonymGraph' …` → "02 OK"

```bash
f=skills/solr/solr-schema/references/02-analyzer-asymmetry.md
grep -qi 'analysis' "$f" && grep -qi 'SynonymGraph' "$f" && grep -qi 'query analyzer' "$f" && echo "02 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 02-analyzer-asymmetry reference + evals"`

---

### Task 4: `03-docvalues-stored-indexed.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/03-docvalues-stored-indexed.md`
- Create: `skills/solr/evals/cases/schema/03-docvalues-stored-indexed.json`

- [ ] **Step 1: Write the eval cases** (`03-docvalues-stored-indexed.json`, 5 cases, `"category": "docvalues"`)

1. *"`brand_s` is used only for faceting and is defined with `docValues="false"`. What's the problem and the fix?"* → must_contain: `docValues`; must_match_regex: `reindex|re-index`.
2. *"What do `indexed`, `stored`, and `docValues` each enable? One line each."* → must_match_regex: `search`; must_contain: `docValues`, `stored`.
3. *"Operations that REQUIRE docValues on a field — name three."* → must_match_regex: `facet|sort|function|group|stream`.
4. *"What does `useDocValuesAsStored` do?"* → must_match_regex: `retriev|return.*docValues|without stored`.
5. *"Can a tokenized `text_general` field have docValues? Why/why not, one sentence."* → must_match_regex: `[Nn]o`; must_match_regex: `tokeniz|multi.?term|analyzed`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `03-docvalues-stored-indexed.md`**

Must cover:
- `indexed` (searchable/filterable), `stored` (retrievable verbatim), `docValues` (column-stride: facet, sort, function queries, grouping, streaming, JSON facet).
- `useDocValuesAsStored` (default true) — retrieve values from docValues without `stored`.
- The failure mode: facet/sort/function on a field lacking docValues → fieldCache/UnInvertedField → heap pressure / OOM; fix = `docValues=true` + **reindex**.
- docValues defaults true for string/numeric/boolean/date in modern schema templates; **not allowed** on tokenized text fields.
- Over-storing: large text `stored=true` that's never returned wastes disk/segment merge.
- Decision guidance table per field role (search-only / retrieve / facet / sort).

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/03-docvalues-stored-indexed.md
grep -qi 'docValues' "$f" && grep -qi 'reindex' "$f" && grep -qi 'useDocValuesAsStored' "$f" && echo "03 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 03-docvalues-stored-indexed reference + evals"`

---

### Task 5: `04-synonyms.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/04-synonyms.md`
- Create: `skills/solr/evals/cases/schema/04-synonyms.json`

- [ ] **Step 1: Write the eval cases** (`04-synonyms.json`, 5 cases, `"category": "synonyms"`)

1. *"Which filter factory replaces the deprecated SynonymFilterFactory, and what filter must follow it at index time?"* → must_contain: `SynonymGraphFilter`, `FlattenGraphFilter`.
2. *"Why are multi-word synonyms applied at QUERY time problematic? One sentence."* → must_match_regex: `graph|mm|phrase|sow|min.?should.?match`.
3. *"Format of a synonyms.txt line for a multi-word equivalence — give an example."* → must_contain: `,`; must_not_contain: `honda`.
4. *"Index-time vs query-time synonyms: which avoids the multi-word graph issue?"* → must_contain: `index`.
5. *"What schemaFactory is required to manage synonyms via the REST API?"* → must_match_regex: `Managed.*Schema|ManagedIndexSchemaFactory`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `04-synonyms.md`**

Must cover:
- SynonymGraphFilterFactory (+ FlattenGraphFilterFactory at index) — replaces SynonymFilterFactory.
- Index-time vs query-time placement; query-time multi-word synonyms produce token graphs that break `mm`/phrase and need `sow`/autoGeneratePhraseQueries care.
- `synonyms.txt` format (explicit `a,b,c` and directional `a => b`), `expand`, `ignoreCase`, `tokenizerFactory`.
- Managed synonyms REST API (requires ManagedIndexSchemaFactory).
- Vendor-neutral examples only (e.g., `tv, television` — never auto-parts).

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/04-synonyms.md
grep -qi 'SynonymGraphFilter' "$f" && grep -qi 'FlattenGraph' "$f" && grep -qi 'query' "$f" && echo "04 OK"
grep -qiE 'honda|civic|brake' "$f" && echo "!!! AUTO-PARTS LEAK" || echo "vendor-neutral OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 04-synonyms reference + evals"`

---

### Task 6: `05-solrconfig-review.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/05-solrconfig-review.md`
- Create: `skills/solr/evals/cases/schema/05-solrconfig-review.json`

- [ ] **Step 1: Write the eval cases** (`05-solrconfig-review.json`, 5 cases, `"category": "solrconfig"`)

1. *"Difference between autoCommit and autoSoftCommit; which controls document visibility?"* → must_contain: `softCommit`; must_match_regex: `visib|searcher|near.?real.?time|NRT`.
2. *"Recommended `openSearcher` setting for a frequent hard autoCommit, and why?"* → must_match_regex: `false`; must_match_regex: `soft.?commit|visibility|expensive`.
3. *"Name two Solr query caches configured in solrconfig.xml."* → must_match_regex: `filterCache|queryResultCache|documentCache`.
4. *"Which schemaFactory is the Solr 9.x default and allows runtime schema edits?"* → must_match_regex: `Managed`; must_not_contain: `Classic`.
5. *"What does `luceneMatchVersion` control, one sentence?"* → must_match_regex: `compat|version|behavior|defaults`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `05-solrconfig-review.md`**

Must cover:
- Commit strategy: `<autoCommit>` (hard, `openSearcher=false`, durability) + `<autoSoftCommit>` (visibility/NRT); typical ratios; pitfalls (per-request commits, openSearcher=true on hard commit).
- Caches: filterCache, queryResultCache, documentCache (CaffeineCache in 9.x); sizing vs heap; autowarm costs.
- `schemaFactory`: ManagedIndexSchemaFactory (9.x default, mutable) vs ClassicIndexSchemaFactory.
- `luceneMatchVersion`; `<lib>` directives / classloading note (cross-link `solr-extending/06-plugin-wiring.md`).
- updateRequestProcessorChain overview; request handler `/select` defaults; `maxBooleanClauses`.
- An "audit checklist" subsection mapping each to a finding+fix.

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/05-solrconfig-review.md
grep -qi 'autoSoftCommit' "$f" && grep -qi 'filterCache' "$f" && grep -qi 'schemaFactory' "$f" && echo "05 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 05-solrconfig-review reference + evals"`

---

### Task 7: `06-anti-patterns.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/06-anti-patterns.md`
- Create: `skills/solr/evals/cases/schema/06-anti-patterns.json`

- [ ] **Step 1: Write the eval cases** (`06-anti-patterns.json`, 5 cases, `"category": "anti-patterns"`)

1. *"List three schema anti-patterns an auditor should flag immediately."* → must_match_regex: `string.*full.?text|docValues|asymmetr|over.?stor|multiValued`.
2. *"A facet field works but heap spikes under load; the field has no docValues. Name the anti-pattern."* → must_contain: `docValues`.
3. *"Migrating a Solr 8 schema to 9: which field family was removed and what replaces it?"* → must_contain: `Trie`, `Point`.
4. *"Why is using a `text_general` field for sorting an anti-pattern?"* → must_match_regex: `tokeniz|multi.?valued|docValues|not.*sort`.
5. *"One-line: is it safe to assume Solr 10 behaves like 9.x for schema syntax?"* → must_match_regex: `verify|release notes|no|check`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `06-anti-patterns.md`**

Must cover (consolidated catalog, each as `anti-pattern → why → fix`):
- string for full-text; text for exact-match/sorting; missing docValues on facet/sort/function; asymmetric analyzers; over-storing; no uniqueKey; unexpected multiValued; copyField sprawl/loops; query-time multi-word synonyms; oversized `maxBooleanClauses`/shingles.
- Version-compat section: **Trie\* removed in 9.0 → \*PointField** (8→9 landmine); ManagedIndexSchemaFactory default in 9.x; conservative note to verify 10.x specifics against release notes (do NOT assert unverified 10.x removals).
- Cross-links to references 01–05 and 07.

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/06-anti-patterns.md
grep -qi 'docValues' "$f" && grep -qi 'Trie' "$f" && grep -qi 'PointField' "$f" && echo "06 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 06-anti-patterns reference + evals"`

---

### Task 8: `07-live-inspection.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/07-live-inspection.md`
- Create: `skills/solr/evals/cases/schema/07-live-inspection.json`

- [ ] **Step 1: Write the eval cases** (`07-live-inspection.json`, 5 cases, `"category": "live-inspection"`)

1. *"You have a running Solr URL but no schema files. Which endpoint lists all fields and their flags?"* → must_match_regex: `/schema|/admin/luke`.
2. *"Which Luke parameter returns the schema view of fields?"* → must_contain: `luke`; must_match_regex: `show=schema`.
3. *"How do you confirm index vs query analysis for `title_t` against a live core?"* → must_contain: `/analysis`; must_match_regex: `fieldname|fieldvalue`.
4. *"In Luke field-flags, which flags indicate a field is indexed and has docValues? (name the flag letters' meaning)"* → must_match_regex: `indexed|docValues|I|D`.
5. *"One endpoint to list configured copyFields on a live collection."* → must_match_regex: `/schema/copyfields|copyField`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `07-live-inspection.md`**

Must cover:
- `GET /solr/<c>/schema`, `/schema/fields`, `/schema/fieldtypes`, `/schema/dynamicfields`, `/schema/copyfields` — when you only have a URL.
- `GET /solr/<c>/analysis/field?analysis.fieldname=&analysis.fieldvalue=&analysis.query=` — live index-vs-query token diff (ties to `02`).
- `GET /solr/<c>/admin/luke?show=schema&numTerms=0` — field flags string and how to decode (Indexed/Tokenized/Stored/DocValues/…).
- A short "audit a black-box Solr" workflow.
- Concrete `curl` examples with generic core name and `title_t`/`brand_s`.

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/07-live-inspection.md
grep -qi '/schema' "$f" && grep -qi '/analysis' "$f" && grep -qi 'luke' "$f" && echo "07 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 07-live-inspection reference + evals"`

---

### Task 9: `08-schemaless-managed-api.md` + evals

**Files:**
- Create: `skills/solr/solr-schema/references/08-schemaless-managed-api.md`
- Create: `skills/solr/evals/cases/schema/08-schemaless-managed-api.json`

- [ ] **Step 1: Write the eval cases** (`08-schemaless-managed-api.json`, 5 cases, `"category": "schemaless"`)

1. *"Which update processor powers schemaless field-guessing?"* → must_contain: `AddSchemaFields`.
2. *"Two pitfalls of leaving schemaless mode on in production."* → must_match_regex: `string|guess|multiValued|type.*lock|wrong type`.
3. *"REST call shape to add a field via the Schema API (method + key)."* → must_contain: `add-field`; must_match_regex: `POST`.
4. *"What schemaFactory must be active to use the Schema REST API?"* → must_match_regex: `Managed`.
5. *"After changing a field type via the Schema API on existing data, what's required?"* → must_match_regex: `reindex|re-index`.

- [ ] **Step 2: Lint** → "JSON OK"

- [ ] **Step 3: Write `08-schemaless-managed-api.md`**

Must cover:
- Schemaless mode: `AddSchemaFieldsUpdateProcessorFactory` type guessing (defaults toward string / multiValued); pitfalls (wrong types, multiValued-by-default, type lock-in after first doc); turning it off for prod.
- Schema REST API: `add-field`, `add-field-type`, `replace-field`, `add-copy-field`, `add-dynamic-field` (POST to `/solr/<c>/schema`); requires ManagedIndexSchemaFactory; reindex implications on type changes.
- Concrete POST JSON example.

- [ ] **Step 4: Verify**

```bash
f=skills/solr/solr-schema/references/08-schemaless-managed-api.md
grep -qi 'AddSchemaFields' "$f" && grep -qi 'add-field' "$f" && grep -qi 'reindex' "$f" && echo "08 OK"
```

- [ ] **Step 5: Commit** (owner's go) — `git commit -m "feat(solr-schema): add 08-schemaless-managed-api reference + evals"`

---

## Task 10: Wiring (resolve dangling references)

**Files:**
- Modify: `skills/solr/check-setup.sh`
- Modify: `skills/solr/evals/README.md`
- Modify: `skills/solr/solr-semantic-search/references/01-architecture.md`
- Modify: `skills/solr/README.md`

- [ ] **Step 1: `check-setup.sh` — register the skill**

Change the SKILLS line:
```bash
# from:
SKILLS="solr-query:12 solr-extending:6 solr-semantic-search:8"
# to:
SKILLS="solr-query:12 solr-extending:6 solr-semantic-search:8 solr-schema:8"
```

- [ ] **Step 2: `evals/README.md` — present-tense schema**

In the structure tree, add a `schema/` cases line (40 cases) and remove "(planned)" from the schema line. In the `--skill` list, change:
```
--skill schema          → solr-schema/ + cases/schema/      (planned)
# to:
--skill schema          → solr-schema/ + cases/schema/
```

- [ ] **Step 3: `solr-semantic-search/references/01-architecture.md:244` — drop "forthcoming"**

Change:
```
- **Schema design for the catalog itself**: covered by `solr-schema` skill (forthcoming).
# to:
- **Schema design for the catalog itself**: covered by the `solr-schema` skill.
```

- [ ] **Step 4: `skills/solr/README.md` — add solr-schema everywhere**

- In the "What's in here" tree, add a `solr-schema/` block (SKILL.md + the 8 references) and add `schema/` under `evals/cases/` (58→… ; add "schema/ ← 40 cases across 8 files").
- In the skills bullet list, add: `**solr-schema** — auditing an existing schema/solrconfig, or designing field types, analyzers, and synonyms`.
- In the "When to read what" table, add 2 rows, e.g.:
  - *"Why does my multi-word synonym match at index but not query time?"* | solr-schema | 02-analyzer-asymmetry.md
  - *"Audit my managed-schema — is brand_s set up right for faceting?"* | solr-schema | 03-docvalues-stored-indexed.md

- [ ] **Step 5: Verify wiring**

```bash
cd skills/solr
grep -q 'solr-schema:8' check-setup.sh && echo "check-setup OK"
grep -q 'solr-schema' README.md && echo "README OK"
! grep -qi 'forthcoming' solr-semantic-search/references/01-architecture.md && echo "architecture wording OK"
! grep -qi 'schema.*planned' evals/README.md && echo "evals README OK"
```
Expected: all four "OK" lines.

- [ ] **Step 6: Commit** (owner's go)

```bash
git add skills/solr/check-setup.sh skills/solr/evals/README.md skills/solr/solr-semantic-search/references/01-architecture.md skills/solr/README.md
git commit -m "chore(solr-schema): wire skill into diagnostics, evals docs, README"
```

---

## Task 11: Final verification pass

**Files:** none (read-only checks)

- [ ] **Step 1: All schema eval JSON valid**

```bash
cd skills/solr
bad=0; for f in evals/cases/schema/*.json; do python3 -c "import json;json.load(open('$f'))" || { echo "BAD $f"; bad=1; }; done; [ $bad -eq 0 ] && echo "all schema JSON valid"
ls evals/cases/schema/*.json | wc -l   # expect 8
```

- [ ] **Step 2: Runner discovers + lints schema cases**

Run:
```bash
python3 evals/runner/run_evals.py --skill schema --lint-only --model x 2>&1 | tail -20
```
Expected: it resolves `solr-schema/` + `evals/cases/schema/` and lints cases without "directory not found"/path errors. (If `--model` is required even for lint, pass a dummy; the lint path must not call a model.)

- [ ] **Step 3: All 8 references present + frontmatter**

```bash
ls skills/solr/solr-schema/references/*.md | wc -l   # expect 8
head -2 skills/solr/solr-schema/SKILL.md | grep -q 'name: solr-schema' && echo "SKILL name OK"
```

- [ ] **Step 4: No dangling/auto-parts/placeholder residue**

```bash
cd skills/solr
grep -rniE 'forthcoming|\(planned\)' . | grep -i schema && echo "!!! still planned" || echo "no 'planned' schema refs"
grep -rniE 'honda|civic|brake|fitment|\bYMM\b|part_terminology' solr-schema evals/cases/schema && echo "!!! AUTO-PARTS" || echo "vendor-neutral OK"
grep -rniE '\bTBD\b|\bTODO\b|fill in|implement later' solr-schema && echo "!!! placeholder" || echo "no placeholders"
```

- [ ] **Step 5: check-setup reports all four skills**

```bash
cd skills/solr && ./check-setup.sh 2>&1 | grep -A1 solr-schema
```
Expected: solr-schema SKILL.md found + "all 8 reference files present" (once installed to `~/.claude/skills/`, or it will report the install-path miss — that's expected if not yet copied).

- [ ] **Step 6: Final commit** (owner's go)

```bash
git add -A skills/solr
git commit -m "test(solr-schema): final verification pass"
```

---

## Self-Review (completed during plan authoring)

**Spec coverage:** every spec section maps to a task — SKILL.md/two-modes/checklist (Task 1); 8 references (Tasks 2–9, one each); ~40 evals across 8 files (Tasks 2–9, 5 each = 40); wiring items 1–6 (Task 10); verification (Task 11). The runner items the spec marks "verify-only" are checked in Task 11 Step 2.

**Placeholder scan:** reference bodies are specified by required-sections + must-cover concrete Solr facts + a named example + grep gates (not "write tests for the above"). Eval cases are given as concrete prompt+assert pairs. No "TBD/TODO".

**Type/term consistency:** filenames `01-…08-` identical across File Structure, tasks, SKILL.md router, and verification greps. `solr-schema:8` (8 references) consistent in check-setup and Task 11. Eval `category` values are stable per file. The 8→9 Trie→Point fact is used consistently (corrected from the spec's "Solr 10" mention).
