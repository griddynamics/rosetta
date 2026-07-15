---
name: testgen-flow-data-collection
description: "Phase 1 Data Collection of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<testgen_flow_data_collection>

<description_and_purpose>
Extract all relevant data from the Issue Tracker ticket and related Wiki / documentation sources to establish baseline for gap analysis and requirements generation.
</description_and_purpose>

<workflow_context>
- Phase 1 of 7 in `testgen-flow`
- Input: initial user request + `initial-data.md`
- Output: `raw-data.md` with extracted Issue Tracker and Wiki data
- Prerequisite: Phase 0 complete
- Collection skill: `data-collection` (single canonical collector). This phase resolves each in-scope provider and passes its role + provider to the skill; the skill loads the role-named binding.
- **Provider resolution (merge evidence; providers are NOT hardcoded):**
  1. Providers were resolved in Phase 0 (`testgen-project-config.md` data sources, prefilled from `gain.json` `sdlc.issue_tracker(_project)` / `sdlc.wiki(_project)`).
  2. Reconcile with explicit user names/handles (which win for this run) and recognizable provider URLs in `initial-data.md` (valid evidence when unambiguous).
  3. Evidence conflicting or ambiguous → ask only about the unresolved provider/input; never silently choose between conflicting systems.
  4. Wiki scope clearly absent → `SKIPPED_NO_CONFIG` (record the gap + skip that source, do not fabricate a provider). The Issue Tracker source is required.
- Integrations: Issue Tracker + Wiki per the parent Terminology (Jira and Confluence are the canonical examples throughout this phase).
</workflow_context>

<phase_steps>
1. Extract Issue Tracker ticket data
2. Get Wiki documentation
3. Create raw data document
4. Update state file
</phase_steps>

<extract_ticket step="1.1">
1. **Read `plans/testgen-{TICKET-KEY}/initial-data.md`** (contributes the original user prompt and a pointer to the project config) and the original user request.
2. Resolve the **Issue Tracker provider** per `<workflow_context>`. If unresolvable with scope active, re-read config; still absent → record the gap and stop Phase 1.
3. Extract ticket key from user input (parse from URL if needed). **Ticket-key extraction failure path:** if no key can be parsed (no URL, malformed input, ambiguous candidates): stop Phase 1, ask the user once for the exact ticket key (`PROJ-NNN` form), do not proceed until the user provides it. After 2 unsuccessful re-asks, record `Phase 1 blocked: ticket key unresolvable` in `testgen-state.md` and stop.
4. USE SKILL `data-collection` with role `Issue Tracker`, the resolved provider, the resolved ticket key, and the ticket section of `<create_raw_data>`'s minimum-output contract; the skill loads its issue binding and adapts the canonical Jira examples to the target system. Retrieve fields: summary, description, status, issuetype, priority, labels, components, assignee, reporter, comments (up to 10). Redaction runs inside `data-collection` via `sensitive-data` before write.

</extract_ticket>

<get_wiki step="1.2">
1. Resolve the **Wiki provider** per `<workflow_context>`. If no Wiki is in scope, apply `SKIPPED_NO_CONFIG`: record `Wiki Source: Skipped — no Wiki configured` and proceed ticket-only.
2. USE SKILL `data-collection` with role `Wiki`, the resolved provider, the Wiki input handle(s), and the Wiki section of `<create_raw_data>`'s contract. The skill's documentation binding owns URL parsing, direct-URL-vs-search precedence, child-page traversal, truncation, deduplication, permission fallbacks, AND the authenticated reads/searches in one binding — no second skill to reconcile against; its canonical Confluence examples adapt to the target system. Redaction runs inside `data-collection` via `sensitive-data` before write.
3. **Search-term seed (passed to `data-collection` when no URLs supplied):** project key (from ticket key), labels, component names, key terms from summary/description.
4. **Fallback**: when the binding reports zero pages after URL + search + its ask-once user fallback, record `Wiki Source: not available — proceeded ticket-only` in the data collection summary and continue. Do NOT fabricate documentation content.
</get_wiki>

<create_raw_data step="1.3">
**Minimum-output contract (asserted by this phase independent of skill internals):** `raw-data.md` MUST capture, at minimum — ticket: summary, description, status, priority, labels, components, comments; Wiki (when not skipped): page title, URL, content. Missing any of these = phase incomplete, regardless of what the `data-collection` role bindings define internally. The template below shows Jira/Confluence field names as canonical examples — adapt labels to the resolved providers.

