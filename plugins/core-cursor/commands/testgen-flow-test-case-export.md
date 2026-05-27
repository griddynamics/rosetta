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
- Skills: `testrail-test-case-export`, `repository-implementation-standards` (when updating tracked repository markdown such as `test-scenarios.md` with TMS IDs)
</workflow_context>

<phase_steps>
1. Identify and activate TMS-specific export skill
2. Verify TMS connection via MCP
3. Get target location from user
4. Parse test cases from markdown
5. Map to TMS format using skill mappings
6. Export test cases via TMS MCP
7. Update documents with TMS IDs
8. Update state file
</phase_steps>

<identify_skill step="6.1">
1. If updating tracked repository files (for example embedding TMS IDs into `test-scenarios.md` under version control): USE SKILL `repository-implementation-standards` first.
2. Determine which TMS the project uses (from project config or ask user)
3. ACQUIRE the corresponding TMS export skill (`testrail-test-case-export`)
4. All subsequent steps use mappings, API calls, and formats defined in that skill
</identify_skill>

<verify_connection step="6.2">
1. Test TMS MCP connection using the method defined in the TMS export skill
2. If fails: inform user, verify MCP config and credentials
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
1. Update `test-scenarios.md`: add TMS case ID and link to each test case, add export summary at top with target info and result table
2. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 6 complete
3. Report completion with TMS link and export statistics
</update_documents>

<validation_checklist>
- TMS connection verified
- Target location exists in TMS
- All test cases parsed from markdown
- At least 80% of test cases exported successfully
- `test-scenarios.md` updated with TMS IDs and links
- State file updated with Phase 6 complete
</validation_checklist>

<pitfalls>
- TMS MCP may lack certain creation capabilities — user may need to create containers manually in TMS UI
- If a required field is not supported by TMS MCP, fall back to embedding info in another field (e.g., prepend preconditions to first step)
- Re-running export may create duplicates in TMS — document this behavior
- Verify field mapping values match the specific TMS project configuration
</pitfalls>

</testgen_flow_test_case_export>
