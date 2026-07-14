# Vendor binding: TMS / test-case vendor

**Canonical TMS example: TestRail.** The field map and worked identifiers/URLs below illustrate TestRail. For another TMS, preserve the role contract and adapt identifier parsing, requests/calls, fields, URLs, errors, and terminology to that system.

**Operations below are named by capability, not by a fixed tool name.** Resolve each through the configured TMS integration: **get case**, **get case fields** (case-field-schema lookup), and -- write, forbidden in this read-only binding -- case **update / add / delete**.

---

## Input parsing

The phase supplies a test-case handle or URL. Apply the resolved TMS's identifier rules. TestRail example:

- **Numeric ID** `12345` or `C12345` (strip the `C` prefix) → use directly.
- **URL** `https://*.testrail.io/index.php?/cases/view/N` or similar → parse the trailing numeric ID.
- **Other TMS** → parse its stable case key/ID according to its canonical URL/handle shape.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary case.

## Retrieval (`extract + normalize` step)

**Get case** by its resolved numeric ID.

- **Custom fields:** if field names are unclear/cryptic, use **get case fields**. Discovery failure → record under Custom Fields `Custom field schema unavailable -- field names may be cryptic`. Do not stop.

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
| Custom fields | API endpoint, HTTP method, etc. when present; resolve via **get case fields** |

Per-field branch per SKILL `<collection>` step 3 (redact sensitive values first); gap note: `missing in <TMS> source` -- never blank, assume, or fabricate.

**Rendered example** (one normalized case in the phase's output artifact -- one step with a proper expected result, one with the gap marker):

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

## Redaction targets

Highest-risk: **step text, preconditions, custom fields, test-data** -- these re-emit downstream and may be exported back into a shared TMS project. Redact per SKILL `<collection>` step 4; structure stays verbatim.

## Failure paths (SKILL `extract` step)

- **Input unresolvable** → stop, report `data-collection/<tms>: case handle unresolvable from input "<input>"`, ask for a canonical handle/URL for the resolved TMS. Do NOT guess.
- **Integration transport error** → per SKILL `<collection>` step 3 (retry once, then stop + report with the same case handle); ask to verify the configured TMS integration.
- **Case-not-found** → stop, report `data-collection/<tms>: case <handle> not found -- verify the handle and configured access`. Do NOT emit a partial/empty artifact.
- **Authorization failure** (401/403 or provider equivalent) → stop, report `data-collection/<tms>: request rejected -- case <handle> may exist but is not visible to the configured credentials`, ask to verify project access.
- **Required field empty** (title/steps/expected results missing) **or get-case-fields discovery fails** → proceed via the field-map per-field branch above (continue + gap/note, do NOT fabricate or stop); the artifact still emits but flags the gap.

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- **Get case** returned a non-empty case object, else a failure path was followed instead.
- Title, Test Steps, Expected Overall Result present or in gaps; no required field silently blank.
- Each test step has an expected result OR a `gap: expected result missing` marker.
- Read-only: none of the forbidden write operations (see Operations) was called.
