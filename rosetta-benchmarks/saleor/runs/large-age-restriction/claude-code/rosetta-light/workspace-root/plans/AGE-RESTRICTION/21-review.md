# 21 — Independent static review: core (age restriction)

Scope: core `saleor` working tree (`git status` / `git diff`, read-only; no history changes, no source edits).
Authority: `AGE-RESTRICTION-SPECS.md` (approved). Handoffs and HANDOFF.md were treated as untrusted; accepted deviations (S05-D1, S09b-D1, S11-D1, S02-I1, S03-D1) were checked as written.
Method: lead reviewer read the domain module, deletion hook and three migrations directly; four read-only slice reviewers covered enforcement and bypass, privacy and permissions, migrations/retention/time/perf, and schema/error codes/tests. Key claims were re-checked by the lead (listed as "lead-verified").
CI-only checks (pytest, semgrep, linters, query-count baselines, Inspector) were NOT run and are residual, not passed.

## Summary

| Severity | Count |
|---|---|
| Blocker | 0 |
| Major | 4 |
| Minor | 15 |
| Nit | 8 |

No completion-path bypass was found. Every checkout, transaction and order sink that creates an order is guarded (see S5 below). The open risks are at line time (a UX guard), in the scope of order creation paths the spec does not list, and in the strength of the performance and TC tests.

## Major

### M-1 Line-time guard pairs variants with input rows by index (lead-verified mechanism)
- File: `saleor/saleor/graphql/checkout/mutations/checkout_lines_add.py:181-185` (`zip(variants, checkout_lines_data)`), guard at `:204-223`.
- Update path: `saleor/saleor/graphql/checkout/mutations/checkout_lines_update.py:256-274` builds `variants` via `get_nodes_or_error` over a `set` of global ids, so the output order is not the input order (`graphql/utils/__init__.py:144` sorts by `pks.index`, but `pks` is set-ordered). `checkout_lines_data` stays in input order. The zip therefore pairs a restricted variant with another line's quantity.
- Effect: a mixed request (for example a qty-0 line plus a restricted line) can add a restricted line without the S5 #1/#2 guard. Completion (#5/#6) still rejects, so no order is created.
- Spec ref: S5 #1, #2; TC-E-01/02/03; T-2 (completion is authority).
- Note: the same zip also feeds the pre-existing availability and publish checks, so this predates the feature.
- Fix: key validation by variant id, not by position. Add a two-variant regression test with both input orders.
- Owner: 04. Confidence: high on mechanism, medium on live exploit (not run).

### M-2 `orderBulkCreate` creates orders with restricted lines and no age check
- File: `saleor/saleor/graphql/order/bulk_mutations/order_bulk_create.py` (no `is_age_restricted` reference).
- Spec ref: S5 covers draft/order paths #12-#14 and does not list `orderBulkCreate`. This is an unrecorded scope decision on an order-creation path.
- Fix: decide scope with the user (HITL). Either add the completion-style check (customer from order user or email, `allow_anonymous` per D4) or record acceptance in the spec.
- Owner: 05 (implementation), 11 (spec note). Confidence: medium.

### M-3 TC-P-01 benchmark tests assert no query count
- File: `saleor/saleor/graphql/checkout/tests/benchmark/test_checkout_age_restriction_query_counts.py:18-50` (lead-verified: both tests request `count_queries` and assert only `not ...["errors"]`).
- Spec ref: NFR-1, TC-P-01 ("query counts unchanged").
- Effect: the zero-extra-query claim is not guarded by any test. `count_queries` only writes to a file.
- Fix: add `CaptureQueriesContext` assertions against a recorded baseline, and a `checkoutLinesAdd` case.
- Owner: 09. Confidence: high.

