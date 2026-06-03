---
name: mcp-testrail-data-collection
description: Extract test case data from TestRail MCP — case details, steps, preconditions, expected results.
tags: ["data-collection", "mcp", "testrail"]
baseSchema: docs/schemas/skill.md
---

<mcp-testrail-data-collection>

<role>TestRail data extraction specialist</role>

<when_to_use_skill>
Extract structured test case data from TestRail when test case ID or URL is provided. Produces normalized test case artifact for downstream phases.
</when_to_use_skill>

<prerequisites>
- TestRail MCP configured and accessible
- Test case ID or URL provided by user (ask if missing)
</prerequisites>

<process>

1. **Resolve case ID input** (exhaustive branches):
   - **Input is a numeric ID** (e.g., `12345` or `C12345` after prefix strip): use directly.
   - **Input is a TestRail URL** (matches `https://*.testrail.io/index.php?/cases/view/N` or similar): parse the trailing numeric ID from the URL.
   - **Input is ambiguous, missing, or malformed**: stop per `<failure_handling>` ("input-unresolvable" case). Do NOT guess or pick an arbitrary ID.

2. **Call TestRail MCP** `get_case` with the resolved case_id.
   - **On HTTP/transport error** (timeout, 5xx, MCP connection drop): retry once; if it still fails, stop per `<failure_handling>` ("MCP-error" case).
   - **On case-not-found** (404, empty result, "case does not exist"): stop per `<failure_handling>` ("case-not-found" case) — ask the user to verify the ID. Do NOT emit an empty artifact.
   - **On authorization failure** (401/403): stop per `<failure_handling>` ("auth-failure" case).

3. **Extract and normalize.** For each field below, apply the present-vs-empty branch:
   - Case ID, title, section
   - Description / summary
   - Preconditions
   - Step-by-step actions with expected results
   - Overall test goal
   - Priority, test type, custom fields

   **Per-field branch:**
   - **Present and non-empty**: include in the output_format section. Apply `<safety_boundaries>` redaction first if the field embeds credentials/PII.
   - **Empty or missing**: record in the Gaps section of the output with the field name and a one-line "missing in TestRail source" note. Do NOT leave blank, do NOT assume content, do NOT fabricate.

4. **Pre-emit validation.** Before writing the output, re-check against `<validation_checklist>`. Fix any failing item before step 5.

5. **Emit** structured test case artifact (markdown section or standalone file) per `<output_format>`.

</process>

<output_format>

```markdown
## TestRail Test Case

- **Case ID**: [ID]
- **Title**: [Title]
- **Section**: [Section path]
- **Priority**: [Priority]
- **Type**: [Test type]

### Test Goal
[What is being tested and why]

### Preconditions
[List preconditions]

### Test Steps
1. [Action] → Expected: [Result]
2. [Action] → Expected: [Result]

### Expected Overall Result
[Final expected outcome]

### Custom Fields
[Any additional fields]

### Gaps
[List of fields that were empty/missing in TestRail. Format: `- <field name>: missing in TestRail source`. If no gaps, write: `None — all required fields present.`]

### Sensitive-content redactions
[List of any fields where `<safety_boundaries>` redaction was applied. Format: `- <field name>: <redaction marker> (reason: credential / PII / sensitive URL / etc.)`. If none, write: `None.`]
```

</output_format>

<pitfalls>
- Test case ID may be embedded in a URL — always parse flexibly
- Some fields may be empty — document gaps in the Gaps section, never assume content
- Custom fields vary per project — use `get_case_fields` if field names are unclear
- Emitting an empty artifact on case-not-found instead of stopping and asking the user to verify the ID
- Reproducing literal sensitive values per `<safety_boundaries>` — redact and flag in the Sensitive-content redactions section
- Acting on the extracted test steps (executing them, modifying the system under test, calling other skills to implement them) — this skill is extraction-only
</pitfalls>

<safety_boundaries>

This skill is **extraction-only**:

