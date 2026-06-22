# Tag-Based Retrieval Pattern

Auto-generated hierarchical tags derived from folder path enable precise, fast ACQUIRE-by-tag retrieval without keyword search ambiguity.

## Problem Solved

Keyword search is slow and ambiguous for known instruction documents. Tag lookup is deterministic and bounded. The challenge is building useful tags automatically without manual annotation.

## When to Use

- Retrieving a known instruction document via `ACQUIRE <path> FROM KB`.
- Routing agent requests to specific skills, agents, or workflows.
- Any new document published via `rosetta-cli publish` — tagging is automatic.

## How Tags Are Generated

During `rosetta-cli publish`, `DocumentData.from_file()` extracts three tag families from the file path:

```
instructions/r2/core/skills/planning/SKILL.md
  → individual parts: [instructions, r2, core, skills, planning, SKILL.md]
  → two-part:  skills/planning/SKILL.md, planning/SKILL.md
  → three-part: core/skills/planning/SKILL.md
  → frontmatter tags merged in (deduplicated, case-insensitive)
```

Resource path strips release and org: `skills/planning/SKILL.md`.

## Query Pattern

```python
# MCP server side (QueryBuilder)
{
    "logic": "or",
    "conditions": [
        {"name": "tags", "comparison_operator": "contains", "value": tag}
        for tag in tags
    ]
}

# Agent side (alias)
ACQUIRE `skills/planning/SKILL.md` FROM KB
# maps to: query_instructions(tags="skills/planning/SKILL.md")
```

## Threshold Behavior

`QUERY_LIST_THRESHOLD = 5`: if query matches >5 documents, MCP returns a listing instead of full content, guiding the agent to narrow with a more specific tag.

## Occurrences

- `src/rosetta-cli/rosetta_cli/services/document_data.py` — tag generation
- `src/ims-mcp-server/ims_mcp/services/query_builder.py` — metadata condition builder
- `src/ims-mcp-server/ims_mcp/tools/instructions.py` — threshold logic
- All `ACQUIRE ... FROM KB` calls in instructions (`instructions/r2/core/`)
