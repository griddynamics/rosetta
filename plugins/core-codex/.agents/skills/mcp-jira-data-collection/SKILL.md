---
name: mcp-jira-data-collection
description: Extract issue data from Jira MCP — ticket fields, description, comments, labels, components, custom fields.
tags: ["data-collection", "mcp", "jira"]
baseSchema: docs/schemas/skill.md
---

<mcp-jira-data-collection>

<role>Jira issue data extraction specialist</role>

<when_to_use_skill>
Extract structured issue data from Jira when a ticket key or URL is provided. Produces normalized ticket artifact for downstream phases.
</when_to_use_skill>

<prerequisites>
- Atlassian (Jira) MCP configured and accessible
- Ticket key or URL provided by user (ask if missing)
</prerequisites>

<process>

1. Parse ticket key from user input (extract from URL `https://jira.company.com/browse/PROJ-123` if needed)
2. Retrieve issue with comprehensive fields:
   ```
   jira_get_issue(
       issue_key="PROJ-123",
       fields="summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated",
       expand="renderedFields",
       comment_limit=10
   )
   ```
3. Extract and normalize:
   - Ticket key, URL, summary
   - Description (rendered if HTML, otherwise raw)
   - Status, issue type, priority
   - Labels, components
   - Assignee, reporter
   - Recent comments (up to 10)
   - Custom fields (Epic Link, Story Points, Sprint, etc.)
4. **Fallback**: If ticket not found, verify key with user; use `jira_search_fields()` to discover custom field names if needed

</process>

<output_format>

```markdown
## Jira Ticket Data

### Ticket: [KEY]
**URL**: [Jira URL]
**Summary**: [Summary]
**Type**: [Issue Type]
**Status**: [Status]
**Priority**: [Priority]
**Created**: [Date]
**Updated**: [Date]

### Description
[Full description]

### Labels
- [Label1]

### Components
- [Component1]

### Assignee / Reporter
- **Assignee**: [Name]
- **Reporter**: [Name]

### Comments (Recent)
1. **[Author]** ([Date]): [Comment text]

### Custom Fields
[Epic Link, Story Points, Sprint, etc.]
```

</output_format>

<pitfalls>
- Ticket key may be embedded in a URL — always parse flexibly
- Custom fields vary per project — use `jira_search_fields()` to discover names
- Rendered HTML description may need markdown conversion
- Some fields (assignee, reporter) may be restricted by permissions
</pitfalls>

</mcp-jira-data-collection>
