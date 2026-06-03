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

<input_contract>

This skill performs **irreversible external writes** to a shared TestRail project. The bindings below MUST be supplied by the calling workflow — undeclared inputs raise the risk of exporting against the wrong project or suite. Mirrors the sibling `testrail-test-case-authoring` `<input_contract>` shape.

| Input | Required? | Source | Used by |
|---|---|---|---|
| Authored case set | **required** | Source document the calling workflow names — typically `test-scenarios.md` (per `<validation_checklist>`) or `agents/qa/{IDENTIFIER}/test-specs.md` | Step 5 (custom_steps_separated build), step 7 (sensitive-value scan + dedup pre-scan + confirmation gate), step 8 (per-case `mcp_testrail_add_case` calls), step 9 (post-export ID write-back) |
| `project_id` | **required** | Parent workflow's TMS config (e.g. `agents/qa/qa-project-config.md` `Test Case Management` → `project_id`, or testgen `testgen-project-config.md`) | Step 1 (`mcp_testrail_get_project`) + step 7 (dedup pre-scan `mcp_testrail_get_cases`) |
| `suite_id` | **required** | Parent workflow's TMS config (same source as `project_id`) | Step 7 dedup pre-scan (`mcp_testrail_get_cases(project_id, suite_id)`) |
| `section_id` | **required** (collected from user at step 2 if not pre-supplied) | User response per `<user_prompt_section_id>` template OR parent workflow's TMS config when pre-bound | Step 7 confirmation gate (echoed to user) + step 8 (`mcp_testrail_add_case(section_id, …)`) |
| Workflow state file path | **required** | Parent workflow phase file (e.g. `agents/qa-state.md`, `agents/testgen-state.md`) | Step 7's `(c) cancel` path (records the cancellation), step 9 (records C-prefixed IDs + per-case approval evidence) |
| Project's TestRail base URL | optional | Parent workflow's TMS config | `<user_prompt_section_id>` template (used to construct the suite URL when asking for section_id) |
| Per-case `priority_id` / `type_id` overrides | optional | Parent workflow may supply per-TestRail-instance mappings | Steps 3 + 4 (override the default P0–P3 / type-name mappings) |

**Required-input failure rule.** If `project_id`, `suite_id`, or the authored case set source path is missing, this skill cannot run — stop, report `testrail-test-case-export: required input missing — <name>` to the calling workflow, ask the user/parent to supply. Do NOT pick defaults for these — the safety gate against exporting to the wrong project depends on these bindings being explicit. `section_id` may be collected from the user during step 2 if it wasn't pre-supplied.

</input_contract>

<process>

1. **Verify connection**: call `mcp_testrail_get_project(project_id)` — if fails, inform user to verify MCP config, credentials, and project access
2. **Get section_id from user** (see `user_prompt_section_id` template below): TestRail MCP cannot create sections — user must provide existing section_id or create one in TestRail UI first
   - Parse flexibly: accept "section_id is XXXXX", "group_id=XXXXX", or just the number
3. **Apply priority mapping** — **precedence: parent workflow's TMS config first, defaults last.** If the parent supplied per-case `priority_id` overrides (per `<input_contract>`) or the TMS-config source (e.g. `agents/qa/qa-project-config.md` `Test Case Management` section, or testgen equivalent) provides an instance-specific `priority_id` table, use that. **Fallback only when no parent mapping is supplied** — the values below are the **documented TestRail-default priority IDs** and **WILL silently mis-map cases on TestRail instances with a customized priority table** (audit risk per `<pitfalls>` "priority_id and type_id values may differ per TestRail instance"):
   - P0 → `priority_id: 4` (Critical)
   - P1 → `priority_id: 3` (High)
   - P2 → `priority_id: 2` (Medium)
   - P3 → `priority_id: 1` (Low)
4. **Apply type mapping** — **same precedence as step 3** (parent's TMS-config `type_id` table or per-case `type_id` overrides first; defaults are the **TestRail-default type IDs**, last-resort fallback only):
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

- **No write without explicit confirmation** per step 7's confirmation gate (canonical) — never call `mcp_testrail_add_case` until the user has chosen `a` / `b` / `c`; ambiguous responses default to `c` (cancel) per step 7.
- **Dedup pre-scan before every export run** per step 7 (canonical) — workflow state can be wrong; the external system is the source of truth for what already exists.
- **No real credentials, secrets, or PII in exported case bodies.** Case titles, step `content`, step `expected`, and the preconditions block are all written verbatim to TestRail and viewable by every TestRail user with project access. Targets to scan and redact in step 7 BEFORE the confirmation gate:
  - **Credentials, tokens, API keys, passwords, JWTs** — replace with the placeholder vocabulary from `testrail-test-case-authoring`'s [references/examples-and-redaction.md](../testrail-test-case-authoring/references/examples-and-redaction.md#targets-to-placeholder-never-literal) (canonical end-to-end vocabulary): `<valid bearer token>` / `<expired bearer token>` for auth tokens, `<valid api key>` for API keys, `<valid test password>` / `<deliberately-wrong test password>` for passwords. Use the same shapes the authoring step used so end-to-end consistency holds.
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
- All priority_id and type_id values match target TestRail project configuration (per step 3 + 4 precedence)
- **Step 7 sensitive-value scan ran** per step 7 + `<safety_boundaries>` placeholder catalog — no literal credentials/PII remain in any case body
- **Step 7 dedup pre-scan ran** — `mcp_testrail_get_cases` called; overlap count shown to user
- **Step 7 confirmation gate passed** — explicit `a` / `b` / `c` choice recorded in workflow state; no `mcp_testrail_add_case` call issued without it
- Exported case set matches the user's choice from step 7
- Each exported case returns a TestRail case ID
- `test-scenarios.md` updated with C-prefixed IDs and TestRail links
</validation_checklist>

<pitfalls>
- TestRail MCP lacks section creation — user must create sections manually in TestRail UI
- If `custom_preconds` field not supported, fall back to prepending preconditions to first step with `--- STEPS ---` separator
- **Re-running export creates duplicate test cases in TestRail** (by design, preserves history) — see step 7 confirmation gate + dedup pre-scan
- Inferring user approval from prose instead of `a` / `b` / `c` — see step 7 ambiguity-defaults-to-cancel rule
- Skipping the dedup pre-scan because the workflow state says "first run" — see step 7
- Exporting real credentials / tokens / passwords / PII verbatim into TestRail case bodies — see `<safety_boundaries>` placeholder catalog (step 7 applies it before the confirmation gate)
- `priority_id` and `type_id` values may differ per TestRail instance — verify with user if defaults don't match
- TestRail case IDs are always C-prefixed — omitting the prefix breaks links
- `custom_steps_separated` format may be rejected if TestRail field configuration differs — check field config and fall back to plain text steps
- TestRail may have API rate limits — if 429 errors occur, increase delay between calls
</pitfalls>

<vendor_replacement>
Full maintainer-facing portability guide (item-by-item rebind list for forking this skill to Zephyr / Xray / qTest / Polarion, plus the workflow-side coupling note for adding a second vendor) lives in [references/vendor-porting.md](references/vendor-porting.md) — load only when forking, not during runtime TestRail export.
</vendor_replacement>

</testrail-test-case-export>