### M-4 TC-P-02 `isAgeEligible` probably exceeds the +2 query budget
- Files: `saleor/saleor/graphql/account/types.py:846-856`, `saleor/saleor/graphql/site/dataloaders.py:15-20` (`SiteByIdLoader`, `Site.objects.in_bulk`), `saleor/saleor/site/models.py:44` (lazy `settings` OneToOne), test `saleor/saleor/graphql/account/tests/benchmark/test_customers_birthday_query_count.py:72` (`<= baseline + 2`).
- Static count: site (1) + settings (1) + audit INSERT (1) = +3 unless `customers` already loads the site.
- Spec ref: NFR-2, TC-P-02.
- Fix: load settings in one query (`select_related("settings")` in the loader, or a SiteSettings loader), then rerun the benchmark.
- Owner: 02. Confidence: medium (static count; benchmark not executed).

## Minor

### m-1 Gift lines skip the line-time guard
- Files: `saleor/saleor/discount/utils/promotion.py:455-470`, `saleor/saleor/graphql/checkout/mutations/utils.py:612`, `checkout_create.py:567`, `checkout_create_from_order.py:501`.
- A restricted gift line is created without the S5 guard. Completion still blocks it (`complete_checkout.py:1649`, `transaction/utils.py:115`).
- Spec silent. Decision needed: exclude restricted gift listings, or guard gift creation, and record the decision.
- Owner: 04. Confidence: high.

### m-2 Draft completion and draft line add check outside a lock
- Files: `saleor/saleor/graphql/order/mutations/draft_order_complete.py:177-186`, `order_lines_create.py:206-219`.
- The check reads lines and customer before `traced_atomic_transaction()`; there is no `select_for_update`. A concurrent `orderLinesCreate` or `draftOrderUpdate` could slip past.
- Spec ref: S5 #12, #13 (placement matches the spec; locking does not).
- Fix: lock the order row and re-validate inside the transaction.
- Owner: 05. Confidence: medium.

### m-3 `accountRegister` birthday accepted only from anonymous requests
- File: `saleor/saleor/graphql/account/mutations/account/account_register.py:156-159`.
- Spec S7 lists owner-with-accountRegister as allowed; the HANDOFF marks this interpretation as open (S02-I1). Authenticated registration with a birthday returns PERMISSION_DENIED.
- Decision needed: confirm anonymous-only, and add the spec row.
- Owner: 02 (plus user decision). Confidence: high on behaviour, spec ambiguity.

### m-4 `deletion.py` comment is wrong about `lazy_sub_objs` (lead-verified)
- File: `saleor/saleor/account/deletion.py:56-57`. Says the marker is set "as for built-in SET_NULL/CASCADE".
- Django 5.2.18 sets `lazy_sub_objs` on `SET`/`SET_NULL` only (`django/db/models/deletion.py:63,73`); `CASCADE` does not carry it. The hook's own marker is correct and is honoured (`deletion.py:343`).
- Fix: correct the comment.
- Owner: 01. Confidence: high.

### m-5 `deletion.py` RK citations and pin wording
- File: `saleor/saleor/account/deletion.py:10-15`. The upgrade re-verify item is RK-1, not RK-4. "Pinned (5.2.18)" is the uv.lock pin only; `pyproject.toml` allows any 5.2.x. The RK-4 raw-SQL fallback note is missing (the FK is `DEFERRABLE INITIALLY DEFERRED` with no `ON DELETE`, so a raw delete fails at COMMIT).
- Fix: correct citations, add the RK-4 note.
- Owner: 01. Confidence: high.

### m-6 Naive `now` treated as system-local time
- File: `saleor/saleor/account/age_restriction.py:54-55` (`get_shop_today`). `astimezone` on a naive datetime assumes system-local time. No guard, no test.
- Spec ref: R1, NFR-8.
- Fix: reject naive datetimes, or treat them as UTC explicitly, with a test.
- Owner: 01. Confidence: medium (per Python docs, not executed).