1. Create `plans/testgen-{TICKET-KEY}/raw-data.md` with structure:
   ```markdown
# Raw Data - [TICKET-KEY]

**Extracted**: [DateTime]
**Phase**: 1 - Data Collection
**Providers**: [resolved Issue Tracker / Wiki]
**Wiki Source**: [User-provided URLs / Auto-search / User-provided after search / Skipped]

---

## Issue Tracker Ticket Data

### Ticket: [KEY]
**URL**: [Ticket URL]
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

## Wiki Documentation

### Page 1: [Page Title]
**URL**: [Wiki page URL]
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
**URL**: [Wiki page URL]
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

- **Ticket**: [KEY]
- **Ticket Fields Extracted**: [Count]
- **Wiki Pages Found**: [Count]
- **Total Content Size**: [Approximate word count]
- **Search Terms Used**: [List]
- **Notes**: [Any issues during extraction]
   ```

</create_raw_data>

<update_state step="1.4">

1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` per the canonical state-file schema (owned by `testgen-flow-project-config-loading.md` `<state_file_template>`, via `testgen-flow.md` `<state_and_outputs>` — this phase does NOT restate the full schema; it produces the Phase 1 delta the schema slots in).

   **Phase 1 delta — required fields (slot into the schema's `## Phase Completion Status` and `## Phase Details` blocks):**

   ```markdown
   # In `## Phase Completion Status`:
   - [x] Phase 1: Data Collection - Completed [ISO datetime]

   # In `## Phase Details`, append:
   ### Phase 1
   - Completed: [ISO datetime]
   - Ticket: [TICKET-KEY]
   - Ticket Fields Captured: [count] (summary, description, status, priority, plus any extracted custom fields)
   - Wiki Pages: [count] (or `0 — user approved skip` if no docs)
   - Files Created: plans/testgen-{TICKET-KEY}/raw-data.md
   - Notes: [partial-load flags from get_wiki step 1.2, or ticket-key-extraction notes from step 1.1, or `None`]
   ```

   Update `**Current Phase**: 1` → `**Current Phase**: 2` and refresh `**Last Updated**` at the top of the file.

2. Tell user: "Phase 1 complete. Found [X] ticket fields and [Y] Wiki pages."
3. Ask: "Ready to proceed to Phase 2 (Gap Analysis)?"
4. **STOP AND WAIT** for explicit user confirmation before advancing to Phase 2. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses (questions, suggestions) as "not confirmed" and re-ask. This is a **priority-(3) per-phase confirmation** per `testgen-flow.md` `<orchestration_and_escalation>` — an explicit user instruction to skip it is honored there; it is **not** one of the never-overridable Phase 3 / Phase 6 HITL gates.
</update_state>

<validation_checklist>
- `raw-data.md` created with the ticket section populated
- Wiki section has at least 1 page OR user confirmed skip
- All key ticket fields captured (summary, description, status, priority)
- State file updated with Phase 1 complete
</validation_checklist>

<pitfalls>
- Wiki search may miss child pages — always perform child-page traversal per `data-collection`'s documentation binding for each found page
- Large Wiki pages should be truncated at ~5000 words with truncation noted
- Wiki URL formats vary (display, direct, short) — be flexible in parsing
- User-provided URLs from a different Wiki domain may not be accessible via the configured integration
- Treating a canonical vendor example (Jira/Confluence) as the configured provider
</pitfalls>
<common_issues>

**Issue**: Ticket not found
**Solution**: Verify ticket key with user, check permissions

**Issue**: Wiki search returns 0 results
**Solution**: Ask user for page URLs, or proceed with ticket-only analysis

**Issue**: Wiki page too large
**Solution**: Include first 5000 words, note truncation in raw-data.md

**Issue**: Custom fields not recognized
**Solution**: Invoke the search-fields operation per `data-collection`'s issue binding (or equivalent integration) to enumerate available field names

**Issue**: Wiki search finds parent but misses child pages
**Solution**: Always perform the child-page traversal operation per `data-collection`'s documentation binding (or equivalent integration) for each found page

**Issue**: User provided an invalid Wiki URL
**Solution**: Try to parse the page handle; if that fails ask user for a correct URL or page ID

**Issue**: Wiki URL is from a different domain
**Solution**: The URL is still valid provider evidence — try the matching available integration once; on failure report the host mismatch and ask for an accessible equivalent or approval to continue without that source
</common_issues>
</testgen_flow_data_collection>
