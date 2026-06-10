---
name: modernization-flow-review
description: "Phase 7 Review of modernization-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 7: Final Review

## Phase Flow

**Phase 7: Final Review**
1. Complete Phase 6 first
2. Review all specs together
3. Check pattern consistency
4. Verify cross-project flows
5. Cleanup final unknowns
6. Request user clarifications
7. Update all documentation

## Context

**PREREQUISITES:** Complete Phase 6 (all target code specs created)

**OBJECTIVES:**
- Final consistency check across all target specs
- Ensure all inter-project dependencies accounted for
- Validate patterns are consistent
- Confirm all handoffs documented
- Validate migration / modernization priorities

## Requirements

- **MUST** review ALL `docs/reference-code-specs-<lib/project>.md` files together
- **MUST** review ALL `docs/source-code-specs-<lib/project>.md` files together
- **MUST** review ALL `docs/target-code-specs-<lib/project>.md` files together
- **MUST** review and update `docs/cross-project-analysis-<feature>.md` file
- **MUST** check for patterns and inconsistencies
- **MUST** verify cross-project flows are captured
- **MUST** update those files as necessary
- **MUST NOT** create any NEW files!
- **MUST** check assumptions and unknowns and cleanup those which are addressed (update respective parts of te original document and remove element completely from this section). 
- **MUST** Request information from the user that is required for the modernization! Must not proceed if not properly addressed by the user! Remember this is the final check, any unknowns left will lead to problems!

## Review Focus

1. **Pattern Consistency**
   - Are similar problems solved similarly?
   - Are patterns consistently applied?

2. **Cross-Project Interactions**
   - All handoffs captured?
   - All interfaces defined?
   - All dependencies clear?

3. **Completeness**
   - All edge cases addressed?
   - All public APIs mapped?
   - All service replacements defined?

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

Before marking as complete, validate in memory! do not write this section!
- [ ] All final documentation phases executed
- [ ] All inter-project dependencies accounted for
- [ ] Patterns consistent across projects
- [ ] Ready for implementation phase

**DEPENDENTS:** Implementation can begin after final review complete

