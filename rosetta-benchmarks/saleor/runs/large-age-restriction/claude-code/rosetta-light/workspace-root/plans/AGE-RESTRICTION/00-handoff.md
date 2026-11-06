# 00 — Preflight baseline · handoff (2026-10-23)

**Done:** repo state recorded (saleor `bb00425`, dashboard `a667b12`, storefront `3d3c3f5`; all detached, clean before and after). Core full suite, bench, ruff, mypy, schema diff. Dashboard check-types, test:quiet, eslint, format:check, lockSchema. Storefront `verify`. E1 executed (`saleor-benchmark-api` stopped, not removed).

**Evidence** (logs in `<scratchpad>/s00/{core,dash,store}/`):
- Core: `-m "not e2e" -n 8` 18161 passed, 1 skipped, 0 failed; 820.9 s pytest (827 s wall). Bench 50 passed, 61.8 s, `core/bench-base.json`. ruff check and format clean; mypy clean (429 files); schema diff empty.
- Dashboard: check-types ✓ (101 s). test:quiet 6132 passed, 2 failed, 8 skipped (403 s). eslint 0 errors, 7166 warnings. format:check ✗ on `agents/MEMORY.md` only. lockSchema 7/7 ✓.
- Storefront: verify exit 0 (61 s). Lint 0 errors, 19 warnings. Vitest 127 files, 787 tests ✓.

**Decisions:**
- E1 ran after core and storefront finished, since plan §5 step 7 needs :8000 for the storefront baseline.
- The three repos ran concurrently (plan Do §1), so runtimes include CPU contention.
- Dashboard Jest's 2 failures pass when re-run alone (15/15). Recorded as load flakes.
- PATH pnpm is 10.28.1. The dashboard pins 11.13.1, and the runs used 11.13.1.

**Blockers:** none gating 01. Pre-existing red: dashboard `format:check` on `agents/MEMORY.md`. Dev servers :9000 and :3000 have no API until restore.

**Next:** 01 (core foundation, solo), then G1. Restore at G3: `docker start saleor-benchmark-api`.
