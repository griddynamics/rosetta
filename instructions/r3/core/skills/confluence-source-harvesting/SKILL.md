---
name: confluence-source-harvesting
description: "Rosetta playbook for pulling Confluence content reliably: direct URLs vs search, child pages, truncation, URL shapes, and permission fallbacks — pair with TMS/Jira collection per workflow."
license: Apache-2.0
tags: ["workflow", "confluence", "mcp", "documentation"]
baseSchema: docs/schemas/skill.md
---

<confluence_source_harvesting>

<role>

Documentation miner who respects Confluence hierarchy, size limits, and MCP boundaries.

</role>

<when_to_use_skill>

Use whenever a workflow enriches tickets or tests with Confluence pages (alone or beside Jira/TestRail). Reduces missed child pages and silent truncation surprises.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Parent workflow selects MCP skills (e.g. `mcp-confluence-data-collection`); this skill defines cross-workflow harvesting discipline
- Jira/TestRail ticket extraction stays in workflow-specific steps; combine outputs after both sides run

</core_concepts>

<process>

1. If the user supplied Confluence URLs or page IDs, fetch those pages first with the configured Confluence MCP.
2. After each parent page retrieved, fetch **child pages** when the API exposes them; repeat until leaves or depth cap the parent workflow defines.
3. If no URLs were supplied, derive search terms from the ticket (labels, components, summary keywords) and run search; record terms used in the raw artifact.
4. GATE: if search returns zero pages, ask once for explicit URLs or permission to proceed ticket-only; document the user choice.
5. Apply truncation: if a page exceeds the parent workflow's word budget (default ~5000 words unless overridden), truncate with a clear banner and keep headings + first sections intact when possible.
6. Normalize links: accept display URLs, direct `/wiki/` URLs, and short links; log the canonical URL stored.
7. GATE: if a URL domain does not match the configured MCP site, warn and try once; on failure, ask for an accessible link or export.
8. Deduplicate pages by canonical URL; merge content in stable order (parents before children unless workflow dictates otherwise).
9. Summarize in the raw artifact: page count, children discovered, truncation flags, search terms, failures.

</process>

<validation_checklist>

- Every stored page lists title, canonical URL, and parent/child relationship when applicable
- Child pages were checked for each retrieved parent unless user waived with explicit approval
- Truncated pages are labeled with what was omitted
- Zero-result search paths end in user decision or documented waiver
- Confluence section absent only when user approved ticket-only continuation

</validation_checklist>

<best_practices>

- Prefer user-provided canonical links when search noise is high
- Capture space key and last-updated metadata when available for traceability

</best_practices>

<pitfalls>

- Assuming Confluence HTML renders identically to markdown — note rendering gaps
- Stopping at the first parent when children hold acceptance criteria
- Hiding MCP permission errors as empty content

</pitfalls>

<resources>

- skill `questioning` — targeted follow-ups when discovery is ambiguous
- skill `hitl` — explicit approval for proceeding without documentation
- Parent workflow — which MCP Confluence skill name to invoke and output file path

</resources>

<templates>

- Page entry (embed in parent artifact):

```markdown
### [Page title]
- URL: [canonical]
- Parent: [title or none]
- Retrieved: [ISO-8601]
- Children fetched: yes | no (reason)
- Truncated: yes | no (word count / limit)
#### Content
[markdown body]
```

</templates>

</confluence_source_harvesting>
