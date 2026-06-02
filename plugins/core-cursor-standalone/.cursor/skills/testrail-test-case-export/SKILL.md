---
name: testrail-test-case-export
description: TestRail-specific export logic — connection verification, field mappings, API calls, and ID formats for exporting test cases to TestRail via MCP.
tags: ["testing", "testrail", "export", "mcp"]
baseSchema: docs/schemas/skill.md
---

<testrail-test-case-export>

<role>TestRail export specialist</role>

<when_to_use_skill>
Use during test case export when the target TMS is TestRail. Provides TestRail-specific connection check, field mappings, MCP tool signatures, preconditions formatting, and post-export ID handling.
</when_to_use_skill>

<process>

1. **Verify connection**: call `mcp_testrail_get_project(project_id)` — if fails, inform user to verify MCP config, credentials, and project access
2. **Get section_id from user** (see `user_prompt_section_id` template below): TestRail MCP cannot create sections — user must provide existing section_id or create one in TestRail UI first
   - Parse flexibly: accept "section_id is XXXXX", "group_id=XXXXX", or just the number
3. **Apply priority mapping**:
   - P0 → `priority_id: 4` (Critical)
   - P1 → `priority_id: 3` (High)
   - P2 → `priority_id: 2` (Medium)
   - P3 → `priority_id: 1` (Low)
4. **Apply type mapping**:
   - Happy Path → `type_id: 1` (Functional)
   - Negative → `type_id: 7`
   - Edge Case → `type_id: 6` (Boundary)
   - Integration → `type_id: 8`
   - Performance → `type_id: 9`
   - Security → `type_id: 10`
5. **Format steps**: use `custom_steps_separated` — each entry has `content` (action) and `expected` (outcome)
6. **Build preconditions**: use `custom_preconds` field with TEST DATA first, then original preconditions (see `preconditions_format` below)
   - If `custom_preconds` not supported: prepend to first step content with `\n\n--- STEPS ---\n\n` separator
7. **Pre-export safety check + dedup pre-scan (GATE — required before any write):**
   - **Sensitive-value scan.** Re-read every case title, step `content`, step `expected`, and the preconditions block for: real credentials, tokens, API keys, passwords, JWTs, signed URLs, private keys, real PII (real names, emails, phone numbers, account IDs, payment data). TestRail is an external shared system and writes are irreversible from this skill's side. If any value is found, **stop** — apply `<safety_boundaries>` redaction discipline (replace with placeholders) before continuing.
   - **Dedup pre-scan.** Call `mcp_testrail_get_cases(project_id, suite_id)` to fetch existing case titles in the target suite. Build the overlap set: which planned titles already exist in the suite (exact-match on `title`). Record the overlap count.
   - **Confirmation gate (user-facing).** Print a summary to the user:
     ```
     Planned export: <N> test cases to TestRail project <project_id>, section <section_id>.
     Existing cases in target suite that match planned titles: <overlap_count>.
     ⚠ TestRail does NOT deduplicate by title — re-running this step creates duplicate cases (by design; preserves history). The <overlap_count> matching titles WILL become duplicates if exported again.
     Proceed?  (a) export all <N>  (b) export only the <N - overlap_count> non-matching titles  (c) cancel
     ```
   - **WAIT for explicit user choice** (`a`, `b`, or `c`). Do NOT proceed on ambiguous responses like "ok", "looks good", silence, or "whatever" — re-ask once, then default to `c` (cancel) if still ambiguous. Inferred approval is forbidden — this is a destructive external write.
   - On `c`: stop the export, record the cancellation in the workflow state, do not call `mcp_testrail_add_case` even once.
8. **Export each approved test case**: call `mcp_testrail_add_case(section_id, title, priority_id, type_id, refs, custom_steps_separated)` for the case set the user approved in step 7 (`a` = full list; `b` = non-overlapping subset).
   - Rate limit: add ~0.5s delay between API calls
   - On individual failure: log error, continue with remaining cases
   - Record each successfully-created case's C-prefixed ID alongside its title for the post-export step
9. **Post-export**: TestRail case IDs are C-prefixed (e.g., C12345) — use this format in document updates and links

</process>

<preconditions_format>

Order: TEST DATA first (tester sees execution count immediately), then preconditions.

