# Vendor binding: TestRail (TMS / test case)

Loaded on demand by `discovery` SKILL.md `<data_collection>` step 2 when the phase resolves the `testrail` binding. Holds the TestRail-specific MCP call shapes, input parsing, field map, redaction targets, failure paths, and validation items. The base SKILL.md owns the general method and the phase-is-SSoT rule — not restated here.

---

## Input parsing (SKILL step 1)

The phase supplies a test case ID or URL. Resolve the numeric case ID:

- **Numeric ID** `12345` or `C12345` (strip the `C` prefix) → use directly.
- **URL** `https://*.testrail.io/index.php?/cases/view/N` or similar → parse the trailing numeric ID.
- **Ambiguous / missing / malformed** → stop per failure path "input-unresolvable". Do NOT guess or pick an arbitrary ID.

## Retrieval (SKILL step 3)

```
get_case(case_id=<resolved id>)
```

- **Custom fields:** if field names are unclear/cryptic, call `get_case_fields`. Discovery failure → record under Custom Fields `Custom field schema unavailable — field names may be cryptic`. Do not stop.

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
| Custom fields | API endpoint, HTTP method, etc. when present; resolve via `get_case_fields` |

Per-field branch: present + non-empty → include (redact first if sensitive); empty/missing → record in gaps with a one-line "missing in TestRail source" note. Do NOT leave blank, assume content, or fabricate.

## Redaction targets (SKILL step 4 → `sensitive-data`)

Step text, preconditions, custom fields, and test-data examples are re-emitted downstream (`raw-data.md` → requirements / test-scenarios / authoring + export, and via the `scenarios-generation` TestRail export binding back into the shared TestRail project) — redact before write:

- **Credentials / tokens / keys / passwords / OAuth secrets** — grep `Bearer `, `Authorization:`, `password:`, `api_key=`, `access_token=`, JWT `eyJ...`, `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY` → `<redacted: bearer token>` / `<redacted: API key>` / `<redacted: password>` / `<redacted: client secret>`.
- **Credentialed / signed URLs** — `https://user:pass@host/...`, `?X-Amz-Signature=`, `?sig=`, `?token=` → redact the `user:pass@` segment or secret query param.
- **DB connection strings** — `postgresql://user:pass@host/db`, `mongodb+srv://user:pass@...` → redact the credential portion only.
- **PII** — real emails (non-`example.com`/`example.org`), phones, card shapes `\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`, real names/account/government IDs in test data → `<redacted: PII — <category>>`.
- **Structural content stays verbatim** — action verbs, expected behaviors, page elements, business rules, endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes. Redaction targets sensitive VALUES, not the structural test description.

Record each redaction in the artifact's redaction section; substitute a clearly-fake placeholder of the same shape when a real value would be the natural example.

## Failure paths (SKILL step 3)

- **Input unresolvable** (no/malformed ID, URL not a recognizable TestRail pattern) → stop, report `discovery/testrail: case ID unresolvable from input "<input>"`, ask for a clean numeric ID or canonical URL. Do NOT guess.
- **MCP transport error** (timeout / 5xx / drop) → retry once same `case_id`; second failure → stop, report the error, ask to verify TestRail MCP configuration.
- **Case-not-found** (404 / empty / "case does not exist") → stop, report `discovery/testrail: case <ID> not found — verify the ID is correct and accessible by the configured credentials`. Do NOT emit a partial/empty artifact, do NOT fabricate fields.
- **Authorization failure** (401/403) → stop, report `discovery/testrail: TestRail rejected the request — case <ID> may exist but is not visible to the configured credentials`, ask to verify credentials / project access.
- **Required field empty** (title/steps/expected results missing) → proceed, record the empty field in gaps, do NOT fabricate; the artifact still emits but flags the gap.
- **`get_case_fields` discovery fails** → proceed with directly-exposed fields + the cryptic-names note above; do not stop.

## Validation items (binding-specific, added to SKILL `<validation_checklist>`)

- `get_case` returned a non-empty case object, else a failure path was followed instead.
- Title, Test Steps, Expected Overall Result present or in gaps; no required field silently blank.
- Each test step has an expected result OR a `gap: expected result missing` marker.
- Read-only: no `update_case` / `add_case` / `delete_case` or equivalent write call was made.
</content>
