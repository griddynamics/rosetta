---
name: testgen-flow
description: MUST apply when test case generation task is assigned. (e.g if a user asks to generate test cases for TICKET-123, create test scenarios from Jira, analyze requirements and generate tests, export tests to Test Management System)
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<testgen_flow>

<description_and_purpose>

Systematic requirements analysis from Jira tickets and Confluence documentation to structured requirements and test scenarios. Extracts data, identifies gaps, clarifies unknowns via HITL, generates requirements document, and produces test cases with optional export to a Test Management System. Designed for BA/QA engineers and requirements engineers.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL PHASES ARE SEQUENTIAL.
- ONE PHASE AT A TIME: Acquire phase file, execute, update state, move to next.
- DO NOT SKIP PHASES: Each builds on previous.
- STATE TRACKING: Update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase.
- USER CONFIRMATION: Wait for approval before next phase.
- MUST use todo tasks for tracking progress.
- MUST create output directory `agents/testgen/{TICKET-KEY}/` at start.

<project_config_loading phase="0" subagent="discoverer" role="Project configuration analyst" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. ACQUIRE `testgen-flow-project-config-loading.md` FROM KB
2. Execute phase instructions.
3. Input: user request with Jira ticket key/URL. Output: `agents/testgen/{TICKET-KEY}/initial-data.md`, project config file.
4. Recommended skills: `questioning`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</project_config_loading>

<data_collection phase="1" subagent="discoverer" role="Requirements data collector" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. ACQUIRE `testgen-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: initial user request, initial-data.md. Output: `agents/testgen/{TICKET-KEY}/raw-data.md` with Jira + Confluence data.
4. Recommended skills: `mcp-jira-data-collection`, `mcp-confluence-data-collection`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</data_collection>

<gap_and_contradiction_analysis phase="2" subagent="architect" role="Requirements gap analyst" subagent_recommended_model="claude-opus-4-6, gpt-5.4-high">

1. ACQUIRE `testgen-flow-gap-and-contradiction-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw-data.md. Output: `agents/testgen/{TICKET-KEY}/analysis.md` with contradictions, gaps, ambiguities.
4. Recommended skills: `gap-and-contradiction-analysis`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</gap_and_contradiction_analysis>

<question_generation phase="3" subagent="architect" role="Requirements clarification analyst" subagent_recommended_model="claude-opus-4-6, gpt-5.4-high" type="HITL">

1. ACQUIRE `testgen-flow-question-generation.md` FROM KB
2. Execute phase instructions.
3. Input: analysis.md. Output: `agents/testgen/{TICKET-KEY}/questions.md`, `agents/testgen/{TICKET-KEY}/answers.md`.
4. **WAIT FOR USER** to fill answers in questions.md. Explicit approval required.
5. Recommended skills: `questioning`
6. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</question_generation>

<requirements_document_generation phase="4" subagent="architect" role="Requirements engineer" subagent_recommended_model="claude-opus-4-6, gpt-5.4-high">

1. ACQUIRE `testgen-flow-requirements-document-generation.md` FROM KB
2. Execute phase instructions.
3. Input: raw-data.md + analysis.md + answers.md. Output: `agents/testgen/{TICKET-KEY}/requirements.md`.
4. Recommended skills: `requirements-synthesis`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</requirements_document_generation>

<test_case_generation phase="5" subagent="engineer" role="Test case design engineer" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. ACQUIRE `testgen-flow-test-case-generation.md` FROM KB
2. Execute phase instructions.
3. Input: requirements.md. Output: `agents/testgen/{TICKET-KEY}/test-scenarios.md`
4. Recommended skills: `testrail-test-case-authoring`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_generation>

<test_case_export phase="6" subagent="engineer" role="Test case export specialist" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium" type="HITL">

1. ACQUIRE `testgen-flow-test-case-export.md` FROM KB
2. Execute phase instructions.
3. Input: test-scenarios.md. Output: test cases exported to Test Management System.
4. **WAIT FOR USER** to provide target location and confirm export.
5. Recommended skills: `testrail-test-case-export` 
6. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_export>

</workflow_phases>

<state_file>

Create/update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase:

```markdown
# Test Generation State - <Ticket ID>

**Last Updated**: [DateTime]
**Current Phase**: [0-6 or COMPLETE]
**Jira Ticket**: [TICKET-KEY]

## Phase Completion Status

- [x] Phase 0: Project Config Loading - Completed [Date]
- [ ] Phase 1: Data Collection - Not started
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started
- [ ] Phase 6: Test Case Export - Not Started

## Phase Details

### Phase 1
- Completed: [DateTime]
- Jira Ticket: [KEY]
- Files Created: [List]
- Confluence Pages: [Count]
- Notes: [Any relevant notes]

[Add sections for each completed phase]
```

</state_file>

<output_directory>

All phase outputs stored in `agents/testgen/{TICKET-KEY}/`:

```
agents/testgen/{TICKET-KEY}/
├── testgen-state.md        # State tracking (updated each phase)
├── initial-data.md         # Phase 0: Initial user input + project config ref
├── raw-data.md             # Phase 1: Jira + Confluence data
├── analysis.md             # Phase 2: Gap analysis
├── questions.md            # Phase 3: Generated questions
├── answers.md              # Phase 3: User answers (HITL)
├── requirements.md         # Phase 4: Final requirements
└── test-scenarios.md       # Phase 5: Test cases
```

</output_directory>

<references>

Subagents:
- `discoverer` (Lightweight): external MCP data gathering, project setup
- `architect` (Full): gap analysis, question generation, requirements engineering
- `engineer` (Full): test case generation, TMS export

Skills:
- `questioning`, `reverse-engineering`, `requirements-synthesis`, `testrail-test-case-authoring`
- `mcp-jira-data-collection`, `mcp-confluence-data-collection`
- `gap-and-contradiction-analysis`
- `testrail-test-case-export` 

MCPs:
- `Atlassian Jira` — ticket data extraction
- `Atlassian Confluence` — documentation retrieval
- `TestRail` — test case export (Phase 6, when TMS is TestRail)
- `Google Drive` — additional documentation (if configured)

</references>

<best_practices>

- Sequential execution only: each phase builds on the previous
- No assumptions: document all unknowns, ask user via HITL gates
- Evidence-based: all requirements reference actual Jira/Confluence content
- Traceability: link requirements to source and test cases to requirements

</best_practices>

<validation_checklist>

- Each phase has corresponding output file in output directory
- State file reflects accurate phase completion status
- HITL gates (Phase 3, 6) have explicit user approval evidence
- Requirements trace back to Jira/Confluence sources
- Test cases trace back to requirements

</validation_checklist>

<pitfalls>

- Skipping Phase 3 HITL gate leads to assumptions in requirements
- Confluence child pages often contain critical detail — always check for children
- TMS MCP may lack container creation — user may need to create target locations manually in TMS UI
- Merging redundant test cases too aggressively can lose coverage

</pitfalls>

</testgen_flow>