For parameterized tests (has Test Data table):
```
=== TEST DATA ===
Execute this test case for EACH row in the table below:

| Parameter | Value 1 | Value 2 |
|-----------|---------|---------|
| [Param]   | [Val]   | [Val]   |

=== PRECONDITIONS ===
- [Precondition 1]
- [Precondition 2]
```

For non-parameterized tests: include only `=== PRECONDITIONS ===` section.

</preconditions_format>

<user_prompt_section_id>

Use this structure when asking user for section_id:

```
TestRail Section Setup Required

To export test cases, I need a section_id from TestRail.

**Option A: Use existing section**
If you already have a section, provide the section_id.
Find it in the URL when viewing a section (e.g., group_id=94686 or section_id=94686)

**Option B: Create new section**
1. Go to: [TestRail suite URL]
2. Click "Add Section"
3. Name it: [TICKET-KEY]
4. After creating, find the section_id in the URL or section details

Please provide: "section_id is XXXXX" or just the number
```

</user_prompt_section_id>

<safety_boundaries>

This skill performs **irreversible writes to an external shared system** — every `mcp_testrail_add_case` call is a permanent, network-visible side effect that cannot be rolled back from this skill. TestRail does NOT deduplicate by title; re-running creates duplicates by design. Treat the export operation as **destructive-on-rerun**.

- **No write without explicit confirmation.** Step 7's confirmation gate is mandatory — never call `mcp_testrail_add_case` before the user has chosen `a` (export all), `b` (export non-overlapping subset), or `c` (cancel). Inferred approval ("looks good", silence, "go ahead probably") is forbidden; re-ask, then default to `c` (cancel) on continued ambiguity.
- **Dedup pre-scan before every export run.** Call `mcp_testrail_get_cases(project_id, suite_id)` and present the overlap count to the user even if the workflow asserts "first run" — workflow state can be wrong; the external system is the source of truth for what already exists.
- **No real credentials, secrets, or PII in exported case bodies.** Case titles, step `content`, step `expected`, and the preconditions block are all written verbatim to TestRail and viewable by every TestRail user with project access. Targets to scan and redact in step 7 BEFORE the confirmation gate:
  - Credentials, tokens, API keys, passwords, JWTs — replace with placeholders (`{valid_token}`, `{admin_token}`, `<bearer-token-for-test-user>`).
  - Real customer emails / names / phone numbers / account IDs / payment card numbers — replace with synthetic equivalents (`test.user-1@example.com`, `+1-555-0100` from the IETF reserved range, official PSP test card numbers if a card is needed and document the source).
  - Signed / credentialed URLs — replace with `<redacted: signed URL>` plus a one-line description.
  - Private keys, service-account JSON, certificates — never embed.
- **Structural content is safe.** Endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, and feature names are functional and recorded verbatim. Redaction targets sensitive **values**, not the structural spec.
- **Cancellation is safe.** Aborting at the confirmation gate produces no writes; cancellation is preferred over best-guess export.
- **Rate limit respected.** ~0.5s between `mcp_testrail_add_case` calls is the floor; back off further on 429.

If a real production value would be the natural example in a case body, replace it with a clearly-fake placeholder of the same shape — better an obviously-fake example than a leaked real one written into TestRail permanently.

</safety_boundaries>

<validation_checklist>
- `mcp_testrail_get_project` call succeeds before export begins
- section_id confirmed valid
- All priority_id and type_id values match target TestRail project configuration
- **Step 7 pre-export safety scan was run** — every case body was re-read for credentials/PII; any found values were replaced with placeholders before the confirmation gate (per `<safety_boundaries>`)
- **Step 7 dedup pre-scan was run** — `mcp_testrail_get_cases` was called against the target suite; overlap count was computed and shown to the user
- **Step 7 confirmation gate was passed** — explicit user choice (`a`, `b`, or `c`) is recorded in the workflow state; no `mcp_testrail_add_case` call was issued without it
- The set of cases actually exported matches the user's choice (`a` = full list; `b` = non-overlapping subset; `c` would have prevented this checklist from being reached at all)
- Each exported case returns a TestRail case ID
- `test-scenarios.md` updated with C-prefixed IDs and TestRail links
</validation_checklist>

