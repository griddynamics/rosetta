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
</workflow_context>

<phase_steps>
1. Execute report analysis (Part A of skill)
2. Review findings
3. Update state
</phase_steps>

<execute_analysis step="7.1" subagent="engineer" role="Test failure analyst">
1. USE SKILL `debugging`
2. USE SKILL `aqa-test-debugging`
3. Execute Part A (Report Analysis) only
4. If test report location unknown, ask user
5. **WAIT** for user to provide report if not found in `agents/user-instructions/`
</execute_analysis>

<review_findings step="7.2">
1. Verify all failures categorized
2. Verify root causes identified
3. Verify page source analyzed for selector errors
4. Confirm recommendations are actionable
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
- Recommendations documented
</validation_checklist>

</aqa_flow_test_report_analysis>
