# Agent report: age-restricted products and customer birthday

## Experiment info

| Field | Value |
|---|---|
| Task | Staff mark a product with a minimum age. Customers who are too young cannot buy it. The customer profile gets a birthday field. Definition of done: implemented end to end, tests in place, all passing locally. Required: skills `hitl` and `tech-specs`, and Rosetta subagents. |
| Method | Rosetta (`rosetta-light` plugin) workflow with human-in-the-loop (HITL) gates. Discovery by subagent, then two Q&A rounds with the user, then a tech spec (approved with 3 corrections), then an execution plan (approved, with the dev-stack option and SC-1 to SC-5). Implementation ran as numbered subagent sessions 00 to 26, in parallel where file scopes did not overlap. Two independent review sessions and an independent validation session followed. After the user wrote "fully autonomous", the later gates (G1, G2, G3) were waived. |
| Runner | Claude Code CLI, session name `saleor-benchmark-8b`. Subagents: Rosetta `discoverer`, `architect`, `planner`, `engineer`, `reviewer` and `validator`. A recurring 7-minute status cron job was used at the user's request and then deleted. |
| Model | Claude Sonnet 5.5 (`claude-sonnet-5-5`). No model override was set for subagents. |
| Start time | 2026-10-23, about 11:30 EDT. This is approximate: the earliest artifact, the spec, was created at 11:49 EDT. The exact start was not recorded. |
| End time | 2026-10-23 20:38 EDT (time the diffs were saved). |
| Repos changed | `saleor`, `saleor-dashboard`, `react-storefront` (no git at the workspace root). Nothing was committed. |

## Outputs

- `run-output/saleor.diff`: 94 files, +9318 / -115.
- `run-output/saleor-dashboard.diff`: 69 files, +2193 / -36.
- `run-output/react-storefront.diff`: 110 files, +3973 / -281.
- Created with `git add -N .` and then `git diff`, as requested. `git add -N` records new files as intent-to-add in each repo's index, so `git status` now shows them as changed. This is the only change to git state, and no commit was made.
- Plan, spec, handoffs, reviews and validation report: `plans/AGE-RESTRICTION/`.

## Actions performed

| Action | Done | Evidence |
|---|---|---|
| Discovery of the codebase (read-only) | yes | Discoverer subagent; findings and 12 open design questions. |
| Asked the user clarifying questions (HITL) | yes | Two question batches (8 questions) plus follow-ups. Decisions are in the spec, section 16. |
| Wrote tech specs | yes | `plans/AGE-RESTRICTION/AGE-RESTRICTION-SPECS.md` (422 lines, status Approved). |
| Wrote an execution plan | yes | `AGE-RESTRICTION-PLAN.md` and session files `00` to `23`. |
| Wrote code | yes | Core: models, 3 migrations, eligibility module, deletion hook, GraphQL API, enforcement. Dashboard: product toggle, shop settings, customer age card, product-list badge. Storefront: label, prompts, birthday fields. See the three `.diff` files. |
| Reviewed the code | yes | Independent reviewer subagents: `21-review.md` (0 blocker, 4 major, 16 minor, 9 nit) and `22-review.md` (1 blocker, 2 major, 5 minor, 4 nit). Findings were fixed in sessions 17 and 21r. A human review was not done. |
| Wrote tests | yes | About 330 new core tests across 40+ files, plus storefront and dashboard tests. Includes leak, security and retention tests. |
| Ran tests | yes | Core full suite 18,495 passed, 2 failed, 1 skipped (session 23). Dashboard 937 suites, 6,206 tests passed. Storefront 155 files, 991 tests passed, `pnpm run verify` exit 0. |
| Ran tests multiple times | yes | Baseline before any change (core 18,161 passed). Per-session runs. Full suite again in sessions 11 and 23. `-n0` and `-n 3` reruns. |
| Ran tests in a different order | partly | Ran with different parallel splits (`-n0`, `-n 3`, `-n 8`). Ran a test-order leak pair in one process (`test_dummy_credit_card` fixture leaking into `test_shop`). Random-order tooling was not run. |
| Ran linters and type checks | yes | ruff, mypy (core). `tsc` and ESLint (dashboard, storefront). `knip`, `lint:changesets`, `lockSchema`, `data:lock` and `core:lock` checks, `cost:check`. |
| Mutation checks on the tests | yes | In-memory breakages of the deletion hook, the read gate, the write gate, and enforcement. Each was caught by at least one test (sessions 06, 09, 10, 21r). |
| Cleaned up leftovers | yes | Stopped the :8001 verification API. Dropped 34 scratch databases by exact name. Deleted the credentials file and a temporary source copy. Removed temporary `test_tmp_*` files. Three temporary clone databases for codegen were dropped too. See `24-handoff.md` and `26-handoff.md`. |
| Updated documentation | yes | `CHANGELOG.md` (new `# 3.24.0` section), `agents/IMPLEMENTATION.md` in core, dashboard and storefront, `docs/CONTEXT.md`, `docs/COMMERCE-CONTEXT.md`, `docs/ARCHITECTURE.md`. |
| Started the application | yes, temporary | A verification API (uvicorn on :8001) on a cloned, migrated database, used for codegen, tests and manual checks, then stopped. The dashboard (:9000) and storefront (:3000) dev servers were already running and were not started or restarted. |
| Checked the API | yes | Introspection and 64 scripted checks against the live :8001 API: guest, no-birthday, minor and adult checkouts, birthday visibility by role, drafts, a minimum-age change, and audit retention on customer deletion (session 23, `23-validation.md`). |
| Took a screenshot of the final result | no | No browser walk-through and no screenshot. Storefront and dashboard UI were checked only by unit and markup tests, typecheck and lint. |
| Ran browser/e2e tests | no | Playwright e2e, Storybook, Chromatic. Needs a live browser stack. |
| Ran CI-only checks | no | GraphQL Inspector, changelog enforcer, migrations-compat job, semgrep binary (reviewed the rules by hand), pre-commit hooks. |
| Committed or pushed | no | Per the repo rule and the user's instruction. |
| Migrated the dev `saleor` database or restarted the API container | no | Not explicitly approved. The container `saleor-benchmark-api` was stopped for this work and is still stopped. Commands are in the final summary. |

## Notes and known limitations

- Two tests written in session 09 failed later in the day. They used a hard-coded date for the frozen clock (`2026-10-23 23:00:00`) and failed with `CHECKOUT_NOT_FULLY_PAID` after the real clock passed it. Validation had run earlier, before the date passed, so it missed this. Both tests now freeze at the real current time and use a relative birthday. They were run alone (2 passed). The full suites were not re-run after that change.
- Two core test failures found in validation were fixed afterwards: a test-order leak that already existed (`test_dummy_credit_card` fixture), and a live-DNS flake in `test_http_client`. The full core suite was not re-run after those two fixes. The affected shop and gateway tests passed (254 tests with `-n 3`), and the `test_http_client` file passed (3 of 3).
- Dashboard `format:check` fails on `agents/MEMORY.md`, and this was already the case at baseline.
- Accepted limitations and deviations are listed in `plans/AGE-RESTRICTION/HANDOFF.md`. The main ones:
  - The birthday is self-declared and unverified.
  - `orderBulkCreate` is exempt on purpose.
  - Transaction errors do not list restricted variants.
  - Quick-add on listings has no age prompt.
- Open items for the user:
  - Legal review of the terms and privacy policy (FU-1, release-blocking).
  - Dev-stack restore (migrate the `saleor` database, start the API container).
  - Whether to commit.
