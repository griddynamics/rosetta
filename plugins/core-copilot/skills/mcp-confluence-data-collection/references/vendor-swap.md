# Vendor Swap Guide — mcp-confluence-data-collection

Loaded on demand **only when forking this skill for a non-Confluence documentation system**. Not needed during runtime extraction — the base `SKILL.md` carries the always-loaded operational instructions; this file is the maintainer-facing portability guide.

The runtime skill is Atlassian-Confluence-specific. To support a different documentation system (Notion, SharePoint, Google Workspace / Docs, GitBook, GitHub Wiki, Outline, Slab, BookStack, etc.), fork the SKILL.md and replace only the items enumerated below — the rest of the structure (role / when_to_use_skill / prerequisites shape / output_format skeleton / pitfalls discipline including truncation, fallback-to-user, search-may-miss / **`<safety_boundaries>` / `<failure_handling>` / `<validation_checklist>` / `<success_criteria>`**) is vendor-agnostic and should stay.

---

## Confluence-specific items that must be re-bound per vendor

- **MCP tool calls** in `<process>`:
  - `confluence_get_page` (steps 1, 2.4) → vendor's equivalent "fetch single page by ID/URL" operation. Parameter shape (`page_id`, `convert_to_markdown`, `include_metadata`) is Confluence-specific.
  - `confluence_get_page_children` (steps 1, 3) → vendor's equivalent "list child pages" operation. Not all systems have a hierarchical page model (GitBook does; Notion does via blocks; SharePoint via libraries; flat-wiki systems like Outline may not).
  - `confluence_search` (step 2.2) → vendor's equivalent full-text search operation. Returns different result shapes per vendor.
- **Query language** in `<process>` step 2.1–2.2:
  - **CQL (Confluence Query Language)** is Atlassian-specific. Other systems use: Notion's filter API, SharePoint's KQL, Google Drive's `q=` syntax, GitBook's REST search, GitHub Wiki via Code Search. Each needs its own query-building logic. The deterministic ranking rule (title > label > body) is generic and stays.
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
- **Failure-handling error message identifiers** in `<failure_handling>` (`Confluence rejected the request`, `URL belongs to a different Confluence host`): vendor-branded; rewrite for the target.

---

## Pattern for swapping

Copy this file to `mcp-<vendor>-data-collection/SKILL.md`, edit only the items enumerated above, keep the rest verbatim.

Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).
