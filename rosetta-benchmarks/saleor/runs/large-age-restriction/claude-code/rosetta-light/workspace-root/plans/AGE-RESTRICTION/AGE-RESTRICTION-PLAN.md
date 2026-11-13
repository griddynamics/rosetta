# AGE-RESTRICTION — Execution Plan (index)

Status: DRAFT → awaiting G0 · 2026-10-23 · HOW only. WHAT/contracts/TCs live in `AGE-RESTRICTION-SPECS.md` (approved), cited as `S§n`. Sessions: `NN-plan-<slug>.md`. Tracker: `HANDOFF.md`. No `plan.json` (planning skill does not require one).
Paths: `saleor/…` = `/Users/isolomatov/saleor-benchmark/saleor`, same for `saleor-dashboard/`, `react-storefront/`; plans dir = `/Users/isolomatov/saleor-benchmark/plans/AGE-RESTRICTION`. Each repo is its own git repo (clean tree, detached HEAD: core `bb00425`, dashboard `a667b12`, storefront `3d3c3f5`); workspace root has no git.

## 1. Read first (every session)
- `AGE-RESTRICTION-SPECS.md` (own `S§` refs) · this file §2–§6 · `HANDOFF.md` (Deviations, Footprint, Cross-scope requests).
- Core: `saleor/CLAUDE.md`, `saleor/docs/ARCHITECTURE.md` (`## Testing`, `## Quality gates`, `## Agent gotchas`), `saleor/docs/GRAPHQL-ARCHITECTURE.md`.
- Dashboard: `saleor-dashboard/CLAUDE.md`, `docs/ARCHITECTURE.md` (`## Testing`, `## Lint, conventions, CI`, `## Change checklist`), `docs/multi-schema.md`, `src/graphql/lockSchema.ts`.
- Storefront: `react-storefront/CLAUDE.md`, `docs/ARCHITECTURE.md` (`## Testing`, `## Quality gates`, `## Extension points`), `docs/DATA-ARCHITECTURE.md` (`## Locks and guardrails`).
- Workspace: `docs/ARCHITECTURE.md` (`## Local runtime`, `## Cross-repo change rules`).

## 2. Governing rules (authority in parentheses)
1. No commit/push; leave work in working tree (`<repo>/CLAUDE.md`). Plan commits are the user's call at G3.
2. Never read `.env*`, `*.env`, `*.pem`, `*.pid`, `seed.dump` (`README.md` Navigating). Birthday/age values never in logs, test output, fixtures dumped to files, Sentry breadcrumbs (S§2 NFR-7).
3. Spec = authority for WHAT. Only deviations are SC-1..SC-5 (§4); any new one → HANDOFF `Deviations` + stop at next gate (`deviation` skill).
4. File ownership §6 is strict. Needing a file you do not own → append `Cross-scope request` row in HANDOFF; orchestrator schedules it. Never edit "just this once".
5. Core commands always `uv run --no-sync …` (plain `uv run` may rewrite `.venv`/`uv.lock`; `exclude-newer` is relative). `git status --short uv.lock pyproject.toml` must stay empty.
6. DB isolation §5: each core session uses its own `DATABASE_URL` db name; never set `PYTEST_DB_URL` (conftest then runs `flush` on that DB); never touch DBs `saleor`/`test_saleor` except via G-approved env actions.
7. Generated files have one owner each (§6). Never hand-edit generated output; never run codegen outside the owner session.
8. Every DB/process/container/out-of-repo file you create → `HANDOFF.md` Footprint ledger (name, creator, cleanup command). Drops only at G3 with user approval, except self-dropping tests DBs (no `--reuse-db`).
9. HITL: gates G0–G3 (§9) are hard stops. Agents never assume approval (`hitl` skill).
10. Existing tests broken by your change: fix inside your package scope (§6 row "regression tests"); outside scope → Cross-scope request.

