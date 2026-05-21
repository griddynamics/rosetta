---
name: testgen-flow-data-collection
description: Phase 1 of Test Generation - Data Collection from Jira and Confluence
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 1: Data Collection

## Prerequisites

- MUST be starting new test generation flow.
- User provided Jira ticket key or URL.
- **Acquire workflows:** ACQUIRE **`mcp-capability-interaction.md`** FROM KB (MCP guided vs questionnaire; always for Phase 1). Before the first guided **`{integration-action:*}`** call in Steps 3–4, ACQUIRE **`mcp-tool-resolution.md`**. Before **Persist** blocks using **`{agent-action:*}`** in Steps 5–6, ACQUIRE **`agent-action-resolution.md`**. If an alias fails, use canonical paths under **`instructions/r2/core/workflows/`** with the same basename.
- **Step 2b only:** Run the numbered **Step 2b checklist** in this file (not the whole fragment for later steps unless needed).
- **Before MCP calls:** Do **not** call Jira/Confluence MCPs until Step **2b** completes.
- **URL placeholders:** `{jira-host}` and `{confluence-host}` in examples mean the customer’s real web hostnames (including subdomain), not fixed vendor domains.

## Objective

Extract all relevant data from Jira ticket and related Confluence documentation to establish baseline for analysis.

## Requirements

**Token resolution (canonical):** **`{integration-action:*}`** → **`mcp-tool-resolution.md`**. **`{agent-action:*}`** → **`agent-action-resolution.md`**. MCP guided vs questionnaire and recording → **`mcp-capability-interaction.md`** (ACQUIRE per **Prerequisites**). Later steps say **see Token resolution** instead of repeating this.

### Step 1: Parse Initial User Input

**Extract from user's initial prompt**:
1. **Jira ticket**: Key or URL (REQUIRED).
2. **Confluence URLs** (optional): Parse and store for later steps. How they affect routing is defined **only** in the **Step 2b** matrix (after `Jira source` / `Confluence source` exist).

**Supported formats**:
```
"Analyze requirements for PROJ-123"
"Analyze requirements for PROJ-123 with Confluence: https://{confluence-host}/display/PROJ/Page"
"Analyze PROJ-123, Confluence pages: URL1, URL2, URL3"
"PROJ-123 + https://{confluence-host}/display/PROJ/Auth"
```

**Parse Confluence URLs**:
- Extract from patterns: "with Confluence", "Confluence:", "Confluence docs:", "Confluence pages:"
- Accept comma-separated or line-separated URLs
- URLs may be:
  - Display format: `https://{confluence-host}/display/SPACE/Page+Title`
  - Direct format: `https://{confluence-host}/pages/viewpage.action?pageId=123456`
  - Short format: `https://{confluence-host}/x/AbCdEf`

### Step 2: Setup Output Directory

Create output directory structure:
```
agents/testgen/{TICKET-KEY}/
└── testgen-state.md (initialize)
```

### Step 2b: Resolve MCP routing (user message vs capability file)

**Precedence:** **A first** — fragment **section A** (user / task text **wins** over the file). **B second** — fragment **section B** (`agents/mcp-capability.yaml`). Full rules: **`mcp-capability-interaction.md`** (ACQUIRE per **Prerequisites**).

**Checklist (execute in order before any Jira/Confluence MCP call in Phase 1):**

1. Confirm **Prerequisites** ACQUIRE list for this phase is loaded (**`mcp-capability-interaction.md`**, and before guided MCP / Persist: **`mcp-tool-resolution.md`**, **`agent-action-resolution.md`** as listed there).
2. Read **`agents/mcp-capability.yaml`** at workspace root if present; if absent, treat capability config as **missing** (see **`mcp-capability-interaction.md`** Path conventions).
3. Apply fragment **§ A — user message** (task text wins over file).
4. If YAML is **missing** and the task text does not override MCP usage: ask **one** question — “Use live MCP for Jira and Confluence in this workspace?” — **STOP**, **WAIT**. **No** → both integrations **questionnaire** for this run. **Yes** → both **guided**; recommend adding `agents/mcp-capability.yaml`.
5. Derive **`Jira source`** and **`Confluence source`** using fragment **§ B** (`mode`, `mcp.jira`, `mcp.confluence`, omitted-key defaults).
6. Record in `agents/testgen/{TICKET-KEY}/testgen-state.md` under Phase 1: `Jira source`, `Confluence source`, and **MCP interaction source:** `agents/mcp-capability.yaml` **or** `user override` **or** `default question`.
7. If **`agents/user-instructions/mcp-guidance.md`** exists and at least one source is **guided**, read it before the first Jira/Confluence MCP call in Phase 1.

#### Routing matrix (after Step 2b)

