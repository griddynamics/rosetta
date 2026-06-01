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

</mcp-confluence-data-collection>
