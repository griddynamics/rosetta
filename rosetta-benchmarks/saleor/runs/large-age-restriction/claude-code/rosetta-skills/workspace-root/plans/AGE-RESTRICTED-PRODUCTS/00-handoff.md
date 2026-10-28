# 00 handoff — baseline, env (DONE 2026-10-26)
## Baselines (unchanged code)
| Repo | Result |
|---|---|
| saleor | pytest `-m "not e2e" -n 8`: 18161 passed, 1 skipped, 9m24s. pre-commit/ruff/mypy not yet run (do in 01+) |
| saleor-dashboard | check-types PASS. Jest: 1 FAIL pre-existing `useAnnouncements › fetches and maps announcements` (6133 pass). eslint (no --fix): 14 parse errors on `.snap` files + 7166 warnings, pre-existing. format:check: `agents/MEMORY.md` flagged, pre-existing |
| react-storefront | generate:all, typecheck, lint (0 err, 19 warn), test:run 787/787, verify:quick: all PASS |
Pre-existing failures are not ours; do not fix. Dashboard acceptance = no NEW failures vs this table.
## Env facts
- Throwaway DB: container `age-check-db`, postgres:15-alpine, `127.0.0.1:55432`, user/db `saleor`. Approved by user (G0). Dev DB :5432 and API :8000 untouched.
- Core tests: `DATABASE_URL=postgres://saleor:saleor@127.0.0.1:55432/saleor .venv/bin/python -m pytest <path> -n0 --create-db` (pytest creates `test_*` DBs). `PYTEST_DB_URL` does NOT work (expects migrated DB). `timeout` binary absent on macOS.
- Dashboard `lint:eslint` script hardcodes `--fix`; use `npx eslint <paths>` for read-only checks. Jest needs `CI=true`.
- Storefront needs `NEXT_PUBLIC_SALEOR_API_URL` inline in shell only; baseline ran against :8000 (read-only introspection).
- Logs: scratchpad `core-baseline.log`, dashboard/storefront logs listed by executors.
## Next
01 core domain. Then 04 starts isolated core on :8001 using same container (fresh DB).