Use `Jira source` and `Confluence source` from state. **Step labels:** **3Q** = Jira questionnaire (no Jira MCP); **3A** = Jira guided MCP; **4Q** = Confluence questionnaire; **4A** = Confluence guided MCP. **“URLs in Step 1?”** = Confluence URL(s) were parsed from the **initial** user prompt in Step 1.

| Jira source | Confluence source | URLs in Step 1? | Execute |
|-------------|-------------------|-----------------|---------|
| guided | guided | yes | **3A** → **4A** Option A |
| guided | guided | no | **3A** → **4A** Option B |
| guided | questionnaire | — | **3A** → **4Q** |
| questionnaire | guided | yes | **3Q** → **4A** Option A |
| questionnaire | guided | no | **3Q** → **4A** Option B |
| questionnaire | questionnaire | — | **3Q** → **4Q** |

#### `{integration-action:…}` intent reference (Phase 1)

Use with **Token resolution** and **`mcp-tool-resolution.md`** when mapping tokens to host MCP tools.

| Token | Intent |
|-------|--------|
| `{integration-action:jira-get-issue}` | Load one issue by key with field list, expand flags, comment limit |
| `{integration-action:jira-search-fields}` | Discover Jira field IDs / API names (custom fields) |
| `{integration-action:confluence-get-page}` | Load one Confluence page by id (markdown/metadata options) |
| `{integration-action:confluence-search-pages}` | Search Confluence pages (query + limit) |
| `{integration-action:confluence-list-child-pages}` | List child pages for a parent (content options) |

### Step 3: Extract Jira Ticket Data

Pick **exactly one** subsection below using the **Step 2b** matrix (`Jira source` column). **Do not** read, summarize, or execute the other subsection (**progressive disclosure**).

#### Step 3Q: Jira questionnaire (no MCP)

**Jira MCP:** **off** — no **`{integration-action:jira-*}`** calls; user-provided content only.

1. Ask **numbered** questions so you can build the Jira section of `raw-data.md`: ticket summary, description (or ask user to paste export), status, priority, labels, components, key links, and any acceptance criteria they rely on.
2. **STOP** and **WAIT** for answers.
3. Write `agents/testgen/{TICKET-KEY}/raw-data.md` (create if needed) with `## Jira (user-provided, MCP absent)` containing merged answers. For any field the user could not supply or was unsure about, add an explicit **`unknown`**, **`unverified`**, or short **why missing** note next to that item (do not imply MCP-grade certainty). Then continue per the **Step 2b** matrix to Step 4.

#### Step 3A: Guided Jira (MCP)

1. **Extract ticket key** from user input:
   - Format: "PROJ-123" or URL "https://{jira-host}/browse/PROJ-123"
   - Parse key from URL if needed

2. **Retrieve issue** — see **Token resolution**, **`mcp-tool-resolution.md`**, and **Intent reference** above for **`{integration-action:jira-get-issue}`**. Then call the resolved tool; logical parameters:
```text
Action: {integration-action:jira-get-issue}
Parameters:
  issue_key: PROJ-123
  fields: summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated
  expand: renderedFields
  comment_limit: 10
```

**Example (mapping only):** On a common Atlassian host the resolved tool is `mcp__atlassian__jira_get_issue`; rename keys from the block above as required (e.g. `issue_key` → `issueKey`, `comment_limit` → `commentLimit`). Other tokens: see **Token resolution**.

3. **Capture** (for Step 5 / `raw-data.md`):
   - Summary, description (both raw and rendered)
   - Issue type, status, priority
   - Labels, components
   - Assignee, reporter
   - Comments (up to 10 recent)
   - Created/updated dates
   - Custom fields if present (epic link, story points, etc.)

#### Step 3A.4 — Jira field schema (optional)

Run **only** when substep **3** leaves custom-field **API names or ids** ambiguous for `raw-data.md`.

1. **Invoke** **`{integration-action:jira-search-fields}`** **once** (see **Token resolution**).
2. **Output:** merge the returned field metadata into working notes and into **`### Custom Fields`** (and related) when executing **Step 5** (`raw-data.md`). If substep 3 was sufficient, **skip** this entire **3A.4** subsection.

### Step 4: Get Confluence Documentation

Pick **exactly one** subsection below using the **Step 2b** matrix (`Confluence source` column; for **4A**, use the **URLs in Step 1?** column for Option A vs B). **Do not** read, summarize, or execute the other subsection (**progressive disclosure**).

#### Step 4Q: Confluence questionnaire (no MCP)

**Confluence MCP:** **off** — no **`{integration-action:confluence-*}`** calls; user-provided content only.

