---
name: modernization-flow-crossproject
description: "Phase 5 Cross-Project Analysis of modernization-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 5: Cross-Project Analysis

## Phase Flow

**Phase 5: Cross-Project Analysis**
1. Complete Phase 4 first
2. Identify similarities and inconsistencies
3. Document patterns across projects
4. Map cross-project flows
5. Document proxy patterns
6. Cleanup assumptions and unknowns
7. Identify migration priority order
8. Create cross-project-analysis file
9. Compact and re-validate

## Context

**PREREQUISITES:** Complete Phase 4 (all class group analyses complete)

**OBJECTIVES:**
- Identify similarities and inconsistencies across projects
- Identify patterns used across projects
- Map cross-project usage and references
- Document proxy patterns and replacement opportunities
- Cleanup assumptions and unknowns
- Identify migration / modernization priority order

## Implement Flow Phases

1. Read all source files required
2. Create `docs/cross-project-analysis.md`
3. Update all `docs/original-code-specs-<lib/project>.md`
4. Revalidate changes are complete, consistent, and full

## Requirements

- **MUST** analyze ALL `docs/reference-code-specs-<lib/project>.md` files together
- **MUST** analyze ALL `docs/original-code-specs-<lib/project>.md` files together (and update!)
- **MUST** analyze both `docs/LEGACY-INTERFACES-CATALOG.md`, `docs/TODO.md` (if they exist).
- **MUST** create todo tasks for each phase and also split phase for each original code spec file to update. Also split validation phase as well.
- **MUST** update original-* files in place to add cross-project flows and dependencies, put direct references to reference-* and other original-* files. 
- **MUST** create explicit follow-up tasks for ambiguities
- **MUST** create `docs/cross-project-analysis.md` as a single file!
- **MUST** check assumptions and unknowns and cleanup those which are addressed (update respective parts of te original document and remove element completely from this section).
- **MUST** create tasks to compact used context of LLM, then tasks to re-read all files to perform full re-read and re-validation of contents to be completed work. Do not output new file or any summary, just fix gaps, issues, inconsistencies.

## Analysis Focus Areas

1. **Similarities**
   - Common patterns across projects
   - Shared libraries or utilities
   - Consistent naming conventions
   - Similar architectural approaches

2. **Inconsistencies**
   - Different approaches to same problem
   - Naming inconsistencies
   - Pattern variations
   - Conflicting implementations

3. **Patterns**
   - Recurring design patterns
   - Common code structures
   - Shared idioms

4. **Cross-Project Usage/References**
   - Which projects call which projects?
   - Shared data structures
   - Common interfaces
   - Service dependencies

## Proxy Pattern Analysis

- **MUST** highlight local proxy patterns (e.g., client classes calling legacy services)
- **MUST** identify service boundaries
- **MUST** document flows for proxy replacements
- Examples: Replace with repository pattern, gRPC, HTTP/REST, etc.

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

Before proceeding to Phase 6:
- [ ] Cross-project flows documented without omissions
- [ ] Similarities and inconsistencies identified
- [ ] Patterns documented with evidence
- [ ] Proxy patterns identified for replacement
- [ ] Follow-up tasks created for ambiguities

**DEPENDENTS:** Phase 6 (Implementation Mapping) depends on cross-project analysis

