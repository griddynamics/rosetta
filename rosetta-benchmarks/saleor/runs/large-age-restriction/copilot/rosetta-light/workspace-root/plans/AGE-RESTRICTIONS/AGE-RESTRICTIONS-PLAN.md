# AGE-RESTRICTIONS — Plan (DRAFT · HOW · session index + sessions)

Status: rev 5 (review findings 1–5 resolved; D1c/INV-1; OQ-1 resolved; G1 approved; D6c birthday-clearing contract 2026-11-05). Nothing implemented. Next: S1.
Specs (WHAT): `AGE-RESTRICTIONS-SPECS.md` (cited as `SPECS §n`). Rationale/evidence: `architecture-notes.md`. Handoff: `HANDOFF.md`. Flow state: `agents/TEMP/AGE-RESTRICTIONS/coding-flow-state.md`.
Deviation: sessions are inlined here (scope permits only 5 artifacts; planning skill default is `NN-plan-*.md` files).

## TOC
1. Read-first · 2. Governing rules · 3. Records · 4. File ownership · 5. Gates & roles · 6. Phase tables · 7. Sessions · 8. Traceability · 9. Integrity check

## 1. Read-first
`docs/CONTEXT.md`, `docs/ARCHITECTURE.md` (esp. `:44-53`, `:74-79`); per repo `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`; `saleor/docs/GRAPHQL-ARCHITECTURE.md`; `react-storefront/docs/{DATA,CHECKOUT}-ARCHITECTURE.md`; `saleor-dashboard/docs/multi-schema.md`; SPECS; architecture-notes.

## 2. Governing rules (one line each → authority)
- Specs D1–D10, D1c and R1–R10 (G1-approved; R4 revised by OQ-1) are contract → SPECS §1.2, §10.
- Public `Shop.minimumAge` is display-only (labels `18+`); no client may authorize, hide, or disable purchase from it; `Shop.timeZone` MANAGE_SETTINGS-only → SPECS §4, §8, §10.
- D6c (user-approved): birthday omission = no change; clear only via explicit `clearBirthday: true`; explicit `null`, date + clear, null flag, empty `customerBirthdayUpdate` rejected → SPECS §4 write matrix, §6, §7 T8–T13.
- INV-1 (D1c, user-approved): the flag gates purchase only; restricted products stay visible in every catalogue surface (cards, PDP, cart, checkout) with an age label; no session may use the flag in any query, filter, `where`, visibility, availability, listing provider, or UI hiding → SPECS §1.2 D1c.
- Model change ⇒ migration; API change ⇒ `uv run poe build-schema`; never hand-edit `schema.graphql` → `saleor/docs/ARCHITECTURE.md:61-70`.
- Writer guard raises in tests; audit writes inside read resolvers need `allow_writer()` → `saleor/docs/ARCHITECTURE.md:25-28`.
- Fire webhooks via `call_event`, never inside transaction → `saleor/docs/ARCHITECTURE.md:64`.
- Dashboard: codegen, extract-messages, changeset, strict TS for new files → `saleor-dashboard/docs/ARCHITECTURE.md:126-146`.
- Storefront: kernel only via `src/lib/saleor`; keep `data:lock`/`core:lock` green; codegen needs live API → `react-storefront/docs/ARCHITECTURE.md:79-102`.
- Sensitive data: no real birthdays/emails in fixtures, logs, handoffs; placeholders `test.user-1@example.com` → skill `sensitive-data`.
- No commit/push in any repo (repo `CLAUDE.md`).

## 3. Records
- Per-session outcome/evidence → `HANDOFF.md` (section per session). Flow phase status → `coding-flow-state.md`.
- Decisions changing SPECS → edit SPECS + note in HANDOFF "Decisions"; re-run G1 if any D# would change.
- Repo change logs → `<repo>/agents/IMPLEMENTATION.md`; workspace → `agents/IMPLEMENTATION.md` (V1 only).

