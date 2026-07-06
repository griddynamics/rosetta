---
name: testgen-flow-data-collection
description: "Phase 1 Data Collection of testgen-flow"
alwaysApply: false
user-invocable: false
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
- Collection skill: `data-collection` (single canonical collector). This phase resolves the in-scope vendor binding(s) from config and passes them to `data-collection` (which resolves and loads its own vendor binding internally).
- **Config-resolved vendors (NOT hardcoded).** Resolve from the testgen project config / `initial-data.md` pointer:
  - **Issue vendor** — first non-empty key (stop at first hit): `issue_mcp_collection_skill`, `issue_collection_skill`, `issue_tracker.mcp_collection_skill`. In-scope signal: `jira_base_url` present → binding = `jira`.
  - **Documentation vendor** — first non-empty key: `documentation_mcp_collection_skill`, `documentation.mcp_collection_skill`, `mcp_documentation_collection_skill`, `confluence_mcp_collection_skill`. In-scope signals: `confluence_base_url` / `confluence_space` present → binding = `confluence`.
  - **Fallback:** resolved vendor empty but scope clearly active → re-read config; still absent → `SKIPPED_NO_CONFIG` (record the gap + skip that source, do not fabricate a vendor).
- MCPs: Jira, Confluence (or equivalent)
</workflow_context>

<phase_steps>
1. Extract Jira ticket data
2. Get Confluence documentation
3. Create raw data document
4. Update state file
</phase_steps>

<extract_jira step="1.1">
1. **Read `agents/testgen/{TICKET-KEY}/initial-data.md`** (contributes the original user prompt and a pointer to the project config) and the original user request.
2. Resolve the **Issue vendor binding** per `<workflow_context>` (`jira_base_url` set → binding = `jira`). If unresolvable with scope active, re-read config; still absent → record the gap and stop Phase 1.
3. ACQUIRE `data-collection` FROM KB if not already loaded.
4. Extract ticket key from user input (parse from URL if needed). **Ticket-key extraction failure path:** if no key can be parsed (no URL, malformed input, ambiguous candidates): stop Phase 1, ask the user once for the exact ticket key (`PROJ-NNN` form), do not proceed until the user provides it. After 2 unsuccessful re-asks, record `Phase 1 blocked: ticket key unresolvable` in `testgen-state.md` and stop.
5. USE SKILL `data-collection` with the resolved issue vendor binding (`jira`), passing the resolved ticket key and the Jira section of `<create_raw_data>`'s minimum-output contract; `data-collection` loads `references/issue-vendor-binding.md`. Retrieve fields: summary, description, status, issuetype, priority, labels, components, assignee, reporter, comments (up to 10). Redaction runs inside `data-collection` via `sensitive-data` before write.

</extract_jira>

<get_confluence step="1.2">
1. Resolve the **Documentation vendor binding** per `<workflow_context>` (`confluence_base_url` / `confluence_space` set → binding = `confluence`). If documentation MCP is not in scope, apply `SKIPPED_NO_CONFIG`: record `Confluence Source: Skipped — no documentation MCP configuration` and proceed Jira-only. ACQUIRE `data-collection` FROM KB if not already loaded.
2. USE SKILL `data-collection` with the resolved documentation vendor binding (`confluence`), passing the Confluence input handle(s) and the Confluence section of `<create_raw_data>`'s contract. `data-collection` loads `references/documentation-vendor-binding.md`, which owns URL parsing, direct-URL-vs-search precedence, child-page traversal, truncation, deduplication, permission fallbacks, AND the authenticated MCP reads/searches in one binding — no second skill to reconcile against. Redaction runs inside `data-collection` via `sensitive-data` before write.
3. **Search-term seed (passed to `data-collection` when no URLs supplied):** project key (from ticket key), labels, component names, key terms from summary/description.
4. **Fallback**: when the binding reports zero pages after URL + search + its ask-once user fallback, record `Confluence Source: not available — proceeded Jira-only` in the data collection summary and continue. Do NOT fabricate documentation content.
</get_confluence>

<create_raw_data step="1.3">
**Minimum-output contract (asserted by this phase independent of skill internals):** `raw-data.md` MUST capture, at minimum — Jira: summary, description, status, priority, labels, components, comments; Confluence (when not skipped): page title, URL, content. Missing any of these = phase incomplete, regardless of what `data-collection` (`jira` / `confluence` bindings) defines internally.

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

1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` per the canonical state-file schema (owned by `testgen-flow-project-config-loading.md` `<state_file_template>`, via `testgen-flow.md` `<state_and_outputs>` — this phase does NOT restate the full schema; it produces the Phase 1 delta the schema slots in).

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
4. **STOP AND WAIT** for explicit user confirmation before advancing to Phase 2. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses (questions, suggestions) as "not confirmed" and re-ask. This is a **priority-(3) per-phase confirmation** per `testgen-flow.md` `<orchestration_and_escalation>` — an explicit user instruction to skip it is honored there; it is **not** one of the never-overridable Phase 3 / Phase 6 HITL gates.
</update_state>

<validation_checklist>
- `raw-data.md` created with Jira section populated
- Confluence section has at least 1 page OR user confirmed skip
- All key Jira fields captured (summary, description, status, priority)
- State file updated with Phase 1 complete
</validation_checklist>

<pitfalls>
- Confluence search may miss child pages — always perform child-page traversal per `data-collection`'s `confluence` binding for each found page
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
**Solution**: Invoke the `jira_search_fields` operation per `data-collection`'s `jira` binding (or equivalent MCP) to enumerate available field names

**Issue**: Confluence search finds parent but misses child pages  
**Solution**: Always perform the child-page traversal operation per `data-collection`'s `confluence` binding (or equivalent MCP) for each found page

**Issue**: User provided invalid Confluence URL  
**Solution**: Try to parse page ID, if fails ask user for correct URL or page ID

**Issue**: Confluence URL is from different domain  
**Solution**: Warn user that Jira MCP might not have access, try anyway, fallback to asking for accessible pages
</common_issues>
</testgen_flow_data_collection>
