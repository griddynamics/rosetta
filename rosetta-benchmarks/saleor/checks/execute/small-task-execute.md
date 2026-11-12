# Execute the small task

This file is how to execute the test cases for the small task. The test cases are in [small-task-test-cases.md](../test-cases/small-task-test-cases.md).

Read this file only when the small-task operator check is the current step under Running one experiment in [BENCHMARKS.md](../../../BENCHMARKS.md). Run it in the assistant session. Never paste this file, the test-cases file, or `result.md` into the agent session.

Do not edit the three Saleor repos. Do not edit the test-cases file. During this check, do not ask the operator or the agent under test any question.

`bench.sh stop`, `start`, and `health` are allowed only while this check runs, and only while the agent under test is idle.

This file writes the check result into the report. It writes the score, merge-ready, the strong point, and the weak point only on its last run. Then leave this file and continue the experiment in the method file.

## Stack

- Dashboard: http://localhost:9000
- Storefront: http://localhost:3000
- API: http://localhost:8000/graphql/
- Channel: default-channel
- Storefront locale: en
- Account: the local dashboard admin under **Login** in Run the setup script in BENCHMARKS.md. Use only that account, in the browser and for the API. Do not write the password or any token into a file or the report.

## Phases

1. Confirm the Playwright MCP server is connected. If it is not, write `BLOCKED` and run no case. → Phase 1
2. Restart the servers and wait until health passes. → Phase 2
3. Read Case control, then execute the tests. Do not start a case before health passes. → Case control, then Phase 3
4. Review the saved DOM and JSON files. Do not open the site for this review. → Phase 4
5. Write `result.md`. → Phase 5
6. Report `result.md` in the run report. Do not review the evidence again. → Phase 6

## Phase 1. Confirm the Playwright MCP server

- Use the Playwright MCP server for every browser action. Its server and tool names may vary; it counts if it can open pages, click, type, and take screenshots.
- Open the browser ONLY headless.
- IDE browser, other browser MCP, or shell Playwright DOES NOT count.
- If Playwright MCP is not connected, create the run folder, write `BLOCKED | Playwright MCP not available` as the only verdict in `result.md`, and run no case, including API. Do not mark a Done when check as pass. Do not send a follow-up that pretends a screen was seen. Stop this file and return to Operator check (small task) in BENCHMARKS.md. Tell the operator the check is blocked.

## Phase 2. Restart the servers

- Do this once, before the run folder and before TC-001.
- Do it again before TC-001 step 6, and again before TC-001 step 11. The storefront caches the product page, so a dashboard save or clear stays invisible until the storefront process starts again. The restart before step 11 is what lets the return to Product A show that the cleared value is gone. These two restarts are not numbered steps and do not get a screenshot.
- Script: `rosetta/rosetta-benchmarks/saleor/scripts/bench.sh`. `BENCH_DIR` defaults to `$HOME/saleor-benchmark` (`$BENCH_DIR` when set).
- Run `bench.sh stop`, then `bench.sh start`, then `bench.sh health`.
- Health must report the API, the storefront, and the dashboard OK. Repeat health until all three are OK. If they are still not OK after about two minutes, create the check folder, write `BLOCKED | health: <output>` in `result.md`, run no case, and return to Operator check (small task) in BENCHMARKS.md. Do not invent case results.
- Do not kill pid files. Do not start `pnpm` yourself. Do not wrap the start in `env -i`. `bench.sh start` is the restart: it brings the API back, then starts the storefront on port 3000 and the dashboard on port 9000.
- After a restart in the middle of TC-001, sign in to the dashboard again if it asks, then do the step.

## Case control

Read this before Phase 3. Apply it while that phase runs. This is not a phase.

- Run TC-001, then TC-002.
- Run a case fully, then note its provisional line. Only then start the next case. A provisional line is not `result.md`.
- Do not run several cases in one script or one batch of calls.
- TC-002 is one sequence. A failed step does not skip the remaining steps: still clear Product A in step 5 when step 2 or 3 has already written the text.
- Always leave Product A with no storage text, even after a failure.
- If a TC-001 step fails: save its evidence, mark TC-001 FAIL. If it failed after step 4, clear Product A's Storage conditions in the dashboard before closing the browser.
- If a precondition cannot be met, mark that case FAIL at step 0 with the reason and go to the next case.
- Never stop the run because a case failed.
- After TC-001's provisional line, close the Playwright browser. Then start TC-002. If the run stopped before any browser action, there is nothing to close.

