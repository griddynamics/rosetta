---
name: antigravity
description: Google Antigravity (2.0 app, CLI, IDE) — rules, workflows, skills, subagents, and plugins via repo-committed configuration. One plugin serves all three surfaces; CLI differences are noted.
---

# Antigravity — Rules, Workflows, Skills, Subagents, Plugins

Google Antigravity has three surfaces sharing one configuration contract: **Antigravity 2.0** (app), **Antigravity CLI**, **Antigravity IDE**. 2.0 and IDE are identical; the CLI differs (see Differences). "Gemini" in paths (`~/.gemini/…`, `GEMINI.md`) is only the config namespace — the separate Gemini CLI product is deprecated.

## Plugin

A plugin is a folder with a root `plugin.json` marker file:

```
<plugin>/
  plugin.json        # required marker; e.g. {"name": "rosetta"}
  rules/             # *.md rules
  skills/            # <skill>/SKILL.md
  agents/            # subagent definitions
  mcp_config.json    # optional MCP servers
  hooks.json         # optional hooks (see docs/hooks/antigravity.md)
```

Install locations: workspace `.agents/plugins/` (or `_agents/plugins/`); global `~/.gemini/config/plugins/`; CLI `~/.gemini/antigravity-cli/plugins/<name>/`.

## Rules

Markdown, ≤12,000 characters each. Workspace `.agents/rules/` (legacy `.agent/rules/`); global `~/.gemini/GEMINI.md`. Activation via `trigger:` frontmatter:

- `always_on` — always applied.
- `model_decision` — the model decides from the rule's `description`.
- `glob` — applied to files matching `globs`.
- `manual` — activated via `@rule-name`.

`@filename` references resolve relative to the rule file (or as repo/absolute paths).

## Workflows

Markdown, invoked as `/workflow-name`; a workflow may call other workflows. IDE and 2.0 only — **the CLI has no workflows** (use skills, which surface as slash commands). ≤12,000 characters each.

## Skills

`skills/<name>/SKILL.md` with `name` + `description` frontmatter. Auto-discovered: the agent sees the skill list and reads the full `SKILL.md` when relevant. Optional `scripts/`, `examples/`, `resources/` subfolders.

## Subagents

`agents/<name>.md` with frontmatter of `name` + `description` only, plus the agent definition body. Packaged in a plugin's `agents/` for the CLI; 2.0 and IDE expose subagents but do not yet consume packaged `agents/`.

## Hooks

See `docs/hooks/antigravity.md`. Summary: no `SessionStart` (use `PreInvocation` at `invocationNum:0`); `PostToolUse` output is ignored; deny is native (`{decision:"deny", reason}`).

## Differences — CLI vs IDE/2.0

| | 2.0 / IDE | CLI |
|---|---|---|
| `plugin.json` name | optional (defaults to dir) | required (`^[a-zA-Z0-9-_]+$`, JSON-schema) |
| Workflows | yes (`/workflow-name`) | none (skills → slash commands) |
| `agents/` in plugin | not yet consumed | consumed (subagent definitions) |
| Install path | `.agents/plugins/`, `~/.gemini/config/plugins/` | `~/.gemini/antigravity-cli/plugins/` |
| Management | Customizations GUI | `agy plugin install/enable/disable/uninstall` |

## Version

Configuration for Antigravity 2.0 / CLI / IDE (antigravity.google docs).
