---
name: codex
description: Codex is OpenAI's AI-powered terminal-based coding assistant. Supports customization through AGENTS.md root configuration, rules, subagents, skills, hooks, and MCP servers.
---

# Codex - Subagents, Skills, Rules, Hooks Configuration Guide - 2026

## Overview

Codex is OpenAI's AI-powered terminal-based coding CLI assistant. Supports customization through AGENTS.md root configuration, Starlark-based execution rules, TOML-based subagents, skills, hooks, and MCP servers.

**Configuration Locations:**

- `AGENTS.md` - **ROOT INSTRUCTIONS** (bootstrap, core rules, always applied)
- `.codex/config.toml` - Project settings (sandbox, MCP, features, model)
- `.codex/agents/` - Custom subagents (TOML files)
- `.codex/rules/` - Execution policy rules (Starlark `.rules` files)
- `.codex/hooks.json` - Lifecycle hooks
- `.agents/skills/` - Agent skills (SKILL.md directories)
- `.agents/plugins/` - Plugins (bundled skills, MCP servers, apps)
- `.agents/rules/` - Agent rules/workflows/commands *.md files(not standard - our decision)

Because regular *.md rules/workflows/commands are not supported directly, we should copy *.md files to `.agents/rules/` as-is and then we reference them in `AGENTS.md` using INDEX style (template: "- `.agents/rules/file.md`: [Description from frontmatter verbatim, or description of why/when to use it inferred from the content] [Glob: if glob pattern used in frontmatter]").

---

## Root Configuration File (AGENTS.md)

**THIS IS THE MOST IMPORTANT FILE.**

The `AGENTS.md` file is the central instruction file that Codex reads on every interaction. Acts as the project's constitution.

**Location:** `AGENTS.md` (project root, shared with team)

**Discovery hierarchy (concatenated, later overrides earlier):**

1. **Global:** `~/.codex/AGENTS.override.md` or `~/.codex/AGENTS.md`
2. **Project:** Walking from repository root to current directory, checking `AGENTS.override.md`, then `AGENTS.md` at each level

Project-level files are the focus of this guide.

**Behavior:**

- Plain Markdown format, no strict schema required
- Files concatenate from root downward with blank line separation
- Override files at any directory level replace broader guidance
- Empty files are skipped during discovery
- Combined size limit: `project_doc_max_bytes` (default 32 KiB), truncated when exceeded
- Instruction chain rebuilds on every run, no manual cache clearing needed

### AGENTS.md Example

```markdown
# Project Instructions

## Working Agreements

- TypeScript strict mode for all files
- Never store credit card data, use Stripe tokens only
- Run tests before committing

## Repository Expectations

- Follow existing code patterns
- Keep PRs focused on single concerns
```

**Verify loaded instructions:** `codex --ask-for-approval never "Summarize the current instructions."`

---

## Execution Rules

**Location:** `.codex/rules/`

**File Format:** `.rules` files using **Starlark** syntax (Python-like, safe execution)

Rules control tool approval policy. They define which commands are allowed, require approval, or are forbidden.

### Rule Structure

```python
prefix_rule(
    pattern = ["gh", "pr", "view"],
    decision = "prompt",
    justification = "Viewing PRs requires approval",
    match = ["gh pr view 7888"],
    not_match = ["gh pr --repo openai/codex view 7888"]
)
```

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `pattern` | Yes | list | Command prefix to match. Literal strings or union alternatives `["view", "list"]` |
| `decision` | No | string | `"allow"` (default), `"prompt"`, or `"forbidden"`. Hierarchy: forbidden > prompt > allow |
| `justification` | No | string | Human-readable explanation |
| `match` | No | list | Example commands that should match (validated at load) |
| `not_match` | No | list | Example commands that should not match (validated at load) |

### Shell Command Handling

Codex safely splits simple bash scripts (`bash -lc`, `bash -c`, `zsh`, `sh`) when they contain only plain words and safe operators (`&&`, `||`, `;`, `|`). Advanced features (redirection, substitutions, wildcards) prevent splitting.

### Testing Rules

```bash
codex execpolicy check --pretty --rules ~/.codex/rules/default.rules -- gh pr view 7888
```

---

## Subagents (Custom AI Agents)

**Location:** `.codex/agents/`

**File Format:** TOML files (one file per agent)

### Subagent File Structure

`.codex/agents/code-reviewer.toml`:

```toml
name = "code-reviewer"
description = "Reviews code for best practices, security, and maintainability"
developer_instructions = """
You are a senior code reviewer.

## Review Checklist

- Security vulnerabilities (SQL injection, XSS, exposed secrets)
- Error handling gaps
- Performance concerns
- Code readability
"""
```

### Configuration Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Agent identifier for spawning |
| `description` | Yes | string | Human-facing guidance for when to use |
| `developer_instructions` | Yes | string | Core behavioral directives (system prompt) |
| `nickname_candidates` | No | string[] | Display name pool for spawned instances |
| `model` | No | string | LLM selection (inherits from parent if omitted) |
| `model_reasoning_effort` | No | string | `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"` |
| `sandbox_mode` | No | string | `"read-only"`, `"workspace-write"`, `"danger-full-access"` |
| `mcp_servers` | No | table | MCP server configuration for this agent |
| `skills.config` | No | array | Skill definitions for this agent |

