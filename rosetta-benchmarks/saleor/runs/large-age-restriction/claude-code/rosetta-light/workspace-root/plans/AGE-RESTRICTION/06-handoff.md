# 06 — Core test foundation · handoff (2026-10-23)

**Done:** shared fixtures (`account/tests/fixtures/age_restriction.py`, one import line in `fixtures/__init__.py`); domain unit tests (TC-B-01..07, 09, 12, Feb 29, 120-year, R5/R7/R9 matrix); model-level retention (TC-R-03) with edge cases; TC-R-04 guard; API retention tests TC-R-01 (`customerDelete`, `accountDelete`, `customerBulkDelete`), TC-R-02 (`staffDelete`, `staffBulkDelete`); TC-R-05 benchmark. 11 new files, no source edits.

**Evidence** (`DATABASE_URL=…/saleor_s06`, self-dropping test DBs, no `PYTEST_DB_URL`):
- Re-run after CSR-01 (orchestrator added `lazy_sub_objs`, xfail removed): `-n0` 75 passed; `-n 3` 75 passed. No xfail left.
- Coverage: `account/age_restriction.py` 100% lines (67/67), `account/deletion.py` 100% (7/7).
- Mutation check (scratch plugin in scratchpad, in memory): swapping `CustomerEvent.user` `on_delete` to CASCADE fails 12 tests, including the TC-R-04 guard and all 3 TC-R-05 tests.
- TC-R-05: exact delta baseline+1 with one events UPDATE and no extra SELECT. The net count is +1, the baseline has no events UPDATE, so the added statement is the UPDATE. The earlier SQL diff showed the SELECT was the only other change.
- ruff check and format clean on the 11 files and `deletion.py`. mypy clean on `deletion.py` (non-test file; CSR-01 edit by orchestrator).

**Fixtures for 08–10** (global via root `conftest.py`; birthdays are module constants, never printed):
- `restricted_product`: `product` with `is_age_restricted=True`, saved.
- `adult` / `minor` / `no_bday`: customers with fixed birthdays (`ADULT_BIRTHDAY`, `MINOR_BIRTHDAY`) or none.
- `set_age_settings(site_settings, minimum_age=18, time_zone="UTC")`: helper, sets and saves.
- `frozen_now` / `SHOP_NOW` = 2026-10-23T12:00Z. Domain calls take explicit `now`/`today`. API flows use `@freeze_time("2026-10-23 12:00:00")`.

**Decisions:**
- Domain tests use unsaved `User`/`Product`/`ProductVariant` instances, no mocks.
- `validate_birthday` and the default-`now` paths use freezegun, because their signatures take no `now`.
- Benchmark baseline is measured in-test by monkeypatching `on_delete` to CASCADE. No hard-coded counts.
- Benchmark helper passes `check_no_permissions=False`, since the second run in one test already holds the permission.

**Blockers / cross-scope:**
- CSR-01 closed by orchestrator (`lazy_sub_objs` marker in `account/deletion.py`; strict xfail removed). Verified above.
- Transient: session 02's `account_register.py` import error blocked all pytest startup for about 6 min. It cleared on its own; no edits by 06.

**Footprint:** no DBs left (`test_saleor_s06*` verified absent). Scratch dir `<scratchpad>/s06/` (mutation plugin, debug dumps) kept; remove at G3 if wanted.

**Next:** 07 after 02–05 (schema). 08–10 consume the fixtures above.