1. Ask **numbered** questions: paste each page body (or export), or provide URLs plus authorized excerpts, parent/child relationships if relevant.
2. **STOP** and **WAIT**.
3. Append to `agents/testgen/{TICKET-KEY}/raw-data.md` under `## Confluence (user-provided, MCP absent)` with merged answers. Mark gaps, pasted excerpts of unknown completeness, or user-stated uncertainty the same way as Step 3Q (**`unknown` / `unverified` / reason**). If Jira questionnaire already created the file, append; otherwise create the file with this section.
4. Continue to **Step 5** so `raw-data.md` matches the full template (headings, metadata). Then run **Validation**.

#### Step 4A: Guided Confluence (MCP)

**Option A vs B:** From the **Step 2b** matrix (**URLs in Step 1?** column).

Resolve each **`{integration-action:confluence-*}`** (see **Token resolution**; e.g. `confluence-get-page` → `mcp__atlassian__confluence_get_page` with `pageId` / `convertToMarkdown` when the host uses that idiom).

##### Option A: User-provided Confluence URLs

1. Parse page IDs from URLs
2. For each URL, extract:
   - Page ID from URL parameters (pageId=123456)
   - Or use space + title from display URL
3. Retrieve pages using **`{integration-action:confluence-get-page}`**
4. Check each page for child pages (REQUIRED)
5. Skip automatic search

**Illustrative resolved call (Atlassian-style host, not mandatory):** `mcp__atlassian__confluence_get_page` with arguments such as `{ "pageId": "123456", "convertToMarkdown": true }` (exact keys per host mapping).

**Tell user**:
```
✅ Using provided Confluence pages:
   - [Page 1 Title] (from URL)
   - [Page 2 Title] (from URL)
🔍 Checking for child pages...
```

##### Option B: No URLs — auto-search

**Use**: **`{integration-action:confluence-search-pages}`**

**Extract search terms** from Jira ticket:
- Project key (from ticket key)
- Labels (if present)
- Component names (if present)
- Key terms from summary/description

**Build CQL query**:
```
type=page AND space={PROJECT_KEY} AND (text ~ "{term1}" OR text ~ "{term2}")
```

**Search Confluence**:
```text
Action: {integration-action:confluence-search-pages}
Parameters:
  query: <cql_query>
  limit: 10
```

**Illustrative resolved call (Atlassian-style host, not mandatory):** `mcp__atlassian__confluence_search_pages` (or host-equivalent) with CQL in the query argument, e.g. `type=page AND space=PROJ AND (text ~ "auth" OR text ~ "login")`.

**Rank results** by relevance:
- Title matches ticket terms
- Labels match ticket labels
- Content matches key terms

**Get top 3-5 pages**:
```text
Action: {integration-action:confluence-get-page}
Parameters:
  page_id: <page_id>
  convert_to_markdown: true
  include_metadata: true
```

**IMPORTANT: Check for child pages** (nested documents often missed by search):
```text
Action: {integration-action:confluence-list-child-pages}
Parameters:
  parent_id: <page_id>
  include_content: true
  convert_to_markdown: true
  limit: 10
```

For each parent page found:
1. Get parent page content
2. Check if parent has child pages
3. If child pages found, retrieve content of relevant child pages (up to 5 most relevant)
4. Include both parent and child pages in analysis

**Example**: 
- Parent: "Job Post" (overview)
- Children: "Create a Job Post", "Edit a Job Post", "Delete a Job Post"
- Capture ALL relevant pages, not just parent

**Capture**:
- Page title, URL
- Page content (markdown)
- Labels, space
- Created/updated dates
- Author
- Parent/child relationships (if applicable)

**Fallback**: If search returns no results or insufficient results, ask user:
"No Confluence pages found automatically. Please provide Confluence page URLs, IDs, or titles (comma-separated), or type 'skip' to proceed with Jira data only."

**If user provides URLs at this point**:
- Parse the URLs
- Extract page IDs or use space + title
- Retrieve specified pages
- Check for child pages

### Step 5: Create Raw Data Document

**File**: `agents/testgen/{TICKET-KEY}/raw-data.md`

**Persist** — see **Token resolution** for **`{agent-action:write-file}`** / **`{agent-action:patch-file}`**:

```text
Action: {agent-action:write-file}
Parameters:
  path: agents/testgen/{TICKET-KEY}/raw-data.md
  content: <markdown from template below, filled from Steps 3–4>
```

**Illustrative host mapping (Cursor-style agent, not mandatory):** tool `Write` with `file_path` / `contents` (or host-equivalent keys after resolution).

If the file already exists and you are only appending, you may use **`{agent-action:patch-file}`** instead (see **Token resolution**).

**Format**:
```markdown
# Raw Data - [TICKET-KEY]

**Extracted**: [DateTime]
**Phase**: 1 - Data Collection
**Confluence Source**: [User-provided URLs / Auto-search / User-provided after search / Skipped]
**Confidence / Unknowns**: [If either source was questionnaire: list unverified, missing, or user-uncertain items; else `MCP-backed` or `n/a`]

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
- **Confidence / Unknowns**: [Same as header line; required when any questionnaire path ran]
```