## 3. Outcomes recorded
`HANDOFF.md` = master index (status, baseline, deviations, ledger, cross-scope requests, blockers, message-key register, FU-1). Per session: `NN-handoff.md` (≤25 lines: done/evidence/decisions/blockers/next), written by the session at completion, linked from HANDOFF.

## 4. Spec deltas found while planning (need ack at G0; not yet applied to the spec)

| ID | Finding (evidence) | Plan handling |
|---|---|---|
| SC-1 | Dashboard changesets allow `patch` only; `S§12` says minor (`saleor-dashboard/scripts/check-changesets.ts:20`, `lint:changesets` in lint-staged/CI). | S15 writes a `patch` changeset. |
| SC-2 | `S§16 A8` says "no `@lockSchema` gating", but `saleor-dashboard/src/graphql/lockSchema.test.ts` validates every generated document against both `schema-main.graphql` and the untouched `schema-staging.graphql` (core `main` snapshot, lacks new fields). | S12 runs the sweep; if staging validation fails, mark new selections `@lockSchema(schema: "main")` (precedent `src/fragments/attributes.ts:38,55`); UI must tolerate `undefined` on staging builds. Do not hand-edit `schema-staging.graphql`. |
| SC-3 | `S§12/§14` edit `ProductListItem.graphql`/`ProductDetails.graphql` directly. Fork rule: add selections in `src/graphql/extensions/{ProductListItemExtension,ProductDetailsExtension}.graphql` + `mapProductExtensions` (`src/config/storefront-view.ts`), operations in `src/config/data-extensions.ts`; the listing/PDP data path (`src/lib/listing/*`, `src/lib/storefront/contract/*`) is hashed in `paper-core.lock.json` (`docs/DATA-ARCHITECTURE.md:53`). `S§12` file list omits `src/lib/listing/providers/saleor/to-card.ts`, `src/ui/components/plp/product-card-data.ts`. | S16/S18 use the extension points first; if a locked file must change → `pnpm run core:lock` + `paper-version.json` `coreOverrides` entry, logged as deviation. |
| SC-4 | Storefront Vitest is node env, includes only `src/**/*.test.ts` (`vitest.config.ts:7-9`); no jsdom/RTL. `S§13` "renders" tests (TC-V-03..05, PDP CTA) cannot be `.tsx`. | Test pure helpers + `react-dom/server` `renderToStaticMarkup` via `React.createElement` in `.test.ts`. |
| SC-5 | `S§2 NFR-4` (read at check time, never cached) vs `Site.objects.get_current()` process-wide `THREADED_SITE_CACHE` (`saleor/saleor/site/patch_sites.py:19-34`, cleared only at `webhook/payloads.py:524`, `graphql/product/filters/product_helpers.py:146`). Paths with `site_settings=None` (`checkout/complete_checkout.py:806,1118,1408`, `checkout/tasks.py:287`, Stripe webhook `:211`) fall back to that cache. GraphQL paths get a fresh per-request `site` via `get_site_promise` dataloader. | S04: age check obtains `SiteSettings` fresh (1 indexed query) only when restricted lines exist and no request-fresh settings were passed ⇒ NFR-1 (0 extra queries for unrestricted carts) and NFR-4 both hold. |

Also assumed (no ack needed unless rejected): in-repo AI docs (`agents/IMPLEMENTATION.md`, `docs/*`) get a short workstream entry in closeouts; docs.saleor.io edits stay out (`S§17`). CHANGELOG release line per `S§16 A1` stays unverified (S11 confirms against repo conventions, records).