### m-7 TC-B-06 (Pago_Pago, UTC-11) checked only at date level
- Files: `saleor/saleor/account/tests/test_age_restriction.py:79-83` (date) vs `:198-202` (eligibility covers Kiritimati and UTC only).
- Fix: add the Pago_Pago `UNDERAGE` row at eligibility level.
- Owner: 08. Confidence: high.

### m-8 `test_actor_delete_keeps_customer_birthday_events_linked_to_customer` does not test what its name says
- File: `saleor/saleor/account/tests/test_deletion_retention.py:97-120`. It would also pass under plain CASCADE. The staff-as-subject case is covered only at GraphQL level (`graphql/account/tests/mutations/test_staff_delete_retention.py:61-63`).
- Fix: rename, or note as a non-regression guard.
- Owner: 09. Confidence: high.

### m-9 TC-SEC-03 flag value not asserted
- File: `saleor/saleor/graphql/account/tests/queries/test_birthday_privacy.py:247,250,255` (`isinstance(..., bool)` only).
- Fix: assert True for the adult and False for the minor.
- Owner: 10. Confidence: high.

### m-10 Existence-only outcome checks in enforcement tests
- Files: `saleor/saleor/graphql/checkout/tests/mutations/test_checkout_complete_age_restriction.py:214` (TC-H-02), `test_order_create_from_checkout_age_restriction.py:170`, `saleor/saleor/graphql/order/tests/mutations/test_order_age_restriction.py:156`, `saleor/saleor/graphql/payment/tests/mutations/test_transaction_age_restriction.py:184`. They assert `payload["order"] is not None` without a DB check.
- Fix: add `Order.objects.filter(checkout_token=...).exists()`, as the neighbouring tests already do.
- Owner: 09. Confidence: high.

### m-11 Time-dependent fixture not frozen
- File: `saleor/saleor/graphql/order/tests/mutations/test_order_age_restriction.py:50-52` (`_years_ago_birthday` reads `timezone.now()`). Stable in practice on day-1 birthdays; not deterministic.
- Fix: freezegun or an injected date.
- Owner: 09. Confidence: medium.

### m-12 Spec TC rows missing for tests that exist
- Spec §13 has no row for TC-B-10 and TC-B-11, though spec lines 332 and 336 reference them. Tests exist (`test_shop_settings_update_accepts_minimum_age_bounds`, `test_minor_update_quantity_zero_removes_restricted_line`).
- Fix: add the rows to the spec, so traceability is complete.
- Owner: 11. Confidence: high.

### m-13 `complete_checkout.py` diff noise and ownership
- File: `saleor/saleor/checkout/complete_checkout.py:1623-1718`. The atomic body of `create_order_from_checkout` is re-indented into a new outer `try` (S11-D1), which makes the diff hard to review. The file belongs to session 04 (plan §6), and session 11 edited it on the user's instruction (S11-D1, accepted).
- Fix: move the voucher release into a helper or the existing except branches to shrink the diff. Record the ownership change in HANDOFF.
- Owner: 04 (11 for the record). Confidence: high.

### m-14 Process-wide Site cache not cleared by `shopSettingsUpdate` (latent)
- Files: `saleor/saleor/site/patch_sites.py:19-34` (`THREADED_SITE_CACHE`, `prefetch_related("settings")`), `saleor/saleor/graphql/shop/mutations/shop_settings_update.py:340` (`instance.save()`, no `Site.objects.clear_cache()`).
- Lead-verified: the age paths do not use this cache. `checkoutLinesAdd`/`checkoutComplete` read `get_site_promise(...).get().settings` (`graphql/site/dataloaders.py:35-45`), which is fresh per request, and the fallback reads `SiteSettings.objects.get` (`complete_checkout.py:1753`). NFR-4 holds for the age paths.
- Latent: `Site.objects.get_current().settings` consumers elsewhere (`complete_checkout.py:808,1120,1410,1946`, `order/tasks.py:178`) can see stale settings. This predates the feature for all SiteSettings fields.
- Fix: call `Site.objects.clear_cache()` after the save (precedent `webhook/payloads.py:524`), plus a regression test.
- Owner: 03. Confidence: high on mechanism, low on age impact.

