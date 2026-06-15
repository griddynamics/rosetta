---
name: modernization-flow-grouping
description: "Phase 4 Class Grouping of modernization-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 4: Class Group Analysis

## Phase Flow

**Phase 4: Class Group Analysis**
1. Complete Phase 2 (or Phase 3 if executed) first
2. Identify tightly-coupled classes
3. Define bounded contexts
4. Map flows between groups
5. Trace dependencies deeply
6. Update original-code-specs files

## Context

**PREREQUISITES:** Complete Phase 2 (all original code specs created), and Phase 3 if executed

**OBJECTIVES:**
- Identify tightly-coupled classes (bounded contexts)
- Map flows between class groups
- Trace dependencies deep (2-3 levels minimum)
- Connect cross class group flows

## Requirements

- **MUST** treat each output file as a **SEPARATE TASK**
- **MUST** process each project separately
- **MUST** update the same `docs/original-code-specs-<lib/project>.md` file (append to existing)
- **MUST** place class group definitions at the top of the file

## Define Class Groups

**IMPORTANT**: A **class group** is a collection of tightly-coupled classes that work together within a single project to provide a cohesive capability. Class groups are identified within bounded contexts and represent classes that:
- Share data or state (technical coupling)
- Provide related business functionality (business cohesion)
- Have frequent interactions and dependencies
- Form a natural unit within the project structure

For each class group, document:
- **Name**: Descriptive name for the class group
- **Classes**: List all classes in the group
- **Purpose**: What business/technical capability does this group provide?
- **Boundaries**: What defines the boundary of this group?
- **Internal Cohesion**: How are classes coupled within the group?

## Map Flows

- **MUST** map flows between class groups
- **MUST** trace at least 2-3 steps deep
- **MUST** connect cross class group flows
- **MUST** identify dependencies and call chains
- **MUST** document flow direction and data passed

## Evidence Required

- **MUST** reference all findings with evidence
- **MUST** provide grep/search results
- **MUST** include file paths and line numbers
- **MUST** show actual code references

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

After each class group analysis, validate (in memory! do not write this section!):
- [ ] Class group mappings supported by explicit findings (validate in 1-2 lines)
- [ ] Flows traced with evidence
- [ ] Dependencies clearly mapped
- [ ] Cross class group interactions identified

**DEPENDENTS:** Phase 5 (Cross-Project Analysis) depends on completion of all class group analyses