## 5. Environment & commands (verified 2026-10-23 unless marked)
**Stack (read-only observation):** docker: `saleor-benchmark-api` :8000 (image `saleor`, `uvicorn --reload`, bind-mount `…/saleor` → `/app`), `saleor-benchmark-db-1` postgres 15 :5432, cache valkey :6379, mailpit :1025/:8025, `saleor-benchmark-saleor-1` (`sleep infinity`, same mount). Host Node: dashboard Vite :9000, storefront `next dev` :3000. Host: 10 cores, 25 GB, `max_connections=100`.
**Coupling trap:** the API container hot-reloads on ANY `.py` change in the core tree and its DB `saleor` is unmigrated ⇒ after S01 lands, :8000 returns 500s on queries touching new columns until `migrate` is applied; dashboard/storefront dev servers (point at :8000) fail with it. Decision at G0 (§9): **Option A (recommended)** stop `saleor-benchmark-api` before S01, use verification stack (below), restore at G3; **Option B** keep :8000 live, apply migrations to `saleor` right after S01 (G1-approved, additive, reversible via `migrate <app> <prev>`), tolerate reload flaps.
**Postgres creds without secrets:** host shell has no `DATABASE_URL`/`DATABASE_URL_REPLICA`/`PYTEST_DB_URL`/`CACHE_URL` ⇒ `saleor/saleor/settings.py:136-151` defaults apply (user/password/host/port = literal default at `settings.py:139`, identical to the tracked compose `db` service). Role has createdb+superuser. Cache = locmem. Proven: 2 existing tests passed against `test_saleor`; `DATABASE_URL=<default URL with path /saleor_probe>` created `test_saleor_probe` (≈55 s from scratch) and dropped it at exit (footprint of planning: that one create+drop). Do not open `saleor/.devcontainer/*.env`, `saleor/.jwt_key.pem`.
**Per-session DB (parallel safety):** `DB_<sid>` = `DATABASE_URL=<URL from settings.py:139 with db name saleor_<sid>>` ⇒ test DB `test_saleor_<sid>` (xdist adds `_gwN`). Parallel sessions sharing `test_saleor` would corrupt each other (TransactionTestCase flush). One-shot runs: omit `--reuse-db` (DB dropped at exit). Repeated runs: `--reuse-db`, list the DB in the ledger. Existing `test_saleor` is the user's; leave alone. CPU budget: parallel sessions `-n 3` (dirs) / `-n0` (single files); solo sessions (00, 11, 23) `-n 8`.
**Verification stack (owner S07, needs G0-approved env actions E2):** clone of `saleor` into `saleor_agevalid` (`CREATE DATABASE … TEMPLATE saleor` needs zero connections ⇒ API container stopped; else `pg_dump | psql` via `docker exec saleor-benchmark-db-1`), `DATABASE_URL=…/saleor_agevalid uv run --no-sync python manage.py migrate`, API `DATABASE_URL=… uv run --no-sync uvicorn saleor.asgi:application --port 8001` (no `--reload`, stable while tests are being written). Restart after ANY core code change (whoever changes core code restarts it; log in ledger). Test users/tokens for manual checks: create via `manage.py shell` on `saleor_agevalid` with generated passwords kept in the scratchpad only. This stack is what D/E codegen and S23 use. Unverified: first API boot on a cloned DB, storefront traffic guard behaviour on it.

**Core commands** (cwd `saleor/`; `<DB>` = `DB_<sid>` env prefix):