### Built-in Agents

- **`default`** - General-purpose fallback
- **`worker`** - Execution-focused (implementation/fixes)
- **`explorer`** - Read-heavy codebase exploration

Custom agents with matching names take precedence over built-ins.

### Global Agent Settings

In `config.toml`:

```toml
[agents]
max_threads = 6          # Concurrent open thread cap
max_depth = 1            # Nesting depth limit
job_max_runtime_seconds = 1800
```

### Invocation

- **CLI:** `/agent` command to switch threads, inspect work
- **Prompt-based:** "Spawn one agent per point, wait for all of them, and summarize..."

---

## Agent Skills

**Location:** `.agents/skills/` (note: `.agents/`, not `.codex/`)

**Format:** `SKILL.md` file in skill directory

### Discovery Locations (precedence order)

| Scope | Path | Use Case |
|-------|------|----------|
| CWD | `.agents/skills/` | Folder-specific workflows |
| Parent | `../.agents/skills/` | Nested folder organization |
| Repo root | `$REPO_ROOT/.agents/skills/` | Repository-wide skills |

### Skill Directory Structure

```
.agents/skills/
└── deploy-app/
    ├── SKILL.md           # Required: Skill definition
    ├── scripts/           # Optional: Executable code
    │   ├── deploy.sh
    │   └── validate.py
    ├── references/        # Optional: Additional documentation
    ├── assets/            # Optional: Templates, configs, data
    └── agents/
        └── openai.yaml    # Optional: UI metadata and policy
```

### SKILL.md Format

`.agents/skills/deploy-app/SKILL.md`:

```markdown
---
name: deploy-app
description: Deploy the application to staging or production environments. Use when deploying code or when the user mentions deployment.
---

# Deploy App

Deploy the application using the provided scripts.

## Instructions

Run the deployment script: `scripts/deploy.sh <environment>`
```

### Frontmatter Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Skill identifier (lowercase, hyphens). Must match parent folder name |
| `description` | Yes | string | What the skill does and when to use it |

### Optional Metadata (agents/openai.yaml)

```yaml
interface:
  display_name: "User-facing name"
  short_description: "UI description"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Surrounding context"

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "toolName"
      description: "Tool description"
```

### Invocation

- **Explicit:** `/skills` command or `$skill-name` mention
- **Implicit:** Codex selects skills matching task description (unless `allow_implicit_invocation: false`)

### Disable Skills

In `config.toml`:

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

---

## Hooks

**Location:** `.codex/hooks.json`

**Enable in `config.toml`:**

```toml
[features]
codex_hooks = true
```

### Supported Events

| Event | Matcher | Purpose |
|-------|---------|---------|
| `SessionStart` | `startup` or `resume` | Run scripts on session start/resume |
| `PreToolUse` | Tool name (currently `Bash` only) | Block or modify before tool execution |
| `PostToolUse` | Tool name | React after tool execution |
| `UserPromptSubmit` | Unsupported | Process user input |
| `Stop` | Unsupported | Intercept session stop |

### Handler Configuration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "path/to/script.py",
            "statusMessage": "Checking policy...",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

### Handler Input/Output

**Input (stdin JSON):** `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `turn_id`

**Output (stdout JSON):**

```json
{
  "continue": true,
  "stopReason": "optional",
  "systemMessage": "optional warning",
  "suppressOutput": false
}
```

Exit code `0` with no output = success. Exit code `2` signals failure via `stderr`.

---

## MCP Configuration

MCP servers are configured in `config.toml`. Codex does **not** use a standalone `.mcp.json` at the project level (`.mcp.json` is only used inside plugins).

**Location:** `.codex/config.toml` (project-level, trusted projects only). Both CLI and IDE extension share this configuration.

### CLI Method

```bash
codex mcp add <server-name> --env VAR1=VALUE1 -- <stdio-command>
```

### config.toml Method

**STDIO servers:**

```toml
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@my/mcp-server"]
startup_timeout_sec = 10
tool_timeout_sec = 60

[mcp_servers.my-server.env]
API_KEY = "value"
```

**HTTP servers:**

```toml
[mcp_servers.remote]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "MCP_TOKEN"
```

### Universal MCP Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable without deletion |
| `required` | boolean | false | Fail startup if unavailable |
| `startup_timeout_sec` | number | 10 | Server startup timeout |
| `tool_timeout_sec` | number | 60 | Tool execution timeout |
| `enabled_tools` | string[] | - | Tool allowlist |
| `disabled_tools` | string[] | - | Tool denylist |
| `cwd` | string | - | Working directory |

### OAuth

```toml
mcp_oauth_callback_port = 5555
mcp_oauth_callback_url = "http://localhost:5555/callback"
```

Login: `codex mcp login <server-name>`

View active servers: `/mcp` in the Codex TUI

---

## Project Configuration (config.toml)

**Location:** `.codex/config.toml`

### Key Settings

```toml
model = "gpt-5-codex"
model_reasoning_effort = "medium"         # minimal|low|medium|high|xhigh
sandbox_mode = "workspace-write"          # read-only|workspace-write|danger-full-access
approval_policy = "on-request"            # untrusted|on-request|never
web_search = "cached"                     # disabled|cached|live
personality = "pragmatic"                 # none|friendly|pragmatic

