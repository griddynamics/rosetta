---
name: aqa-flow-test-report-analysis
description: Phase 7 of AQA workflow - Test Report Analysis (USER INTERACTION REQUIRED if report location unknown)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_report_analysis>

<description_and_purpose>
Analyze test execution reports, identify failure root causes, and prepare for corrections.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `aqa-flow`
- Input: test report or execution output, test plan, page sources
- Output: failure analysis with root causes and recommendations
- Prerequisite: Phase 6 complete, test executed by user
- HITL: may need to ask user for report location
- Uses Rosetta skill `automation-test-execution-analysis` (ACQUIRE from KB when not already loaded). **Canonical document:** same tag as the skill `name:` in `instructions/r3/core/skills/automation-test-execution-analysis/SKILL.md` (this repo); successful ACQUIRE returns that instruction body.
- **Scope:** parse the report, categorize failures, identify root causes, assign evidence strength, and document recommendations for correction — **no** production code edits and **no** writes to test or product source files; exact steps are in the SKILL.
</workflow_context>

<phase_steps>
1. Obtain or locate the test report
2. Run failure analysis via `automation-test-execution-analysis`
3. Review findings
4. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. If the test report is not under a known path and not in `agents/user-instructions/`: ask user; **WAIT** until a report artifact is available or the user confirms none.
2. If `automation-test-execution-analysis` is not already in the loaded skill set: ACQUIRE `automation-test-execution-analysis` FROM KB.
3. If step 2 did not yield the skill document: record the failure in `agents/aqa-state.md`, stop this phase, and ask the user to fix Rosetta/KB access.
4. USE SKILL `automation-test-execution-analysis` — keep scope to report triage only: no code writes in this phase.
</execute_analysis>

<review_findings step="7.2">
1. Verify all failures categorized
2. Verify root causes identified
3. Verify page source analyzed for selector errors
4. Confirm recommendations are actionable
5. Classify each root cause by evidence strength:
   - **Confirmed:** logs, stack traces, or reproducible steps tie the failure to this cause — no Assumption/Unknown tag.
   - **Assumption:** partial evidence only (e.g., time correlation without stack, single flaky run, or symptom-based guess) — label the root cause **Assumption** and say what evidence is missing.
   - **Unknown:** no usable supporting evidence — label **Unknown** and list what evidence would be needed to confirm.
   - **Ambiguous evidence:** if a case could reasonably be tagged as both **Confirmed** and **Assumption**, choose **Assumption** (weaker label). If it could be both **Assumption** and **Unknown**, choose **Unknown** unless at least one concrete partial fact exists — then **Assumption**.
6a. Re-read every failure entry and confirm each has exactly one of **Confirmed**, **Assumption**, or **Unknown**.
6b. If any entry lacks a label or violates the ambiguity rule in step 5, repeat steps 1–5 — **at most two** full cycles.
6c. After two cycles with remaining gaps: record unresolved rows in `agents/aqa-state.md`, ask the user once how to label them (or approval to leave borderline items as **Assumption**), then continue only after the user replies or explicitly approves proceeding with those documented defaults — only then run `update_state`.
</review_findings>

<update_state step="7.3">
1. Update `agents/aqa-state.md`:
   - Test Report Location: [path]
   - Tests Executed: [count]
   - Tests Failed: [count]
   - Root Causes: [list]
   - Phase 7 completion timestamp
2. Mark Phase 7 complete, Phase 8 current
</update_state>

<validation_checklist>
- Test report located and parsed
- All failures identified and categorized
- Root causes analyzed (including page source for selector errors)
- Each root cause tagged **Confirmed**, **Assumption**, or **Unknown** with a one-line evidence rationale
- Recommendations documented
</validation_checklist>

</aqa_flow_test_report_analysis>