| Purpose | Command |
|---|---|
| tests | `<DB> uv run --no-sync pytest <path> -n0 --reuse-db -p no:cacheprovider` (dir: `-n 3`); poe `test` = `pytest --reuse-db` (`pyproject.toml:181`); `setup.cfg [tool:pytest]` forces `--ds=saleor.tests.settings`, sockets off |
| full suite (CI parity `tests-and-linters.yml:87`) | `<DB> uv run --no-sync pytest -m "not e2e" -n 8 -p no:cacheprovider` |
| query counts | add `--django-db-bench=<scratch>/x.json` (option verified); compare `uv run --no-sync django-queries diff base.json after.json` (CLI verified; CI diffs counts; `count_queries` fixture, `S§13 TC-P-*`) |
| lint | `uv run --no-sync ruff check <paths>` · `uv run --no-sync ruff format --check <paths>` (verified) |
| types | `uv run --no-sync mypy --cache-dir=/dev/null <changed non-test .py>` (verified ≈14 s / small set; tests excluded by config) |
| migrations | `uv run --no-sync python manage.py makemigrations --check --dry-run` · `… sqlmigrate <app> <NNNN>` (reads default DB only) |
| schema | S07 only: `uv run --no-sync poe build-schema` (stdout-capture to `saleor/graphql/schema.graphql`; a failure leaves it truncated → `git diff --stat`, restore `git checkout -- saleor/graphql/schema.graphql`); gate = `uv run --no-sync python manage.py get_graphql_schema \| diff saleor/graphql/schema.graphql -` empty (baseline verified in sync) |
| deps | `uv run --no-sync deptry .` (binary 0.23.1 present, invocation unverified) · `uv.lock`/`pyproject.toml` untouched |
| semgrep / pre-commit | `semgrep` not installed; `pre-commit run` fetches hooks from GitHub ⇒ not used. Manual review against `.semgrep/` rules (no exception objects in logger `extra`, no raw `requests`, celery logger naming, data-migration queue, `AddIndexConcurrently`) |
| CI-only (not locally runnable) | GraphQL Inspector (`graphql-inspector.yml`), changelog enforcer, migrations-compat (`PYTEST_DB_URL` job — only on a dedicated throwaway DB if S23 does it), e2e |

**Dashboard commands** (cwd `saleor-dashboard/`; Node 24, pnpm 11; verified: Jest single file 2 s):
`pnpm run test:quiet <path>` · `pnpm test` (Jest + lint-rule tests) · `pnpm run check-types` (tsc + tsc-strict) · `pnpm exec eslint <changed files>` (no fix) · `pnpm run format:check` · `pnpm exec prettier --write <changed files>` · `pnpm run knip` · `pnpm run lint:changesets` · S12 only: `API_URL=http://localhost:8001/graphql/ pnpm run fetch-local-schema` (writes through `schema.graphql` symlink into `schema-main.graphql`) then `pnpm run generate` · S15 only: `pnpm run extract-messages`. **Do not run** `pnpm run lint:eslint` (`--fix` repo-wide) or `lint:prettier` (`--write .`) unless followed by `git status` and reverting out-of-scope changes. E2E/Storybook/Chromatic not run (`e2e/` needs disposable Docker Saleor).

**Storefront commands** (cwd `react-storefront/`; verified: Vitest single file 1 s): inline env, no `.env.local` exists: `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/` (required by codegen/ESLint/typecheck, `.graphqlrc.ts:25-33`; baseline S00 uses :8000). `pnpm exec vitest run <path>` · `pnpm run test:run` · `pnpm exec tsc --noEmit` (parallel sessions) — **`pnpm run typecheck` triggers `pretypecheck` = `generate:all` ⇒ races on `src/gql`**; use it only in S00/S16/S20/S23 · `pnpm exec eslint <changed files>` · S16: `pnpm run generate:all`, `pnpm run data:lock`, `pnpm run core:lock` · S20/S23: `pnpm run verify` (docs:check + tokens + variants + locks + typecheck + lint + tests). Playwright e2e not run (needs build + live demo data).

## 6. File ownership (non-overlapping; "new" = created by that session only)