### m-15 Accepted risk: `productUpdate{isAgeRestricted:null}` un-restricts silently
- Accepted as S03-D1. A partial update that sends an explicit null resets the flag to false, which reduces restriction without a separate MANAGE_PRODUCTS action beyond the write itself. Recorded for awareness; no change requested.
- Owner: 03. Confidence: high.

### m-16 Pre-existing app crash on `CustomerEvent.user` (outside the diff, not lead-verified)
- Reported by the privacy slice: `saleor/saleor/graphql/account/types.py:277-283` uses `info.context.user.has_perm`, which fails for app contexts (lazy wrapper around None, `graphql/context.py:86`). Not an age-restriction leak. Out of scope for this feature; flagged for awareness.
- Owner: 02 (separate ticket). Confidence: medium (read only, not run).

## Nit

- N-1 `isAgeEligible` always audits, while `birthday` skips the audit when null (`graphql/account/types.py:839-855` vs `:830`). Defensible, since "no birthday" is revealed by the returned False. Document or align. Owner 02.
- N-2 Duplicate "not eligible" message literal: `graphql/checkout/mutations/order_create_from_checkout.py:283` and `graphql/order/mutations/draft_order_create.py:58`. Reuse one constant. Owner 05.
- N-3 Duplicate `order_lines` filter comprehension in `graphql/checkout/mutations/checkout_create_from_order.py` (~326-337). Owner 04.
- N-4 `isAgeEligible` description in `graphql/account/types.py` (~566) omits "apps never", per S6. Owner 07.
- N-5 TC-SEC-09 is absent from the spec (numbering gap; no test references it). Owner 11.
- N-6 No semgrep rule for birthday in logger or error params (`.semgrep/` has none). Spec only requires code review and TC-E-06, so optional. Owner 10.
- N-7 Stale bytecode `saleor/saleor/graphql/account/tests/benchmark/__pycache__/test_tmp_s08_bench_probe.cpython-312-pytest-8.4.2.pyc` (source gone). Gitignored; harmless. Owner 11.
- N-8 `shop_settings_update.py:282` calls `zoneinfo.available_timezones()` on every write (filesystem scan). Write path only. Owner 03.
- N-9 `draftOrderCreate` user lookup uses `is_active=True` (`draft_order_create.py:289`), while `resolve_order_customer` does not filter on it, mirroring `update_user_fields`. Confirm the intended behaviour against spec A6. Owner 05. Confidence: low.

## Spec traceability

### S5 enforcement rows (lead summary of slice A, file:line in the Major and Minor items above)
- #1 checkoutLinesAdd: guard at `checkout_lines_add.py:199`, customer `checkout.user`. Subject to M-1.
- #2 checkoutLinesUpdate: guard inherited through `clean_input`. Qty-0 removal allowed (TC-E-03). Subject to M-1.
- #3 checkoutCreate: `checkout_create.py:304-310`, `info.context.user`, correct codes.
- #4 checkoutCreateFromOrder: restricted lines excluded (`checkout_create_from_order.py:222-248`), codes LR/BR/UA.
- #5 checkoutComplete transaction flow: guard `complete_checkout.py:1649`, after `assign_checkout_user`, inside the `select_for_update` atomic block; evaluates the stored `checkout.user` (`:1754`, R6).
- #6 legacy flow: guard `complete_checkout.py:1934`, before `complete_checkout_pre_payment_part` (`:1947`) and `_process_payment` (`:1980`).
- #7 orderCreateFromCheckout: `order_create_from_checkout.py:277-285`, LR/NE mapping.
- #8 auto-completion task: `checkout/tasks.py:287-311`, generic logged message.
- #9 Stripe legacy webhook: `payment/gateways/stripe/webhooks.py:211-218`, `user=checkout.user`.
- #10 transactionInitialize: `transaction_initialize.py:178-179`, before `cancel_active_payments` (`:200`).
- #11 transactionProcess: `transaction_process.py:196-197`, before `cancel_active_payments` (`:214`).
- #12 orderLinesCreate: `order_lines_create.py:206-210`, `allow_anonymous=True` for no-customer drafts. Subject to m-2.
- #13 draftOrderComplete: `draft_order_complete.py:177-185`, before status change and `update_user_fields`. Subject to m-2.
- #14 draftOrderCreate: `draft_order_create.py:399-403`, cleaned user, NE.
- Bypass hunt: all completion routes go through `complete_checkout` (callers `checkout_complete.py:364`, `tasks.py:287`, `webhooks.py:211`). Order creation happens only in `_create_order_from_checkout` (`complete_checkout.py:1479`) and `_create_order` (`:815`), both behind the guard. Out-of-scope or accepted: M-2, m-1, `orderLineUpdate`, `orderConfirm`, draft user change (A6/D4), staff reassignment of a draft to a non-account email (D4, staff only).