### Step 6: Update State File

**File**: `agents/testgen/{TICKET-KEY}/testgen-state.md`

**Persist** — same as Step 5 (**see Token resolution**):

```text
Action: {agent-action:write-file}
Parameters:
  path: agents/testgen/{TICKET-KEY}/testgen-state.md
  content: <markdown from template below, filled for this ticket>
```

**Create initial state**:
```markdown
# Test Generation State - [TICKET-KEY]

**Last Updated**: [DateTime]
**Current Phase**: 1 - Data Collection (COMPLETED)
**Jira Ticket**: [TICKET-KEY]
**Confluence Pages**: [Count pages, list URLs]
**Confluence Source**: [User-provided URLs / Auto-search]

## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [DateTime]
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started

## Metrics

- Jira Fields Extracted: [Count]
- Confluence Pages Analyzed: [Count]
- Total Content Size: [Word count]
- Contradictions Found: 0
- Gaps Identified: 0
- Questions Generated: 0
- User Stories Created: 0
- Test Scenarios: 0

## Phase Details

### Phase 1: Data Collection
- **Completed**: [DateTime]
- **Jira Ticket**: [KEY]
- **Files Created**: raw-data.md, testgen-state.md
- **Confluence Pages**: [Count]
- **Search Terms**: [List]
- **Notes**: [Any relevant notes or issues]
```

## Validation

Before completing Phase 1, verify:
- ✅ `agents/testgen/{TICKET-KEY}/` directory exists
- ✅ Phase 1 block in `testgen-state.md` contains lines **`Jira source`**, **`Confluence source`**, and **`MCP interaction source`**
- ✅ If **`Jira source` is `questionnaire`**: `raw-data.md` contains `## Jira (user-provided, MCP absent)`
- ✅ If **`Confluence source` is `questionnaire`**: `raw-data.md` contains `## Confluence (user-provided, MCP absent)`
- ✅ If any **questionnaire** path ran: `raw-data.md` **Data Collection Summary** includes **`Confidence / Unknowns`**
- ✅ `raw-data.md` created with Jira section populated (MCP or questionnaire path)
- ✅ Confluence section has at least 1 page OR user confirmed skip
- ✅ `testgen-state.md` created with Phase 1 marked complete
- ✅ All key Jira fields captured (summary, description, status, priority)

## Tools Used

| Token / use | Where |
|---------------|--------|
| `{integration-action:jira-get-issue}` | Step 3A.2 |
| `{integration-action:jira-search-fields}` | Step 3A.4 (conditional) |
| `{integration-action:confluence-search-pages}` | Step 4A Option B |
| `{integration-action:confluence-get-page}` | Step 4A Options A / B |
| `{integration-action:confluence-list-child-pages}` | Step 4A Option B |
| `{agent-action:write-file}` | Steps 5–6 (**Persist** blocks) |
| `{agent-action:patch-file}` | Steps 5–6 (optional append / edit) |

## Common Issues

**Issue**: Jira ticket not found  
**Solution**: Verify ticket key with user, check permissions

**Issue**: Confluence search returns 0 results  
**Solution**: Ask user for page URLs, or proceed with Jira-only analysis

**Issue**: Confluence page too large  
**Solution**: Include first 5000 words, note truncation in raw-data.md

**Issue**: Custom fields not recognized  
**Solution**: Run **Step 3A.4** — **`{integration-action:jira-search-fields}`** (or equivalent) to discover field names

**Issue**: Confluence search finds parent but misses child pages  
**Solution**: Always check for child pages using **`{integration-action:confluence-list-child-pages}`** for each found page

**Issue**: User provided invalid Confluence URL  
**Solution**: Try to parse page ID, if fails ask user for correct URL or page ID

**Issue**: Confluence URL is from different domain  
**Solution**: Warn user that Jira MCP might not have access, try anyway, fallback to asking for accessible pages

## Next Phase

After Phase 1 completion:
1. Tell user: "Phase 1 complete. Found [X] Jira fields and [Y] Confluence pages."
2. Ask: "Ready to proceed to Phase 2 (Gap Analysis)?"
3. Wait for confirmation
4. Load Phase 2: ACQUIRE testgen-phase2-md FROM KB

## Notes

- Confluence search may need tuning based on organization's Confluence structure
- Some Jira instances have custom fields - capture all available
- Confluence pages may be in different spaces - search broadly initially
- **CRITICAL**: Always check for child pages - nested documentation often contains the most relevant details
- Example: "Job Post" parent may have children "Create a Job Post", "Edit a Job Post", etc.
- Retrieve up to 10 child pages per parent, prioritize by relevance to ticket
- Confluence URL formats vary - be flexible in parsing (display URLs, direct URLs, short URLs)