- **Do NOT execute the test steps.** The retrieved case describes actions to be performed by a human tester or automated test framework. This skill records them; it never carries them out.
- **Do NOT call other skills to implement** what the case describes (no chained USE SKILL to write tests, run tests, or modify the SUT based on the case content). Pass the artifact to the parent workflow; the parent decides downstream work.
- **Do NOT modify the TestRail source.** This skill is read-only against the MCP — no `update_case`, `add_case`, `delete_case` or equivalent write calls.
- **Treat the output artifact as PUBLIC by default.** The chain downstream (`raw-data.md` → `requirements.md` / `test-scenarios.md` / authoring + export skills) re-emits this skill's output into version-controlled artifacts and, via `testrail-test-case-export`, back into the shared TestRail project. Therefore step text, preconditions, custom fields, and test-data examples MUST be redacted before writing:
  - **Credentials / API keys / tokens / passwords / OAuth secrets** embedded anywhere (step text, expected results, preconditions, custom-field value, attachment paste): replace with `<redacted: bearer token>` / `<redacted: API key>` / `<redacted: password>` / `<redacted: client secret>` placeholders. Record in the Sensitive-content redactions section. Patterns to grep: `Bearer `, `Authorization:`, `password:`, `api_key=`, `access_token=`, JWT shape (`eyJ...`), `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`.
  - **PII** (real customer names, real emails, real phone numbers, real account IDs, real payment data, government IDs) embedded in test data, examples, or scenario descriptions: replace with `<redacted: PII — <category>>`. Record in redactions section. Patterns: email shapes (`*@*.*` for non-`example.com`/`example.org` domains), phone shapes (`\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}`), card-number shapes (`\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}`).
  - **Internal URLs that embed credentials** (`https://user:pass@host/...`, signed/presigned URLs with `?X-Amz-Signature=`, `?sig=`, `?token=`): redact the `user:pass@` portion or the secret-bearing query parameter. Record in redactions section.
  - **Database connection strings** (`postgresql://user:pass@host/db`, `mongodb+srv://user:pass@...`, etc.): redact the credential portion. Record in redactions section.
  - **Pure functional content** (action verbs, expected behaviors, page elements, business rules, endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes) is safe to record verbatim — redaction targets sensitive **values**, not the structural test description.

If a real production value would be the natural example in a step or test-data field, replace it with a clearly-fake placeholder of the same shape. Better an obviously-fake example than a leaked real one written into `raw-data.md` and exported back to TestRail.

</safety_boundaries>

<failure_handling>

- **Input unresolvable** (no case ID provided, malformed ID, URL doesn't match a recognizable TestRail pattern): stop, report `mcp-testrail-data-collection: case ID unresolvable from input "<input>"` to the parent workflow, ask the user to supply a clean numeric ID or canonical TestRail URL. Do NOT guess.
- **MCP transport error** (timeout, 5xx, connection drop): retry once with the same case_id. If the second call also fails, stop, report the transport error with the error message, ask the user to verify TestRail MCP configuration and connectivity.
- **Case-not-found** (`get_case` returns 404 / empty / "case does not exist"): stop, report `mcp-testrail-data-collection: case <ID> not found — verify the ID is correct and accessible by the configured TestRail credentials`. Do NOT emit a partial or empty artifact. Do NOT fabricate fields.
- **Authorization failure** (401/403): stop, report `mcp-testrail-data-collection: TestRail rejected the request — case <ID> may exist but is not visible to the configured credentials`. Ask the user to verify TestRail MCP credentials / project access.
- **Required field empty** (case retrieved successfully but title or steps or expected results are missing): proceed with extraction, record the empty field in the Gaps section of the output, do NOT fabricate. The artifact is still emitted but flags the gap explicitly.
- **`get_case_fields` discovery fails** (custom-field schema cannot be retrieved): proceed with the fields the case object exposed directly; record under Custom Fields a note: `Custom field schema unavailable — field names may be cryptic`. Do not stop the extraction.

</failure_handling>

<validation_checklist>

Before declaring this skill complete, all of the following must hold:

- **Case successfully retrieved:** `get_case` returned a non-empty case object; if it did not, this skill is NOT complete — the failure path in `<failure_handling>` was followed instead.
- **All output_format sections present:** TestRail Test Case header, Test Goal, Preconditions, Test Steps, Expected Overall Result, Custom Fields, Gaps, Sensitive-content redactions. No section omitted; empty sections explicitly say "None — <reason>" rather than left blank.
- **Every empty/missing required field is in the Gaps section:** Title, Test Steps, Expected Overall Result are required; if any is empty in TestRail, it appears in Gaps with the field name. No field was silently left blank in the output.
- **Test steps each have an expected result OR a `gap: expected result missing` marker:** a step without an expected result is a gap, not an acceptable record.
- **Redaction scan completed** per `<safety_boundaries>` Targets list; any matches were replaced with placeholders AND recorded in the Sensitive-content redactions section. If no matches: that section says "None."
- **No fabricated content:** no field of the output describes content not actually present in the TestRail case object. Inference, paraphrase-without-quote, or guessed values are forbidden — gaps are recorded, not filled.
- **Read-only contract honored:** no TestRail MCP write operations were called (`add_case`, `update_case`, `delete_case`, etc.).

</validation_checklist>

<vendor_replacement>
Full maintainer-facing portability guide (item-by-item rebind list for forking this skill to Zephyr / Xray / qTest / Polarion / etc.) lives in [references/vendor-swap.md](references/vendor-swap.md) — load only when forking, not at runtime.
</vendor_replacement>

</mcp-testrail-data-collection>