### S7 permission matrix and S6 gates (slice B, lead-spot-checked)
- Owner, superuser, MANAGE_USERS, other staff, app, anonymous rows match S7.
- One `User` type gate covers every route; app requestors resolve through `get_user_or_app_from_context` and get null.
- Write gates use key presence; PermissionDenied is raised before validation; `birthday` is in `CustomerInput` only, not `UserInput`, so staff inputs are unchanged.
- `Product.isAgeRestricted` write is covered by existing MANAGE_PRODUCTS on create, update and bulk create.

### S9 audit (slice B)
- Change events are emitted once per mutation and only when the value changes; read events are deduplicated per request by the DataLoader and batched into one `bulk_create` under `allow_writer()` (`graphql/account/dataloaders.py:134-150`, `account/events.py:138-152`).

### S8 migrations (slice C, lead-spot-checked)
- `makemigrations --check`: no changes detected.
- `sqlmigrate account 0106`: `ADD COLUMN birthday date NULL`, no-op AlterFields, no FK DDL.
- `sqlmigrate site 0053`: `smallint DEFAULT 18 NOT NULL`, `varchar(64) DEFAULT 'UTC' NOT NULL`.
- `sqlmigrate product 0211`: `boolean DEFAULT false NOT NULL`.
- `db_default` matches `default` for all three; no RunPython; leaves 0105→0106, 0210→0211, 0052→0053 are unique.

### S9.1 retention and RK (slice C)
- Hook covers `instance.delete()` and `QuerySet.delete()` through Django's collector. Retained events keep `parameters`, get `user_id NULL`; other events are deleted as before.
- TC-R-01..05 are mapped to tests (see below). R-01..03 would fail under plain CASCADE.

### S10 error messages and S6 schema (slice D)
- `git diff` of `saleor/saleor/graphql/schema.graphql`: 124 insertions, 0 deletions. Reported by the schema slice: regenerated schema via `get_graphql_schema` is byte-identical to the committed file (regen output in the scratchpad). Not re-run by the lead.
- Every S6 field present with correct nullability; `ADDED_IN_324` on 15 descriptions.
- Messages match S10 verbatim; none echo birthday, age or minimum age.

### STRIDE status (S11)

