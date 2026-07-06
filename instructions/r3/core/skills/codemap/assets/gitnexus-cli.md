# GitNexus CLI reference

<role>
CLI reference for GitNexus — maps commands to their flags, effects, and when to run them.
</role>

<when_to_use>
Use when a GitNexus CLI command should be run directly, need to know which flags to pass, or must trigger indexing, cleanup, or wiki generation outside of an automated hook.
</when_to_use>

<commands>

**analyze — Build or refresh the index**
```bash
npx -y gitnexus@latest analyze
```

Run from the project root. This parses all source files, builds the knowledge graph, writes it to `.gitnexus/`.

| Flag           | Effect                                                           |
| -------------- | ---------------------------------------------------------------- |
| `--force`      | Force full re-index even if up to date                           |
| `--embeddings` | Enable embedding generation for semantic search (off by default) |

**When to run:** First time in a project, after major code changes, or when `gitnexus://repo/{name}/context` reports the index is stale.

**status — Check index freshness**
```bash
npx -y gitnexus@latest status
```

Shows whether the current repo has a GitNexus index, when it was last updated, and symbol/relationship counts. Use this to check if re-indexing is needed.

**clean — Delete the index**
```bash
npx -y gitnexus@latest clean
```

Deletes the `.gitnexus/` directory and unregisters the repo from the global registry. Use before re-indexing if the index is corrupt or after removing GitNexus from a project.

| Flag      | Effect                                            |
| --------- | ------------------------------------------------- |
| `--force` | Skip confirmation prompt                          |
| `--all`   | Clean all indexed repos, not just the current one |

**wiki — Generate documentation from the graph**
```bash
npx -y gitnexus@latest wiki
```

Generates repository documentation from the knowledge graph using an LLM. Requires an API key (saved to `~/.gitnexus/config.json` on first use).

| Flag                | Effect                                    |
| ------------------- | ----------------------------------------- |
| `--force`           | Force full regeneration                   |
| `--model <model>`   | LLM model (default: minimax/minimax-m2.5) |
| `--base-url <url>`  | LLM API base URL                          |
| `--api-key <key>`   | LLM API key                               |
| `--concurrency <n>` | Parallel LLM calls (default: 3)           |
| `--gist`            | Publish wiki as a public GitHub Gist      |

**list — Show all indexed repos**
```bash
npx -y gitnexus@latest list
```

Lists all repositories registered in `~/.gitnexus/registry.json`. The MCP `list_repos` tool provides the same information.

</commands>

<troubleshooting>

- **"Not inside a git repository"**: Run from a directory inside a git repo
- **Index is stale after re-analyzing**: Restart Editor to reload the MCP server
- **Embeddings slow**: Omit `--embeddings` (it's off by default) or set `OPENAI_API_KEY` for faster API-based embedding

</troubleshooting>
