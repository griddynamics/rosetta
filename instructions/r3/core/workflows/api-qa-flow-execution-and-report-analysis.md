---
name: api-qa-flow-execution-and-report-analysis
description: Phase 6 of API QA workflow - Test Execution and Report Analysis (USER INTERACTION REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<api_qa_flow_execution_and_report_analysis>

<description_and_purpose>
Analyze test execution results provided by user. Identify failures, categorize root causes, and prepare actionable fix recommendations.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `api-qa-flow`
- Input: test execution report or output (user-provided or from `agents/user-instructions/`)
- Output: `agents/api-qa/{IDENTIFIER}/execution-report.md` with failure analysis and recommendations
- Prerequisite: Phase 5 complete, tests executed by user
- HITL: may need to ask user for test execution results
</workflow_context>

<phase_steps>
1. Obtain test execution results
2. Execute report analysis (Part A of skill)
3. Review findings and update state
</phase_steps>

<execute_analysis step="6.1" subagent="engineer" role="API test failure analyst">
1. USE SKILL `debugging`
2. USE SKILL `api-qa-test-debugging`
3. Execute Part A (Report Analysis) only
4. If test report location unknown, ask user
5. **WAIT** for user to provide results if not found in `agents/user-instructions/`
</execute_analysis>

<review_findings step="6.2">
1. Verify all failures categorized
2. Verify root causes identified
3. Verify patterns analyzed across failures
4. Confirm recommendations are actionable
</review_findings>

<update_state step="6.3">
1. Update `agents/api-qa-state.md`:
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
- Patterns identified across failures
- `execution-report.md` created with all sections
- Clear recommendations for Phase 7
</validation_checklist>

</api_qa_flow_execution_and_report_analysis>
