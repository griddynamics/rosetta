---
name: modernization-flow-analysis
description: "Phase 2 Code Analysis of modernization-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 2: Old Code Analysis

## Phase Flow

**Phase 2: Old Code Analysis**
1. Complete Phase 1 first
2. Process each project separately
3. Analyze code and tests
4. Create original-code-specs files
5. Document legacy services and dependencies
6. Analyze database objects
7. Document interfaces and signatures
8. Document business purpose
9. Analyze usage and visibility
10. List unknowns and assumptions
11. Link implementation and tests

## Context

**PREREQUISITES:** Complete Phase 1 (all reference code specs created)

**OBJECTIVES:**
- Create complete, factual specification of existing code
- Understand functionality, requirements, edge cases, and usage
- Identify unknowns and create follow-up tasks
- Validate compatibility with modernization target (e.g., Linux support, containerization, cloud-native, etc.)
- Identify services that need replacement (replace with package references or gRPC/HTTP/REST)
- CRITICAL! Identify and maintain original libraries, namespaces, folders, names of classes, methods, interfaces, enums, etc -> so all coding constructs to maintain full names for easy upgrade of dependent libraries (Exception is platform-specific objects and ASYNC methods). Pay attention to modifiers like "ref", "out", "&". Preserve original contracts! Provide additional non-breaking features like access to underlying native objects, enumerators, properties, etc.
- Use appropriate exceptions instead of custom exceptions where appropriate.
- Use and rely on performance optimizations already applied (we must not downgrade!).
- New code will use migrated code, old code will still use old code (so no need to maintain obsolete services or other proxies => use package references OR gRPC/HTTP communication)

## Requirements

- **MUST** process each project separately
- **MUST** create `docs/original-code-specs-<lib/project>.md` for each project
- **MUST** analyze ALL code AND associated unit tests
- **MUST** use search/grep/tools to discover all relevant details
- **MUST** document findings with evidence (references to actual code)
- **MUST** document all service instantiation calls and service providers (including, identifier, purpose, what is used, and references to existing implementation code, identify is it just PROXY or used extensibility or other use case).
- **MUST** document briefly usage of frameworks/services with a brief list of used **features** and methods called (no code, but references).
- **MUST** analyze database schema files (if applicable) to identify database objects used by code:
  - **CRITICAL:** Database files can be HUGE - **DO NOT read/parse entire files!**
  - **USE codebase_search OR grep** to find specific object names (tables, procedures, functions, views, types). **Note: grep is more specific** with regex patterns, but incorrect regex may not find existing content.
  - Example: If code calls `apiGetUserByName`, use `codebase_search` or `grep "CREATE PROCEDURE.*apiGetUserByName"` to find it
  - Example: If code queries `Resources` table, use `codebase_search` or `grep "CREATE TABLE.*Resources"`
  - **Keep database analysis output BRIEF** - list only database objects actually used by the code being analyzed, with line references for context.
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

Before proceeding to Phase 3:
- [ ] All required sections present for each project
- [ ] Free from generalizations (only facts documented)
- [ ] All unknowns explicitly called out
- [ ] Evidence provided for all findings
- [ ] Tests analyzed and documented

**DEPENDENTS:** Phase 3 or 4 (Test Coverage or Class Group Analysis) depends on completion of all project specs