| ID | Status | Evidence |
|---|---|---|
| S-1 | accepted residual | D5 self-declared, CHANGELOG/docs |
| S-2 | covered | stored `checkout.user` (R6); TC-H-03, TC-E-11 |
| S-3 | covered | app impersonation denied; TC-SEC-06 |
| T-1 | covered | PermissionDenied on CustomerInput.birthday; TC-SEC-05 |
| T-2 | covered | completion authority; TC-E-05 (see M-1 for the line-time gap) |
| T-3 | covered | drift tests; TC-B-08 |
| T-4 | accepted | IANA validation only |
| R-1 | covered | BIRTHDAY_CHANGED/READ with actor id |
| R-2 | covered | retention hook; TC-R-01..05 |
| R-3 | covered (guard) | TC-R-04 identity check; RK-1 note; m-5 wording |
| I-1 | covered | single gate; TC-SEC-01..08 |
| I-2 | accepted (OQ-4) | staff/app codes collapse to NOT_ELIGIBLE |
| I-3 | accepted (OQ-5) | every flag read audited |
| I-4 | covered | generic messages, params = variant ids; TC-E-06 |
| I-5 | residual, legal | RK-2 / FU-1c pending legal review |
| D-1 | not verified | TC-P-02 (see M-4) |
| E-1 | covered | date gated on is_superuser; TC-SEC-04 |

### TC coverage (S13, core)
- Covered by named tests: B-01, 02, 03, 04, 05, 08, 09, 12; H-01..08; V-01, V-02; E-01..11; R-01..05; SEC-01..08, 10, 11; P-01 and P-02 exist but do not assert counts (M-3, M-4).
- Gaps or weak: TC-B-06 eligibility level (m-7); TC-SEC-03 flag value (m-9); TC-H-02 existence (m-10).
- Out of scope in this repo: V-03..05 and dashboard/storefront Jest rows (verified in the other repos, not reviewed here).

