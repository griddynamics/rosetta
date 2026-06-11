---
name: modernization-flow-reuse
description: "Phase 1 Existing-Library Reuse of modernization-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 1: Existing Library Analysis

## Phase Flow

**Phase 1: Existing Library Analysis**
1. Process each project separately
2. Analyze code and tests
3. Create reference-code-specs files
4. Document interfaces and signatures
5. Document business and tech purpose
6. Analyze usage and visibility
7. List unknowns and assumptions
8. Link implementation and tests
9. Describe test coverage

## Context

**PREREQUISITES:** None

**OBJECTIVES:**
- Create complete, factual specification of existing code
- Understand functionality, requirements, edge cases, and usage
- Identify unknowns and create follow-up tasks
- Use and rely on performance optimizations already applied (we must not downgrade!).
- These project must not be modernized, but could be extended, and definitely must be reused!

## Requirements

- **MUST** process each project separately
- **MUST** create `docs/reference-code-specs-<lib/project>.md` for each project
- **MUST** analyze ALL code AND associated unit tests
- **MUST** use search/grep/tools to discover all relevant details
- **MUST** document findings with evidence (references to actual code)
- **MUST** list all files and create todo tasks systematically

## Address Edge Cases

Edge cases **MUST** be explicitly identified and documented:
- Case sensitivity handling
- Reference parameters and side effects
- Out parameters
- Null/undefined handling
- Boundary conditions
- Error conditions

## Specification Contents (MANDATORY)

Each specification **MUST** include:

1. **Interfaces & Method Signatures & Enums & Other Code Constructs**
   - Full signature with parameters, return types
   - Access modifiers (public, private, internal, protected)
   - Static vs instance

2. **Business/Technology Purpose**
   - What does this code do?
   - Why does it exist?
   - What problem does it solve?

3. **Special Requirements & Edge Cases**
   - Performance requirements
   - Threading/concurrency considerations
   - Transaction handling
   - Security requirements
   - Edge cases identified from tests

4. **Usage Analysis**
   - Who calls this code? (list all callers)
   - What calls this code? (classes, methods, external systems)
   - If PUBLIC: note possible external callers outside codebase

5. **Visibility**
   - public, private, internal, protected
   - Package/assembly visibility

6. **Unknowns**
   - List anything that is unclear or not understood
   - Custom libraries not yet analyzed
   - External dependencies not documented
   - Patterns not yet seen

7. **Assumptions**
   - List all assumptions made during analysis
   - Flag assumptions that need validation

8. **Implementation Links**
   - File path and line numbers for implementation
   - File path and line numbers for corresponding tests

9. **Test Descriptions**
   - Summary of what tests cover
   - Test rules and validation logic
   - Edge cases tested
   - Coverage gaps

## Critical Rules for This Phase

- **NO GENERALIZATION** - Only document facts
- **NO ASSUMPTIONS** - Call out assumptions explicitly
- **NO SUGGESTIONS** - This is specification, not design
- **NO RECOMMENDATIONS** - Only what exists
- **MUST** call out inconsistencies explicitly (byte-to-byte consistency required)
- **MUST** create follow-up tasks for any ambiguity
- **MUST** validate spec completeness before advancing

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

Before proceeding to Phase 2:
- [ ] All required sections present for each project
- [ ] Free from generalizations (only facts documented)
- [ ] All unknowns explicitly called out
- [ ] Evidence provided for all findings
- [ ] Tests analyzed and documented

**DEPENDENTS:** Phase 2 (existing old code analysis) depends on completion of all project specs

