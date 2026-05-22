---
name: testgen-flow-data-collection
description: Phase 1 of Test Generation - Data collection 
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_data_collection>

<description_and_purpose>
Extract all relevant data from Jira ticket and related Confluence/Google Drive documentation to establish baseline for gap analysis and requirements generation.
</description_and_purpose>

<workflow_context>
- Phase 1 of 7 in `testgen-flow`
- Input: initial user request + `initial-data.md`
- Output: `raw-data.md` with extracted Jira and Confluence data
- Prerequisite: Phase 0 complete
- Skills: `mcp-jira-data-collection`, `mcp-confluence-data-collection`
- MCPs: Atlassian Jira, Confluence (or equivalent)
</workflow_context>

<phase_steps>
1. Extract Jira ticket data
2. Get Confluence documentation
3. Create raw data document
4. Update state file
</phase_steps>

<extract_jira step="1.1">
1. USE SKILL `mcp-jira-data-collection`
2. Read initial user request 
3. Extract ticket key from user input (parse from URL if needed)
4. Retrieve issue with fields: summary, description, status, issuetype, priority, labels, components, assignee, reporter, comments (up to 10)

</extract_jira>

<get_confluence step="1.2">
1. USE SKILL `mcp-confluence-data-collection`
2. **If user provided Confluence/documentation URLs**: retrieve those pages directly using using `mcp_Jira_MCP_confluence_get_page()`, then check for child pages 
2. **If no URLs provided**: 
2.1. Extract search terms from Jira ticket:
- Project key (from ticket key)
- Labels (if present)
- Component names (if present)
- Key terms from summary/description
2.2. Retrieve relevant Confluence pages
3. **Fallback**: If no results, ask user for specific page URLs/IDs or proceed with Jira only
</get_confluence>

<create_raw_data step="1.3">
1. Create `agents/testgen/{TICKET-KEY}/raw-data.md` with structure:
   ```markdown
# Raw Data - [TICKET-KEY]

**Extracted**: [DateTime]
**Phase**: 1 - Data Collection
**Confluence Source**: [User-provided URLs / Auto-search / User-provided after search / Skipped]

---

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
[Full description - rendered if HTML, otherwise raw]

### Labels
- [Label1]
- [Label2]

### Components
- [Component1]
- [Component2]

### Assignee
**Name**: [Assignee Name]
**Email**: [If available]

### Reporter
**Name**: [Reporter Name]
**Email**: [If available]

### Comments (Recent)
1. **[Author]** ([Date]): [Comment text]
2. **[Author]** ([Date]): [Comment text]
[...]

### Custom Fields
[List any custom fields found, e.g., Epic Link, Story Points, Sprint, etc.]

---

## Confluence Documentation

### Page 1: [Page Title]
**URL**: [Confluence URL]
**Space**: [Space Key]
**Labels**: [Labels]
**Updated**: [Date]
**Type**: Parent / Child of [Parent Title]

#### Content
[Full page content in markdown]

#### Child Pages (if any)
- [Child 1 Title] - [URL]
- [Child 2 Title] - [URL]

---

### Page 2: [Child Page Title]
**URL**: [Confluence URL]
**Space**: [Space Key]
**Parent Page**: [Parent Title] - [URL]
**Labels**: [Labels]
**Updated**: [Date]
**Type**: Child

#### Content
[Full page content in markdown]

---

[Repeat for each page and child page]

---

## Data Collection Summary

- **Jira Ticket**: [KEY]
- **Jira Fields Extracted**: [Count]
- **Confluence Pages Found**: [Count]
- **Total Content Size**: [Approximate word count]
- **Search Terms Used**: [List]
- **Notes**: [Any issues during extraction]
```

</create_raw_data>

<update_state step="1.4">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 1 complete and metrics
2. Tell user: "Phase 1 complete. Found [X] Jira fields and [Y] Confluence pages."
3. Ask: "Ready to proceed to Phase 2 (Gap Analysis)?"
</update_state>

<validation_checklist>
- `raw-data.md` created with Jira section populated
- Confluence section has at least 1 page OR user confirmed skip
- All key Jira fields captured (summary, description, status, priority)
- State file updated with Phase 1 complete
</validation_checklist>

<pitfalls>
- Confluence search may miss child pages — always use `get_page_children` for each found page
- Large Confluence pages should be truncated at ~5000 words with truncation noted
- Confluence URL formats vary (display, direct, short) — be flexible in parsing
- User-provided URLs from different Confluence domains may not be accessible via configured MCP
</pitfalls>
<common_issues>

**Issue**: Jira ticket not found  
**Solution**: Verify ticket key with user, check permissions

**Issue**: Confluence search returns 0 results  
**Solution**: Ask user for page URLs, or proceed with Jira-only analysis

**Issue**: Confluence page too large  
**Solution**: Include first 5000 words, note truncation in raw-data.md

**Issue**: Custom fields not recognized  
**Solution**: Use `mcp_Jira_MCP_jira_search_fields()` to discover field names

**Issue**: Confluence search finds parent but misses child pages  
**Solution**: Always check for child pages using `confluence_get_page_children()` for each found page

**Issue**: User provided invalid Confluence URL  
**Solution**: Try to parse page ID, if fails ask user for correct URL or page ID

**Issue**: Confluence URL is from different domain  
**Solution**: Warn user that Jira MCP might not have access, try anyway, fallback to asking for accessible pages
</common_issues>
</testgen_flow_data_collection>
