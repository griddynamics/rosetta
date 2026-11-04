# Storage Conditions — Plan (HOW)

Specs (WHAT, single authority): `storage-conditions-SPECS.md` (cited as `SPECS §n`). Design: `architecture-notes.md`. Status tracking: `HANDOFF.md`. Date 2026-11-03.

## Read first
1. `SPECS` (all), `architecture-notes.md` §1 (F-facts) and §6 (risks).
2. `docs/ARCHITECTURE.md` `## Schema and codegen coupling`, `## Cross-repo change rules`, `## Local runtime`. `agents/MEMORY.md` (all ACTIVE rules).
3. Per repo, before editing: `<repo>/CLAUDE.md` + `<repo>/docs/ARCHITECTURE.md` (+ `saleor/docs/GRAPHQL-ARCHITECTURE.md`, `saleor-dashboard/docs/multi-schema.md`, `react-storefront/docs/DATA-ARCHITECTURE.md`).

## Governing rules (one line each → authority)
- Specs win over this plan. If a conflict appears, STOP and report to the orchestrator → `SPECS`.
- Repo rules win inside a repo: follow existing style, add tests, run linters, **no commit/push** → `<repo>/CLAUDE.md`.
- Scope is fixed: **no story edits (`*.stories.tsx`)**, **no search/filter/sort/cart/checkout/order/email changes** → `SPECS §1`, U7.
- Generated files only via generators: `saleor/saleor/graphql/schema.graphql`, `saleor-dashboard/schema-main.graphql`, `saleor-dashboard/src/graphql/*.generated.ts`, `react-storefront/src/gql/` → `docs/ARCHITECTURE.md` `## Schema and codegen coupling`.
- Never read `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump`, or secrets → `agents/MEMORY.md` "Learn the running stack without reading secrets".
- Never run `fetch-schema`, `fetch-schema:main/staging`, or `update-schema` in the dashboard → `SPECS §8.1`, arch R1.
- Shared local DB: only the gated forward migration. No backward migration, flush, `populatedb`, restore, or `--create-db` against the main DB without explicit human approval → U7.
- Compare schemas by declaration names, not raw diff → `agents/MEMORY.md`.

