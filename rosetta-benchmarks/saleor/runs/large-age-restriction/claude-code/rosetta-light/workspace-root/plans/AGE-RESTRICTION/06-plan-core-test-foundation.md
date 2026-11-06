# 06 — Core test foundation: fixtures, domain unit tests, retention tests (Phase C)
Depends on: 01 only. Parallel with 02–05 (and later 07–10 starters). Spec: `S§13` fixtures paragraph, TC-B-01..12, TC-R-01..05, `S§9.1`, `S§8`.

## Do
1. Shared fixtures (single owner of this module): `restricted_product`, `adult` (born 2000-01-01), `minor` (2012-06-01), `no_bday`, a helper to set `min_age`/`time_zone` on the site settings fixture, frozen-now helper (freezegun, injected `today`). New file `account/tests/fixtures/age_restriction.py` + one import line in `account/tests/fixtures/__init__.py`.
2. `account/tests/test_age_restriction.py`: TC-B-01..07, 09, 12 plus Feb-29 target-year cases and `allow_anonymous`/precedence matrix of R5.
3. `account/tests/test_deletion_retention.py` and `graphql/account/tests/{mutations,bulk_mutations}/test_*retention*.py`: TC-R-01 (`customerDelete`, `customerBulkDelete`, `accountDelete`, each separate), TC-R-02 (`staffDelete`, `staffBulkDelete`), TC-R-03 (queryset `.delete()` and `instance.delete()`).
4. `account/tests/test_migration_0106.py`: TC-R-04 (FK `on_delete is cascade_except_retained_customer_events`; `call_command("sqlmigrate","account","0106")` has no FK DDL); `graphql/account/tests/benchmark/test_*retention*.py`: TC-R-05 (+1 UPDATE per delete batch vs baseline).
5. Publish fixture names + semantics in `06-handoff.md` for 08–10.

## Subagents
- `rosetta-light:engineer` — write tests; long-running.
- `rosetta-light:executor` — run new tests `-n0` and `-n 3` on `DB_s06`; short-term.

## Notes
- New files only; do not touch existing test modules/conftests. Grep `saleor/**/fixtures*` for name clashes first (`customer_user`, `product`, `site_settings` already exist).
- Retention assertions need real deletes, not mocks: check `CustomerEvent` rows after delete with `user_id IS NULL` and `parameters` intact; "other events deleted" = count by type.
- Staff-actor vs subject distinction (TC-R-02): birthday events where the staff member is only the actor stay linked to their customer (`user` = customer).
- Any test calling `customerBulkDelete`/`accountDelete` may enqueue Celery/webhooks: mock only the external plugin/webhook seam, keep DB real.
- freezegun and DataLoader/`timezone.now`: assert with explicit `now`/`today` args where the domain function accepts them; use freezing only for API-level flows.
- TC-B-10 (min age 1/120 accepted) lives in 08, TC-B-08/11 in 09; do not duplicate.
- 06 can run before 02–05 land: it must pass with only 01 in place (no GraphQL birthday fields yet) — use ORM/model-level setup and existing delete mutations.

## Done when
- All listed TCs have a named passing test; run once with `-n0` and once with `-n 3` on `DB_s06`.
- Tests fail if the deletion hook is reverted to plain `CASCADE` (mutation check: temporarily swap in a scratch copy, do not leave edits).

## Checklist
- [ ] STD-ALL  [ ] STD-T
- [ ] TC-B-01..07, 09, 12 · TC-R-01..05 covered by id
- [ ] Fixtures documented for 08–10 in handoff
- [ ] Unit coverage of `account/age_restriction.py` and `account/deletion.py` > 90 % lines (pytest-cov if available, else manual branch list)
- [ ] Edge cases: leap days, DST day, ±14 h zones, 120-year boundary, empty queryset delete