| Session | Owns (create/edit) | Regression-test dirs it may edit (existing files only) |
|---|---|---|
| 01 | core: `account/{models.py,__init__.py,deletion.py(new),age_restriction.py(new)}`, `account/migrations/0106_*(new)`, `product/models.py`, `product/migrations/0211_*(new)`, `site/models.py`, `site/migrations/0053_*(new)`, `checkout/error_codes.py`, `order/error_codes.py`, `payment/error_codes.py`, `graphql/core/descriptions.py` | `account/tests`, `site/tests` |
| 02 | core: `account/events.py`, `graphql/account/{types.py,dataloaders.py}`, `graphql/account/mutations/{base.py,account/account_register.py,account/account_update.py,staff/customer_create.py,staff/customer_update.py}`, `graphql/account/bulk_mutations/customer_bulk_update.py` | `graphql/account/tests` |
| 03 | core: `graphql/product/types/products.py`, `graphql/product/mutations/product/product_create.py`, `graphql/product/bulk_mutations/product_bulk_create.py`, `graphql/shop/{types.py,mutations/shop_settings_update.py}` | `graphql/product/tests`, `graphql/shop/tests`, `product/tests`, `site/tests` |
| 04 | core: `checkout/complete_checkout.py`, `graphql/checkout/mutations/{checkout_lines_add,checkout_lines_update,checkout_create,checkout_create_from_order,checkout_complete,order_create_from_checkout}.py` (+ their shared `utils`) | `graphql/checkout/tests`, `checkout/tests` |
| 05 | core: `graphql/payment/mutations/transaction/{transaction_initialize,transaction_process}.py` (+ one shared helper file in that dir, new or existing `utils`), `graphql/order/mutations/{order_lines_create,draft_order_create,draft_order_complete}.py` | `graphql/payment/tests`, `graphql/order/tests`, `order/tests`, `payment/tests` |
| 06 | core tests (new files only): `account/tests/fixtures/{age_restriction.py,__init__.py(one import line)}`, `account/tests/{test_age_restriction.py,test_deletion_retention.py,test_migration_0106.py}`, `graphql/account/tests/{mutations,bulk_mutations,benchmark}/test_*retention*.py` | — |
| 07 | core: `graphql/schema.graphql`; verification stack lifecycle (env) | — |
| 08 | core tests (new): `graphql/account/tests/{mutations,queries,benchmark}/test_*birthday*.py`, `graphql/product/tests/**/test_*age_restricted*.py`, `graphql/shop/tests/**/test_*age_restriction*.py` | — |
| 09 | core tests (new): `graphql/checkout/tests/**/test_*age_restriction*.py`, `graphql/payment/tests/**/test_*age_restriction*.py`, `graphql/order/tests/**/test_*age_restriction*.py`, `checkout/tests/test_*age_restriction*.py`, `payment/gateways/stripe/tests/test_*age_restriction*.py` | — |
| 10 | core tests (new): `graphql/account/tests/queries/test_birthday_privacy*.py`, `graphql/account/tests/mutations/test_birthday_write_permissions*.py`, `graphql/webhook/tests/test_*birthday_privacy*.py`, `webhook/tests/test_*birthday_privacy*.py`, `graphql/product/tests/queries/test_*visibility*.py`, `csv/tests/test_*birthday*.py` | — |
| 11 | core: `CHANGELOG.md`, `agents/IMPLEMENTATION.md`, in-repo `docs/*` touch-ups; whole-repo gate runs | any test file, only to fix collateral regressions, logged |
| 12 | dashboard: `schema-main.graphql`, `src/graphql/**/*.generated.ts`, `src/fragments/{products,shop,customers,auth}.ts`, `src/siteSettings/mutations.ts`, `src/customers/mutations.ts` | — |
| 13 | dashboard: `src/products/**` (not fragments), `src/siteSettings/{components,views}/**` | same dirs' tests |
| 14 | dashboard: `src/customers/{components,views}/**`, `src/utils/errors/order.ts`(+test) | same dirs' tests |
| 15 | dashboard: `locale/defaultMessages.json`, `.changeset/*.md(new)`, `agents/IMPLEMENTATION.md`, `docs/*` touch-ups | — |
| 16 | storefront: `src/graphql/**` (all `.graphql` incl. extensions, `ShopAgeRestriction.graphql` new), `src/config/{data-extensions,storefront-view}.ts`, generated `src/gql/`, `src/checkout/graphql/generated/`, `data-layer.lock.md`, `paper-core.lock.json`/`paper-version.json` (if SC-3 fallback) | — |
| 17 | storefront: `src/app/actions.ts`, `src/app/(checkout)/actions.ts`, `src/ui/components/pdp/{variant-section-dynamic,add-to-cart,sticky-bar}.tsx`, `src/ui/components/plp/quick-add-overlay.tsx`, `src/checkout/lib/payment/{format-checkout-complete-error,gateway-messages}.ts`, `src/checkout/components/contact/sign-in-form.tsx` | same dirs' `.test.ts` |
| 18 | storefront: `src/ui/components/age-restriction-badge.tsx(new)`, `plp/{product-card-link,product-card-with-quick-add,product-card-data}.tsx/ts`, `search-results.tsx`, PDP header/badge host (not the three PDP files of S17), `src/lib/listing/providers/saleor/to-card.ts` (only if SC-3 fallback) | same dirs' `.test.ts` |
| 19 | storefront: `src/ui/components/{sign-up-form.tsx,account/{settings-page,edit-birthday-form}.tsx}`, `src/app/api/auth/register/route.ts`, `src/app/(storefront)/[locale]/[channel]/(main)/account/actions.ts` | same dirs' `.test.ts` |
| 20 | storefront: `messages/en.json`, `agents/IMPLEMENTATION.md`, `docs/*` touch-ups | — |
| 21–23 | read-only on product code; write only reports/HANDOFF | — |

