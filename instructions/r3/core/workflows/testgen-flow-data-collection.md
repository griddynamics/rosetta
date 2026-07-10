---
name: testgen-flow-data-collection
description: "Phase 1 Data Collection of testgen-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 1: Data Collection

## Prerequisites

- MUST be starting new test generation flow
- User provided Jira ticket key or URL
- Jira MCP configured and accessible

## Objective

Extract all relevant data from Jira ticket and related Confluence documentation to establish baseline for analysis.

## Requirements

### Step 1: Parse Initial User Input

**Extract from user's initial prompt**:
1. **Jira ticket**: Key or URL (REQUIRED)
2. **Confluence URLs**: List of URLs (REQUIRED)

**Supported formats**:
```
"Analyze requirements for PROJ-123"
"Analyze requirements for PROJ-123 with Confluence: https://confluence.com/display/PROJ/Page"
"Analyze PROJ-123, Confluence pages: URL1, URL2, URL3"
"PROJ-123 + https://confluence.com/display/PROJ/Auth"
```

**Parse Confluence URLs**:
- Extract from patterns: "with Confluence", "Confluence:", "Confluence docs:", "Confluence pages:"
- Accept comma-separated or line-separated URLs
- URLs may be:
  - Display format: `https://confluence.company.com/display/SPACE/Page+Title`
  - Direct format: `https://confluence.company.com/pages/viewpage.action?pageId=123456`
  - Short format: `https://confluence.company.com/x/AbCdEf`

**If Confluence URLs provided**:
- Extract page IDs from URLs
- Skip automatic search (Step 3)
- Go directly to retrieving specified pages

**If no Confluence URLs provided**:
- Proceed with automatic search (Step 3)

### Step 2: Setup Output Directory

Create output directory structure:
```
agents/testgen/{TICKET-KEY}/
└── testgen-state.md (initialize)
```

### Step 3: Extract Jira Ticket Data

**Use**: Jira and/or Confluence MCPs respectively, snippets below will contain example pseudo-function calls for better understanding `mcp_Jira_MCP_jira_get_issue`, `mcp_Jira_MCP_confluence_get_page`, `mcp_Jira_MCP_confluence_search`, `mcp_Jira_MCP_confluence_get_page_children`.

**Extract ticket key** from user input:
- Format: "PROJ-123" or URL "https://jira.company.com/browse/PROJ-123"
- Parse key from URL if needed

**Retrieve issue** with comprehensive fields:
```python
mcp_Jira_MCP_jira_get_issue(
    issue_key="PROJ-123",
    fields="summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated",
    expand="renderedFields",
    comment_limit=10
)
```

**Capture**:
- Summary, description (both raw and rendered)
- Issue type, status, priority
- Labels, components
- Assignee, reporter
- Comments (up to 10 recent)
- Created/updated dates
- Custom fields if present (epic link, story points, etc.)

### Step 4: Get Confluence Documentation

**Decision Point**: Did user provide Confluence URLs in initial prompt?

#### Option A: User Provided Confluence URLs

**If URLs provided in initial prompt**:
1. Parse page IDs from URLs
2. For each URL, extract:
   - Page ID from URL parameters (pageId=123456)
   - Or use space + title from display URL
3. Retrieve pages directly using `mcp_Jira_MCP_confluence_get_page()`
4. Check each page for child pages (REQUIRED)
5. Skip automatic search

**Tell user**:
```
✅ Using provided Confluence pages:
   - [Page 1 Title] (from URL)
   - [Page 2 Title] (from URL)
🔍 Checking for child pages...
```

#### Option B: No URLs Provided - Auto-Search

**Use**: `mcp_Jira_MCP_confluence_search()`

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
```python
mcp_Jira_MCP_confluence_search(
    query=cql_query,
    limit=10
)
```

**Rank results** by relevance:
- Title matches ticket terms
- Labels match ticket labels
- Content matches key terms

**Get top 3-5 pages**:
```python
mcp_Jira_MCP_confluence_get_page(
    page_id=page_id,
    convert_to_markdown=True,
    include_metadata=True
)
```

**IMPORTANT: Check for child pages** (nested documents often missed by search):
```python
mcp_Jira_MCP_confluence_get_page_children(
    parent_id=page_id,
    include_content=True,
    convert_to_markdown=True,
    limit=10
)
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

**Format**:
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

### Step 6: Update State File

**File**: `agents/testgen/{TICKET-KEY}/testgen-state.md`

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
- ✅ `raw-data.md` created with Jira section populated
- ✅ Confluence section has at least 1 page OR user confirmed skip
- ✅ `testgen-state.md` created with Phase 1 marked complete
- ✅ All key Jira fields captured (summary, description, status, priority)

## Tools Used

- `mcp_Jira_MCP_jira_get_issue()` - Jira ticket extraction
- `mcp_Jira_MCP_confluence_search()` - Confluence page search
- `mcp_Jira_MCP_confluence_get_page()` - Confluence page content retrieval
- `mcp_Jira_MCP_confluence_get_page_children()` - Confluence child page discovery
- `write()` - File creation

## Common Issues

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

## Next Phase

After Phase 1 completion:
1. Tell user: "Phase 1 complete. Found [X] Jira fields and [Y] Confluence pages."
2. Ask: "Ready to proceed to Phase 2 (Gap Analysis)?"
3. Wait for confirmation
4. Load Phase 2: APPLY PHASE testgen-flow-gap-and-contradiction-analysis.md

## Notes

- Confluence search may need tuning based on organization's Confluence structure
- Some Jira instances have custom fields - capture all available
- Confluence pages may be in different spaces - search broadly initially
- **User can provide Confluence URLs in initial prompt** - this skips auto-search
- If user provides specific page URLs/IDs, use those directly instead of search
- **CRITICAL**: Always check for child pages - nested documentation often contains the most relevant details
- Example: "Job Post" parent may have children "Create a Job Post", "Edit a Job Post", etc.
- Retrieve up to 10 child pages per parent, prioritize by relevance to ticket
- Confluence URL formats vary - be flexible in parsing (display URLs, direct URLs, short URLs)

