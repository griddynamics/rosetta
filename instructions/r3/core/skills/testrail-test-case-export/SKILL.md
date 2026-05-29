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
7. **Export each test case**: call `mcp_testrail_add_case(section_id, title, priority_id, type_id, refs, custom_steps_separated)`
   - Optionally call `mcp_testrail_get_cases(project_id, suite_id)` beforehand to check existing cases
   - Rate limit: add ~0.5s delay between API calls
   - On individual failure: log error, continue with remaining cases
8. **Post-export**: TestRail case IDs are C-prefixed (e.g., C12345) — use this format in document updates and links

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

<validation_checklist>
- `mcp_testrail_get_project` call succeeds before export begins
- section_id confirmed valid
- All priority_id and type_id values match target TestRail project configuration
- Each exported case returns a TestRail case ID
- `test-scenarios.md` updated with C-prefixed IDs and TestRail links
</validation_checklist>

<pitfalls>
- TestRail MCP lacks section creation — user must create sections manually in TestRail UI
- If `custom_preconds` field not supported, fall back to prepending preconditions to first step with `--- STEPS ---` separator
- Re-running export creates duplicate test cases in TestRail (by design, preserves history)
- `priority_id` and `type_id` values may differ per TestRail instance — verify with user if defaults don't match
- TestRail case IDs are always C-prefixed — omitting the prefix breaks links
- `custom_steps_separated` format may be rejected if TestRail field configuration differs — check field config and fall back to plain text steps
- TestRail may have API rate limits — if 429 errors occur, increase delay between calls
</pitfalls>

</testrail-test-case-export>
