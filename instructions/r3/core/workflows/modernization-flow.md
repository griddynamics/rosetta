---
name: modernization-flow
description: "Workflow for converting, modernizing, upgrading, or re-architecting code (e.g. C++→Java, monolith→microservices), etc."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

# Modernization Flow - Execute Phases Sequentially

## Context

This modernization process is designed to systematically analyze, specify, and implement code modernization/migration projects. The process is divided into phases that **MUST be executed one-by-one**.

### Critical Requirements

- **ONE PHASE AT A TIME**: Read one phase file, execute it completely, update state file, then move to next phase.
- **DO NOT SKIP PHASES**: Each phase builds on the previous one.
- **STATE TRACKING**: After each phase, update `agents/modernization-flow-state.md` with completion status, keep this document concise.
- **USER CONFIRMATION**: Wait for user confirmation before proceeding to next phase.
- Make sure to have todo tasks for each phase! Do not skip phases!
- **REMEMBER** Do not put decisions/recommendations/suggestions/implementation code for the next phases in the output documents! The decisions are made at phase 6 and review at phase 7 AFTER full analysis. Respect that.
- **MUST** Create and update files that ARE EXPLICITLY stated here, ASK for permission to create any other file!
- **MUST** use grep/search on large files to read "table of contents" and then use line ranges to read what is needed.
- **MUST** use only applicable phases according to the target of the modernization (acquire user approval first and store it in state), as those phases are for multi-project cross-tech modernization. Do not take shortcuts within the phase!
- Prioritize ACCURACY over SPEED!
- THIS is very large workflow: MUST use best matching available separate subagents for each phase, top level agent is orchestrator, orchestrator must be smart with reading/writing files (avoid, fallback to grep and reading line-ranges, as those are very large)
- Phase subagents must contain additionally: "MUST ACQUIRE <phase.md> FROM KB AND FULLY EXECUTE ALL STEPS", goal, context, original user request, inputs, expected outputs, and summary in the format useful for orchestrator, subagents must be informed they are used as subagents.

### User Customizations

- If user did not specify any preferences perform all steps except optional.
- User CAN customize and ask only for specific steps OR steps could have been done already OR towards specific goal OR for specific case, in this case LISTEN and ADOPT to the user.
- Modernization scope could be small or could be done in place (example: upgrade Java 8 to 17 or 17 to 21), in this case only use `Phase 2` and `Phase 6`, unless you discover dependencies and project becomes bigger.
- If there is no need to rewrite code (example: upgrade .NET 6 to .NET 8), then take original and target code specs LIGHTLY, only document WHAT IS NECESSARY TO CHANGE (example: new way to use app builder).

## Modernization Flow - Phase Overview

**Phase 0: Prerequisites** 
1. All Rosetta prep steps MUST be FULLY completed
2. MUST USE OPERATION_MANAGER for deterministic execution

**Phase 1: Existing Library Analysis for Reusing in Target State** [modernization-flow-reuse.md]
1. ACQUIRE modernization-flow-reuse.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 2: Old Code Analysis, Generating Original Specs** [modernization-flow-analysis.md]
1. ACQUIRE modernization-flow-analysis.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 3: Pre-Modernization Test Coverage (OPTIONAL)** [modernization-flow-testing.md]
**NOTE: Execute this phase if user explicitly approves it**
1. ACQUIRE modernization-flow-testing.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 4: Class Group Analysis** [modernization-flow-grouping.md]
1. ACQUIRE modernization-flow-grouping.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 5: Cross-Project Analysis** [modernization-flow-crossproject.md]
1. ACQUIRE modernization-flow-crossproject.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 6: Implementation Mapping, Generating Target Specs** [modernization-flow-mapping.md]
1. ACQUIRE modernization-flow-mapping.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 7: Final Review** [modernization-flow-review.md]
1. ACQUIRE modernization-flow-review.md FROM KB
2. Execute phase instructions
3. Update `agents/modernization-flow-state.md` with brief state
4. Validate by listing files in respective folders

**Phase 8: Implementation** [modernization-flow-implement.md]
1. ACQUIRE modernization-flow-implement.md FROM KB
2. Get explicit human approval
3. Follow approved target specs
4. Implement one project at-a-time
5. Maintain backward compatibility
6. Write comprehensive tests
7. Achieve 80% code coverage

## State File Format

Create/update `agents/modernization-flow-state.md` briefly after each phase using sample:

```markdown
# Modernization State

**Last Updated**: [Date and Time]
**Current Status**: [Phase Number or COMPLETE]
**Project**: [Project/Feature Name]

## Phase Completion Status

- [x] Phase 1: Existing Library Analysis - Completed [Date]
- [ ] Phase 2: Old Code Analysis - Not Started
- [ ] Phase 3: Test Coverage (OPTIONAL) - Not Started / Skipped
- [ ] Phase 4: Class Group Analysis - Not Started
- [ ] Phase 5: Cross-Project Analysis - Not Started
- [ ] Phase 6: Implementation Mapping - Not Started
- [ ] Phase 7: Final Review - Not Started
- [ ] Implementation Phase - Not Started

## Phase Details

### Phase 1
- Completed: [Date/Time]
- Files Created: [List files]
- Projects Analyzed: [List projects]
- Notes: [Any relevant notes]

[Add similar sections for each completed phase]
```

## Important Notes

- **Sequential Execution Required**: Phases build on each other and must be done in order
- **No Assumptions**: If information is missing, track it in spec files
- **User Guidance**: Ask questions to resolve critical unknowns
- **Evidence-Based**: All findings must reference actual code
- **Get Approval**: Implementation phase requires explicit human approval
