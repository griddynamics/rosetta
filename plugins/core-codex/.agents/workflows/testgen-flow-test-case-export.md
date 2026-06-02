---
name: testgen-flow-test-case-export
description: Phase 6 of Test Generation - Export test cases to Test Management System
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_test_case_export>

<description_and_purpose>
Export test cases from `test-scenarios.md` to a Test Management System (TMS) via MCP, mapping priorities, types, and structured steps. If TMS MCP unavailable, offer user alternatives (manual copy, CSV, etc.).
</description_and_purpose>

<workflow_context>
- Phase 6 of 7 in `testgen-flow`
- Input: `test-scenarios.md` from Phase 5
- Output: test cases created in TMS
- Prerequisite: Phase 5 complete, user reviewed test cases, TMS MCP configured
- HITL: user must provide target location in TMS (e.g., section, folder, suite)
- Skills: **USE** TMS-specific export skill (e.g., `testrail-test-case-export`) for connection, field mappings, and API details; **USE** `repository-implementation-standards` when updating tracked repository markdown such as `test-scenarios.md` with TMS IDs.
</workflow_context>

<phase_steps>
1. Activate `repository-implementation-standards` (if updating tracked files) and identify TMS-specific export skill
2. Verify TMS connection via MCP
3. Get target location from user
4. Parse test cases from markdown
5. Map to TMS format using skill mappings
6. Export test cases via TMS MCP
7. Update documents with TMS IDs
8. Write `export-report.md` (TMS IDs/URLs, per-case status, timestamp)
9. Update state file
</phase_steps>

<identify_skill step="6.1">
1. If updating tracked repository files (for example embedding TMS IDs into `test-scenarios.md` under version control): USE SKILL `repository-implementation-standards` first.
2. Determine which TMS the project uses (from project config or ask user)
3. ACQUIRE the corresponding TMS export skill (`testrail-test-case-export`)
4. All subsequent steps use mappings, API calls, and formats defined in that skill
</identify_skill>

<verify_connection step="6.2">
1. Test TMS MCP connection using the method defined in the TMS export skill
2. **On connection failure:** inform user, verify MCP config and credentials. Retry once. On a second failure, present the **documented alternatives** below and let the user choose; do not silently abort:
   - **Manual copy:** export the test cases as plain markdown for the user to paste into the TMS UI. Artifact: keep `agents/testgen/{TICKET-KEY}/test-scenarios.md` as-is; record the user's confirmation of manual export in `export-report.md` (see step 6.6).
   - **CSV export:** generate `agents/testgen/{TICKET-KEY}/test-scenarios.csv` with one row per test case (columns: `TC_ID,Title,Priority,Type,Source_Requirements,Preconditions,Steps,Expected_Result,Tags`). Record the CSV path + row count in `export-report.md`.
   - **Defer:** mark Phase 6 as `BLOCKED — TMS unavailable` in `testgen-state.md` and stop, awaiting user to fix MCP access.
3. **On chosen fallback:** the corresponding artifact path becomes the on-disk evidence of Phase 6 (replacing the TMS-IDs receipt section of `export-report.md`).
</verify_connection>

<get_target_location step="6.3">
1. Ask user for target location in TMS — specifics defined by TMS export skill
2. Parse location identifier from user response (accept flexible formats)
</get_target_location>

<parse_and_map step="6.4">
1. Read `agents/testgen/{TICKET-KEY}/test-scenarios.md`
2. Parse each TC-NNN: title, type, priority, preconditions, steps, expected results, test data, requirements
3. Apply priority mapping from TMS export skill
4. Apply type mapping from TMS export skill
5. Build preconditions text: TEST DATA table first (if parameterized, with "Execute for EACH row" note), then original preconditions
6. Format steps per TMS export skill specification
</parse_and_map>

<export step="6.5">
1. For each test case: call TMS API as defined in TMS export skill
2. Track results: created (with TMS case ID), failed (with error), skipped
3. Add small delay between API calls for rate limiting
4. Continue on individual failures — report all at end
</export>

