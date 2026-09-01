---
name: github-copilot
description: GitHub Copilot configuration guide for instructions, custom agents, prompt files (custom slash commands), skills, plugins, hooks, and MCP integration through repository-committed configuration files.
---

# GitHub Copilot - Agents, Skills, Prompts, Plugins Configuration Guide - 2026

## Overview

GitHub Copilot supports customization through repository-committed configuration files: instructions, custom agents, prompt files (custom slash commands), skills, plugins, hooks, and MCP servers. Copilot CLI manages plugins via `copilot plugin` commands.

**Configuration Locations:**

- **`.github/copilot-instructions.md`** - Repository-wide instructions (CORE root rule) - Markdown
- **`.github/instructions/*.instructions.md`** - Path-specific instructions - Markdown + YAML frontmatter
- **`.github/agents/*.agent.md`** - Custom agents - Markdown + YAML frontmatter
- **`.github/prompts/*.prompt.md`** - Prompt files / custom slash commands - Markdown + YAML frontmatter
- **`.github/skills/*/SKILL.md`** - Agent skills - Markdown + YAML frontmatter
- **`.github/plugin/`** - Plugin manifests and marketplace - JSON
- **`.vscode/mcp.json`** - MCP server integration - JSON

Because regular `*.md` rules/workflows/commands are not supported directly, we should copy `*.md` files to `.github/instructions/` or `.github/prompts/` as-is and then reference them in `.github/copilot-instructions.md` using INDEX style (template: `- .github/instructions/file.md: [Description from frontmatter verbatim, or description of why/when to use it inferred from the content] [Glob: if glob pattern used in frontmatter]`).

---

## Repository-Wide Instructions

**THIS IS THE MOST IMPORTANT FILE.**

**File:** `.github/copilot-instructions.md`

**Format:** Markdown (natural language, no frontmatter)

**Behavior:**

- Automatically injected into all Copilot requests within the repository
- Use workspace relative references to include other documents and instructions
- Priority hierarchy (highest to lowest): Personal > Repository > Organization
- Supported everywhere: GitHub.com, VS Code, Visual Studio, JetBrains, Xcode, Eclipse

**Structure:**

```markdown
# Project Coding Standards

## General Guidelines

- Use TypeScript for all new files
- Follow functional programming principles

## Security

- Never commit API keys or secrets
- Validate all user inputs
```

**Notes:**

- Keep instructions under ~2 pages for optimal context usage
- Must not be task-specific; focus on general project conventions
- Recommended content: repo summary, build/test commands, project layout, CI/CD documentation, config file locations, dependencies

### Other Instruction Files Read by Copilot

Copilot also reads these instruction files from the repository root:

- `AGENTS.md` - Primary root for Codex
- `CLAUDE.md` - Primary root for Claude Code
- `GEMINI.md` - Primary root for Gemini

---

## Path-Specific Instructions

**Location:** `.github/instructions/[name].instructions.md`

**Format:** Markdown with YAML frontmatter (filename MUST end with `.instructions.md`)

**Supported:** VS Code, Visual Studio, JetBrains, GitHub.com (cloud agent and code review)

**Frontmatter Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `applyTo` | Yes | string | Glob pattern(s) for matching files. Comma-separated for multiple patterns |
| `excludeAgent` | No | string | `"code-review"` or `"coding-agent"` to exclude from specific agents |

**Structure:**

```markdown
---
applyTo: "src/api/**/*.ts"
---

# Backend API Guidelines

## Request Handling

- Validate all incoming requests using Zod schemas
- Return consistent error responses with status codes

## Security

- Implement rate limiting on all endpoints
- Use JWT tokens for authentication
```

---

## Custom Agents

**Location:** `.github/agents/[agent-name].agent.md`

**Compatibility:** `.claude/agents/` is also read in VS Code. Additional locations configurable via `chat.agentFilesLocations`.

**Invocation:** Select from agents dropdown in Copilot Chat, or reference as subagent via `agents` property

