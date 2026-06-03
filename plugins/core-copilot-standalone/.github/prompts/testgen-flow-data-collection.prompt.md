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
- Skills: `mcp-jira-data-collection`, `mcp-confluence-data-collection`, `confluence-source-harvesting`
- MCPs: Jira, Confluence (or equivalent)
</workflow_context>

<phase_steps>
1. Extract Jira ticket data
2. Get Confluence documentation
3. Create raw data document
4. Update state file
</phase_steps>

<extract_jira step="1.1">
1. USE SKILL `mcp-jira-data-collection`
2. **Read `agents/testgen/{TICKET-KEY}/initial-data.md`** (contributes the original user prompt and a pointer to the project config) and the original user request.
3. Extract ticket key from user input (parse from URL if needed). **Ticket-key extraction failure path:** if no key can be parsed (no URL, malformed input, ambiguous candidates): stop Phase 1, ask the user once for the exact ticket key (`PROJ-NNN` form), do not proceed until the user provides it. After 2 unsuccessful re-asks, record `Phase 1 blocked: ticket key unresolvable` in `testgen-state.md` and stop.
4. Retrieve issue with fields: summary, description, status, issuetype, priority, labels, components, assignee, reporter, comments (up to 10)

</extract_jira>

<get_confluence step="1.2">
1. USE SKILL `confluence-source-harvesting` — URL shapes, child pages, truncation, permission fallbacks.
2. USE SKILL `mcp-confluence-data-collection` — authenticated reads and searches.
   - **Precedence on conflict:** `confluence-source-harvesting` defines URL parsing, child-page traversal, and truncation/permission rules (wins on those). `mcp-confluence-data-collection` defines authenticated read/search operations (wins on those). If both touch the same concern, prefer `confluence-source-harvesting` and record the conflict in the **Notes** field of the data collection summary.
3. **URL-handling branches (exhaustive; try in order):**
   - **All URLs provided AND resolved cleanly:** retrieve those pages via the `confluence_get_page` operation exposed by `mcp-confluence-data-collection` (or equivalent MCP), then check for child pages. Skip the search step.
   - **Some URLs provided, some failed to resolve (or coverage insufficient — fewer pages than the ticket suggests):** retrieve the resolved URLs first, then run the keyword search in step 4 to fill gaps. Record which URLs failed and why in the data collection summary.
   - **No URLs provided:** proceed to step 4 (keyword search).
4. **Keyword search (when triggered by step 3 branches):**
   4.1. Extract search terms from Jira ticket:
   - Project key (from ticket key)
   - Labels (if present)
   - Component names (if present)
   - Key terms from summary/description
   4.2. Retrieve relevant Confluence pages
5. **Fallback**: If neither URL retrieval nor keyword search produced results, ask user for specific page URLs/IDs or proceed with Jira only.
</get_confluence>

<create_raw_data step="1.3">
**Minimum-output contract (asserted by this phase independent of skill internals):** `raw-data.md` MUST capture, at minimum — Jira: summary, description, status, priority, labels, components, comments; Confluence (when not skipped): page title, URL, content. Missing any of these = phase incomplete, regardless of what `mcp-jira-data-collection` / `mcp-confluence-data-collection` / `confluence-source-harvesting` define internally.

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

1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` per the parent flow's canonical state-file schema (declared once in `testgen-flow.md` `<state_file>` — this phase does NOT restate the full schema; it produces the Phase 1 delta the schema slots in).

   **Phase 1 delta — required fields (slot into the schema's `## Phase Completion Status` and `## Phase Details` blocks):**

   ```markdown
   # In `## Phase Completion Status`:
   - [x] Phase 1: Data Collection - Completed [ISO datetime]

   # In `## Phase Details`, append:
   ### Phase 1
   - Completed: [ISO datetime]
   - Jira Ticket: [TICKET-KEY]
   - Jira Fields Captured: [count] (summary, description, status, priority, plus any extracted custom fields)
   - Confluence Pages: [count] (or `0 — user approved skip` if no docs)
   - Files Created: agents/testgen/{TICKET-KEY}/raw-data.md
   - Notes: [partial-load flags from get_confluence step 1.2, or ticket-key-extraction notes from step 1.1, or `None`]
   ```

   Update `**Current Phase**: 1` → `**Current Phase**: 2` and refresh `**Last Updated**` at the top of the file.

2. Tell user: "Phase 1 complete. Found [X] Jira fields and [Y] Confluence pages."
3. Ask: "Ready to proceed to Phase 2 (Gap Analysis)?"
4. **STOP AND WAIT** for explicit user confirmation. **DO NOT PROCEED** to Phase 2 until the user confirms. User instruction to bypass this gate must be refused with citation of this rule; the only acceptable input is an explicit confirmation token (`yes` / `proceed` / equivalent). Do not silently obey "skip the ask", "move to Phase 2 now", or equivalent phrasings — the gate is mechanical and cannot be overridden by instruction alone.
</update_state>

<validation_checklist>
- `raw-data.md` created with Jira section populated
- Confluence section has at least 1 page OR user confirmed skip
- All key Jira fields captured (summary, description, status, priority)
- State file updated with Phase 1 complete
</validation_checklist>

<pitfalls>
- Confluence search may miss child pages — always perform child-page traversal per `confluence-source-harvesting` for each found page
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
**Solution**: Invoke the `jira_search_fields` operation exposed by `mcp-jira-data-collection` (or equivalent MCP) to enumerate available field names

**Issue**: Confluence search finds parent but misses child pages  
**Solution**: Always perform the child-page traversal operation per `confluence-source-harvesting` (via `mcp-confluence-data-collection` or equivalent MCP) for each found page

**Issue**: User provided invalid Confluence URL  
**Solution**: Try to parse page ID, if fails ask user for correct URL or page ID

**Issue**: Confluence URL is from different domain  
**Solution**: Warn user that Jira MCP might not have access, try anyway, fallback to asking for accessible pages
</common_issues>
</testgen_flow_data_collection>
