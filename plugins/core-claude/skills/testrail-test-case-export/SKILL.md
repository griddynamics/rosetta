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

Irreversibility + dedup discipline: see step 7 confirmation gate (canonical). Bindings below MUST be supplied by the calling workflow.

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
2. **Get section_id from user** (TestRail MCP cannot create sections — user must provide existing section_id or create one in TestRail UI first). Verbatim prompt template in [references/vendor-porting.md "Section-ID user prompt template"](references/vendor-porting.md#section-id-user-prompt-template-referenced-from-skillmd-process-step-2) — load on demand. Parse flexibly: accept `section_id is XXXXX`, `group_id=XXXXX`, or just the number.
3. **Apply priority mapping** — **precedence: parent TMS config first, defaults last** (per-case overrides + instance-specific tables from `qa-project-config.md` / `testgen-project-config.md` win). Defaults (used only when no parent mapping is supplied):
   - P0 → `priority_id: 4` (Critical) · P1 → `3` (High) · P2 → `2` (Medium) · P3 → `1` (Low)
4. **Apply type mapping** — same precedence as step 3. Defaults:
   - Happy Path → `type_id: 1` (Functional) · Negative → `7` · Edge Case → `6` (Boundary) · Integration → `8` · Performance → `9` · Security → `10`

   **Default-ID rationale + silent-mismatch audit risk** (why ID tables vary per TestRail instance, what audits should catch) lives in [references/vendor-porting.md "Default-ID rationale"](references/vendor-porting.md#default-id-rationale-referenced-from-skillmd-process-steps-3--4) — load when reviewing whether the defaults are safe for the target instance.
5. **Format steps**: use `custom_steps_separated` — each entry has `content` (action) and `expected` (outcome)
6. **Build preconditions**: use `custom_preconds` field with TEST DATA first, then original preconditions. Verbatim TEST DATA / PRECONDITIONS section format in [references/vendor-porting.md "Preconditions format"](references/vendor-porting.md#preconditions-format-referenced-from-skillmd-process-step-6) — load on demand. If `custom_preconds` not supported: prepend to first step content with `\n\n--- STEPS ---\n\n` separator.
7. **Pre-export safety check + dedup pre-scan (GATE — required before any write):**
   - **Sensitive-value scan.** Re-read every case title, step `content`, step `expected`, and the preconditions block. Targets + placeholder vocabulary live in `<safety_boundaries>` "Redaction targets" (single SSoT). If any target is found, **stop** — apply `<safety_boundaries>` redaction discipline before continuing. (Why this matters at this step: see the irreversibility warning in the user-facing Confirmation gate below — canonical home for the destructive-write framing.)
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

<safety_boundaries>

Destructive-write framing (irreversibility + dedup-by-design + Destructive-on-rerun) lives once at `<process>` step 7's user-facing Confirmation gate (canonical). The redaction discipline + operational rules below are the additive content.

**Gate procedure** — Sensitive-value scan + dedup pre-scan + confirmation gate (`a`/`b`/`c`) defined in `<process>` step 7.

**Redaction targets** (the catalog step 7 applies — single source of truth for what counts as sensitive):
- **Credentials / tokens / API keys / passwords / JWTs** — replace with placeholders: `<valid bearer token>` / `<expired bearer token>` for auth tokens, `<valid api key>` for API keys, `<valid test password>` / `<deliberately-wrong test password>` for passwords. The authoring skill (`testrail-test-case-authoring`) uses the same placeholder shapes by convention.
- **Real PII** — customer emails / names / phone numbers / account IDs / payment cards → synthetic equivalents (`test.user-1@example.com`, `+1-555-0100` IETF reserved range, official PSP test card numbers).
- **Signed / credentialed URLs** → `<redacted: signed URL>` + one-line description.
- **Private keys / service-account JSON / certificates** — never embed.

**Structural content is safe** — endpoint paths, HTTP methods, status codes, error message templates, field names, schema shapes, feature names. Redaction targets sensitive **values**, not the structural spec.

**Operational rules** (always inline; not covered by step 7):
- Cancellation is safe — aborting at the gate produces no writes; cancellation is preferred over best-guess export.
- Rate limit: ~0.5s between `mcp_testrail_add_case` calls is the floor; back off further on 429.

If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape.

</safety_boundaries>

<validation_checklist>

**Grep-proof layer only** — operational rules live in `<process>` step 7 and `<safety_boundaries>`; items below verify those rules by grep before any export call.

- `mcp_testrail_get_project` call succeeded (step 1).
- `section_id` confirmed valid (step 2).
- `priority_id` / `type_id` values match target TestRail project configuration per step 3 + 4 precedence (parent TMS config first, defaults last).
- **Step 7 GATE passed** — sensitive-value scan + dedup pre-scan (`mcp_testrail_get_cases` called, overlap count shown) + explicit `a`/`b`/`c` choice recorded in workflow state. No `mcp_testrail_add_case` call issued without all three. (Canonical procedure: step 7.)
- Exported case set matches the step-7 user choice.
- Each exported case returns a TestRail case ID.
- `test-scenarios.md` updated with C-prefixed IDs and TestRail links.

</validation_checklist>

<pitfalls>
(Each item is a pointer; the rule lives in the cited section.)
- TestRail MCP lacks section creation — user creates manually in TestRail UI (`<user_prompt_section_id>` template).
- `custom_preconds` field unsupported → fall back to `--- STEPS ---` prepend per step 6.
- Re-run creates duplicates (by-design history preservation) → step 7 dedup pre-scan + confirmation gate.
- Inferred approval from prose ("ok" / silence) → step 7 ambiguity-defaults-to-cancel rule.
- Skipping dedup pre-scan on "first run" → step 7 (workflow state can be wrong; TestRail is source of truth).
- Real credentials / PII in case bodies → `<safety_boundaries>` redaction catalog (applied at step 7).
- `priority_id` / `type_id` instance-mismatch → step 3 + 4 precedence (canonical — parent TMS config first, defaults last).
- Missing C-prefix → step 9 ID format.
- `custom_steps_separated` rejected → step 5 fallback to plain text.
- 429 rate limits → `<safety_boundaries>` operational rules (back off further).
</pitfalls>

<vendor_replacement>
Full maintainer-facing portability guide (item-by-item rebind list for forking this skill to Zephyr / Xray / qTest / Polarion, plus the workflow-side coupling note for adding a second vendor) lives in [references/vendor-porting.md](references/vendor-porting.md) — load only when forking, not during runtime TestRail export.
</vendor_replacement>

</testrail-test-case-export>
