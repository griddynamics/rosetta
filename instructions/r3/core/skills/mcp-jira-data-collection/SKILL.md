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

<vendor_replacement>
This skill is Atlassian-Jira-specific. To support a different issue tracker (GitHub Issues, GitLab Issues, Linear, Azure DevOps Work Items, ServiceNow, Asana, etc.), fork this SKILL.md and replace only the items below — the rest of the structure (role / when_to_use_skill / prerequisites shape / output_format skeleton / pitfalls discipline) is vendor-agnostic and should stay.

**Jira-specific items that must be re-bound per vendor:**

- **MCP tool calls** in `<process>`:
  - `jira_get_issue` (step 2) → vendor's equivalent "fetch single issue by key/ID" operation. Parameter shape (`issue_key`, `fields`, `expand`, `comment_limit`) is Jira-specific — other vendors use different signatures (e.g., GitHub Issues uses `owner/repo/issue_number`, Linear uses GraphQL with `id`).
  - `jira_search_fields` (step 4 fallback + pitfalls) → vendor's equivalent "discover custom-field schema" operation. Not all trackers expose custom-field metadata via API.
- **Identifier format** in `<prerequisites>` and `<process>` step 1:
  - Jira accepts `PROJ-NNN` project-prefixed keys and URL form `https://*.atlassian.net/browse/PROJ-NNN` (or self-hosted `https://jira.company.com/browse/PROJ-NNN`). Other vendors use different ID schemes: GitHub `owner/repo#NNN`, GitLab `group/project#NNN`, Linear `TEAM-NNN`, Azure DevOps numeric ID, ServiceNow `INC-NNNNNNN`.
- **Field set** in `<process>` step 2:
  - The comma-separated `fields=` list (`summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated`) is Jira's field vocabulary. Other vendors use different field names (e.g., GitHub: `title,body,state,labels,assignees`; Linear: `title,description,state,priority,assignee`).
- **Field semantics** in `<process>` step 3:
  - "Components" is Jira-specific (also Azure DevOps "Area Path", GitLab "Components" only via labels).
  - "Custom Fields" enumeration (Epic Link, Story Points, Sprint) is Jira+JIRA Agile specific. Other trackers expose different metadata (GitHub Projects, Linear cycles, Azure DevOps iterations).
- **Output template label** in `<output_format>`:
  - `## Jira Ticket Data` heading and `### Ticket: [KEY]` field. Rename to the target vendor's nomenclature (`## GitHub Issue Data` / `### Issue: [owner/repo#N]`) so downstream phases can route by source.

**Pattern for swapping:** copy this file to `mcp-<vendor>-data-collection/SKILL.md`, edit only the items above, keep the rest. Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).
</vendor_replacement>

</mcp-jira-data-collection>