## Where outcomes are recorded
- Per-session status, evidence, deviations: `HANDOFF.md` (the session's section). Cross-session issues: `HANDOFF.md` `## Common issues`.
- Durable lessons → `agents/MEMORY.md`. Completed workstream → `agents/IMPLEMENTATION.md` (S06 only).

## Ordering (critical path)
`S01 → S02 → R1 → G2 → {S03 → S04} ∥ S05 → S06`
- Codegen/schema order: core `build-schema` (S01 draft, S02 final) → G2: the local API serves the final schema → dashboard `fetch-local-schema` + `generate` (S03 only) → storefront `generate:all` (S05). Clients must never refresh from an API that lacks the full §6.1 set.

| # | Session / gate | Repo | Depends on | Parallel with |
|---|---|---|---|---|
| G0 | Pre-flight (HITL): baselines clean, approvals recorded | all | — | — |
| S01 | Core data, validation, GraphQL, mutations, events | saleor | G0 | — |
| S02 | Core webhooks, CSV, final schema, CHANGELOG | saleor | S01 | — |
| R1 | Core review + validation gate | saleor | S02 | — |
| G2 | Local rollout (HITL): forward migration on shared DB, API serves new code | saleor runtime | R1 | — (**alone**) |
| S03 | Dashboard schema/codegen, product form, export | saleor-dashboard | G2 | S05 |
| S04 | Dashboard translations UI + progress | saleor-dashboard | S03 | S05 |
| S05 | Storefront PDP | react-storefront | G2 | S03, S04 |
| R2 | Client review gate (per repo, after S04 and after S05) | dashboard, storefront | S04 / S05 | each other |
| S06 | Integration validation + freshness E2E (G4 HITL) | all (read/verify) | R2 | — (**alone**) |
- Unlisted pairs are sequential. S05 ∥ S03/S04 is valid only because they share no files (different repos) and S05 only reads the local API. S03 and S04 are sequential because S04 consumes S03 codegen and S03's translation fixtures, and S04 extracts messages covering S03 strings.
- Collisions resolved by ownership (no file has two owners): (a) `schema.graphql` (core) is sequentially owned S01 → S02 (S02 final). (b) Dashboard codegen output + both fragment files belong to S03 only, so S04 never re-runs `generate`. (c) `saleor-dashboard/src/translations/fixtures.ts` belongs to **S03 only**. S03 adds `storageConditions` to every product-translation fixture S04 will need (with-source, blank-source, orphan-translation variants). S04 treats it as read-only and keeps any further test data inside its own test files. If S04 needs a fixture change, it STOPs and reports. (d) `saleor-dashboard/locale/defaultMessages.json` belongs to **S04 only**. S03 adds react-intl messages in source but does not run `extract-messages`. S04 runs it once at its end, which captures the S03 and S04 strings. Transfer point: S03 is marked done in HANDOFF. (e) Core test files are split by directory (below).

## File ownership (exclusive; anything not listed needs orchestrator approval)
| Session | Owns (create/modify) |
|---|---|
| S01 | `saleor/saleor/product/models.py`; `saleor/saleor/product/migrations/0211_product_storage_conditions.py`; validator/constant module in `saleor/saleor/product/` (new, name per repo style); `saleor/saleor/graphql/product/types/products.py`; `saleor/saleor/graphql/product/mutations/product/{product_create,product_update}.py`; `saleor/saleor/graphql/product/bulk_mutations/product_bulk_create.py`; `saleor/saleor/graphql/translations/types.py`; `saleor/saleor/graphql/translations/mutations/{utils,product_translate,product_bulk_translate,category_translate,collection_translate}.py`; tests under `saleor/saleor/graphql/product/tests/**`, `saleor/saleor/graphql/translations/tests/**`, `saleor/saleor/product/tests/**`; `saleor/saleor/graphql/schema.graphql` (draft regen) |
| S02 | `saleor/saleor/webhook/payloads.py`; `saleor/saleor/webhook/tests/**`; `saleor/saleor/graphql/webhook/tests/**` (subscription payload tests); `saleor/saleor/csv/utils/__init__.py`; `saleor/saleor/graphql/csv/enums.py`; `saleor/saleor/csv/tests/**`; `saleor/saleor/graphql/csv/tests/**`; `saleor/saleor/graphql/schema.graphql` (final regen); `saleor/CHANGELOG.md` |
| S03 | `saleor-dashboard/schema-main.graphql` (via `fetch-local-schema` only); `saleor-dashboard/src/graphql/*.generated.ts` (codegen only); `saleor-dashboard/src/fragments/{products,translations}.ts`; `saleor-dashboard/src/products/**` excluding `*.stories.tsx` (form, page, utils, handlers, `ProductDetailsForm.tsx`, `ProductExportDialog/*` excl. stories, `fixtures.ts`, tests); `saleor-dashboard/src/translations/fixtures.ts` (sole owner; see collision rule c); `saleor-dashboard/.changeset/<new>.md`; source-level react-intl messages only (no `locale/defaultMessages.json`) |
| S04 | `saleor-dashboard/src/translations/**` excluding `*.stories.tsx` and `fixtures.ts` (types, `utils.ts`, `bulkSubmit.ts`, `progress.ts`, `TranslationsProductsPage/*`, `TranslationFieldsLong*`, `views/EntityLists/utils.ts`, tests); `saleor-dashboard/locale/defaultMessages.json` (sole owner, via `extract-messages` only, run once at the end of S04) |
| S05 | `react-storefront/src/graphql/ProductDetails.graphql`; `react-storefront/src/lib/saleor-translations.ts` (+ test); `react-storefront/src/lib/storefront/contract/product.ts`; `react-storefront/src/lib/storefront/mappers/product.ts` (+ test); `react-storefront/src/ui/components/pdp/product-attributes.tsx` (+ new `.test.ts`); `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx`; `react-storefront/messages/*.json` (8); `react-storefront/paper-core.lock.json` (via `core:lock` only) |
| G2, R1, R2, S06 | No product-code files. Only `plans/storage-conditions/HANDOFF.md`, and `agents/{MEMORY,IMPLEMENTATION}.md` in S06 |
- Explicitly not owned by anyone (must stay unchanged): `saleor-dashboard/schema-staging.graphql`, `saleor-dashboard/schema.graphql` symlink type, `react-storefront/src/app/api/revalidate/route.ts`, `react-storefront/src/lib/saleor/invalidation/**`, `react-storefront/data-layer.lock.md`, all `*.stories.tsx`, core `product/search.py`, filters/sorters, checkout/order/email modules.

## Gates (HITL = orchestrator asks the user; subagents never self-approve)
| Gate | When | Approves / checks |
|---|---|---|
| G0 HITL | before S01 | `git status` clean in 3 repos at the baselines in `SPECS` header (or the user accepts the deltas); the user acknowledges the G2 and G4 shared-resource writes up front or per gate |
| R1 | after S02 | `rosetta:reviewer` on the core diff vs `SPECS §4–§7,§11` + `rosetta:validator` reruns core commands; findings fixed in S01/S02-owned files only |
| G2 HITL | before any client session | Runs alone. Local Docker dev DB only. Steps in `### G2 — Local rollout protocol` below. Needs the exact user confirmation immediately before migrating. Non-local or ambiguous target → ABORT before migrating and report |
| R2 | after S04; after S05 | `rosetta:reviewer` per repo vs `SPECS §8` / `§9`, `git status` shows no stories/staging/locked-forbidden files |
| G4 HITL | inside S06 | creating or using a webhook/App in the shared DB for AC-13 (the human supplies or approves secrets; agents do not read them) |
| G-RB HITL | only on rollback | any backward migration or data-dropping step |

### G2 — Local rollout protocol (orchestrator + `rosetta:executor`; no file edits except HANDOFF)
Authorization (user, 2026-11-03): "Yes, I confirm the API and migration command use the same local database." Scope: apply `0211` **only** to the local Docker development database (compose project `saleor-benchmark`, service `db`). Same-database equivalence comes from this human confirmation. Agents do not infer it from DB activity, connection counts, or similar heuristics.
Hard prohibitions: no migration against any non-local target (remote host, cloud/managed DB, another compose project, connected server port (`srv_port`) other than 5432) or any ambiguous target (several candidate DBs/containers, missing or unparseable probe values). Either case → ABORT before step 5 and report. Never read or print credentials (`USER`, `PASSWORD`, `OPTIONS`, `DATABASE_URL`, `os.environ`, env files, `docker inspect`, `docker exec … env`).
Pre-checks are read-only and sanitized.
1. Local service identity: `docker ps --format '{{.Names}} {{.Ports}} {{.Label "com.docker.compose.project"}} {{.Label "com.docker.compose.service"}}'` shows exactly one compose project `saleor-benchmark` with service `db` (postgres) on :5432 and exactly one API container (A) publishing :8000 (`docs/ARCHITECTURE.md` `## Local runtime`). `docker exec` into A is allowed only to run the M commands below when M = A.
2. Migration environment M + sanitized local-target probe:
   - M = A (`docker exec <A> … manage.py …`) when `0211_product_storage_conditions.py` exists inside A (read-only `ls`). Otherwise M = host `uv run`.
   - In M, a one-off `manage.py shell -c` prints one JSON line with exactly these keys:
     - `cfg_host`, `cfg_port`, `cfg_name`: from `connection.settings_dict` HOST/PORT/NAME
     - `db`, `srv_port`: from read-only `SELECT current_database(), inet_server_port()`.
   - Pass:
     - `cfg_host` ∈ {`db`, `localhost`, `127.0.0.1`, `::1`}
     - `cfg_port` is `5432` or the empty/default value (`""`/`None`, i.e. libpq default). The empty/default value is accepted **only** when `srv_port` = 5432 and the other pass conditions (local `cfg_host`, step 1 identity of the approved local Docker `db` server) hold.
     - `srv_port` = 5432 always.
     - Any other `cfg_port`, or any `srv_port` ≠ 5432 → ABORT.
     - `cfg_name` equals `db` (the `current_database()` value); the name is recorded
     - all keys present.
   - Anything else → ABORT.
3. Migration state in M: `python manage.py showmigrations product` shows `[X] 0210_…` and `[ ] 0211_product_storage_conditions`. Any other state (0211 applied, unknown 0211, earlier migrations unapplied) → ABORT.
4. SQL review in M: `python manage.py sqlmigrate product 0211` contains exactly two `ALTER TABLE … ADD COLUMN "storage_conditions" varchar(250) NULL` (on `product_product` and `product_producttranslation`), with no `DEFAULT` rewrite, index, `DROP`, or data statements.
5. Confirmation gate. The orchestrator shows the user the evidence from steps 1–4 and asks for confirmation. Proceed only if the user's reply, given **immediately before** migrating and after this evidence is shown, contains exactly: "Yes, I confirm the API and migration command use the same local database." Any other wording, a delay with intervening actions, or a changed step 1–4 result → no migration; re-run steps 1–4 and ask again. Then, in M only: `python manage.py migrate product 0211`. Nothing else is migrated.
6. Post-checks in M: `showmigrations product` shows `[X] 0211_…`. Read-only Django introspection (`connection.introspection.get_table_description`) shows `storage_conditions` on both tables, `varchar(250)`, nullable. Any mismatch → stop, report, no automatic rollback (G-RB).
7. API serves the new code: confirm, or restart A with approval (WA-06). Then introspection (`## Validation commands`) must show all 6 schema elements. This shows A reads the migrated schema; it does not replace step 5.
8. Record steps 1–7 in HANDOFF `### G2` and in the shared-writes log: command, sanitized output, the verbatim confirmation, timestamp. Before recording, check that no credential, user name, or URL with userinfo appears in captured output. If one does, discard it and re-run narrower.

## Sessions

### S01 — Core: data, validation, GraphQL, mutations, events
Depends on: G0
#### Do
1. Model fields + migration `0211` per `SPECS §4`. Translated keys include the field.
2. One validator per `SPECS §5`, applied on all product write paths in `SPECS §6.2`.
3. GraphQL fields/inputs per `SPECS §6.1`. Category/Collection guard per `SPECS §6.2–6.3`.
4. `productTranslate` / `productBulkTranslate`: persist the field, emit `PRODUCT_UPDATED` per `SPECS §6.2` (bulk dedupe, prefetch), `webhook_events_info`.
5. Tests T-C1…T-C9, T-C13…T-C15 (T-C15 = server column of SPECS §12 T-A1…T-A7). `uv run poe build-schema` (draft).
#### Subagents
- `rosetta:engineer` (long-running, owns the S01 files). `task`/`rosetta:executor` (short-term test/lint runs).
#### Rules (traps)
- `BaseTranslateMutation.validate_input` builds the **base** model from input (F `utils.py:74-79`). The Category/Collection guard must run before it, or Django raises an unexpected-kwarg error instead of `INVALID`.
- Bulk translate copies raw Django `e.code` (`max_length`) into errors (F `utils.py:434-441`). Add an explicit `INVALID` for this field only and leave other fields alone.
- `ProductTranslate.perform_mutation` overrides the base and wraps writes in `traced_atomic_transaction` (F `product_translate.py:36-55`). Events must go through `call_event` so they fire on commit.
- Migration tests run on the pytest test DB (`setup.cfg:18-19`, `-n auto`). Do **not** run `migrate` against the main DB in S01 (that is G2).
#### Done when
- `makemigrations --check --dry-run` is clean. `sqlmigrate product 0211` shows only 2 nullable `ADD COLUMN`.
- Targeted pytest passes. `ruff check` + `ruff format --check` on touched files pass. `mypy` on touched modules passes or shows no new errors.
#### Checklist
- [ ] SPECS §4–§6 implemented, no extra API surface
- [ ] T-C1…T-C9, T-C13…T-C15 green (incl. padded/astral boundaries); existing translation/product mutation tests green
- [ ] graphene-2 omitted-vs-null proven (I-1)
- [ ] Draft `schema.graphql` regenerated, additive only
- [ ] No edits outside S01 ownership; no main-DB migration; no commit
- [ ] HANDOFF S01 section filled (commands + results)

### S02 — Core: webhooks, CSV, final schema, CHANGELOG
Depends on: S01
#### Do
1. Legacy product payload fields + translation keys per `SPECS §7`. Sample/serializer fixtures follow.
2. CSV enum + header mapping per `SPECS §7`.
3. Tests T-C10…T-C12. Final `uv run poe build-schema`. CHANGELOG entries per `SPECS §6.3`.
#### Subagents
- `rosetta:engineer` (long-running, owns S02 files). `rosetta:executor` (short-term test runs).
#### Rules (traps)
- `PRODUCT_FIELDS` feeds both created/updated **and** deleted payloads (F `payloads.py:715-776`). Both must stay consistent.
- The CSV header text is exactly `storage conditions` (lowercase, matches the enum value).
#### Done when
- Targeted pytest on webhook/csv/subscription tests passes. The schema diff vs baseline `bb00425` is only `SPECS §6.1` + descriptions + `webhookEventsInfo` (AC-9).
#### Checklist
- [ ] T-C10…T-C12 green; existing payload/CSV tests green
- [ ] AC-9 diff verified by declaration names
- [ ] CHANGELOG mentions field, INVALID rule, new PRODUCT_UPDATED emission
- [ ] Non-goal grep (AC-12, core part) clean
- [ ] HANDOFF S02 section filled

### S03 — Dashboard: schema/codegen, product form, export
Depends on: G2
#### Do
1. `pnpm run fetch-local-schema` → verify `SPECS §8.1` diff rule → `pnpm run generate`.
2. Fragments (`products.ts`, `translations.ts`) with `@lockSchema(schema: "main")`, then regenerate.
3. One exported `count` helper + `250` constant per `SPECS §5` agreement rule, in an S03-owned `src/products/**` module (name per repo style). S04 imports it read-only.
4. Product form/page/variables/limit UX per `SPECS §8.2`. Export option per `SPECS §8.4`. Product and translation fixtures (incl. with-source / blank-source / orphan-translation variants for S04), react-intl messages in source (no `extract-messages`), changeset.
5. Tests T-D1, T-D2 (all of T-A1…T-A7 against the helper and the form; over-limit → no `productUpdate` call), T-D5, T-D6.
#### Subagents
- `rosetta:engineer` (long-running, owns S03 files). `rosetta:executor` (short-term codegen/jest/type runs).
#### Rules (traps)
- `schema.graphql` is a tracked symlink. After fetch, `git status` must show `schema-main.graphql` modified and **no** typechange on `schema.graphql`.
- `ProductDetailsForm` prop must be optional: its story (not editable) passes `data` without the key (F `ProductDetailsForm.stories.tsx:32`).
- Count = code points of the **trimmed** value (`Array.from(v.trim()).length`). Untrimmed counts disagree with the server for padded input. Native `maxLength` and `.length` count UTF-16 units.
- Do not run `extract-messages`; `locale/defaultMessages.json` belongs to S04.
- `lint:eslint` / `lint:prettier` use `--fix`/`--write` on the whole repo. Run eslint/prettier only on touched files.
#### Done when
- `pnpm run check-types`, targeted `pnpm exec jest src/products src/graphql/lockSchema.test.ts`, eslint on touched files, and `pnpm run lint:changesets` pass. `schema-staging.graphql` and stories are unchanged.
#### Checklist
- [ ] SPECS §8.1, §8.2, §8.4 met; diff by declaration names recorded in HANDOFF
- [ ] Generated files from codegen only; fragments locked to main
- [ ] Tests T-D1, T-D2, T-D5, T-D6 green; T-A1…T-A7 dashboard column green
- [ ] Translation fixtures complete for S04 (S04 will not edit them); `defaultMessages.json` untouched
- [ ] No story/staging edits; no `fetch-schema*`
- [ ] HANDOFF S03 section filled

### S04 — Dashboard: translations UI + progress
Depends on: S03
#### Do
1. Field name, product-only row, visibility, `maxLength` limit, submit/clear per `SPECS §8.3`.
2. Progress (detail + list) counts the field only with a non-blank source (U6).
3. Tests T-D3, T-D4, T-D7 (single-field save: V250 / padded V250 submit; V251A / padded V251A → save disabled, `productTranslate` not called), T-D8 (bulk save: V250 included; V251A → bulk save disabled, no mutation called).
4. `pnpm run extract-messages` once at the end (sole owner of `locale/defaultMessages.json`; captures S03 + S04 strings).
#### Subagents
- `rosetta:engineer` (long-running, owns S04 files). `rosetta:executor` (short-term jest/type runs).
#### Rules (traps)
- Section builders such as `createGeneralNameDescriptionSection` are shared with Category/Collection. Add the field on the product page only.
- Detail progress sums every rendered field (F `progress.ts:62-68`). An orphan row (blank source) is rendered but must not count.
- Do not re-run `fetch-local-schema`/`generate`. Do not edit `src/translations/fixtures.ts`. If a document or fixture change is needed, STOP and report (S03 owns both).
- Use S03's `count` helper. Do not re-implement counting. The limit must gate both the single-field and the bulk submit paths (F `src/translations/bulkSubmit.ts:30-56`).
#### Done when
- `check-types`, `pnpm exec jest src/translations src/graphql/lockSchema.test.ts`, and eslint on touched files pass.
#### Checklist
- [ ] SPECS §8.3 met for product; Category/Collection pages unchanged (T-D3)
- [ ] Progress totals unchanged for entities without source (T-D4)
- [ ] T-D7 + T-D8 green: 250 astral submits, 251 astral (also padded) never submits, single and bulk
- [ ] `defaultMessages.json` regenerated once, contains S03 + S04 strings
- [ ] No story edits; HANDOFF S04 section filled

### S05 — Storefront PDP
Depends on: G2
#### Do
1. Query, merge, view, mapper, component, wiring, messages per `SPECS §9`.
2. Tests T-S1…T-S3 (node vitest env, `.test.ts` only, F `vitest.config` include). No new dependencies.
3. `pnpm run generate:all` against the local API, `pnpm run core:lock`, `pnpm verify`.
#### Subagents
- `rosetta:engineer` (long-running, owns S05 files). `rosetta:executor` (short-term `verify` runs).
#### Rules (traps)
- Paper-core files are hash-locked. Refresh only via `pnpm core:lock`, and only for `contract/product.ts` + `mappers/product.ts` hashes. Any other hash change means a forbidden file was touched.
- Do not touch `/api/revalidate` or `invalidation/**`. Freshness comes from core (U4).
- The `next dev` on :3000 keeps stale codegen until `generate:all` runs. Do not start or stop the user's dev servers without approval.
#### Done when
- `pnpm verify` passes. `git diff --stat` shows only S05-owned files. `data-layer.lock.md` is unchanged.
#### Checklist
- [ ] SPECS §9 met; block after description, expanded, escaped, hidden when blank
- [ ] T-S1…T-S3 green; 8 locale files updated
- [ ] `core:lock:check` + `data:lock:check` green
- [ ] No checkout/cart/order/listing documents touched
- [ ] HANDOFF S05 section filled

### S06 — Integration validation + freshness E2E
Depends on: R2 (both repos). Runs alone.
#### Do
1. Run AC-1…AC-14 evidence collection (re-run each repo's Done-when commands; no code edits).
2. G4: with an approved `PRODUCT_UPDATED` subscription webhook (`product{slug}`) → `http://<storefront>/api/revalidate`, translation-only save → verify PDP + log (AC-13). Visual AC-14 via browser.
3. Update `agents/IMPLEMENTATION.md`, `agents/MEMORY.md` (lessons only), `HANDOFF.md`.
#### Subagents
- `rosetta:validator` (long-running, evidence). `rosetta:reviewer` (short-term, cross-repo contract check: core SDL ↔ dashboard schema ↔ storefront query).
#### Done when
- Every AC has evidence (command output or screenshot path) in HANDOFF. Leftover webhook/app config is removed or left in place per the user's decision.
#### Checklist
- [ ] AC-1…AC-14 evidenced; failures routed back to the owning session
- [ ] Non-goal grep across 3 repos clean
- [ ] Shared-DB writes limited to G2/G4 approvals
- [ ] Docs/memory updated; no commit/push

## Validation commands (per repo; run from the repo root)
- saleor: `uv run python manage.py makemigrations --check --dry-run` · `uv run python manage.py sqlmigrate product 0211` · `uv run pytest <owned test paths>` · `uv run ruff check <files>` · `uv run ruff format --check <files>` · `uv run mypy <modules>` · `uv run poe build-schema` · `git diff --stat`.
- saleor-dashboard: `pnpm run fetch-local-schema` (S03 only) · `pnpm run generate` (S03 only) · `pnpm run check-types` · `pnpm exec jest <paths>` · `pnpm exec eslint <files>` · `pnpm exec prettier --check <files>` · `pnpm run extract-messages` · `pnpm run lint:changesets`.
- react-storefront: `pnpm run generate:all` · `pnpm exec vitest run <files>` · `pnpm run core:lock` · `pnpm verify`.
- Introspection (G2 step 7, no auth needed): one POST to `http://localhost:8000/graphql/` with `{p:__type(name:"Product"){fields{name}} pt:__type(name:"ProductTranslation"){fields{name}} ptc:__type(name:"ProductTranslatableContent"){fields{name}} pi:__type(name:"ProductInput"){inputFields{name}} ti:__type(name:"TranslationInput"){inputFields{name}} pfe:__type(name:"ProductFieldEnum"){enumValues{name}}}`. Pass = `storageConditions` in p, pt, ptc, pi, ti, and `STORAGE_CONDITIONS` in pfe. Record all 6 results.
- If a command cannot run locally (e.g. pytest host/socket allowlist `setup.cfg:19`, DB host reachable only inside the devcontainer), STOP and report. Do not change settings to work around it.

## Shared local DB safeguards
- Forward migration only at G2, only via `### G2 — Local rollout protocol` (local identity + sanitized local-target probe, unapplied-state and SQL checks → exact user confirmation immediately before migrating → post-checks; local Docker dev DB only, non-local/ambiguous targets prohibited). Abort on any ambiguity. It is additive and nullable, so other checkouts running old code keep working.
- Tests use the pytest test databases only (`--ds=saleor.tests.settings`). Never pass flags that target or recreate the main DB.
- No data seeding, product edits for testing, or webhook creation on the shared DB outside G4. Record any shared-DB write (what, when, how to undo) in HANDOFF.

## Rollback order (each step separately approvable)
1. Storefront: revert the S05 files (`git checkout -- <files>`). Re-run `core:lock:check`.
2. Dashboard: revert the S04 then S03 files, including `schema-main.graphql` + generated files from git. Delete the new changeset.
3. Core code: revert S02 then S01 files **except** `migrations/0211_*.py`. Old code is compatible with the extra nullable columns.
4. G-RB HITL (destructive, optional): export feature values if needed, then `migrate product 0210` on the shared DB (needs the `0211` file present), then delete the `0211` file. If not approved, keep `0211` and the columns, and record the state in HANDOFF (a dangling applied migration otherwise blocks future upstream `0211`).
5. Remove any G4 webhook/App created for AC-13.
- Note: this refines arch §6 ("core revert → reverse migration"). The migration file must outlive the core revert.