## Phase 3. Execute the tests

Run the cases in [small-task-test-cases.md](../test-cases/small-task-test-cases.md). Do not edit that file. Do not start a case before health passes. Case control is already in effect.

### Evidence

- `$RUN` is the run folder from the method file: `rosetta/rosetta-benchmarks/saleor/runs/small-storage-conditions/<runner>/<method>/`.
- At the start, create one folder `$RUN/operator-check/<YYYYMMDD-HHMMSS>/` (local time). Use it for the whole check. Do not write under `agents/testgen`. Do not write inside the three Saleor repos.
- UI evidence and API evidence go in separate folders. Each test case has its own folder under those:
  - `ui/TC-001/step-<nn>.png`
  - `api/TC-002/step-<nn>-<operation>.json`
- TC-001 steps 1 through 11 are all UI checks. After each one, save a screenshot of the state that step checked as `ui/TC-001/step-<nn>.png`. If the tool saves elsewhere, move the file into that folder. A check that something is absent still gets a screenshot of that spot. Step 10 is the clear, and its screenshot shows the empty field. Step 11 is the return to Product A, and its screenshot shows the block is gone. The server restarts are not numbered test steps and do not get a screenshot.
- With each screenshot, save the checked fragment as `ui/TC-001/step-<nn>-dom.html`. Present: the block or the field. Absent: Shipping & Returns and the next sibling. Cart: Product A's section. Dashboard: the Storage conditions field and the Save button.
- On storefront product steps 1, 6, 9, and 11, scroll the footer into view before the screenshot, including when the scenario says to scroll to Shipping & Returns or to the storage block. The footer is the `footer.bg-foreground.text-background` element at the bottom of the storefront page. The screenshot is of that view. The footer is on screen, and so is the storage block or the empty spot directly above it. A full-page image does not count.
- TC-002: save the response of every GraphQL call in `api/TC-002/` as `step-<nn>-<operation>.json`. nn is the step number. A login call before step 1 uses step 00.
- In saved login responses, replace every token value with "REDACTED".

TC-001: pick Product A and Product B from the seeded catalog that match the preconditions. Check them before step 1. Record their slugs in `result.md`.

## Phase 4. Review the saved DOM and JSON files

Do this before writing `result.md`. Do not write `result.md` from the provisional lines. Open each file and check only that line. Do not open the site. A missing file fails that check. If a check fails, change that case to FAIL and cite the file. A case is PASS only if these checks pass.

- `ui/TC-001/step-01-dom.html` --> No Storage conditions block and no `pdp-storage-conditions`.
- `ui/TC-001/step-02-dom.html` --> Storage conditions field is present and empty. Save is inactive.
- `ui/TC-001/step-03-dom.html` --> Field is `Store in a cool dry place`. Save is active.
- `ui/TC-001/step-04-dom.html` --> Field is still `Store in a cool dry place`. No error.
- `ui/TC-001/step-05-dom.html` --> Field is still `Store in a cool dry place`.
- `ui/TC-001/step-06-dom.html` --> `pdp-storage-conditions` shows `Store in a cool dry place`.
- `ui/TC-001/step-07-dom.html` --> Product A is in the bag.
- `ui/TC-001/step-08-dom.html` --> Product A's cart section has no Storage conditions and no `Store in a cool dry place`.
- `ui/TC-001/step-09-dom.html` --> No Storage conditions block and no `pdp-storage-conditions`.
- `ui/TC-001/step-10-dom.html` --> Storage conditions field is empty. No error.
- `ui/TC-001/step-11-dom.html` --> No Storage conditions block and no `pdp-storage-conditions`.
- `api/TC-002/step-01-product.json` --> Product A and Product B have no storage text.
- `api/TC-002/step-02-productUpdate.json` --> The update succeeds.
- `api/TC-002/step-03-product.json` --> Product A is `Store in a cool dry place`. Product B has no storage text.
- `api/TC-002/step-04-product.json` --> Product A is still `Store in a cool dry place`.
- `api/TC-002/step-05-productUpdate.json` --> The clear succeeds.
- `api/TC-002/step-05-product.json` --> Product A and Product B have no storage text.