## Accepted deviations: how the review treats them
- S05-D1 (no `variants` on transaction errors, #10/#11): accepted; not a finding.
- S09b-D1 (legacy-flow refund on age failure): accepted; behaviour checked, not a finding. Note the transaction-flow voucher release was fixed by S11-D1 (accepted, see m-13 for ownership).
- S11-D1: accepted; ownership deviation logged at m-13.
- S02-I1: open; see m-3.
- S03-D1: accepted; see m-15.
- S11-O1 (InsufficientStock/GiftCardNotApplicable release gap): open parent decision, outside the age scope; not re-reviewed here.

## Residual, CI-only, not passed
- pytest (all new and modified suites), query-count baselines (NFR-1/2/3, TC-P-01/02), freezegun/DST determinism.
- Linters (ruff, mypy, pre-commit), semgrep, GraphQL Inspector (breaking-change label), migrations-compat.
- Live PostgreSQL catalog inspection (the FK form is from `sqlmigrate` of migration 0051); PG 15 lock behaviour of ADD COLUMN.
- Concurrency windows (m-2, `select_for_update` race in S5 #5).
- Storefront and dashboard TCs (other repos).

## Owner routing (plan §6)
- 01 foundation: m-4, m-5, m-6.
- 02 account API: M-4, m-3, m-16, N-1.
- 03 catalog-shop API: m-14, m-15, N-8.
- 04 enforce-checkout: M-1, m-1, m-13, N-3.
- 05 enforce-payment-order: M-2, m-2, N-2, N-9.
- 06 test-foundation: none.
- 07 schema-contract: N-4.
- 08 tests-api: m-7.
- 09 tests-enforcement: M-3, m-8, m-10, m-11.
- 10 tests-security: m-9, N-6.
- 11 closeout: m-12, N-5, N-7.

Any finding that changes the GraphQL schema reopens G2 (PLAN §9). None of the findings above requires a schema change, so G2 is not reopened.

## Remediation status (21r, 2026-10-23)

Per-finding status after the core remediation (`21r-handoff.md` has the evidence). "fixed" = code or spec changed and covered by a test. "documented" = a scope decision recorded in the spec and CHANGELOG. "skipped" = not changed, with the reason. "accepted" = accepted in its own deviation record.

| ID | Status | Note |
|---|---|---|
| M-1 | fixed | validation keyed by variant id (`checkout_lines_add.py` `clean_input`); 4 new tests in `test_checkout_age_restriction_lines.py`, 3 failed before the fix |
| M-2 | documented | exempt by orchestrator decision: spec §5 bullet, CHANGELOG 3.24.0 note, test `test_order_bulk_create_age_restricted_line_imported_without_age_check` |
| M-3 | fixed | TC-P-01 asserts exact counts (guest complete 200, customer complete 213, lines add 83 / 86) |
| M-4 | fixed (claim corrected) | measured 5 → 6 (+1 audit INSERT). The review's +3 estimate was wrong: the baseline already loads site and settings. No optimisation needed; budget test kept and documented |
| m-1 | skipped | spec silent; needs a product decision (exclude restricted gift listings vs guard gift creation). Completion still blocks (`complete_checkout.py:1649`, `transaction/utils.py:115`). Open for decision |
| m-2 | skipped (open) | a correct fix needs `select_for_update` in both `orderLinesCreate` and `draftOrderComplete` with a shared lock order, which changes staff-mutation concurrency. Not cheap; open for decision |
| m-3 | documented | spec S7 owner row, A14 and CHANGELOG record anonymous-only register; `test_account_register_birthday_denied_for_authenticated_requestor` already covers it |
| m-4 | fixed | `deletion.py` `lazy_sub_objs` comment corrected (Django sets the marker on `SET`/`SET_NULL` only) |
| m-5 | fixed | `deletion.py` docstring: RK-1 re-verify item, lock-file vs pyproject pin wording, RK-4 raw-SQL note |
| m-6 | fixed | `get_shop_today` raises `ValueError` on naive `now`; test `test_shop_today_rejects_naive_datetime` |
| m-7 | fixed | TC-B-06 Pago_Pago row added at eligibility level |
| m-8 | fixed | renamed to `test_staff_actor_delete_does_not_touch_customer_birthday_events`, docstring marks it a non-regression guard |
| m-9 | fixed | TC-SEC-03 asserts `True` for the adult in all three places; new minor test asserts `False` |
| m-10 | fixed | DB existence checks added in the four enforcement tests |
| m-11 | fixed | order tests use the fixed `ADULT_BIRTHDAY` fixture instead of a clock-based helper (freezing time at 12:00 made fixtures unavailable, see 09 handoff) |
| m-12 | fixed | spec §13 rows TC-B-10 and TC-B-11 added |
| m-13 | skipped | diff noise only; behaviour is correct and the completion path should not be restructured in a remediation. Ownership change recorded in HANDOFF (S11-D1) |
| m-14 | fixed | `Site.objects.clear_cache()` after `shopSettingsUpdate` save; test `test_shop_settings_update_refreshes_process_site_cache` (fails without the line) |
| m-15 | accepted | S03-D1; no change requested |
| m-16 | fixed | `CustomerEvent.user` resolves the requestor first and returns PermissionDenied for apps; test `test_customer_event_user_for_app_is_permission_denied` |
| N-1 | documented | spec §9: `isAgeEligible` audited when birthday is null, by design |
| N-2 | fixed | single `NOT_ELIGIBLE_MESSAGE` in `account/age_restriction.py`, used by both mutations |
| N-3 | skipped | not a duplicate: each handler narrows `variant_ids_set`, so each following filter is needed; consolidating would refactor unrelated code |
| N-4 | skipped | fixing the `isAgeEligible` description changes `schema.graphql`; remediation avoids schema changes (reopens G2 and the client locks). Open for a later schema pass |
| N-5 | skipped | TC-SEC-09 was never defined in the spec and no reference cites it; renumbering would churn cited IDs |
| N-6 | skipped | optional per spec; semgrep is not runnable locally and an untested rule was not written |
| N-7 | fixed | stale `test_tmp_s08_bench_probe` bytecode removed (source gone) |
| N-8 | fixed | `_available_time_zones()` cached with `functools.cache` |
| N-9 | documented | pre-existing `is_active=True` in `draftOrderCreate`; spec A6 records the verification; no code change |
