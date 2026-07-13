---
name: testgen-flow
description: "Workflow for generating test cases from requirements (Jira/Confluence), exporting to TestRail, etc."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

# Test Case Generation Flow - Execute Phases Sequentially

## Context

Systematic requirements analysis from Jira tickets and Confluence documentation to structured requirements and test scenarios. Designed for BA/QA engineers and requirements engineers.

### Critical Requirements

- **ONE PHASE AT A TIME**: Read phase file, execute, update state, move to next.
- **DO NOT SKIP PHASES**: Each builds on previous.
- **STATE TRACKING**: Update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase.
- **USER CONFIRMATION**: Wait for approval before next phase.
- **HITL GATE**: Phase 3 (Questions & Answers) requires user input before Phase 4.
- **MUST** use todo tasks for each phase.
- **MUST** create output directory `agents/testgen/{TICKET-KEY}/` at start.

## Test Generation Flow - Phase Overview

**Phase 0: Project Config Loading** [testgen-flow-project-config-loading.md]
1. APPLY PHASE testgen-flow-project-config-loading.md
2. Execute phase instructions
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

**Phase 1: Data Collection** [testgen-flow-data-collection.md]
1. APPLY PHASE testgen-flow-data-collection.md
2. Execute phase instructions
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`
4. Validate by listing raw-data.md file

**Phase 2: Gap & Contradiction Analysis** [testgen-flow-gap-and-contradiction-analysis.md]
1. APPLY PHASE testgen-flow-gap-and-contradiction-analysis.md
2. Execute phase instructions
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`
4. Validate analysis.md with identified gaps

**Phase 3: Question Generation & User Input** [testgen-flow-question-generation.md] ⭐ **HITL APPROVAL GATE**
1. APPLY PHASE testgen-flow-question-generation.md
2. Execute phase instructions
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`
4. **WAIT FOR USER** to fill answers in questions.md

**Phase 4: Requirements Document Generation** [testgen-flow-requirements-document-generation.md]
1. APPLY PHASE testgen-flow-requirements-document-generation.md
2. Execute phase instructions (requires completed answers.md)
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`
4. Validate requirements.md structure

**Phase 5: Test Case Generation** [testgen-flow-test-case-generation.md]
1. APPLY PHASE testgen-flow-test-case-generation.md
2. Execute phase instructions
3. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`
4. Validate test-scenarios.md (10-30 test cases typical)

**Phase 6: Test Case Export** [testgen-flow-test-case-export.md] ⭐
1. APPLY PHASE testgen-flow-test-case-export.md
4. Execute phase instructions
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

## State File Format

Create/update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase:

```markdown
# Test Generation State - <Ticket ID>

**Last Updated**: [DateTime]
**Current Phase**: [1-5 or COMPLETE]
**Jira Ticket**: [TICKET-123]
**Confluence Pages**: [URLs or page IDs]

## Phase Completion Status

- [x] Phase 0: Data Collection - Completed [Date]
- [] Phase 1: Data Collection - Not started
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started
- [ ] Phase 6: TestRail Export - Not Started

## Metrics

- Jira Fields Extracted: X
- Confluence Pages Analyzed: Y
- Contradictions Found: Z
- Gaps Identified: N
- Questions Generated: M
- User Stories Created: P
- Test Scenarios: Q

## Phase Details

### Phase 1
- Completed: [DateTime]
- Jira Ticket: [KEY]
- Files Created: [List]
- Confluence Pages: [Count]
- Notes: [Any relevant notes]

