# Document Bundling Pattern

Multiple RAGFlow documents at the same VFS resource path are merged into a single structured XML response, so an agent asking for one resource path gets everything published at it in one call.

## Problem Solved

A resource path is a lookup key, not a file handle, and more than one published document can answer it: a deployment that publishes two instruction repositories into the same collection, or a transitional state during a rename. The agent should get all of them in one call rather than a truncated arbitrary pick. XML wrapping adds metadata without polluting document content.

Within Rosetta's own tree this rarely fires. Filenames are unique across the domain sets, so a path normally resolves to exactly one document.

## When to Use

- Any `ACQUIRE ... FROM KB` response with 1–5 matching documents.
- Serving a collection fed by more than one publishing source.

## Output Format

```xml
<rosetta:file id="<uuid>" dataset="aia-r3" path="skills/planning/SKILL.md"
              name="core/skills/planning/SKILL.md" tags="...">
  [core document content]
</rosetta:file>
<rosetta:file id="<uuid>" dataset="aia-r3" path="skills/planning/SKILL.md"
              name="other-source/skills/planning/SKILL.md" tags="...">
  [content from the second publishing source]
</rosetta:file>
```

## Sorting

Documents sorted by `sort_order` metadata (default `1000000`), then by name. A publisher that wants its document to land last gives it a higher `sort_order`.

## Listing vs. Bundle

- `bundle()` — full content, used when ≤5 docs match.
- `format_as_listing()` — metadata only, used when >5 docs match or for `list_instructions`.
- `format_children_listing()` — folders + files, used for VFS hierarchy browsing.

## Occurrences

- `src/rosetta-mcp-server/rosetta_mcp/services/bundler.py` — `Bundler` class
- `src/rosetta-mcp-server/rosetta_mcp/tools/instructions.py` — threshold decision
- `src/rosetta-mcp-server/rosetta_mcp/tools/resources.py` — VFS resource reads
- `instructions/r3/{core,workflows,qe,search,modernization}/` — the domain sets that supply bundled content