## 4. File ownership (prevents collisions)
| Owner | Owns (exclusive) |
|---|---|
| S1 | `saleor/saleor/{product,site,account}/models.py`, their `migrations/`, `account/__init__.py`, `account/events.py`, policy module (R1), all `*/error_codes.py`, `saleor/saleor/graphql/{product,shop,account}/**` (non-test), `saleor/saleor/graphql/schema.graphql`, `saleor/CHANGELOG.md`, `saleor/docs/**` |
| S2 | `saleor/saleor/checkout/complete_checkout.py`, `saleor/saleor/graphql/order/utils.py`, `saleor/saleor/graphql/order/mutations/{draft_order_complete,order_lines_create}.py`, `saleor/saleor/graphql/payment/mutations/**` initialize mutations (R6) |
| S3 | `saleor-dashboard/**` (non-test) |
| S4 | `react-storefront/**` (non-test) |
| T1 / T2 / T3 | tests in `saleor/**/tests/**` / `saleor-dashboard/src/**/*.test.ts(x)` / `react-storefront/**/*.test.ts` |
| V1 | `agents/IMPLEMENTATION.md`, root `docs/**` |
Resolved latent collisions: error enums + `schema.graphql` + `CHANGELOG.md` assigned to S1 only (S2 consumes, never regenerates schema); `graphql/order/**` split S2 vs S1 by file; tests isolated in T-sessions.

## 5. Gates & roles
| Gate | When | Approver | Pass condition |
|---|---|---|---|
| G0 | done | user | "Yes, I reviewed the design" (decisions D1–D10) |
| G1 | done 2026-11-05 | user | "Approve, the design and specs were reviewed" — accepted as G1 per user's explicit approval instruction; covers R1–R10 (R4 revised), D1c, OQ-1 |
| G2 | before first local migrate / API restart / `fetch-local-schema` | user | explicit OK for local DB schema change + overwrite of dashboard `schema-main.graphql` pin |
| G3 | after V1 | user | final coverage acceptance (requirements-use) |
Roles: `engineer` = S*, T*; `reviewer` = phase 2 (artifacts), phase 5 (code), phase 7 (tests), must be subagents; `validator` = V1; `executor` = builds/tests/codegen runs.

## 6. Phase tables
Phase 4 — implementation
| # | Session | Depends on | Parallel with |
|---|---|---|---|
| S1 | Core foundation | G1 | — (runs alone) |
| S2 | Core enforcement | S1 | S3, S4 |
| S3 | Dashboard | S1, G2 | S2, S4 |
| S4 | Storefront | S1, G2 | S2, S3 |
Phase 5 review_code (reviewer) after S1–S4. Phase 6 — tests
| # | Session | Depends on | Parallel with |
|---|---|---|---|
| T1 | Core tests | S1, S2, phase 5 | T2, T3 |
| T2 | Dashboard tests | S3, phase 5 | T1, T3 |
| T3 | Storefront tests | S4, phase 5 | T1, T2 |
Phase 7 review_tests → Phase 8 V1 validation (alone) → G3.
Unlisted pairs are sequential. Parallelism is valid only because the paired sessions own disjoint files (§4) and S2 makes no schema change; if S2 needs one, STOP and route to S1 owner.

## 7. Sessions

### S1 — Core foundation
Depends on: G1
## Do
1. Fields + migrations per SPECS §5 (`db_default` precedent `site/models.py:77`).
2. Policy module per SPECS §3 signatures (R1 location).
3. Shop settings read/write + validation per SPECS §4, §6 (`minimumAge` public read, `timeZone` MANAGE_SETTINGS read).
4. `Product.ageRestricted` + `ProductInput.ageRestricted` per SPECS §4.
5. Birthday: `User.birthday` resolver gate, `AccountInput.birthday` + `clearBirthday`, `customerBirthdayUpdate(birthday, clearBirthday)`, audit events per SPECS §4–§5 (write matrix D6c).
6. Error enums `AGE_RESTRICTED` (checkout, order, R6 payment enums) per SPECS §4.
7. `build-schema`; changelog entry; brief `saleor/docs` update.
## Subagents
engineer (long-running) · executor (short: makemigrations --check, build-schema, mypy/ruff).
## Rules (traps)
- `AccountUpdate` also accepts apps with IMPERSONATE_USER (`account_update.py:74-77`, `mixins.py:28-56`) → birthday must reject App requestor.
- D6c: graphene input must distinguish absent key vs explicit `null` (mechanism = discovery); never treat `birthday: null` as clear; validate matrix before any save so rejected input changes no `AccountInput` field and writes no audit.
- Do NOT add birthday to `CustomerInput`/`UserCreateInput` (`graphql/account/mutations/base.py:216,247`), the user search document (`account/search.py:17`), or `generate_customer_payload` fields (`webhook/payloads.py:602-618`).
- `AccountUpdate.save` emits `customer_updated` only for tracked fields (`ACCOUNT_UPDATE_FIELDS`, `account/mutations/account/utils.py:19-24`; `account_update.py:103-135`) — discovery: whether birthday change should emit it (payload stays birthday-free either way); record decision in HANDOFF.
- `ProductBulkCreateInput` inherits `ProductInput` (`product_bulk_create.py:117`) — accepted, keep.
- INV-1: do not add `ageRestricted` to product filter/`where`/sort inputs, channel-listing visibility, `isAvailableForPurchase`, or any catalogue queryset.
- Staff-actor audit pattern = actor in `user`, subject in `parameters.account_id` (`account/events.py:11-30`) ⇒ superuser birthday rows surface on the superuser's `User.events`, not the customer's timeline (SPECS §5); do not add cross-listing.
- Superuser read audit inside resolver ⇒ writer access via `allow_writer()`.
- Discovery items SPECS §10 (ADDED_IN constant, enum names, CharField length) — find, do not invent.
## Done when
Migrations generated + `makemigrations --check` clean; schema regenerated and contains SPECS §4 elements only; build/mypy/ruff pass.
## Checklist
[ ] Implemented SPECS §3 policy, §4, §5, §6 rows owned by S1 · [ ] No birthday in payloads/CSV/search/logs · [ ] Requirement IDs in code comments · [ ] Schema additive only · [ ] Docs + CHANGELOG updated · [ ] Work protocol adhered · [ ] Security checked