## Phase 5. Write result.md

Write `$RUN/operator-check/<YYYYMMDD-HHMMSS>/result.md` only after Phase 4. Chat may quote that file. A chat line is not the record.

- One line for TC-001: `TC-001 | PASS` or `TC-001 | FAIL | step <n> | saw: <observed> | expected: <expected> | evidence: <file>`
- One line for TC-002: `TC-002 | PASS` or `TC-002 | FAIL | step <n> | saw: <observed> | expected: <expected> | evidence: <file>`
- Evidence paths are relative to this check folder, for example `ui/TC-001/step-06.png` or `api/TC-002/step-03-product.json`.
- A case is PASS only if every step passes and the file review agrees.
- Then these Done when lines, from the verdicts above:
  - `1 | set | TC-001 steps 2-6 | pass` or `fail`
  - `2 | clear | TC-001 steps 10-11 | pass` or `fail`. Edit to a second value is not in these cases.
  - `3 | API | TC-002 | pass` or `fail`
  - `4 | storefront shows it | TC-001 step 6 | pass` or `fail`
  - `5 | nothing extra when empty | TC-001 steps 1, 9, and 11 | pass` or `fail`
  - `6 | existing products | TC-001 steps 1 and 9 | pass` or `fail`. A storefront error on step 1 fails the case. The home page is not a separate step.
  - `7 | local tests | not this check`
  - `8 | cleanup | not this check`
- On `BLOCKED`, do not mark those checks as pass.

## Phase 6. Report the results

`result.md` is final. Do not open evidence or the site, and do not change a verdict. UI is TC-001. API is TC-002. `<dir>` is this check's `operator-check/<YYYYMMDD-HHMMSS>`. A later run replaces these fields.

Copy each Done when line from `result.md` into the matching check in the `$RUN/report.md` Done when table. Evidence for each: `<dir>/result.md`. Add a timeline `note` with the TC-001 line and the TC-002 line.

Then, only on the last run (both PASS, or a case still fails after the third follow-up), and not on `BLOCKED`:

- UI only: `operator_score: 3`, `operator_merge_ready: no`. Strong: `UI tests passed.` Weak: `API tests did not pass.`
- API only: `operator_score: 4`, `operator_merge_ready: no`. Strong: `API tests passed.` Weak: `UI tests did not pass.`
- Both: `operator_score: 5`, `operator_merge_ready: yes`. Strong: `All tests passed.` Weak: `All tests passed.`
- Neither: `operator_score: 1`, `operator_merge_ready: no`. Strong: `No test passed.` Weak: `UI tests did not pass. API tests did not pass.`

Put the strong and weak sentences on the Notes lines `Strong point of the method in this run` and `Weak point of the method in this run`. Set `done_checks_passed` to the number of Done when lines in `result.md` that say pass, not counting local tests or cleanup.

## After this file

This file is the only sender of the case follow-up. The method file does not send it again. Leave this file only when the check is BLOCKED, both cases PASS, or a case still fails after the third follow-up.

- `BLOCKED`: tell the operator. Do not invent a follow-up. Do not write the Done when checks. Do not write the score, merge-ready, the strong point, or the weak point.
- Any case `FAIL`, and fewer than 3 case follow-ups have been sent: the result is already written. Do not write the score yet. Save the id of the session that received the task prompt in `$RUN/agent-session-id` if it is not there yet. Exit that session if it is still open, then resume it with the `--resume` command in the method file and that id. Send one follow-up there. Do not start a new session. One message covers this failed run, including every failed case. For each failed case it states what was seen, what was expected, and the evidence path from this run. Do not add a cause from the agent's source code. Add a timeline row of type `follow-up` with the exact text, and add 1 to `followups`. After the agent finishes, run this file again.
- A case still fails after the third follow-up: do not send another. Write the score from this run. Keep the failure and continue: write T2 if it is not written yet, fill "Tests pass locally" and "No manual cleanup needed", then the red flags and the agent's claims, then the post-implementation prompt.
- Both cases `PASS`: write the score from this run. Next, in the method file: write T2 if it is not written yet, fill "Tests pass locally" and "No manual cleanup needed", then the red flags and the agent's claims, then the post-implementation prompt. Do not send that prompt from this file.