**Format:** Markdown with YAML frontmatter (filename MUST end with `.agent.md`). Max 30,000 characters.

**Frontmatter Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `description` | Yes | string | Agent purpose and capabilities |
| `name` | No | string | Display name (defaults to filename without extension) |
| `tools` | No | list/string | Available tools. Use `<server-name>/*` for all MCP server tools |
| `model` | No | string/list | Single model or prioritized array (tried in order until available) |
| `target` | No | string | `"vscode"` or `"github-copilot"` (defaults to both) |
| `agents` | No | list | Allowed subagents, or `"*"` for all |
| `user-invocable` | No | boolean | Allow manual selection in dropdown (default: true) |
| `disable-model-invocation` | No | boolean | Prevent automatic model selection |
| `mcp-servers` | No | table | Additional MCP servers (cloud agent only) |
| `handoffs` | No | list | Sequential workflow transitions between agents |
| `hooks` | No | object | Hook commands scoped to this agent (preview) |
| `metadata` | No | object | Key-value annotation pairs (cloud agent only) |

**Tool Aliases:**

| Alias | Capability |
|-------|-----------|
| `"execute"` | Shell/bash/powershell |
| `"read"` | File viewing |
| `"edit"` | File modification |
| `"search"` | File/text searching |
| `"agent"` | Invoking other custom agents |
| `"web"` | URL fetching, web search |
| `"todo"` | Task management |
| `"*"` | All tools |
| `"github/*"` | All GitHub MCP server tools |
| `"playwright/navigate"` | Specific MCP tool |
| etc | any new from mcp or new version |

**Out-of-box MCP servers:**

- `github` - Read-only tools scoped to source repository
- `playwright` - Browser automation limited to localhost

**Models:**
- (omitted) - Inherits model from parent agent (default)
- `Claude Opus 4.8` - Anthropic Claude 4.8 Opus (most capable, with extended reasoning)
- `Claude Opus 4.6` - Anthropic Claude 4.6 Opus prev gen (4.7 existed but was not good)
- `Claude Sonnet 5` - Anthropic Claude 5 Sonnet with thinking
- `Claude Haiku 4.5` - Anthropic Claude 4.5 Haiku with thinking
- `GPT-5.3-Codex` - OpenAI GPT 5.3 Codex
- `GPT-5.4` - OpenAI GPT 5.4 model, better than 5.3 (combined codex and regular), medium reasoning efforts
- `gpt-5.5` - OpenAI GPT 5.5 with medium reasoning efforts, better than opus 4.8 (architect)
- `Grok Code Fast 1` - xAI Grok Code Fast
- `Gemini 3.1 Pro (Preview)` - Google Gemini 3 Pro

**Structure:**

```markdown
---
description: Expert code reviewer for quality, security, and maintainability
tools: ["read", "search"]
model: ["Claude Sonnet 5", "GPT-5.4"]
handoffs:
  - label: "Send to Implementation"
    agent: implementer
    prompt: "Implement the suggested fixes"
    send: true
---

You are a senior code reviewer ensuring high standards. When invoked:

1. Use #tool:codebase to inspect files
2. Analyze code for readability and maintainability
3. Check for security vulnerabilities

Provide specific, actionable feedback with examples.
```

**Handoff Workflows:** Enable sequential multi-agent workflows. Buttons appear after agent responses allowing transitions (e.g., Planning -> Implementation -> Code Review).

**Secrets in MCP config:** `${{ secrets.VAR_NAME }}`

---

## Prompt Files (Custom Slash Commands)

**Location:** `.github/prompts/[name].prompt.md`

**Invocation:** `/{filename}` in Copilot Chat (e.g., `/explain-code` runs `explain-code.prompt.md`)

**Format:** Markdown with YAML frontmatter (filename MUST end with `.prompt.md`)

**Status:** Public preview

**Supported:** VS Code, Visual Studio, JetBrains

