---
name: modernization-flow-testing
description: "Phase 3 Testing (optional) of modernization-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Modernization Phase 3: Test Coverage (OPTIONAL)

## Phase Flow

**Phase 3: Test Coverage (OPTIONAL - Execute only when explicitly requested)**
1. Complete Phase 2 first
2. Analyze existing test coverage
3. Identify gaps in test coverage
4. Create unit tests for uncovered code
5. Achieve 80% code coverage target
6. Document test approach and coverage
7. Integration tests are preferred

## Context

**PREREQUISITES:** Complete Phase 2 (all original code specs created)

**THIS PHASE IS OPTIONAL** - Only execute when explicitly requested in the modernization context or by user.

**OBJECTIVES:**
- Establish baseline test coverage for original code before modernization
- Ensure original behavior is captured in tests for validation during migration
- Achieve 80% code coverage on original codebase
- Document existing behavior through comprehensive tests
- Provide safety net for modernization implementation

## Requirements

- **MUST** process each project separately
- **MUST** analyze existing test coverage using coverage tools
- **MUST** identify code paths not covered by tests
- **MUST** create unit tests for uncovered code
- **MUST** achieve minimum 80% code coverage per project
- **MUST** document test approach in `docs/original-test-coverage-<lib/project>.md`
- **MUST** ensure tests validate actual behavior (not assumed behavior)
- **MUST** use existing tests as reference for style and patterns
- **MUST** create todo tasks for each test file or test suite

## Test Creation Guidelines

### Test Priorities

Focus on testing in this order:
1. **Public APIs** - All public methods and interfaces
2. **Critical Business Logic** - Core functionality and calculations
3. **Edge Cases** - Boundary conditions, null handling, error conditions
4. **Integration Points** - Service calls, database operations, external dependencies

### Test Quality Requirements

- **MUST** test actual behavior (validate against running code where possible)
- **MUST** include edge cases identified in Phase 2 analysis
- **MUST** test error conditions and exception handling
- **MUST** test with realistic data
- **MUST** avoid brittle tests (don't over-specify implementation details)
- **MUST** follow existing test conventions and patterns
- **SHOULD** use descriptive test names explaining what is being tested

### Coverage Analysis

For each project:
1. Run coverage tools to establish baseline
2. Identify files/classes with <80% coverage
3. Analyze which code paths are missing tests
4. Prioritize based on criticality and complexity
5. Create tests to fill gaps
6. Re-run coverage to verify 80% target achieved

## Documentation Requirements

Create `docs/original-test-coverage-<lib/project>.md` for each project including:

1. **Coverage Summary**
   - Overall coverage percentage before/after
   - Coverage by module/namespace
   - Files with <80% coverage (if any)

2. **Test Approach**
   - Testing frameworks and tools used
   - Mocking strategies for dependencies
   - Test data management approach

3. **Coverage Gaps**
   - Areas intentionally not tested (with reasoning)
   - Hard-to-test code (with explanation)
   - Recommendations for future testing

4. **Test Organization**
   - Test file structure and naming conventions
   - How tests map to source files
   - Test categorization (unit, integration, etc.)

## Critical Rules for This Phase

- **DO NOT** modify production code to make it testable (this is original code analysis phase)
- **DO NOT** assume behavior - validate against actual code execution where possible
- **DO NOT** skip complex code - these areas need tests most
- **MUST** ensure tests pass consistently before marking phase complete
- **MUST** document any assumptions made in tests
- **MUST** use mocks/stubs appropriately for external dependencies

## Validation Checkpoint

MUST spawn separate subagent to validate grounding, truthfulness, gaps, consistency, reasoning, and overall completion of the phase.

Before proceeding to Phase 4:
- [ ] All projects have ≥80% code coverage
- [ ] Coverage reports generated and documented
- [ ] Tests are stable and passing
- [ ] Test documentation complete for each project
- [ ] Coverage gaps documented with reasoning
- [ ] Test approach documented

## Important Notes

- This phase provides safety net for modernization by capturing current behavior in tests
- These tests will be ported/adapted during implementation phase (along with original tests)
- Focus on correctness over perfection - tests should validate behavior, not implementation
- If original code has bugs, tests should capture that buggy behavior (document as assumption/unknown)

**DEPENDENTS:** Phase 4 (Class Group Analysis) depends on completion of this phase (if executed)