### S2 — Core enforcement
Depends on: S1
## Do
1. Guards at every path in SPECS §3 "Guard points" with listed buyer + `buyer_required`.
2. Checkout guard before any payment processing / order creation.
3. `orderBulkCreate` untouched (D5).
## Subagents
engineer (long-running) · executor (short: lint/mypy).
## Rules (traps)
- `complete_checkout(user=…)` / `create_order_from_checkout(user=…)` are the requestor; buyer = `CheckoutInfo.user` (`checkout/fetch.py:119`).
- `complete_checkout` also runs from `automatic_checkout_completion_task` (`checkout/tasks.py:213,287`) and Stripe webhook (`payment/gateways/stripe/webhooks.py:211`) — guard must live in shared code, not mutations.
- Reuse loaded `CheckoutLineInfo.product`; CI diffs query counts.
- No schema/model/enum edits (S1 owns).
- INV-1: guards only raise at purchase funnels; never remove lines, block `checkoutLinesAdd`, or change availability/visibility.
## Done when
Every SPECS §3 guard row reachable and raising SPECS §6 error; build/lint pass.
## Checklist
[ ] Implemented · [ ] No bypass for staff/app/superuser · [ ] Draft w/o user allowed · [ ] No extra queries on unrestricted path · [ ] Requirement IDs in comments · [ ] Security checked

### S3 — Dashboard
Depends on: S1, G2
## Do
1. Refresh schema from local API; regenerate types.
2. `ProductUpdatePage` only: `ageRestricted` control (D8). Do not touch `CreateProductDialog` (name + type only); no initial-create control; ignore unrendered `components/ProductCreatePage/` (architecture-notes §1 Dashboard).
3. Site settings: `minimumAge`, `timeZone` controls + error mapping (D2, D8).
4. Messages extracted; patch changeset.
## Subagents
engineer (long-running) · executor (short: fetch-local-schema, generate, check-types, lint, extract-messages).
## Rules (traps)
- `fetch-local-schema` overwrites stable pin `schema-main.graphql` (symlinked `schema.graphql`) — G2; diff by declaration names (`agents/MEMORY.md` "Compare schemas…").
- No birthday UI anywhere (D8). New files strict TS. react-hook-form preferred for new forms.
## Done when
check-types, lint, format:check pass; generated files consistent; UI shows both controls gated by MANAGE_PRODUCTS / MANAGE_SETTINGS.
## Checklist
[ ] Implemented · [ ] Messages extracted · [ ] Changeset · [ ] knip clean · [ ] Manually checked in local dashboard · [ ] Docs updated