Latent collisions resolved: `schema.graphql` (S07 only; CI `gql-schema-check` is expected red between S01 and S07) · test fixtures `__init__` (S06 only) · error enums + `ADDED_IN_324` (S01 only, consumed read-only by B) · `account/events.py` (S02 only; S06 tests use model-level deletes) · both codegens (S12/S16 only) · `messages/en.json` and `locale/defaultMessages.json` (S20/S15 only; S17–19/S13–14 register keys in HANDOFF) · `plp/product-card-with-quick-add.tsx` (S18; S17 touches quick-add behaviour only via `quick-add-overlay.tsx`/actions, else Cross-scope request) · `CHANGELOG.md` (S11 only).

## 7. Phases (unlisted pairs are sequential; parallelism is valid only because the sessions share no files, no generated output, no DB)

**Phase 0 — acceptance baseline**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 00 | Preflight baseline (3 repo baselines) | G0 | its 3 repo parts run concurrently; core part must finish before 01 edits core |

**Phase A — core foundation (A)** · 01 runs ALONE, then gate G1

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 01 | Core foundation: models, migrations, domain module, error codes, deletion hook | 00 | none |

**Phase B — core GraphQL + enforcement + permissions + audit (B)**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 02 | Core account API + audit | 01, G1 | 03, 04, 05, 06 |
| 03 | Core catalog + shop API | 01, G1 | 02, 04, 05, 06 |
| 04 | Core enforcement: checkout side (#1–#9) | 01, G1 | 02, 03, 05, 06 |
| 05 | Core enforcement: transactions + staff orders (#10–#14) | 01, G1 | 02, 03, 04, 06 |

**Phase C — core tests, schema regen, CHANGELOG (C)**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 06 | Test foundation + domain/retention tests | 01 | 02, 03, 04, 05 |
| 07 | Schema contract + verification stack (alone w.r.t. `schema.graphql` and shared env), then gate G2 | 02, 03, 04, 05 | 06, 08, 09, 10 |
| 08 | Core API tests (account/product/shop, audit changes, TC-P-02) | 02, 03, 06 | 07, 09, 10, 12–20 |
| 09 | Core enforcement tests (+TC-P-01) | 04, 05, 06 | 07, 08, 10, 12–20 |
| 10 | Core security/leak/visibility tests | 02, 03, 06 | 07, 08, 09, 12–20 |
| 11 | Core closeout: CHANGELOG, full suite, lint/type/schema/migration gates (ALONE in core) | 07, 08, 09, 10 | 12–20 (other repos) |

**Phase D — dashboard (D)**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 12 | Dashboard contract: schema, documents, codegen, staging sweep | 07, G2 | 16, 08–11 |
| 13 | Dashboard product toggle + shop settings UI | 12 | 14, 17, 18, 19 |
| 14 | Dashboard customer age card + errors | 12 | 13, 17, 18, 19 |
| 15 | Dashboard closeout: messages, changeset, gates | 13, 14 | 11, 20 |

**Phase E — storefront (E)**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 16 | Storefront contract: documents, codegen, locks | 07, G2 | 12, 08–11 |
| 17 | Storefront cart/checkout/PDP add flows | 16 | 18, 19, 13, 14 |
| 18 | Storefront age label (catalog) | 16 | 17, 19, 13, 14 |
| 19 | Storefront sign-up + account birthday | 16 | 17, 18, 13, 14 |
| 20 | Storefront closeout: messages, locks, verify | 17, 18, 19 | 15, 11 |

**Phase F — review and validation (F)**

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 21 | Independent review: core (reviewer) | 11 | 22 |
| 22 | Independent review: dashboard + storefront (reviewer) | 15, 20 | 21 |
| — | Remediation loop: reopen the owning engineer session per finding (owner by §6); a schema-visible change goes back to G2 | 21, 22 | — |
| 23 | Validation: suites, lint, types, manual GraphQL on the verification stack (validator, ALONE), then gate G3 | 21, 22, remediation | none |

Genuinely parallel: 02 ∥ 03 ∥ 04 ∥ 05 ∥ 06 (disjoint source dirs, new-files-only tests, no codegen); 08 ∥ 09 ∥ 10 (new test files only, own test DBs); core tests ∥ D ∥ E (separate repos; clients consume only the frozen schema from 07); 13 ∥ 14 and 17 ∥ 18 ∥ 19 (disjoint dirs; generated output and message catalogs deferred to single owners). Serial by necessity: 01 (everything imports it), 07 (single `schema.graphql`, shared stack), 11 / 15 / 20 (repo-wide gates and single-owner catalogs), 23 (shared stack, final tree).

## 8. Session shape
Each file: `# NN — Title`, `Depends on`, `## Do`, `## Subagents` (name, role, long|short), `## Notes` (project traps only), `## Done when`, `## Checklist`. Do not restate spec; cite `S§`.
**STD-ALL** (every session): [ ] Ownership §6 respected, cross-scope requests logged [ ] No commit/push, no secrets read, no PII in output [ ] `NN-handoff.md` written, HANDOFF row + ledger + deviations updated [ ] Work protocol adhered (gates, DB isolation) [ ] Documents updated where the session owns them.
**STD-C** (core code sessions): [ ] Implemented per cited `S§` [ ] `ruff check` + `ruff format --check` clean on changed files [ ] `mypy` clean on changed non-test files [ ] `makemigrations --check --dry-run` clean [ ] Affected existing suites green on own `DB_<sid>` [ ] `graphql/schema.graphql` untouched (except 07) [ ] No birthday/age/min-age in messages, params, logs [ ] No new use of `Site.objects.get_current()` for age settings (SC-5).
**STD-T** (test sessions): [ ] Given/when/then, one file per operation (`GRAPHQL-ARCHITECTURE.md` `## API test helpers`) [ ] Each TC id in the session scope has a named test (TC id in test name/docstring) [ ] Mocks only for external systems, not for the domain module [ ] Passes with `-n0` and `-n 3` [ ] No dependence on wall clock (freezegun) or test order.
**STD-D / STD-E** (client sessions): [ ] Changed-file `tsc`/ESLint/Prettier clean [ ] Tests added per `S§13` scope, pass [ ] `git status` shows no changes outside ownership (esp. after lint fixers) [ ] No birthday in logs/analytics/URLs/shared caches.

## 9. HITL gates (stop; report; wait for explicit user answer)

| Gate | When | User decides |
|---|---|---|
| G0 | before 00 | Approve this plan; ack SC-1..SC-5; choose Option A/B (§5); approve env actions: **E1** stop `saleor-benchmark-api` (A only), **E2** create `saleor_agevalid` clone + migrate + start :8001 (S07), **E3** per-session test DBs `test_saleor_s<NN>[_gwN]` on the dev Postgres. |
| G1 | after 01 | Review migration SQL (`sqlmigrate` output) + deletion hook design (RK-1, `S§9.1`); Option B only: approve `migrate` on dev DB `saleor`. Cheap stop: 02–06 all depend on this foundation. |
| G2 | after 07 | Contract freeze: review schema diff summary vs `S§6` (additive only, `Added in Saleor 3.24.`). After G2 any schema-visible change reopens 07 + 12 + 16. |
| G3 | after 23 | Final delivery: review/validation reports, deviations, residual risks, **FU-1 legal review still open** (non-code, merchant/legal, before release), env restore (Option A: apply migrations to `saleor`, `docker start saleor-benchmark-api`, restart dev servers) and footprint cleanup list (DROP `saleor_agevalid`, `test_saleor_s*`), and whether to commit (agents never do). |

## 10. Risks (spec risks RK-1..4, S-1..E-1 stay in `S§11/§16`)

| ID | Risk | Control | Session |
|---|---|---|---|
| PR-1 | Hot-reload + unmigrated DB breaks :8000/:9000/:3000 mid-work | Option A/B decision, edits keep tree importable | G0, 01 |
| PR-2 | Parallel pytest on one DB corrupts runs; `PYTEST_DB_URL` flushes target DB | per-session `DATABASE_URL`; rule 6 | all core |
| PR-3 | Stale process cache for min age/time zone (SC-5) | fresh read when restricted lines exist; test with mutated settings between calls | 04, 09 |
| PR-4 | `RK-1` custom `on_delete` relies on non-public Django API | read `django/db/models/deletion.py` in `.venv`; TC-R-04 guard | 01, 06 |
| PR-5 | `poe build-schema` truncates file on failure; enum additions in 01 drift schema until 07 | check + restore; 07 owns | 07 |
| PR-6 | Dashboard staging sweep fails (SC-2); `fetch-local-schema` printer/patch skew pollutes `schema-main.graphql` | declaration-name diff vs HEAD limited to `S§6`; escalate otherwise | 12 |
| PR-7 | Storefront core-lock drift / race on `src/gql` via `pretypecheck` | extension points (SC-3); single codegen owner | 16–20 |
| PR-8 | Fixers rewrite out-of-scope files (`lint:eslint`, `lint:prettier`) | forbidden/ git status check | D/E |
| PR-9 | Birthday leaks via client tooling (Sentry/analytics/URL/`new Date()` TZ shift) | date kept as `YYYY-MM-DD` string; review checklist | 14, 19, 22 |
| PR-10 | semgrep/Inspector/e2e not locally runnable | manual rule review; CI-only list §5 | 11, 21 |
| PR-11 | Full-suite runtime/flakes unknown (est. 20–40 min, unverified) | S00 baseline = pre-existing failure list; compare in 11, 23 | 00 |
| PR-12 | Shared fixture names collide with existing fixtures | S06 greps `saleor/**/fixtures` before naming | 06 |

## 11. Blockers / open (none block planning)
- **B-1 (needs user, G0):** Option A vs B (§5), ack SC-1..SC-5, env actions E1–E3.
- Not locally runnable: semgrep, pre-commit hooks, GraphQL Inspector, e2e/Chromatic/Storybook-Chromium (§5). Everything else verified runnable (core pytest, ruff, mypy, schema build; dashboard Jest; storefront Vitest).
- Unverified until used: full-suite runtime and failures (S00), `deptry` invocation, verification stack boot on a cloned DB, storefront `generate:all`/`verify` against :8001 (needs required channel env if `verify` demands it — S00 records), `lockSchema` sweep outcome (S12).
- FU-1 (legal review ToS/Privacy, `S§17`) is non-code, owned by merchant/legal; tracked in HANDOFF, surfaced at G3, release-blocking per spec.
- Assumption (needs no answer unless rejected): subagents `rosetta-light:engineer` implement, `executor` run long commands, `reviewer` 21/22, `validator` 23.
