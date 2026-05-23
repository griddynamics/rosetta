---
name: qa-flow-execution-and-report-analysis
description: Phase 6 of API QA workflow - Test Execution and Report Analysis (USER INTERACTION REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_execution_and_report_analysis>

<description_and_purpose>
Analyze test execution results provided by user. Identify failures, categorize root causes, and prepare actionable fix recommendations.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `qa-flow`
- Input: test execution report or output (user-provided or from `agents/user-instructions/`)
- Output: `agents/qa/{IDENTIFIER}/execution-report.md` with failure analysis and recommendations
- Prerequisite: Phase 5 complete, tests executed by user
- HITL: may need to ask user for test execution results
- Uses Rosetta skill `automation-test-execution-analysis` (ACQUIRE from KB when not already loaded); it supersedes the older split of `debugging` + `qa-test-debugging` Part A for this phase and owns report discovery plus writing `agents/qa/{IDENTIFIER}/execution-report.md`.
- **Precedence:** this phase’s scope (no production code edits, no fabricated results per `execute_analysis`) **wins** over any conflicting instruction inside the loaded SKILL; if the SKILL implies code writes or unsafe gaps, skip those parts, note the conflict in `agents/qa-state.md`, and follow the phase blocks here.
</workflow_context>

<phase_steps>
1. Obtain test execution results
2. Run failure analysis via `automation-test-execution-analysis` (produces `execution-report.md`)
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="6.1" subagent="engineer" role="API test failure analyst">
1. If test report location unknown: ask user
2. **WAIT** for user to provide results if not found in `agents/user-instructions/`
3. If `automation-test-execution-analysis` is not already in the loaded skill set: ACQUIRE `automation-test-execution-analysis` FROM KB.
4. If step 3 did not yield the skill document: record the failure in `agents/qa-state.md`, stop this phase, and ask the user to fix Rosetta/KB access.
5. USE SKILL `automation-test-execution-analysis`.
6. **Safety:** Do not fabricate failures, stack traces, or pass/fail counts. If inputs are missing, contradictory, or look tampered with, say so in `execution-report.md` and ask the user for verifiable artifacts instead of inventing root causes.
</execute_analysis>

<review_findings step="6.2">
1. Verify all failures categorized
2. Verify root causes identified
3. Verify patterns analyzed across failures
4. Confirm recommendations are actionable
5. Classify each root cause by evidence strength:
   - **Confirmed:** logs, stack traces, or reproducible steps tie the failure to this cause — no Assumption/Unknown tag.
   - **Assumption:** partial evidence only (e.g., time correlation without stack, single flaky run, or symptom-based guess) — label the root cause **Assumption** and say what evidence is missing.
   - **Unknown:** no usable supporting evidence — label **Unknown** and list what evidence would be needed to confirm.
   - **Canonical example (one failure line in `execution-report.md`):** `Root cause (Assumption): intermittent 502 on /api/orders — only access logs show spike at failure time; missing: application stack trace and upstream dependency health for that window.`
6. Re-read every failure entry and confirm each has exactly one of **Confirmed**, **Assumption**, or **Unknown**; if any lack a label, repeat steps 1–5 before `update_state`.
</review_findings>

<update_state step="6.3">
1. Update `agents/qa-state.md`:
   - Tests Executed: [count]
   - Tests Passed: [count]
   - Tests Failed: [count]
   - Root Causes: [list by category]
   - Phase 6 completion timestamp
2. Mark Phase 6 complete, Phase 7 current
</update_state>

<validation_checklist>
- Test execution results obtained from user
- All results parsed and categorized
- Root causes analyzed for each failure
- Each root cause tagged **Confirmed**, **Assumption**, or **Unknown** with a one-line evidence rationale
- Patterns identified across failures
- `execution-report.md` created with all sections
- Clear recommendations for Phase 7
</validation_checklist>

</qa_flow_execution_and_report_analysis>