### S4 — Storefront
Depends on: S1, G2
## Do
1. Regenerate against local API.
2. Optional `ageRestricted` → `ProductView` (+ card, cart line, checkout line view models); label on card, PDP, cart, checkout (D9).
3. Account settings birthday form via `AccountUpdate`; read via `CurrentUserProfile` only (R10); future date rejected client-side + server error shown; "remove birthday" uses `clearBirthday: true` (D6c).
4. `AGE_RESTRICTED` mapping per SPECS §6 (guest → sign-in CTA; authenticated → generic guidance + account-settings link).
5. Labels/messages for enabled locales.
## Subagents
engineer (long-running) · executor (short: generate:all, verify).
## Rules (traps)
- UI must not import `@/gql`/kernel; templates pure; storefront must not import `@/checkout/*` (`react-storefront/docs/ARCHITECTURE.md:23-33`).
- Checkout/cart documents and actions must not select or fetch `birthday`; error branch uses session state only.
- No `STOREFRONT_CONTRACT_VERSION` bump: field is additive optional (`src/lib/storefront/contract/version.ts:4-8`). `data:lock`/`core:lock` impact = discovery.
- Never display buyer age or birthday outside account settings; threshold appears only in the `"{minimumAge}+"` label (never in the `AGE_RESTRICTED` message); no birthday in analytics/URLs.
- D6c: existing profile/name `AccountUpdate` calls must omit `birthday`/`clearBirthday` keys; birthday form never sends `birthday: null` (use `clearBirthday: true`).
- `Shop.minimumAge` is display-only: never branch purchase, visibility, or add-to-cart on it; do not query `Shop.timeZone`. Fetch path/cache tier for `minimumAge` = discovery (kernel registry, `data:lock`).
- INV-1: listing providers, PLP filters, search, cards, PDP buy box, cart and checkout must keep restricted products visible + labelled; do not derive `isAvailable` or hide/disable add-to-cart from the flag.
## Done when
`pnpm verify` passes with local API; all four label surfaces + form + error guidance visible manually.
## Checklist
[ ] Implemented · [ ] Locks green · [ ] No PII in analytics/logs · [ ] Manually checked guest/no-birthday/underage/eligible · [ ] Docs updated

### T1 / T2 / T3 — Tests (per repo, SPECS §7)
T1 core: all core suites + boundary table T1–T7 + write matrix T8–T13 + INV-1 visibility suite + benchmarks · T2 dashboard Jest · T3 storefront Vitest (incl. INV-1 pass-through, D6c payload shapes).
Rules: frozen time for date tests; placeholder PII only; no network (core VCR replay-only).
Done when: suites in SPECS §7 exist and pass locally (`uv run poe test …`, `pnpm run test:quiet`, `pnpm test:run`/`verify`); each test names its D#/R#.
Checklist: [ ] Happy/edge/error/security cases · [ ] Isolated, idempotent · [ ] Coverage of new code ≥ 85% · [ ] Requirement IDs mapped

### V1 — Final validation (alone)
Do: end-to-end manual QA on local stack (Dashboard flag/settings → SF label; INV-1: as guest, restricted product visible + labelled on PLP/search card, PDP, cart, checkout; guest/no-birthday/underage/eligible purchase; draft with/without customer; app `orderCreateFromCheckout`; superuser read audit (row on superuser's events, value-free); D6c: name-only profile save keeps birthday, "remove birthday" clears with one `operation=clear` audit). Update `agents/IMPLEMENTATION.md`.
Done when: validator report attached to HANDOFF; all suites green; G3 requested.

## 8. Traceability (ID → session → tests)
D1→S1,S3,S4→T1,T2,T3 · D1c/INV-1→S1,S2,S4,V1→T1,T3 · D2→S1,S3→T1,T2 · D3→S1→T1 · D4→S2,S4→T1,T3 · D5→S2→T1 · D6/D10→S1,S4→T1,T3 · D6c→S1,S4→T1,T3 · D7→S1→T1 · D8→S3→T2 · D9→S1,S4→T1,T3 · R1–R5,R8,R9→S1 · R6,R7→S2 · R10→S4.

## 9. Integrity check
- [x] No spec content duplicated; sessions cite SPECS sections.
- [x] Every D# mapped to ≥1 session and test session.
- [x] INV-1 (D1c) in governing rules, S1/S2/S4 traps, T1/T3, V1.
- [x] D6c in governing rules, S1/S4 Do + traps, T1/T3, V1.
- [x] Parallel pairs own disjoint files; S1 and V1 run alone.
- [x] Gates G1–G3 explicit (G1 done); side-effecting steps behind G2.
