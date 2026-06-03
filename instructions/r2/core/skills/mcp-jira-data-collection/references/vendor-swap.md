# Vendor Swap Guide — mcp-jira-data-collection

Loaded on demand **only when forking this skill for a non-Jira issue tracker**. Not needed during runtime extraction — the base `SKILL.md` carries the always-loaded operational instructions; this file is the maintainer-facing portability guide.

The runtime skill is Atlassian-Jira-specific. To support a different issue tracker (GitHub Issues, GitLab Issues, Linear, Azure DevOps Work Items, ServiceNow, Asana, etc.), fork the SKILL.md and replace only the items enumerated below — the rest of the structure (role / when_to_use_skill / prerequisites shape / output_format skeleton / pitfalls discipline / `<safety_boundaries>` / `<failure_handling>` / `<validation_checklist>`) is vendor-agnostic and should stay.

---

## Jira-specific items that must be re-bound per vendor

- **MCP tool calls** in `<process>`:
  - `jira_get_issue` (step 2) → vendor's equivalent "fetch single issue by key/ID" operation. Parameter shape (`issue_key`, `fields`, `expand`, `comment_limit`) is Jira-specific — other vendors use different signatures (e.g., GitHub Issues uses `owner/repo/issue_number`, Linear uses GraphQL with `id`).
  - `jira_search_fields` (step 6 fallback + pitfalls) → vendor's equivalent "discover custom-field schema" operation. Not all trackers expose custom-field metadata via API.
- **Identifier format** in `<prerequisites>` and `<process>` step 1:
  - Jira accepts `PROJ-NNN` project-prefixed keys and URL form `https://*.atlassian.net/browse/PROJ-NNN` (or self-hosted `https://jira.company.com/browse/PROJ-NNN`). Other vendors use different ID schemes: GitHub `owner/repo#NNN`, GitLab `group/project#NNN`, Linear `TEAM-NNN`, Azure DevOps numeric ID, ServiceNow `INC-NNNNNNN`.
- **Field set** in `<process>` step 2:
  - The comma-separated `fields=` list (`summary,description,status,issuetype,assignee,priority,reporter,labels,components,created,updated`) is Jira's field vocabulary. Other vendors use different field names (e.g., GitHub: `title,body,state,labels,assignees`; Linear: `title,description,state,priority,assignee`).
- **Field semantics** in `<process>` step 3:
  - "Components" is Jira-specific (also Azure DevOps "Area Path", GitLab "Components" only via labels).
  - "Custom Fields" enumeration (Epic Link, Story Points, Sprint) is Jira+JIRA Agile specific. Other trackers expose different metadata (GitHub Projects, Linear cycles, Azure DevOps iterations).
- **Output template label** in `<output_format>`:
  - `## Jira Ticket Data` heading and `### Ticket: [KEY]` field. Rename to the target vendor's nomenclature (`## GitHub Issue Data` / `### Issue: [owner/repo#N]`) so downstream phases can route by source.
- **Failure-handling identifiers** in `<failure_handling>`:
  - The "Jira rejected the request" and "ticket <KEY> not found" error messages are vendor-branded — rewrite for the target vendor.

---

## Pattern for swapping

Copy this file to `mcp-<vendor>-data-collection/SKILL.md`, edit only the items enumerated above, keep the rest verbatim.

Do not abstract into a shared parent skill until a third vendor binding is needed (YAGNI; two bindings are not enough to validate the abstraction boundary).
