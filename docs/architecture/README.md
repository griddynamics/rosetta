# Architecture Diagrams

**Who is this for?** Contributors who want the picture before the prose in [ARCHITECTURE.md](../ARCHITECTURE.md) and [MCP-ARCHITECTURE.md](../MCP-ARCHITECTURE.md).

Each view answers one question. The `.d2` file is the source; the `.svg` next to it is the rendered output. Never edit an SVG directly.

| View | Question it answers | Embedded in |
| --- | --- | --- |
| [system-context](system-context.svg) ([src](system-context.d2)) | How do instructions get from this repo to a coding agent, and which components sit in between? | [ARCHITECTURE — System Overview](../ARCHITECTURE.md#system-overview) |
| [instruction-model](instruction-model.svg) ([src](instruction-model.d2)) | Once a session starts, which instruction types load or delegate to which? | [ARCHITECTURE — Bootstrap Flow](../ARCHITECTURE.md#bootstrap-flow) |
| [plugin-build](plugin-build.svg) ([src](plugin-build.d2)) | What goes into `rosettify-plugins`, which stages run, and what comes out? | [ARCHITECTURE — Plugin Delivery Flow](../ARCHITECTURE.md#plugin-delivery-flow) |
| [hooks-runtime](hooks-runtime.svg) ([src](hooks-runtime.d2)) | What runs when an IDE fires a hook event? | [ARCHITECTURE — Hooks Runtime](../ARCHITECTURE.md#hooks-runtime) |
| [mcp-delivery](mcp-delivery.svg) ([src](mcp-delivery.d2)) | How does the optional MCP mode publish, store, and serve instructions? | [MCP-ARCHITECTURE — System Overview](../MCP-ARCHITECTURE.md#system-overview) |

## Conventions

- Arrows show data or control moving toward the consumer. Each source file's header comment states what its arrows mean.
- Dashed edges mark optional paths: MCP delivery, `rosettify` plans for LARGE work only, and hook state access.
- Boxes are grouped by ownership or location: this repo, build/publish, distribution, target repo.
- Out of scope: per-IDE format differences (see the tables in ARCHITECTURE.md), OAuth modes (see [mcp/AUTHENTICATION.md](../mcp/AUTHENTICATION.md)), Curiocity internals (see [src/curiocity/docs/architecture.md](../../src/curiocity/docs/architecture.md)), and board automation (see [AUTOMATION-ARCHITECTURE.md](../AUTOMATION-ARCHITECTURE.md)).

## Evidence

| Claim in a diagram | Source of truth |
| --- | --- |
| Generator stages and inputs | `src/rosettify-plugins/src/plugin-processors/`, `src/rosettify-plugins/src/spec/`, `src/rosettify-plugins/plugins/`, `src/rosettify-plugins/profiles/lightweight.json` |
| Standard + light builds, hooks off in shipped plugins | `scripts/pre_commit.py` (`plugin sync`, `plugin sync light`) |
| Hook bundles per IDE, Antigravity exclusions | `src/hooks/scripts/build-bundles.mjs` (`PLUGINS`, `HOOK_SOURCES`) |
| Hook pipeline | `src/hooks/src/entrypoints/`, `src/hooks/src/adapter.ts`, `src/hooks/src/adapters/`, `src/hooks/src/runtime/state-store.ts` |
| Always-loaded rules and mode files | `instructions/r3/core/rules/` |
| `rosettify plan` used at runtime by instructions | `instructions/r3/core/skills/orchestration/`, `instructions/r3/core/skills/subagent-directives/assets/s-session-execution-controller.md` |
| MCP tools and resource | `src/rosetta-mcp-server/rosetta_mcp/server.py` (`get_context_instructions`, `query_instructions`, `list_instructions`, `rosetta://{path}`) |
| Redis contents | `src/rosetta-mcp-server/rosetta_mcp/migrations.py`; `REDIS_URL` is optional in `config.py` |
| CLI publish to RAGFlow | `src/rosetta-cli/rosetta_cli/commands/`, `.github/workflows/publish-instructions.yml` |

## Updating a diagram

1. Edit the `.d2` source. Keep node IDs stable and reuse the names already in the other views.
2. Render it with [D2](https://d2lang.com) using the default `dagre` layout:

   ```bash
   d2 docs/architecture/system-context.d2 docs/architecture/system-context.svg
   ```

3. Open the SVG and check for clipped labels, arrows pointing the wrong way, and crossed edges. Commit the source and the SVG together.
4. If the change alters behavior described in prose, update the matching section of ARCHITECTURE.md or MCP-ARCHITECTURE.md in the same commit.