[Add sections for each completed phase]
```

## Output Directory Structure

All phase outputs stored in `agents/testgen/{TICKET-KEY}/`:

```
agents/testgen/{TICKET-KEY}/
├── testgen-state.md        # State tracking (updated each phase)
├── raw-data.md             # Phase 1: Jira + Confluence data
├── analysis.md             # Phase 2: Gap analysis
├── questions.md            # Phase 3: Generated questions
├── answers.md              # Phase 3: User answers (HITL)
├── requirements.md         # Phase 4: Final requirements
└── test-scenarios.md       # Phase 5: Test cases
```

## Important Notes

- **Sequential Execution**: Phases build on each other, must execute in order.
- **No Assumptions**: Document all unknowns and ambiguities.
- **Evidence-Based**: All requirements reference actual Jira/Confluence content.
- **Structured Output**: Follow document templates in phase instructions.
- **Traceability**: Link requirements to source (Jira fields, Confluence sections).
- **Clarity**: Questions must be specific and actionable.
- **Completeness**: Requirements must cover functional, non-functional, constraints.
- **Test Coverage**: Scenarios must include happy path, edge cases, negative tests.

## Prerequisites

- **Jira MCP**: Configured and accessible
- **Jira Ticket**: User provides ticket key or link
- **Confluence Access**: Via Jira MCP (same authentication)
- **Output Directory**: Created at start (`agents/testgen/{TICKET-KEY}/`)

## Common Patterns

### Initial Prompt Formats

**Format 1: Jira Only**
```
Analyze requirements for PROJ-123
```

**Format 2: Jira + Confluence URLs**
```
Analyze requirements for PROJ-123 with Confluence pages:
- https://confluence.company.com/display/PROJ/Job+Post
- https://confluence.company.com/pages/viewpage.action?pageId=123456
```

**Format 3: Jira URL + Confluence URLs**
```
Analyze requirements for https://jira.company.com/browse/PROJ-123
Confluence docs:
- https://confluence.company.com/display/PROJ/Authentication
- https://confluence.company.com/display/PROJ/Security+Requirements
```

### Jira Ticket Input
Accept any format:
- Ticket key: "PROJ-123"
- Jira URL: "https://jira.company.com/browse/PROJ-123"
- Extract key from URL if needed

### Confluence Input
Accept multiple formats:
- **Confluence URLs**: Full page URLs (preferred)
- **Page IDs**: Numeric IDs (e.g., "123456")
- **Page Titles + Space**: "Authentication" in space "PROJ"
- **Or none**: Agent will auto-search based on ticket

### Confluence Search Strategy
1. **If user provided Confluence URLs**: Use those directly, skip search
2. **If no URLs provided**: Auto-search using ticket labels, components, project key
3. Search CQL: `type=page AND space=PROJ AND text ~ 'feature'`
4. Get top 3-5 most relevant pages
5. Always check for child pages (nested documents)
6. Fallback: Ask user for specific page IDs/titles if needed

### Contradiction Types
- **Value Mismatch**: Same field, different values (e.g., priority High vs Medium)
- **Logic Conflict**: Incompatible requirements (e.g., must be fast AND detailed)
- **Scope Conflict**: Different understanding of feature boundaries

### Gap Types
- **Missing Info**: Required field/detail not present
- **Incomplete Spec**: Partial information, needs clarification
- **Undefined Behavior**: Edge cases not specified
- **Missing Dependencies**: Referenced components/systems not documented

## User Interaction Points

1. **Start**: User provides Jira ticket key (optionally with Confluence URLs)
2. **Phase 1**: Agent extracts data; asks for more Confluence pages only if needed
3. **Phase 3**: User fills answers in questions.md, notifies agent
4. **Phase 4**: User reviews and approves requirements.md
5. **Phase 5**: User reviews test-scenarios.md
6. **Phase 6**: User creates TestRail section, confirms export

## Validation Rules

- **Phase 1**: raw-data.md must contain both Jira and Confluence sections
- **Phase 2**: analysis.md must list specific contradictions/gaps with evidence
- **Phase 3**: questions.md must have at least 1 question; answers.md validated before Phase 4
- **Phase 4**: requirements.md must have user stories with acceptance criteria
- **Phase 5**: test-scenarios.md must have TestRail-compatible format with priorities
- **Phase 6**: At least 80% of test cases exported to TestRail successfully

## Error Handling

- **Jira ticket not found**: Ask user to verify ticket key
- **No Confluence results**: Ask user for specific page IDs or proceed with Jira only
- **User doesn't answer questions**: Remind user, cannot proceed to Phase 4
- **Incomplete requirements**: Identify gaps, add to questions for clarification

## Next Steps After Completion

1. Use `requirements.md` for development implementation
2. **Phase 6**: Export test cases to TestRail
4. Link both documents to Jira ticket (as attachments or comments)
5. Archive testgen-state.md and all outputs for traceability

## TestRail Export (Phase 6)

**When to use Phase 6**:
- You want test cases in TestRail for execution tracking
- Your team uses TestRail for test management
- You need integration with TestRail test runs

**Configuration** (default):
- **Project ID**: <clarify with user>
- **Suite ID**: <clarify with user>
- **Section**: New section created per Jira ticket

**To trigger Phase 6**, after Phase 5 say:
- "Export to TestRail"
- "Upload test cases to TestRail"
- "Continue to Phase 6"