**Frontmatter Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `description` | No | string | Short explanation shown in chat |
| `name` | No | string | Display name after `/` (defaults to filename) |
| `argument-hint` | No | string | Guidance text shown in chat input |
| `agent` | No | string | Agent type: `"ask"`, `"agent"`, `"plan"`, or custom agent name |
| `model` | No | string | Language model selection |
| `tools` | No | list | Available tools (MCP tools, extensions) |

**Dynamic Inputs:**

- `${input:fieldname}` - Creates interactive input field at invocation time
- `${input:fieldname:placeholder}` - With placeholder text
- `${selection}` - Currently selected code in editor

**File References:**

- Markdown link: `[description](../../path/to/file.ts)` (relative to prompt file)
- Direct syntax: `#file:../../path/to/file.ts`
- Tool reference: `#tool:<tool-name>`

**Structure:**

```markdown
---
description: Generate a React component with tests
agent: agent
tools: ["codebase", "web/fetch"]
---

# Create React Component

Create a new React component named ${input:componentName:MyComponent}.

## Requirements

- Use TypeScript strict mode
- Follow patterns in [components guide](../../docs/components.md)
- Include unit tests using #tool:codebase for pattern discovery

## Output

- Component file in `src/components/`
- Test file in `src/components/__tests__/`
```

**Invocation Methods:**

- Type `/` + prompt name in Copilot Chat input
- Command Palette: `Chat: Run Prompt`
- Play button in prompt file editor title bar
- Pass arguments: `/create-react-form formName=MyForm`
- Type `/create-prompt` in Agent mode for AI-assisted generation

**Storage Locations:**

| Scope | Path | Use Case |
|-------|------|----------|
| Workspace | `.github/prompts/` | Shared with team (recommended) |
| User | VS Code user data directory | Personal prompts |
| Configurable | `chat.promptFilesLocations` setting | Custom locations |

**Tool Resolution Priority:**

1. Prompt file's `tools` field (if specified)
2. Referenced custom agent's tools (if any)
3. Default agent tools

---

## Agent Skills

**Works with:** Copilot coding agent, GitHub Copilot CLI, VS Code agent mode

**Skill Locations (cross-tool):**

| Path | Tool |
|------|------|
| `.github/skills/<name>/` | Copilot |
| `.agents/skills/<name>/` | Codex |
| `.claude/skills/<name>/` | Claude Code |

**Format:** Markdown with YAML frontmatter (file must be named `SKILL.md`)

**Frontmatter Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Skill identifier (lowercase-with-hyphens). Must match parent folder name |
| `description` | Yes | string | What the skill does and when to use it |
| `license` | No | string | License information |
| `user-invocable` | No | boolean | `false` = hidden from `/` menu; agent can still auto-load it (default: `true`) |
| `disable-model-invocation` | No | boolean | `true` = agent will not auto-load; explicit `/` invocation only (default: `false`) |

**Structure:**

```markdown
---
name: github-actions-failure-debugging
description: Guide for debugging failing GitHub Actions workflows. Use this when asked to debug failing GitHub Actions workflows.
---

To debug failing GitHub Actions workflows in a pull request:

1. Use the `list_workflow_runs` tool to look up recent workflow runs for the pull request and their status
2. Use the `summarize_job_log_failures` tool to get an AI summary of the logs for failed jobs
3. If you still need more information, use the `get_job_logs` or `get_workflow_run_logs` tool to get the full detailed failure logs
4. Try to reproduce the failure yourself in your own environment
5. Fix the failing build
```

**Skill Directory Structure:**

```
.github/skills/
└── deploy-app/
    ├── SKILL.md           # Required: Skill definition
    ├── scripts/           # Optional: Executable code
    ├── references/        # Optional: Additional documentation
    └── assets/            # Optional: Templates, configs, data
```

**Notes:**

- Each skill must be in its own directory
- Directory name should match the `name` in frontmatter
- Can include additional scripts, examples, or resources in the skill directory
- Copilot automatically loads skills based on task relevance and skill description
- Skills vs Instructions: Use instructions for simple rules relevant to all tasks, skills for detailed task-specific procedures