<pitfalls>
- TestRail MCP lacks section creation — user must create sections manually in TestRail UI
- If `custom_preconds` field not supported, fall back to prepending preconditions to first step with `--- STEPS ---` separator
- **Re-running export creates duplicate test cases in TestRail** (by design, preserves history) — step 7's confirmation gate + dedup pre-scan is the only safeguard; never call `mcp_testrail_add_case` without it
- Inferring user approval from prose like "looks good" or silence instead of `a`/`b`/`c` — re-ask, default to cancel
- Skipping the dedup pre-scan because the workflow state says "first run" — the external system is the source of truth, not workflow state
- Exporting real credentials / tokens / passwords / PII verbatim into TestRail case bodies — apply `<safety_boundaries>` redaction before the confirmation gate, not after
- `priority_id` and `type_id` values may differ per TestRail instance — verify with user if defaults don't match
- TestRail case IDs are always C-prefixed — omitting the prefix breaks links
- `custom_steps_separated` format may be rejected if TestRail field configuration differs — check field config and fall back to plain text steps
- TestRail may have API rate limits — if 429 errors occur, increase delay between calls
</pitfalls>

<vendor_replacement>
This skill is TestRail-specific. To support a different TMS (Zephyr, Xray, qTest, Polarion, etc.), fork this SKILL.md and replace only the items below — the rest of the structure (role / when_to_use_skill / process shape / preconditions_format / user_prompt template skeleton / validation_checklist discipline / pitfalls posture) is vendor-agnostic and should stay.

**TestRail-specific items that must be re-bound per vendor:**

- **MCP tool calls** in `<process>`:
  - `mcp_testrail_get_project` (step 1) → vendor's equivalent "verify project / authenticate / probe access" call
  - `mcp_testrail_add_case` (step 7) → vendor's equivalent "create test case" call
  - `mcp_testrail_get_cases` (step 7) → vendor's equivalent "list existing cases" call (if needed for dedup)
- **Container concept** in `<process>` step 2 and `<user_prompt_section_id>`:
  - "section_id" is TestRail-specific. Equivalents: Xray "test folder", Zephyr "folder ID", qTest "module ID", Polarion "category". Whether the container is auto-creatable also differs per vendor (TestRail requires manual UI creation; some others allow API creation).
- **Priority ID mapping** in `<process>` step 3:
  - TestRail numeric `priority_id` 1–4 (Low → Critical). Each vendor has its own scheme (numeric vs string enum, different value count, different default ordering).
- **Type ID mapping** in `<process>` step 4:
  - TestRail numeric `type_id` 1, 6–10. Vendors differ in both numbering and the set of available types (e.g., Xray distinguishes "Manual" / "Cucumber" / "Generic" rather than functional vs negative vs edge).
- **Field names** in `<process>` steps 5–6:
  - `custom_steps_separated` (steps + expected results) and `custom_preconds` (preconditions block) are TestRail field names. Vendors use different field IDs and may not split steps/expected at all.
- **Case ID format** in `<process>` step 8 and `<validation_checklist>`:
  - `C12345` C-prefix is TestRail-specific. Xray uses `XRAY-NNN`, Zephyr uses project-prefixed keys, qTest uses `TC-NNN`, etc.
- **User prompt template** in `<user_prompt_section_id>`:
  - Branded with "TestRail Section Setup" and TestRail URL/UI references. Rewrite for the target vendor's nomenclature and UI.
- **Pitfalls** that name TestRail behaviors specifically (section creation limit, duplicate-on-rerun semantics, 429 specifics, `custom_steps_separated` quirks).

**Pattern for swapping:** copy this file to `<vendor>-test-case-export/SKILL.md`, edit only the items above, keep the rest. Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).

**Workflow-side coupling note:** the calling workflow currently ACQUIREs `testrail-test-case-export` by name. When a second-vendor binding is added, either (a) rename the workflow's ACQUIRE to a parameter resolved from project config (e.g., `<tms_export_skill>` placeholder bound to `qa-project-config.md`'s TMS field), or (b) keep per-vendor workflow forks. Option (a) is preferred but should not be implemented until at least one second-vendor binding exists.
</vendor_replacement>

</testrail-test-case-export>
