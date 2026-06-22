# Document Bundling Pattern

Multiple RAGFlow documents at the same VFS resource path are merged into a single structured XML response, enabling layered instruction override (core + org) transparent to the agent.

## Problem Solved

Organization customizations must extend core instructions without replacing them. Agents should receive both layers in one call. XML wrapping adds metadata without polluting document content.

## When to Use

- Any `ACQUIRE ... FROM KB` response with 1–5 matching documents.
- Adding an organization overlay at the same resource path as a core instruction.

## Output Format

```xml
<rosetta:file id="<uuid>" dataset="aia-r2" path="skills/planning/SKILL.md"
              name="core/skills/planning/SKILL.md" tags="...">
  [core document content]
</rosetta:file>
<rosetta:file id="<uuid>" dataset="aia-r2" path="skills/planning/SKILL.md"
              name="grid/skills/planning/SKILL.md" tags="...">
  [organization overlay content]
</rosetta:file>
```

## Sorting

Documents sorted by `sort_order` metadata (default `1000000`), then by name. Core comes before org overlays when org has higher sort_order.

## Listing vs. Bundle

- `bundle()` — full content, used when ≤5 docs match.
- `format_as_listing()` — metadata only, used when >5 docs match or for `list_instructions`.
- `format_children_listing()` — folders + files, used for VFS hierarchy browsing.

## Occurrences

- `src/ims-mcp-server/ims_mcp/services/bundler.py` — `Bundler` class
- `src/ims-mcp-server/ims_mcp/tools/instructions.py` — threshold decision
- `src/ims-mcp-server/ims_mcp/tools/resources.py` — VFS resource reads
- `instructions/r2/core/` + `instructions/r2/grid/` (if present) — layered content
