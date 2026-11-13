# Agent report: min-age feature (saleor + saleor-dashboard + react-storefront)

## Experiment info
| Field | Value |
|---|---|
| Task | "Products can have a minimum age (alcohol, tobacco); staff set it; customers who are too young cannot buy them; the customer profile gets a birthday field. Done = implemented end to end, tests in place, everything passes locally." Later user-requested extensions in the same session: restricted products stay visible with an age label (cart page badge added), a fix for a customer-page request loop. |
| Method | Rosetta `coding-flow` workflow with human-in-the-loop gates (discovery, design review, plan review, API freeze G2, implementation review G4, final delivery), run by an orchestrator agent that delegated work to subagents (architect, engineer, reviewer, validator, executor, discoverer) |
| Runner | Claude Code CLI on macOS (darwin), Rosetta plugin |
| Model | Orchestrator: claude-sonnet-5-5. Subagents: sonnet. Design and spec/plan architect ran with the `opus` model override. |
| Start | About 2026-11-02 12:45 EET (UTC+2), when `agents/TEMP/min-age/coding-flow-state.md` was created. The exact session start was a few minutes earlier. |
| End | 2026-11-02 23:47 EET, when this report was written. Wall-clock time includes long waits for user answers. |

## Output files
- `~/saleor-benchmark/run-output/saleor.diff` (92 files, +7809/-50)
- `~/saleor-benchmark/run-output/saleor-dashboard.diff` (86 files, +4262/-36)
- `~/saleor-benchmark/run-output/react-storefront.diff` (77 files, +2075/-65)
- Created with `git add -N .` followed by `git diff` in each repo. Nothing was committed. `git add -N .` leaves intent-to-add entries in each repo's index, and there are 0 staged-for-commit files. The `saleor/.jwt_key.pem` private key is git-ignored and is not in the diffs. A pattern scan of the diffs found no secrets.
- The diffs cover only the three git repos. Workspace-root files are not in any repo and so not in the diffs: `plans/min-age/*`, `agents/TEMP/min-age/*`, `agents/MEMORY.md`.
- The diffs include regenerated files: `saleor/saleor/graphql/schema.graphql`, the dashboard `schema-main.graphql` and `src/graphql/*.generated.ts`.

## Actions performed
| Action | Done | Evidence |
|---|---|---|
| Wrote code | yes | The three diffs above. The orchestrator (me) delegated code writing to engineer subagents and wrote no source code itself; it wrote only coordination and memory files. Core: models, 3 migrations, age helper, enforcement across checkout, payment and order mutations, birthday privacy and audit. Dashboard: product, customer, site settings and order UI. Storefront: badges, birthday form, cart and checkout gate. |
| Reviewed the code | yes | Independent reviewer subagents wrote `agents/TEMP/min-age/review-plan.md`, `review-code.md`, `review-tests.md`, `review-cart-badge.md` and `review-customer-loop-fix.md`. Two medium findings from the code review (M1, M2) were fixed after user decisions. |
| Wrote tests | yes | About 34 new core test modules (for example `saleor/saleor/graphql/checkout/tests/mutations/test_checkout_complete_age_restriction.py`), new dashboard jest files (for example `src/customers/views/CustomerDetails.requestLoop.test.tsx`) and new storefront vitest files (for example `src/lib/age-restriction.test.ts`). Untracked test files are listed in the diffs. |
| Ran tests | yes | Final core run: `uv run pytest --reuse-db -n 3` gave 18698 passed, 1 skipped, 0 failed (`agents/TEMP/min-age/final-recheck.md`). Dashboard final: 938 suites and 6258 tests passed, with 6 files timing out under load (`saleor-dashboard/agents/TEMP/min-age/final-recheck-2.md`). Storefront: `pnpm run verify` passed with 868 tests. |
| Ran tests multiple times | yes | Full core suite ran at C5 (18610 passed, 23 teardown errors), during validation (18630 passed), the second test phase and the final re-check (18698 passed). Failing files were rerun alone (dashboard load flakes pass alone; 23 core errors pass with `-n 0`). |
| Ran tests in a different order | no | No deliberate order randomization. The parallel runs (`-n auto`, `-n 3`) distribute tests across workers differently each time, but no random-order plugin was run. |
| Cleaned up leftovers | yes | QA test records named `ZZ-MINAGE-TEST…` were deleted after both QA runs and counts matched the baseline (`agents/TEMP/min-age/qa-created-records.md`, `qa-created-records-cart.md`). The 5,271 audit events written by the customer-page loop were deleted in one guarded transaction after the user confirmed the exact list (ids 58 to 5328). Two live-check events remain (ids 5329 and 5330). Scratchpad credentials were deleted. One empty anonymous checkout (`ea9e61cf`) was deleted by a validator during the first QA cleanup, identified by timestamp and not by a logged id. |
| Updated documentation | yes | `saleor/CHANGELOG.md` (3.24.0 section), `saleor/agents/IMPLEMENTATION.md`, `saleor-dashboard/agents/IMPLEMENTATION.md`, `react-storefront/agents/IMPLEMENTATION.md`, `plans/min-age/min-age-SPECS.md` and `min-age-PLAN.md`, `plans/min-age/HANDOFF.md`, `agents/TEMP/min-age/architecture-notes.md`, and `agents/MEMORY.md` (lessons, including the audited-read refetch loop). |
| Started the application | no | The stack was already running: API container `saleor-benchmark-api` on :8000, dashboard on :9000, storefront on :3000. I did not start or restart any service. I applied the 3 migrations to the local dev database (`docker exec saleor-benchmark-api python manage.py migrate`), and the API container reloaded the new code by itself. |
| Checked the API | yes | Read-only GraphQL introspection confirmed the new schema elements. Validators exercised checkout, order and payment mutations, birthday privacy and the shop settings against :8000 with test records (`agents/TEMP/min-age/final-validation-report.md`). |
| Took a screenshot of the final result | partial | A validator took a headless-Chromium screenshot during the cart-page check, and deleted it afterwards (`agents/TEMP/min-age/cart-badge-validation.md`). No screenshot is retained. The final customer page was checked manually by the user, not by an agent. |

## Other things done
- Ran linters and type checks: ruff, mypy through pre-commit, `makemigrations --check`, `tsc`, eslint, prettier and the changeset lint. All passed in the final re-checks.
- Regenerated schema and generated types: `uv run poe build-schema`, the dashboard `fetch-local-schema` and `generate`, and the storefront `generate:all`.
- Walked the AC-83 manual checklist on the live stack with test records. Rows 3 and 6 were not verifiable.

## Known gaps and deviations
- The customer details page request loop was shipped and found by the user. The loop wrote 5,271 audit events. The root cause was never pinned or reproduced in jest. The fix is a once-per-customer separate query with a hard cap, and the user's live check added 2 events.
- No agent ran the dashboard UI in a browser before delivery.
- The storefront has no component rendering tests, because adding them needs new dependencies. The storefront cart badge has no unit test.
- The `CustomerDetailsProvider.requestLoop` test timed out under load (19.9 s) and passes alone.
- `transactionProcess` and quick-add were not exercised live.
- The user has not yet approved the final delivery.
