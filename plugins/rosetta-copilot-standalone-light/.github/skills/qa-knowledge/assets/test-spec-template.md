# API-AQA test-spec template

QA test-specs.md skeleton -- Summary, Given-When-Then ATC scenarios, file mapping, shared utilities, execution order.

<test-spec-template>

Skeleton for `plans/api-aqa-{IDENTIFIER}/test-specs.md`. The shape already in context; the skill emits Given-When-Then ATC entries into this shape. (Outer fence = 4 backticks so the inner 3-backtick example doesn't terminate it.)

````markdown
# QA Test Specifications - [IDENTIFIER]

**Created**: [DateTime]
**Phase**: 4 - Test Case Specification
**Source Test Cases**: [List source references]

---

## Summary

- **Total Test Scenarios**: [Count]
- **Priority Breakdown**: P0: [N], P1: [N], P2: [N], P3: [N]
- **Type Breakdown**: Happy Path: [N], Negative: [N], Auth: [N], Resource: [N], Edge Case: [N]
- **Endpoints Covered**: [Count]
- **Test Files Planned**: [Count]

---

## Test Scenarios

### Endpoint: [METHOD] [PATH]

[All ATC-NNN specifications for this endpoint -- one per scenario]

**ATC-NNN naming:** `ATC` = API Test Case; `NNN` = zero-padded, continuous across all endpoints in this file (`ATC-001`, `ATC-002`, …).

Each `ATC-NNN` entry follows the Given-When-Then ATC template + scenario taxonomy + worked examples -- READ SKILL FILE `references/gwt-spec.md`; do not restate the format here.

---

## Test File Mapping
One row per ATC-NNN: target test file (e.g. `tests/api/orders.test.js`), test name (function/describe block), reusable fixtures.

## Shared Utilities
List each auth helper, request builder, response validator, data factory, teardown utility to create/reuse -- with purpose + target file path.

## Execution Order
Ordered list of test groups with dependencies (e.g. create-then-read runs sequentially). Mark each independent / sequential / setup-required.

## Assumptions
List Phase-3 assumptions affecting these specs **plus new ones introduced during specification** (guessed boundary values, default headers, fixture sizes). Cite source for each.
````

</test-spec-template>
