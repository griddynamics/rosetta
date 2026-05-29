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

</mcp-testrail-data-collection>