---

## Plugins

Plugins bundle agents, skills, commands, hooks, MCP servers, and LSP servers into installable packages.

**Manifest Discovery Order:** `.plugin/` -> repo root -> `.github/plugin/` -> `.claude-plugin/`

### Plugin Management (Copilot CLI)

| Command | Purpose |
|---------|---------|
| `copilot plugin install SPECIFICATION` | Install a plugin |
| `copilot plugin uninstall NAME` | Remove a plugin |
| `copilot plugin list` | List installed plugins |
| `copilot plugin update NAME` | Update a plugin |
| `copilot plugin marketplace add SPECIFICATION` | Register a marketplace |
| `copilot plugin marketplace list` | List registered marketplaces |
| `copilot plugin marketplace browse NAME` | Browse marketplace plugins |
| `copilot plugin marketplace remove NAME` | Unregister a marketplace |

### Installation Specification Formats

| Format | Example |
|--------|---------|
| Marketplace | `plugin@marketplace` |
| GitHub repo root | `OWNER/REPO` |
| GitHub subdirectory | `OWNER/REPO:PATH/TO/PLUGIN` |
| Git URL | `https://github.com/o/r.git` |
| Local directory | `./my-plugin` or `/abs/path` |

### Plugin Manifest (plugin.json)

**Required:**

- `name` (string) - Kebab-case plugin name. Max 64 chars.

**Optional metadata:**

- `description`, `version`, `author` (object with `name`, `email`, `url`), `homepage`, `repository`, `license`, `keywords`, `category`, `tags`

**Component path fields (all optional, type: `string | string[]`). Paths are relative to the plugin root directory:**

| Field | Default | Description |
|-------|---------|-------------|
| `agents` | `agents/` | Path(s) to agent directories (`.agent.md` files) |
| `skills` | `skills/` | Path(s) to skill directories (`SKILL.md` files) |
| `commands` | - | Path(s) to command directories |
| `hooks` | `hooks.json` or `hooks/hooks.json` | Path to hooks config file, or inline hooks object |
| `mcpServers` | `.mcp.json`, `.vscode/mcp.json`, `.devcontainer/devcontainer.json`, `.github/mcp.json` | Path to MCP config file, or inline server definitions |
| `lspServers` | `lsp.json` or `.github/lsp.json` | Path to LSP config file, or inline server definitions |

**Interface metadata:** `displayName`, `shortDescription`, `longDescription`, `category`, `capabilities`, `defaultPrompt`, `brandColor`

**Visual assets:** `composerIcon`, `logo`, `screenshots` (under `./assets/`)

**Structure:**

```json
{
  "name": "my-dev-tools",
  "description": "React development utilities",
  "version": "1.2.0",
  "author": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "license": "MIT",
  "keywords": ["react", "frontend"],
  "agents": "agents/",
  "skills": ["skills/", "extra-skills/"],
  "hooks": "hooks.json",
  "mcpServers": ".mcp.json"
}
```

### Plugin Directory Structure

```
my-plugin/
├── plugin.json              # Required: manifest
├── agents/                  # Optional: bundled agents
│   └── my-agent.agent.md
├── skills/                  # Optional: bundled skills
│   └── my-skill/
│       └── SKILL.md
├── hooks.json               # Optional: lifecycle hooks
└── .mcp.json                # Optional: bundled MCP servers
```

### Marketplace

Marketplaces catalog plugins as JSON files. Discovery order: `marketplace.json` → `.plugin/marketplace.json` → `.github/plugin/marketplace.json` → `.claude-plugin/marketplace.json`.

**Required fields:** `name` (string, kebab-case, max 64), `owner` (object with `name`, optional `email`), `plugins` (array).

**Optional:** `metadata` (object with `description`, `version`, `pluginRoot`).

