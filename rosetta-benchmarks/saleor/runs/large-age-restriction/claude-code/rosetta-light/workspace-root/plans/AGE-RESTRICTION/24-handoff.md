# 24 — Closeout handoff (2026-10-23)

**Done**
- A: `saleor/payment/gateways/dummy_credit_card/tests/test_dummy_credit_card.py:29-30` autouse fixture now `monkeypatch.setattr(DeprecatedDummyCreditCardGatewayPlugin, "DEFAULT_ACTIVE", True)` (added `monkeypatch` arg; 2 lines). Restores automatically. ruff check and format pass.
- B: `saleor/core/tests/test_http_client.py` disallows-private-ranges test now pins `requests_hardened.ip_filter.allowed_gai_family` to `socket.AF_INET` via monkeypatch (test-local; cassette records IPv4). ruff pass. No product code touched.
- C: uvicorn :8001 pid 14123 stopped (verified: pid file, cmdline, LISTEN socket). Dropped 34 DBs by exact name: `saleor_agevalid`; `test_saleor_s02`, `s03`, `s08`, `s09`, `s09b`, `s21r` (each +`_gw0..2`); `test_saleor_s11` (+`_gw0..7`). `test_saleor_s04` absent, nothing dropped. Deleted `<scratchpad>/s07/validation-credentials.json`, `<scratchpad>/s23/head-src/`, and 5 sourceless `saleor/**/__pycache__/test_tmp_*.pyc` (s04, s08, s11).

**Evidence**
- Leaker+victim, one process, `-n0`, DB `saleor_s24`: `test_dummy_credit_card.py` + `test_query_available_payment_gateways` + `..._specified_currency_USD` → 63 passed.
- `pytest saleor/graphql/shop saleor/payment/gateways/dummy_credit_card -n 3` → 254 passed (log `<scratchpad>/s24-shop-dcc-n3.log`).
- `saleor/core/tests/test_http_client.py` alone → 3 passed. The flake was not reproducible on demand (IPv6 DNS), so the fix is verified only for green, not for the original failure.
- Remaining DBs after cleanup (pg_database): `postgres`, `saleor`, `template0`, `template1`, `test_saleor`.

**Decisions**
- Test DB used `saleor_s24` via explicit `DATABASE_URL` (default URL pattern); never `PYTEST_DB_URL`; `saleor` and `test_saleor` not touched. No credential values read or printed.
- B applied as a test-local pin because the test already depends on a recorded cassette; no product code change.

**Blockers / open**
- None for A/B/C. FU-1 legal review still open (release-blocking, non-code). G3 commit decision still open.
- Unexplained drift: `git status` entries changed since 23 (dashboard 62 → 60, storefront 85 → 84); this session did not touch those repos.
- Ledger drift `test_saleor_s04` (absent) carried; no action.
- Not run this closeout: full `-m "not e2e" -n 8` suite (last full run 23: 18495 passed, 2 env-failed, now addressed by B).

**Restore dev stack (user to run; not run by agent)**
1. Migrate dev DB (Option A): `cd /Users/isolomatov/saleor-benchmark/saleor && env | grep -c DATABASE_URL` (expect 0), then `.venv/bin/python manage.py migrate`.
2. Start API container: `docker start saleor-benchmark-api`.
3. Dev servers :3000 (pid 79409) and :9000 (pid 79387) were left running untouched.

**Confirm git status (no commits made)**
- `cd /Users/isolomatov/saleor-benchmark/saleor && git status --porcelain | awk '{print substr($0,1,2)}' | sort | uniq -c` → expect 49 `M`, 45 `??`, HEAD `bb00425`.
- `cd /Users/isolomatov/saleor-benchmark/saleor-dashboard && …` → expect 51 `M`, 9 `??`, HEAD `a667b12`.
- `cd /Users/isolomatov/saleor-benchmark/react-storefront && …` → expect 53 `M`, 31 `??`, HEAD `3d3c3f5`.
