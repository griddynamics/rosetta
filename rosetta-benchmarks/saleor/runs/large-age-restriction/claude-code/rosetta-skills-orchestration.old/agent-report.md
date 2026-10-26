# Agent report: MIN-AGE (age-restricted products + customer birthday)

## Experiment info
- **Task:** products can be marked age-restricted; customers who are too young can't buy them; customer profile gets a birthday. DoD: implemented end to end, tests in place, everything passes locally. Later scope from the user: restricted products stay visible everywhere with an age label ("N+"); local dev DB migrated and API restarted.
- **Method:** Rosetta workflow with human-in-the-loop gates (skills `hitl`, `tech-specs`, `orchestration`). Discovery by subagents, then user Q&A rounds (4 batches), then tech specs by an architect subagent, then user approval, then implementation by engineer subagents, independent reviewer and validator subagents, then user acceptance. Decisions are in `plans/MIN-AGE/MIN-AGE-DECISIONS.md` (D1-D8); specs in `plans/MIN-AGE/MIN-AGE-SPECS.md`.
- **Runner:** Claude Code CLI, main session acting as orchestrator. I wrote almost no product code myself; engineer subagents did.
- **Model:** Sonnet 5.5 (`claude-sonnet-5-5`) for the main session. Subagents used the default model of their agent type (not set explicitly; I did not record which).
- **Start:** about 2026-10-22 16:2x EDT (first saved artifact, the decisions file, is stamped 16:27:14 EDT; discovery ran just before). Exact start is not recorded.
- **End:** 2026-10-22 about 21:45 EDT (this report).
- **Repos changed (uncommitted, nothing committed):** `saleor` (72 files, +5266/-28), `saleor-dashboard` (112 files, +3690/-1857, mostly generated schema/types), `react-storefront` (69 files, +1754/-105). Diffs: `run-output/<repo>.diff`. `git add -N .` was run in each (intent-to-add, changes the index only).
- **Files outside any repo** (workspace root is not a git repo, so not in the diffs): `plans/MIN-AGE/*`, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`, `run-output/*`.

## Actions
| # | Action | Done | Evidence |
|---|---|---|---|
| 1 | Wrote code | yes | Core: 3 migrations (`account/0106`, `product/0211`, `site/0053`), `saleor/account/age_restriction.py`, checkout/draft enforcement, privacy and audit code. Dashboard and storefront changes. All by engineer subagents; see the three diffs. |
| 2 | Reviewed the code | yes | Independent reviewer subagents: core phase 1 (ACCEPT WITH FIXES, 7 findings), core phase 2 (ACCEPT WITH FIXES, 8 findings incl. 1 HIGH). Fixes applied by a fresh engineer. Validators also read the code (policy audit, coverage map). |
| 3 | Wrote tests | yes | Core about 11 new test files plus additions (phase 1: 105 test functions; phase 2: about 139 more across new files); dashboard about 10 new test files plus extensions; storefront new vitest files (`age-restriction.test.ts`, `json-ld.test.ts`, `actions.test.ts`, others). |
| 4 | Ran tests | yes | Engineers and validators ran suites. Final validator counts: core 13,464 passed, 0 failed (21 chunks, `-n 8 --reuse-db`); dashboard 6,218 passed, 8 skipped (947 suites); storefront 876 passed (134 files). |
| 5 | Ran tests multiple times | yes | The core fix engineer re-ran the chunks after fixes (7,623 passed); the validator re-ran everything independently, twice for the clients (round 1 and round 2). Early dashboard runs were flaky under load and passed on re-run. |
| 6 | Ran tests in a different order | no | I did not randomize or reverse test order. Parallel workers (`-n 8`) vary scheduling, but I did not run a deliberate different-order check. |
| 7 | Cleaned up leftovers | partly | Done: validator dropped its throwaway DB `minage_validation_*` and killed its :8765 server (confirmed gone); restored `agents/MEMORY.md` after `pnpm run lint` rewrote it; stopped the finished core engineer agent that kept sending timers. Not done: scratch scripts, logs and the pre-migration DB dump remain in the session scratchpad. |
| 8 | Updated documentation | yes | `saleor/CHANGELOG.md`, `saleor/docs/TODO.md` (2 entries), `react-storefront/docs/CHECKOUT-ARCHITECTURE.md`, `.changeset/quiet-owls-age.md`, `plans/MIN-AGE/*`, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`. Not updated: the repos' `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` (feature not described there). |
| 9 | Started the application | partly | I restarted the `saleor-benchmark-api` container (`docker restart`) and applied the 3 migrations to the local dev DB with the user's approval. The validator ran a temporary Django server on :8765 against a throwaway DB. The dashboard and storefront dev servers were already running; I did not start them. |
| 10 | Checked the API | yes | After the restart: shop returned `minimumAge: 18, timeZone: "UTC"`; `products(channel:"default-channel")` returned 29 products with `isAgeRestricted:false, ageLabel:null`. Validator's E2E over HTTP on the throwaway DB: guest, no-birthday and underage blocked with the product named; adult completed; permission matrix; audit events kept after customer delete. |
| 11 | Took a screenshot of the final result | no | No browser or UI check was done. Dashboard and storefront pages were checked only by type checks, lint and unit tests. |

## Other facts
- **Reported errors corrected during the work:** the first core engineer reported a missing error code as present (it was not); a reviewer caught it and it was added. The validators ran the suites themselves.
- **Local DB migration:** approved by the user; a `pg_dump` backup was taken first (scratchpad file `saleor_dev_before_minage.dump`). The running API had auto-reloaded onto the new code and was failing until the migration ran.
- **Known gaps accepted by the user:** no component render tests in the storefront; weak tests for the dashboard product-list age column and tiles; machine-written translations (7 non-English locales); no retention deletion job; no age check at payment start (documented in `saleor/docs/TODO.md`); restricted gift-reward lines caught only at completion.
- **Not run:** browser/UI checks, Playwright, storybook tests, semgrep/pre-commit/deptry, query-count baselines.
- **Nothing was committed or pushed.**