**Plugin entry required fields:** `name` (string), `source` (string or object — relative path, `OWNER/REPO`, or URL).

**Plugin entry optional fields:** `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`, `commands`, `agents`, `skills`, `hooks`, `mcpServers`, `lspServers`, `strict` (boolean, default true — when false, relaxed validation).

The `source` field path is relative to the root of the repository.

**Structure:**

```json
{
  "name": "my-marketplace",
  "owner": { "name": "Team Name" },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "OWNER/REPO",
      "description": "What it does"
    }
  ]
}
```

### Loading Order and Precedence

- **Agents/Skills:** First-found-wins. Project-level custom agents/skills with the same name as plugin ones take precedence.
- **MCP Servers:** Last-wins. Plugin MCP server definitions take precedence over previously installed servers with the same name.
- **Built-in tools/agents:** Cannot be overridden by user-defined or plugin-supplied components.

---

## Hooks

Copilot hooks run scripts at lifecycle events, in TWO formats: [Copilot CLI](https://docs.github.com/en/copilot/reference/hooks-reference) uses camelCase events + `bash`/`powershell` fields; [VS Code](https://code.visualstudio.com/docs/agent-customization/hooks) uses PascalCase events + a `command` field. **Register PascalCase event names only** — VS Code fires PascalCase exclusively, and Copilot CLI's PascalCase fire works too (registering both casings makes Copilot CLI fire each event TWICE).

### Hook Locations

| Path | Scope |
|------|-------|
| `.github/hooks/*.json` | Workspace (team-shared) |
| Plugin `hooks.json` at root | Plugin hooks (auto-discovered) |

### Registration Format

```json
{
  "version": 1,
  "hooks": {
    "SessionStart": [
      { "type": "command", "bash": "path/to/script.sh", "powershell": "path/to/script.ps1", "timeoutSec": 30 }
    ]
  }
}
```

### Supported Events (Rosetta-relevant)

| Event | Trigger |
|-------|---------|
| `SessionStart` | First prompt of a new/resumed session |
| `PreToolUse` | Before tool invocation |
| `PostToolUse` | After successful tool invocation |
| `Stop` | Agent session/turn ends |
| `SubagentStop` | Subagent ends |
| `PreCompact` | Before context compaction — **Copilot CLI only; VS Code has no compaction hook** |

**(!) VS Code ignores matcher values — hooks fire on ALL tool invocations regardless of any matcher; gate inside the hook script itself, not via matcher.**

### Input shape (differs by runtime — a hook script must handle both)

| Field | Copilot CLI (camelCase fire) | VS Code / Copilot CLI's own PascalCase fire (snake_case) |
|-------|-------------------------------|-------------------------------------------------------------|
| event name | *(absent — infer from payload shape)* | `hook_event_name` |
| tool name | `toolName` | `tool_name` |
| tool args | `toolArgs` — **JSON string, must be parsed** | `tool_input` — already-parsed object |
| tool result | `toolResult` (object) | `tool_response` (**string**, VS Code) / `tool_result` (object, Copilot CLI) |
| session id | `sessionId` | `session_id` |

### Output — emit EVERY field at BOTH placements

| Field | Honored by |
|-------|------------|
| `additionalContext` (top-level) | **Copilot CLI** — ignored by VS Code |
| `hookSpecificOutput.additionalContext` (nested) | **VS Code** — ignored by Copilot CLI |
| `permissionDecision` / `permissionDecisionReason` (top-level) | **Copilot CLI**, `PreToolUse` allow/deny |
| `hookSpecificOutput.permissionDecision` / `.permissionDecisionReason` (nested) | **VS Code**, same purpose |
| `decision` / `reason` (top-level, `Stop`) | both — `"block"`; **(!) `reason` REQUIRED when blocking**; ALSO has a nested `hookSpecificOutput.decision`/`.reason` form |
| `decision` / `reason` (`SubagentStop`) | both — `"block"`; **(!) `reason` REQUIRED when blocking** — **top-level ONLY, no `hookSpecificOutput` wrapper for this event** |
| `systemMessage` | **(!) USER-facing only (shown in the IDE) — NEVER reaches model context.** Use `additionalContext` for model-visible text |

**(!) For `SessionStart`/`PreToolUse`/`PostToolUse`/`Stop`, a single hook script must emit BOTH the top-level AND the nested `hookSpecificOutput.*` form of every field above.** Each runtime honors only its own placement and silently ignores the other — emitting only one means the other runtime never receives it, with no error. **`SubagentStop` is the one exception — top-level only.**

```json
{
  "additionalContext": "Content injected into the AI session",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Content injected into the AI session"
  }
}
```

`permissionDecision` values: `allow`, `deny`, `ask` (Copilot's cloud agent treats `ask` as `deny`).

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | stdout JSON parsed — deny/context delivered via the JSON body, not the exit code |
| `2` | blocking error (`PreToolUse` deny; also fail-closed on a crashing/timing-out hook) |
| other non-zero | non-blocking warning |

### Matchers

Pattern (Copilot CLI docs only, undocumented for VS Code): `^(?:PATTERN)$` on tool name; omit = all tools.

---

## MCP Integration

**File:** `.vscode/mcp.json` (repo-level) or VS Code `settings.json` (personal)

**Format:** JSON

**Activation:** Must select **Agent mode** in Copilot Chat to use MCP tools

### Local (stdio) Server

```json
{
  "servers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my/mcp-server"],
      "env": {
        "API_KEY": "${env:MY_API_KEY}"
      }
    }
  }
}
```

### Remote (HTTP/SSE) Server

```json
{
  "servers": {
    "remote-server": {
      "url": "https://api.example.com/mcp/",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer ${env:MCP_TOKEN}"
        }
      }
    }
  }
}
```

### MCP Prompts and Resources

- **Slash commands for MCP prompts:** `/mcp.servername.promptname`
- **Add context from MCP resources:** "Add Context..." -> "MCP Resources" in chat
- **Auto-discover Claude Desktop configs:** `"chat.mcp.discovery.enabled": true` in VS Code settings

### GitHub MCP Server

A first-party MCP server provided by GitHub for working with repos, issues, PRs, and GitHub features from within Copilot Chat.

**Notes:**

- MCP must be enabled in organization policy for Business/Enterprise plans (disabled by default)
- Free/Pro/Pro+ plans: no policy restriction
- The coding agent only supports MCP **tools** — it does NOT support MCP resources or prompts

---

## Built-in Slash Commands

Available built-in commands in Copilot Chat:

- `/doc` - Insert documentation comments
- `/explain` - Explain selected code
- `/fix` - Fix bugs or errors
- `/tests` - Generate unit tests
- `/generate` - Generate new code snippets
- `/optimize` - Recommend code optimizations
- `/help` - Show available commands
- `/exp` - Start new conversation with fresh context
- `/new` - Set up new projects
- `/newNotebook` - Set up new Jupyter notebooks
- `/init` - Generate baseline instructions for the repository
- `/create-prompt` - AI-assisted prompt file generation (Agent mode)
- `/create-agent` - AI-assisted agent file generation (Agent mode)

Custom slash commands are defined via **Prompt Files** (`.prompt.md`) — see above.

---

## Project File Structure

```
project-root/
├── .github/
│   ├── copilot-instructions.md          # CORE root rule
│   ├── agents/
│   │   └── [agent-name].agent.md        # Custom agents
│   ├── instructions/
│   │   └── [rule-name].instructions.md  # Path-specific instructions
│   ├── prompts/
│   │   └── [prompt-name].prompt.md      # Custom slash commands
│   ├── skills/
│   │   └── [skill-name]/
│   │       ├── SKILL.md                 # Required filename
│   │       └── [optional-resources]
│   └── plugin/
│       ├── plugin.json                  # Plugin manifest
│       └── marketplace.json             # Plugin marketplace catalog
├── .vscode/
│   ├── mcp.json                         # MCP server configuration
│   └── settings.json                    # VS Code project settings
├── AGENTS.md                            # Agent compatibility (Codex, etc.)
└── CLAUDE.md                            # Agent compatibility (Claude Code)
```

---

## VS Code Settings (Project-Level)

**File:** `.vscode/settings.json`

**Structure:**

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false
  },
  "editor.inlineSuggest.enabled": true,
  "chat.promptFiles": true,
  "chat.mcp.discovery.enabled": true
}
```

---

## Cross-Tool Compatibility

### Feature Support by Platform

| Feature | Copilot (VS Code) | Copilot (GitHub.com) | Copilot CLI |
|---------|-------------------|---------------------|-------------|
| `.github/copilot-instructions.md` | Yes | Yes | Yes |
| `.github/instructions/*.instructions.md` | Yes | Yes (cloud agent, code review) | - |
| `.github/agents/*.agent.md` | Yes | Yes (agents tab) | Yes |
| `.github/prompts/*.prompt.md` | Yes | - | - |
| `.github/skills/*/SKILL.md` | Yes | Yes (coding agent) | Yes |
| Plugins (`plugin.json`) | - | - | Yes |
| MCP servers | Yes (Agent mode) | Yes (coding agent, tools only) | Yes |
| `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` | Read | Read | - |

### Cross-Tool Directory Compatibility

Copilot reads configuration from other AI coding tools' directories:

| Directory | What Copilot reads | Platform | Notes |
|-----------|-------------------|----------|-------|
| `.github/agents/` | Agents (`.agent.md`) | VS Code, GitHub.com, CLI | Primary Copilot location |
| `.github/skills/` | Skills (`SKILL.md`) | VS Code, GitHub.com, CLI | Primary Copilot location |
| `.claude/agents/` | Agents (`.agent.md`) | VS Code | Read for Claude Code compatibility |
| `AGENTS.md` | Instructions | VS Code, GitHub.com | Read for Codex compatibility |
| `CLAUDE.md` | Instructions | VS Code, GitHub.com | Read for Claude Code compatibility |
| `GEMINI.md` | Instructions | VS Code, GitHub.com | Read for Gemini compatibility |

**Additional locations** for agents and skills can be configured in VS Code via `chat.agentFilesLocations` and similar settings.

**Plugin manifest discovery** (Copilot CLI only): `.plugin/` -> repo root -> `.github/plugin/` -> `.claude-plugin/`

**Precedence:** `.github/` takes precedence when agents with the same name exist in multiple locations.

---

## Configuration Tips

1. **Start with `copilot-instructions.md`:** Clear project instructions first
2. **Use prompt files for workflows:** Convert repetitive multi-step procedures into `.prompt.md` files
3. **Single responsibility:** Each agent/skill/prompt should have one clear purpose
4. **Be specific in descriptions:** Clear descriptions determine when agents delegate and skills activate
5. **Version control:** Commit `.github/` configuration to share with team
6. **Start small:** Begin with 2-3 focused agents, add more as needed
7. **Use handoffs:** Chain agents for multi-step workflows (Planning -> Implementation -> Review)

---

## Additional Resources

- [Customizing Copilot](https://docs.github.com/en/copilot/customizing-copilot)
- [Repository Custom Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [Custom Agents Configuration](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
- [VS Code Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization)
- [Prompt Files](https://code.visualstudio.com/docs/copilot/chat/prompt-files)
- [MCP Integration](https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-chat-in-vs-code-with-mcp)
- [VS Code Hooks](https://code.visualstudio.com/docs/copilot/customization/hooks#_hook-lifecycle-events)
- [VS Code Plugin Hooks](https://code.visualstudio.com/docs/copilot/customization/agent-plugins#_hooks-in-plugins)

---

## Version

This guide is based on GitHub Copilot configuration (2026). Check official documentation for latest features and changes.
