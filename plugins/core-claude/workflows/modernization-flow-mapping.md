---
name: modernization-flow-mapping
description: "Phase 6 Implementation Mapping of modernization-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 6: Implementation Mapping

## Phase Flow

**Phase 6: Implementation Mapping**
1. Complete Phase 5 first
2. Define technical approaches
3. Compare multiple alternatives
4. Map source to target
5. Identify supporting libraries
6. Address edge cases
7. Ensure backward compatibility
8. Create target-code-specs files
9. Emphasize port file-by-file

## Context

**PREREQUISITES:** Complete Phase 5 (cross-project analysis)

**OBJECTIVES:**
- Define technical approaches for modernization
- Identify and compare multiple options (especially with edge cases)
- Map source code to target code
- Identify supporting libraries and packages
- Address all edge cases and special requirements
- Identify at least three alternatives (in memory)
- Validate backward compatibility and overall modernization goals instead of just modern best practices, think about side affects, reason WHY did you choose one alternative (in memory)
- Validate your alternative vs existing code (in memory)
- Document only selected alternative, reasons, side affects, and very briefly the other alternatives reviewed
- Design principle: backward compatibility (names, signature, behavior) and less code is better
- In case of strong cases of idiomatic target make sure to have two implementations: compatible non-idiomatic and idiomatic new (examples: original enumerator methods and normal IEnumerable implementation, original methods with refs/outs and new methods, original methods and new properties, new async methods)
- YOU MUST EMPHASIS IN THE OUTPUT DOCUMENT:
  * Backward compatibility is a MUST, additional ctor/fields/properties/methods/classes/enums are allowed.
  * To PORT code file-by-file, class by class, method by method, re-read-source-write-target one-by-one. Do not reinvent! Require creation of todo tasks.
  * To PORT tests! Test by test, re-read-source-write-target one-by-one! Require creation of todo tasks.
  * To VALIDATE all tests and code from target matching the source (logic and contract).
- YOU MUST STRESS IN THE OUTPUT DOCUMENT:
  * To perform code and tests file-by-file comparison source vs target of original and implemented *contract* and *logic*, until there are no gaps and inconsistencies, re-read both source and target.
  * To perform EXACT behavior copy, excluding async and enumerators.
  * To put mapping which file to match to which file.
  * To implement async and enumerators.
  * To update `docs/target-code-specs-<lib/project>.md` to match ACTUAL implementation with actual contracts, paths, API, async, additional methods/properties, enumerables implemented AS IF it was planned so good (DO NOT: create new sections, green checkboxes, "implemented" statuses, and so on).

## Requirements

- **MUST** process each project separately
- **MUST** re-read `docs/cross-project-analysis.md`
- **MUST** re-read matching `docs/original-code-specs-<lib/project>.md`
- **MUST** re-read both incoming/outgoing dependency if those exist `docs/target-code-specs-<lib/project>.md`
- **MUST** create `docs/target-code-specs-<lib/project>.md` for each project
- **MUST** analyze each source spec file separately
- **MUST** suggest technical approaches and supporting libraries
- **MUST** include 3rd-party packages when appropriate
- **MUST** pay attention to performance optimizations already applied (we must not degrade, but can improve!)
- **MUST NOT** contain implementation code. This document GUIDES implementation.

## Target Specification Contents

For each class or enum or any language construct, specify:

1. **Source to Target Mapping**
   - Source file path → Target file path
   - Source class → Target class
   - Source methods → Target methods (signatures only, NO code)

2. **Implementation References**
   - Track references to old implementation
   - Note what depends on this class
   - Cross-reference with source spec

3. **Edge Cases & Special Requirements**
   - Which edge cases from source are matched in target?
   - Which are changed? (document why)
   - How are they handled differently?

4. **Technical Approach**
   - Which libraries/frameworks to use?
   - Which patterns to apply?
   - Proposed architecture

5. **Supporting Libraries**
   - Standard libraries (language/framework)
   - 3rd-party packages (specify versions)
   - Custom utilities

6. **Public API Compatibility**
   - How is public API preserved?
   - What changes to public API? (requires approval)
   - Internal changes allowed

## Design Principles

- **MUST** focus on reliable, consistent, minimal code
- **SHOULD** leverage modern language features
- **SHOULD** use standard libraries over custom code
- **SHOULD** prefer established 3rd-party libraries over custom solutions
- **MUST** maintain public API compatibility (and document any required changes)

## Unresolved Items

- **MUST** create explicit tasks for unresolved items
- **MUST** document assumptions
- **MUST** call out unknowns

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

After implementation mapping:
- [ ] Mapping completeness verified
- [ ] Traceability ensured (source → target clear)
- [ ] Edge cases addressed
- [ ] Libraries identified
- [ ] Public API compatibility verified or documented

**DEPENDENTS:** Phase 7 (Final Cross-Project Review) depends on all target specs

