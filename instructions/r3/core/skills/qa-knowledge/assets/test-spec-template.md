# API-QA test-spec template (asset of the `qa-knowledge` skill)

QA test-specs.md skeleton — Summary, Given-When-Then ATC scenarios, file mapping, shared utilities, execution order.

<test-spec-template>

Skeleton for `plans/api-qa-{IDENTIFIER}/test-specs.md`. The phase owns the section list and the scenario taxonomy; the skill emits Given-When-Then ATC entries into this shape. (outer fence uses 4 backticks so the inner `markdown` example with 3 backticks does not terminate it)

````markdown
# QA Test Specifications - [IDENTIFIER]

**Created**: [DateTime]
**Phase**: 4 - Test Case Specification
**Source Test Cases**: [List source references]

---

## Summary

- **Total Test Scenarios**: [Count]
- **Priority Breakdown**: P0: [N], P1: [N], P2: [N], P3: [N]
- **Type Breakdown**: Happy Path: [N], Negative: [N], Auth: [N], Edge Case: [N]
- **Endpoints Covered**: [Count]
- **Test Files Planned**: [Count]

---

## Test Scenarios

### Endpoint: [METHOD] [PATH]

[All ATC-NNN specifications for this endpoint — one per scenario]

**ATC-NNN naming:** `ATC` = API Test Case, `NNN` = zero-padded sequence (`ATC-001`, `ATC-002`, …). Use a continuous sequence across all endpoints in this file.

**Worked example of one ATC-NNN GWT specification:**

```markdown
#### ATC-001: GET /api/v1/orders/{orderId} returns order when ID exists

**Priority:** P0  **Type:** Happy Path  **Source:** TC-42 (raw-data.md), G3 (analysis.md gap)

**Given:**
- Authenticated user with role `customer`
- Order `o-12345` exists in the system with status `PAID`, customer_id matches authenticated user

**When:**
- `GET /api/v1/orders/o-12345`
- Headers: `Authorization: Bearer <token>`, `Accept: application/json`
- Body: (none)

**Then:**
- Status: `200 OK`
- Response body matches schema `Order` (per api-analysis.md)
- `body.id == "o-12345"`
- `body.status == "PAID"`
- `body.customer_id == <authenticated user id>`
- Response time < 500ms (NFR target from analysis.md)
```

---

## Test File Mapping
**Required content:** for each ATC-NNN, the planned target test file (e.g., `tests/api/orders.test.js`), the test name (function/describe block), and any reusable fixtures. One row per ATC-NNN.

## Shared Utilities
**Required content:** auth helpers, request builders, response validators, data factories, and teardown utilities to be created or reused. List each with its purpose and target file path.

## Execution Order
**Required content:** ordered list of test groups including any dependencies (e.g., create-then-read flows must run sequentially). Mark each as independent / sequential / setup-required.

## Assumptions
List any assumptions from Phase 3 that affect these specs **plus any new assumptions introduced during specification** (e.g., guessed boundary values, default headers, fixture sizes). Cite source for each.
````

</test-spec-template>
