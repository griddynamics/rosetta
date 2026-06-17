# Vendor binding: TestRail (TMS / test case)

Loaded on demand by `discovery` SKILL.md `<data_collection>` step 2 when the phase resolves the `testrail` binding. Holds the TestRail-specific MCP call shapes, input parsing, field map, redaction targets, failure paths, and validation items. The base SKILL.md owns the general method and the phase-is-SSoT rule — not restated here.

**MCP method names below (`mcp_testrail_get_case`, `mcp_testrail_get_case_fields`, and the update/add/delete write calls) are illustrative of one common TestRail MCP server — not a hardcoded contract.** Resolve the actual tool from the configured TestRail MCP binding; if it names operations differently, map by capability: get-case, case-field-schema lookup, and (write — forbidden in this read-only binding) case update/add/delete.

---

## Input parsing (SKILL step 1)

The phase supplies a test case ID or URL. Resolve the numeric case ID:

- **Numeric ID** `12345` or `C12345` (strip the `C` prefix) → use directly.
- **URL** `https://*.testrail.io/index.php?/cases/view/N` or similar → parse the trailing numeric ID.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary ID.

## Retrieval (SKILL step 3)

```
# illustrative — call the configured TestRail MCP's get-case tool; this literal name is not a contract
mcp_testrail_get_case(case_id=<resolved id>)
```

- **Custom fields:** if field names are unclear/cryptic, call `mcp_testrail_get_case_fields`. Discovery failure → record under Custom Fields `Custom field schema unavailable — field names may be cryptic`. Do not stop.

## Field map (normalize into the phase's section)

| Field | Notes |
|---|---|
| Case ID + Title | Title required; empty → gap |
| Section path | section the case lives under |
| Priority / Type | |
| Test Goal | what is being tested and why |
| Preconditions | list; `None` if absent |
| Test Steps | step-by-step actions, each with an expected result; a step missing its expected result is a gap (`gap: expected result missing`), not an acceptable record |
| Expected Overall Result | required; empty → gap |
| Custom fields | API endpoint, HTTP method, etc. when present; resolve via `mcp_testrail_get_case_fields` |

Per-field branch: present + non-empty → include (redact first if sensitive); empty/missing → record in gaps with a one-line "missing in TestRail source" note. Do NOT leave blank, assume content, or fabricate.

**Rendered example** (one normalized case in `raw-data.md` — one step with a proper expected result, one with the gap marker):

```markdown
### C12345 — Refund a paid order
- **Section:** Billing / Refunds · **Priority:** High · **Type:** Functional
- **Test Goal:** verify a paid order can be fully refunded
- **Preconditions:** order `o-12345` exists with status `PAID`
- **Steps:**
  1. POST /api/v1/orders/o-12345/refund → Expected: status 200, `body.status == "REFUNDED"`
  2. GET /api/v1/orders/o-12345 → Expected: `gap: expected result missing`
- **Expected Overall Result:** order shows `REFUNDED`; refund recorded
```

## Redaction targets (SKILL step 4 → `sensitive-data`)

Highest-risk TestRail fields: **step text, preconditions, custom fields, and test-data examples** — these re-emit downstream (`raw-data.md` → requirements / test-scenarios / authoring, and via the `scenarios-generation` TestRail export binding back into the shared TestRail project). Scan every captured value and redact per the canonical scope — `qa-knowledge/references/redaction-scope.md` — applied via `sensitive-data`. Structural content (action verbs, expected behaviors, endpoint paths, methods, status codes, field names, schema shapes) stays verbatim. Record each redaction in the artifact's redaction section.

## Failure paths (SKILL step 3)

- **Input unresolvable** (no/malformed ID, URL not a recognizable TestRail pattern) → stop, report `discovery/testrail: case ID unresolvable from input "<input>"`, ask for a clean numeric ID or canonical URL. Do NOT guess.
- **MCP transport error** (timeout / 5xx / drop) → retry once same `case_id`; second failure → stop, report the error, ask to verify TestRail MCP configuration.
- **Case-not-found** (404 / empty / "case does not exist") → stop, report `discovery/testrail: case <ID> not found — verify the ID is correct and accessible by the configured credentials`. Do NOT emit a partial/empty artifact, do NOT fabricate fields.
- **Authorization failure** (401/403) → stop, report `discovery/testrail: request rejected — case <ID> may exist but is not visible to the configured credentials`, ask to verify credentials / project access.
- **Required field empty** (title/steps/expected results missing) → proceed, record the empty field in gaps, do NOT fabricate; the artifact still emits but flags the gap.
- **`mcp_testrail_get_case_fields` discovery fails** → proceed with directly-exposed fields + the cryptic-names note above; do not stop.

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- `mcp_testrail_get_case` returned a non-empty case object, else a failure path was followed instead.
- Title, Test Steps, Expected Overall Result present or in gaps; no required field silently blank.
- Each test step has an expected result OR a `gap: expected result missing` marker.
- Read-only: no `mcp_testrail_update_case` / `mcp_testrail_add_case` / `mcp_testrail_delete_case` or equivalent write call was made.
