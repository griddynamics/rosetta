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

1. Parse test case ID from user input (extract from URL if needed)
2. Call TestRail MCP (`get_case` with case_id)
3. Extract and normalize:
   - Case ID, title, section
   - Description / summary
   - Preconditions
   - Step-by-step actions with expected results
   - Overall test goal
   - Priority, test type, custom fields
4. Output structured test case artifact (markdown section or standalone file)

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
```

</output_format>

<pitfalls>
- Test case ID may be embedded in a URL — always parse flexibly
- Some fields may be empty — document gaps, never assume content
- Custom fields vary per project — use `get_case_fields` if field names are unclear
</pitfalls>

<vendor_replacement>
This skill is TestRail-specific. To support a different TMS (Zephyr, Xray, qTest, Polarion, etc.), fork this SKILL.md and replace only the items below — the rest of the structure (role / when_to_use_skill / prerequisites shape / output_format / pitfalls discipline) is vendor-agnostic and should stay.

**TestRail-specific items that must be re-bound per vendor:**

- **MCP tool calls** in `<process>`:
  - `get_case` (step 2) → vendor's equivalent "fetch single test case by ID" operation
  - `get_case_fields` (mentioned in pitfalls) → vendor's equivalent "discover custom-field schema" operation
- **Identifier format** in `<prerequisites>` and `<process>`:
  - TestRail accepts numeric case IDs and `https://*.testrail.io/index.php?/cases/view/N` URL form. Other vendors use different ID schemes (e.g., Xray uses `XRAY-NNN`, Zephyr uses prefixed keys).
- **Field semantics** in `<process>` step 3:
  - "Section path" is TestRail-specific terminology — other vendors call this Folder / Suite / Component / Module.
  - "Priority / test type" enum values map to TestRail's `priority_id` / `type_id` numeric tables; other vendors use string enums or different ID ranges.
- **Output template label** in `<output_format>`:
  - `## TestRail Test Case` heading and `**Case ID**:` field naming. Rename to the target vendor's nomenclature so downstream phases can route by vendor.

**Pattern for swapping:** copy this file to `mcp-<vendor>-data-collection/SKILL.md`, edit only the items above, keep the rest. Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).
</vendor_replacement>

</mcp-testrail-data-collection>