<update_documents step="6.6">
1. Update `test-scenarios.md`: add TMS case ID and link to each test case, add export summary at top with target info and result table.
2. **Write `agents/testgen/{TICKET-KEY}/export-report.md`** using the template below. This artifact is the on-disk receipt that the validation_checklist verifies; do NOT skip this step on any execution path (full TMS export, manual-copy fallback, CSV fallback, or partial-export under the 80% threshold). Sections that don't apply to the path taken are explicitly marked `N/A — <reason>`, not omitted.

```markdown
# Phase 6 Export Report — [TICKET-KEY]

**Completed:** [ISO-8601 timestamp]
**Outcome:** FULL_EXPORT | PARTIAL_EXPORT | MANUAL_COPY_FALLBACK | CSV_FALLBACK | DEFERRED
**Source artifact:** agents/testgen/[TICKET-KEY]/test-scenarios.md

## Target

- **TMS:** [TestRail / Zephyr / Xray / qTest / N/A — fallback path]
- **Target location:** [section / folder / suite identifier, or N/A]
- **TMS project URL:** [base URL or N/A]

## Export Summary

- **Total cases parsed:** [N]
- **Created:** [N]
- **Failed:** [N]
- **Skipped:** [N]
- **Success rate:** [N/M = NN%]
- **Threshold (80%) met:** [yes / no]

## Per-case status

| TC-NNN | Title (truncated) | Status   | TMS ID | TMS URL | Error (if any) |
|--------|-------------------|----------|--------|---------|----------------|
| TC-001 | ...               | created  | C123   | <url>   | —              |
| TC-002 | ...               | failed   | —      | —       | <error message> |
| TC-003 | ...               | skipped  | —      | —       | <reason>       |

## Fallback (if applicable)

[Present only when Outcome is MANUAL_COPY_FALLBACK / CSV_FALLBACK / DEFERRED; otherwise this section is `N/A — full TMS export path taken`.]

- **Path taken:** MANUAL_COPY | CSV | DEFERRED
- **Artifact path:** [e.g., `agents/testgen/[TICKET-KEY]/test-scenarios.csv` for CSV, or `agents/testgen/[TICKET-KEY]/test-scenarios.md` for manual-copy]
- **Row count (CSV) / case count (manual):** [N]
- **User confirmation of manual export:** [verbatim user reply, with timestamp, for MANUAL_COPY path; otherwise N/A]
- **Reason for defer:** [verbatim error / MCP state, for DEFERRED path; otherwise N/A]

## Failed cases — investigation pointers

[Present only when Failed > 0 or Outcome is PARTIAL_EXPORT. Otherwise: `None — all cases exported successfully.`]

- TC-NNN: [error category] — [next-step suggestion: retry / adjust mapping / check TMS field config / etc.]
- ...
```

3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 6 complete (or `PARTIAL — N/M exported` per the validation_checklist 80% threshold rule). Reference the export-report.md path from the state file's Phase 6 entry.
4. Report completion to the user with TMS link, export statistics, AND the export-report.md path so they can audit the run.
</update_documents>

<validation_checklist>
- TMS connection verified (or documented fallback executed per step 6.2)
- Target location exists in TMS (or fallback artifact path recorded)
- All test cases parsed from markdown
- **Success threshold:** at least 80% of test cases exported successfully. **If below 80%:** mark Phase 6 incomplete in `testgen-state.md` (`Phase 6: PARTIAL — N/M exported`), list every failed TC-NNN with the per-case error in `export-report.md`, and HALT for user decision. Do not auto-advance. The user must choose one of: (a) retry failed exports, (b) accept partial export and mark Phase 6 complete with documented gaps, or (c) abort Phase 6 entirely.
- `test-scenarios.md` updated with TMS IDs and links (or fallback artifact identifiers)
- `export-report.md` exists with TMS IDs/URLs, per-case status, timestamp
- State file updated with Phase 6 complete (or PARTIAL per the threshold rule)
</validation_checklist>

<pitfalls>
- TMS MCP may lack certain creation capabilities — user may need to create containers manually in TMS UI
- If a required field is not supported by TMS MCP, fall back to embedding info in another field (e.g., prepend preconditions to first step)
- Re-running export may create duplicates in TMS — document this behavior
- Verify field mapping values match the specific TMS project configuration
</pitfalls>

</testgen_flow_test_case_export>
