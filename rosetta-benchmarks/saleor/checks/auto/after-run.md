# After the run: the assistant's own checks

`scripts/bench-run.py` sends you this file after the post-implementation prompt and the saved artifacts (step 10 of the method file). You are the operator's assistant from BENCHMARKS.md section 5, "Working with an AI assistant". The agent session is closed. Do not message any agent. Do not change code in the three repos.

Do these items in the run report (the driver gives you the paths), in order:

1. Section 4, "Done when", rows 7 and 8. Row 7: run the template's local test commands for the changed areas in all three repos (backend tests in the API container, the changed frontends' tests), with the flaky-test rule of section 5. Row 8: look for leftovers (debug code, temp files, commented-out code) in the saved `<repo>.diff` files. Write pass or fail, the commands and the counts.
2. Section 5, red flags. Tick each one you see, with one line of evidence.
3. Section 6, the agent's claims from `agent-report.md` against what you see in the diffs and the test results.
4. Section 2, "Size of the change", from the saved `<repo>.diff` files with `git apply --numstat`, run outside any repo folder (BENCHMARKS.md, step 10). Fill both sets of columns. Remove the `/usage` "Code changes" sentence: automated runs have no `/usage`.
5. Known deficiency: run `pnpm run check-types` in the dashboard repo and record "passes" or "fails" in section 8, with the rule of BENCHMARKS.md section 5, "Known deficiency: dashboard type check" (a fail adds 1 to `followups`).
6. Data block: set `red_flags` and `tests_pass`. Add 1 to `done_checks_passed` for row 7 and for row 8 when they pass. Change `followups` only for item 5. Do not change any other field: the driver owns them.

Edit the report with the edit tool. Keep every other section as it is. Reply with one line: `after-run: done` or `after-run: blocked: <reason>`.
