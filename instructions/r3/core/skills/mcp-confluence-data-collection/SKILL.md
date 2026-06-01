---
name: mcp-confluence-data-collection
description: Extract documentation from Confluence MCP — page content, child pages, feature context, technical specs.
tags: ["data-collection", "mcp", "confluence"]
baseSchema: docs/schemas/skill.md
---

<mcp-confluence-data-collection>

<role>Confluence documentation extraction specialist</role>

<when_to_use_skill>
Retrieve and normalize feature documentation, technical specs, and business context from Confluence when page IDs, URLs, or search terms are available.
</when_to_use_skill>

<prerequisites>
- Atlassian (Confluence) MCP configured and accessible
- Page ID, page URL, or search terms provided by user (ask if missing)
</prerequisites>

<process>

1. **If user provided page URLs/IDs**: retrieve pages directly using `confluence_get_page()`, then check for child pages using `confluence_get_page_children()`
2. **If no URLs provided**:
   2.1. Build CQL query from available context (project key, labels, component names, key terms)
   2.2. Search Confluence: `confluence_search(query=cql_query, limit=10)`
   2.3. Rank results by relevance (title match, label match, content match)
   2.4. Retrieve top 3-5 pages: `confluence_get_page(page_id, convert_to_markdown=True, include_metadata=True)`
3. For each parent page, retrieve up to 5 relevant child pages
4. Extract and normalize per page:
   - Page title, URL, space key
   - Labels, last updated date
   - Parent/child relationship
   - Full content in markdown
5. **Fallback**: If no results, ask user for specific page URLs/IDs or note gap
6. Truncate pages exceeding ~5000 words, note truncation

</process>

<output_format>

```markdown
## Confluence Documentation

### Page: [Page Title]
**URL**: [URL]
**Space**: [Space Key]
**Labels**: [Labels]
**Updated**: [Date]
**Type**: Parent / Child of [Parent Title]

#### Content
[Full page content in markdown]

#### Child Pages
- [Child Title] — [URL]

---
[Repeat for each page]
```

</output_format>

<pitfalls>
- Child pages often contain critical detail — always check with `get_page_children`
- Large pages should be truncated at ~5000 words with truncation noted
- URL formats vary (display, direct, short) — parse flexibly
- User-provided URLs from different Confluence domains may not be accessible via configured MCP
- Search may miss pages — always offer user a chance to provide direct URLs
</pitfalls>

<vendor_replacement>
This skill is Atlassian-Confluence-specific. To support a different documentation system (Notion, SharePoint, Google Workspace / Docs, GitBook, GitHub Wiki, Outline, Slab, BookStack, etc.), fork this SKILL.md and replace only the items below — the rest of the structure (role / when_to_use_skill / prerequisites shape / output_format skeleton / pitfalls discipline including truncation, fallback-to-user, search-may-miss) is vendor-agnostic and should stay.

**Confluence-specific items that must be re-bound per vendor:**

- **MCP tool calls** in `<process>`:
  - `confluence_get_page` (steps 1, 2.4) → vendor's equivalent "fetch single page by ID/URL" operation. Parameter shape (`page_id`, `convert_to_markdown`, `include_metadata`) is Confluence-specific.
  - `confluence_get_page_children` (steps 1, 3) → vendor's equivalent "list child pages" operation. Not all systems have a hierarchical page model (GitBook does; Notion does via blocks; SharePoint via libraries; flat-wiki systems like Outline may not).
  - `confluence_search` (step 2.2) → vendor's equivalent full-text search operation. Returns different result shapes per vendor.
- **Query language** in `<process>` step 2.1–2.2:
  - **CQL (Confluence Query Language)** is Atlassian-specific. Other systems use: Notion's filter API, SharePoint's KQL, Google Drive's `q=` syntax, GitBook's REST search, GitHub Wiki via Code Search. Each needs its own query-building logic.
- **Identifier and URL formats** in `<prerequisites>` and `<process>` step 1:
  - Confluence accepts numeric/alphanumeric page IDs and several URL forms (`/display/SPACE/Page+Title`, `/wiki/spaces/SPACE/pages/N`, short tinyurl forms). Other vendors use different ID schemes (Notion UUIDs, SharePoint GUIDs + site path, GitBook page slugs, GitHub `owner/repo/wiki/Page-Name`).
- **Hierarchy concept** in `<process>` steps 1, 3, 4 and `<output_format>`:
  - "Space key" + "Parent/child relationship" is Confluence-specific terminology. Equivalents: Notion "workspace + parent block", SharePoint "site + library + folder", GitBook "space + group + page", Google Drive "folder + file". Some vendors are flat (Outline pages, GitHub Wiki) and have no real parent/child.
- **Markdown conversion** in `<process>` step 2.4:
  - `convert_to_markdown=True` is a Confluence-MCP parameter. Other vendors return HTML / proprietary blocks (Notion) / DOCX (SharePoint) / native markdown (GitBook, GitHub Wiki) and require different conversion strategies.
- **Output template label** in `<output_format>`:
  - `## Confluence Documentation` heading and the `**Space**:` / parent-child fields. Rename to the target vendor's nomenclature so downstream phases can route by source.
- **Pitfall about cross-domain URLs**:
  - "User-provided URLs from different Confluence domains may not be accessible via configured MCP" is Confluence-specific. Other vendors have analogous but differently-shaped multi-tenant constraints (Notion workspace boundaries, SharePoint tenant/site boundaries, GitBook organization boundaries).

**Pattern for swapping:** copy this file to `mcp-<vendor>-data-collection/SKILL.md`, edit only the items above, keep the rest. Note that the **truncation rule (~5000 words) and the no-fabrication discipline are generic** and should stay verbatim — they are not vendor-specific.

Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).
</vendor_replacement>

</mcp-confluence-data-collection>