[features]
shell_tool = true
multi_agent = true
codex_hooks = true
```

### Profiles

```toml
profile = "default"

[profiles.careful]
model = "gpt-5-codex"
personality = "pragmatic"
plan_mode_reasoning_effort = "high"
```

---

## Plugins

Plugins bundle skills, MCP servers, and apps into installable packages.

**Location:** `.agents/plugins/` (repo-scoped)

### Plugin Structure

```
my-plugin/
├── .codex-plugin/
│   └── plugin.json          # Required: manifest
├── skills/                  # Optional: bundled skills
│   └── my-skill/
│       └── SKILL.md
├── .mcp.json                # Optional: bundled MCP servers
├── .app.json                # Optional: app/connector mappings
└── assets/                  # Optional: icons, logos, screenshots
```

### Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

**Identity fields:** `name` (kebab-case), `version`, `description`

**Component pointers:** `skills`, `mcpServers`, `apps`

**Publisher metadata:** `author`, `homepage`, `repository`, `license`, `keywords`

**Interface metadata:** `displayName`, `shortDescription`, `longDescription`, `category`, `capabilities`, `defaultPrompt`, `brandColor`

**Visual assets:** `composerIcon`, `logo`, `screenshots` (under `./assets/`)

### Marketplace

Marketplaces catalog plugins as JSON files:

- `$REPO_ROOT/.agents/plugins/marketplace.json` - Repo-scoped
- `~/.agents/plugins/marketplace.json` - Personal

Plugins install to `~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/`.

Use the built-in `$plugin-creator` skill to scaffold new plugins.

---

## File Structure Example

```
your-project/
├── AGENTS.md                       # ROOT INSTRUCTIONS (bootstrap)
├── .codex/
│   ├── config.toml                 # Project settings, MCP, sandbox
│   ├── hooks.json                  # Lifecycle hooks
│   ├── agents/
│   │   ├── code-reviewer.toml      # Code review agent
│   │   ├── test-generator.toml     # Test generation agent
│   │   └── security-auditor.toml   # Security audit agent
│   └── rules/
│       └── default.rules           # Execution policy rules
├── .agents/
│   ├── skills/
│   │   ├── deploy-app/
│   │   │   ├── SKILL.md
│   │   │   ├── scripts/
│   │   │   │   └── deploy.sh
│   │   │   └── assets/
│   │   │       └── config.json
│   │   └── generate-docs/
│   │       └── SKILL.md
│   └── plugins/
│       ├── marketplace.json        # Repo-scoped plugin catalog
│       └── my-plugin/
│           ├── .codex-plugin/
│           │   └── plugin.json
│           ├── skills/
│           ├── .mcp.json
│           └── assets/
├── src/
├── tests/
└── package.json
```

---

## Cross-Tool Compatibility

Codex uses its own directory conventions:

- `.codex/agents/` - Subagents (TOML files, Codex-only)
- `.codex/config.toml` - Configuration (Codex-only)
- `.agents/skills/` - Skills (open standard, shared across tools via [agentskills.io](https://agentskills.io))

Codex does **not** read from `.claude/` or `.cursor/` directories. However, other tools may read Codex directories (e.g., Cursor reads `.codex/agents/`). Skills in `.agents/skills/` follow the open Agent Skills Standard and are portable across compatible tools.

---

## Configuration Tips

1. **AGENTS.md first:** Start with clear project instructions in `AGENTS.md`
2. **Be specific:** Clear descriptions determine when agents delegate and skills activate
3. **Single responsibility:** Each subagent/skill should have one clear purpose
4. **Version control:** Commit `AGENTS.md`, `.codex/`, and `.agents/` to share with team
5. **Start small:** Begin with 2-3 focused subagents, add more as needed
6. **Test rules:** Use `codex execpolicy check` to validate execution rules

---

## Additional Resources

- [Codex AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md)
- [Codex Rules Reference](https://developers.openai.com/codex/rules)
- [Codex Hooks Reference](https://developers.openai.com/codex/hooks)
- [Codex MCP Configuration](https://developers.openai.com/codex/mcp)
- [Codex Skills Reference](https://developers.openai.com/codex/skills)
- [Codex Subagents Reference](https://developers.openai.com/codex/subagents)
- [Codex Config Reference](https://developers.openai.com/codex/config-reference)
- [Codex Plugins Guide](https://developers.openai.com/codex/plugins/build)
- [Agent Skills Standard](https://agentskills.io)

---

## Version

This guide is based on Codex CLI configuration (2026). Check official documentation for latest features and changes.
