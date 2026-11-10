# Execute SALEOR-STORAGE

The cases live in `test-scenarios.md`. This file is only how to run them.

Run the test cases in agents/testgen/SALEOR-STORAGE/test-scenarios.md on the local Saleor stack. Do not edit that file. Do not change application code. Do not ask questions.

## Stack

- Dashboard: http://localhost:9000
- Storefront: http://localhost:3000
- API: http://localhost:8000/graphql/
- Channel: default-channel
- Storefront locale: en
- Account: the local dashboard admin in rosetta/rosetta-benchmarks/BENCHMARKS.md section 3.2 ("Login"). Use only that account, in the browser and for the API. Do not write the password or any token into a file or the report.

## Phases

1. Confirm the Playwright MCP server is connected. If it is not, stop and report "Playwright MCP not available". Run no case. → Phase 1
2. Restart the servers and wait until health passes. → Phase 2
3. Read Case control, then execute the tests. Do not start a case before health passes. → Case control, then Phase 3
4. Review the saved DOM and JSON files. Do not open the site for this review. → Phase 4
5. Report in chat. → Phase 5

## Phase 1. Confirm the Playwright MCP server

- Use the Playwright MCP server for every browser action. Its server and tool names may vary; it counts if it can open pages, click, type, and take screenshots.
- Open the browser ONLY headless.
- IDE browser, other browser MCP, or shell Playwright DOES NOT count.
- If Playwright MCP is not connected, stop the run, run no case including API, and report "Playwright MCP not available".

## Phase 2. Restart the servers

- Do this once, before the run folder and before TC-001.
- Do it again before TC-001 step 6, and again before TC-001 step 11. The storefront caches the product page, so a dashboard save or clear stays invisible until the storefront process starts again. The restart before step 11 is what lets the return to Product A show that the cleared value is gone. These two restarts are not numbered steps and do not get a screenshot.
- Script: `rosetta/rosetta-benchmarks/saleor/scripts/bench.sh`. `BENCH_DIR` defaults to `$HOME/saleor-benchmark` (`$BENCH_DIR` when set).
- Run `bench.sh stop`, then `bench.sh start`, then `bench.sh health`.
- Health must report the API, the storefront, and the dashboard OK. Repeat health until all three are OK. If they are still not OK after about two minutes, stop the whole run, run no case, and report the health output.
- Do not kill pid files. Do not start `pnpm` yourself. Do not wrap the start in `env -i`. `bench.sh start` is the restart: it brings the API back, then starts the storefront on port 3000 and the dashboard on port 9000.
- After a restart in the middle of TC-001, sign in to the dashboard again if it asks, then do the step.

## Case control

Read this before Phase 3. Apply it while that phase runs. This is not a phase.

- Run TC-001, then TC-002.
- Run a case fully, then print its result in chat. Only then start the next case.
- Do not run several cases in one script or one batch of calls.
- TC-002 is one sequence. A failed step does not skip the remaining steps: still clear Product A in step 5 when step 2 or 3 has already written the text.
- Always leave Product A with no storage text, even after a failure.
- If a TC-001 step fails: save its evidence, mark TC-001 FAIL. If it failed after step 4, clear Product A's Storage conditions in the dashboard before closing the browser.
- If a precondition cannot be met, mark that case FAIL at step 0 with the reason and go to the next case.
- Never stop the run because a case failed.
- After TC-001's result is printed in chat, close the Playwright browser. Then start TC-002. If the run stopped before any browser action, there is nothing to close.

## Phase 3. Execute the tests

Run the cases test-scenarios.md. Do not edit that file. Do not start a case before health passes. Case control is already in effect.

### Evidence

- At the start, create one folder agents/testgen/SALEOR-STORAGE/runs/<YYYYMMDD-HHMMSS>/ (local time). Use it for the whole run.
- UI evidence and API evidence go in separate folders. Each test case has its own folder under those:
  - `ui/TC-001/step-<nn>.png`
  - `api/TC-002/step-<nn>-<operation>.json`
- TC-001 steps 1 through 11 are all UI checks. After each one, save a screenshot of the state that step checked as `ui/TC-001/step-<nn>.png`. If the tool saves elsewhere, move the file into that folder. A check that something is absent still gets a screenshot of that spot. Step 10 is the clear, and its screenshot shows the empty field. Step 11 is the return to Product A, and its screenshot shows the block is gone. The server restarts are not numbered test steps and do not get a screenshot.
- With each screenshot, save the checked fragment as `ui/TC-001/step-<nn>-dom.html`. Present: the block or the field. Absent: Shipping & Returns and the next sibling. Cart: Product A's section. Dashboard: the Storage conditions field and the Save button.
- On storefront product steps 1, 6, 9, and 11, scroll the footer into view before the screenshot, including when the scenario says to scroll to Shipping & Returns or to the storage block. The footer is the `footer.bg-foreground.text-background` element at the bottom of the storefront page. The screenshot is of that view. The footer is on screen, and so is the storage block or the empty spot directly above it. A full-page image does not count.
- TC-002: save the response of every GraphQL call in `api/TC-002/` as `step-<nn>-<operation>.json`. nn is the step number. A login call before step 1 uses step 00.
- In saved login responses, replace every token value with "REDACTED".

TC-001: pick Product A and Product B from the seeded catalog that match the preconditions. Check them before step 1. Record their slugs in chat.

## Phase 4. Review the saved DOM and JSON files

After both results are printed in chat, open each file and check only that line. Do not open the site. A missing file fails that check. If a check fails, change that case to FAIL and cite the file. A case is PASS only if these checks pass.

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

## Phase 5. Report in chat

- TC-001 | PASS  (or FAIL | step <n> | saw: <observed> | expected: <expected> | evidence: <file>)
- For TC-002, one line for the case: TC-002 | PASS, or TC-002 | FAIL | step <n> | saw: ... | expected: ... | evidence: <file>
- Evidence paths are relative to the run folder, for example `ui/TC-001/step-06.png` or `api/TC-002/step-03-product.json`.
- A case is PASS only if every step passes and the file review agrees.
