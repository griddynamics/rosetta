---
name: claude-code
description: Claude Code is Anthropic's AI-powered terminal-based coding assistant. Supports customization through root configuration, slash commands, agents (subagents), skills, rules, and plugins.
---

# Claude Code - Commands, Subagents, Skills, Plugins, Rules Configuration Guide - 2026

## Overview

Claude Code is Anthropic's AI-powered terminal-based coding assistant. Supports customization through root configuration, slash commands, agents (subagents), skills, rules, and plugins.

**⚠️ CRITICAL: `CLAUDE.md` (root folder) is the ROOT CORE RULES/INSTRUCTION FILE**

**Configuration Locations:**

- `CLAUDE.md` - **ROOT INSTRUCTIONS** (bootstrap, core rules, always applied)
- `.claude/claude.md` - alternative location of root core rules file, if exists use it instead
- `.claude/commands/` - Custom slash commands
- `.claude/agents/` - Custom agents (specialized assistants)
- `.claude/skills/` - Agent skills (autonomous capabilities)
- `.claude/plugins/` - Installable plugins (bundles of commands, agents, skills)
- `.claude/rules/` - Path-specific rules
- `.claude/settings.json` - Project settings and team plugin configuration

**⚠️ CRITICAL LIMITATION: claude code subagents CANNOT spawn new subagents, only top-level agent can do that! It is two levels only: user -> orchestrator -> subagents**. Orchestrator can spawn subagents. Subagents CANNOT spawn subagents.

---

## Root Configuration File (CLAUDE.md)

**⚠️ THIS IS THE MOST IMPORTANT FILE - READ THIS FIRST!**

The `CLAUDE.md` file is the **central instruction file** that Claude Code reads on every interaction. Acts as project's constitution - fundamental rules and context guiding all AI behavior.

**Location:** `CLAUDE.md` (root, shared with team) or `.claude/claude.md` (alternative location)

**Purpose:**

- Defines core project rules and conventions
- Acts as bootstrap configuration
- Always applied before any other instructions
- Shared across entire team via version control
- Takes precedence as primary source of truth

### Root Configuration Structure

`CLAUDE.md`:

```markdown
# Project Core Instructions

## Project Context

E-commerce platform built with Next.js 14, PostgreSQL, Stripe payments.

## Core Rules

- TypeScript strict mode for all files
- Never store credit card data, use Stripe tokens only
```

---

## Modular Rules with `.claude/rules/`

For path-specific rules (e.g., TypeScript only applies to `.ts` files), use `.claude/rules/` with YAML frontmatter. All `.md` files in `.claude/rules/` are automatically loaded.

### Path-Specific Rules Format

`.claude/rules/typescript.md`:

```markdown
---
paths: **/*.ts, **/*.tsx
---

# TypeScript Rules

- Use strict mode
```

**⚠️ MUST follow original YAML format - do not add square brackets, multi-line formatting, or arrays.**

Rules without `paths` frontmatter apply to all files.

### Usage Guidelines

**Use `.claude/rules/` for:**

- Language-specific rules for certain file types
- Framework-specific rules for specific extensions
- Database query rules for SQL files
- Rules that conditionally load based on file patterns

**Use `.claude/` (NOT rules/) for:**

- Bootstrap (CLAUDE.md)
- Conditionally loaded rules (agents.md, coding.md, etc.)
- Any rule that must not auto-load

**⚠️ CRITICAL: Conditionally loaded rules MUST NOT be in `.claude/rules/`. They MUST follow original conditional loading pattern.**

---

## Custom Slash Commands

**Location:** `.claude/commands/` (legacy, still functional) or `.claude/skills/` (recommended)

**File Format:** Markdown with optional YAML frontmatter

**Invocation:** `/command-name`

**⚠️ IMPORTANT: Custom slash commands have been merged into skills.** Files at `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work identically. Existing `.claude/commands/` files keep working, but skills add optional features (supporting files, invocation control). **Be aware of naming conflicts** - if a skill and command share the same name, the skill takes precedence.

### Command File Structure

Filename becomes command name. Content is the prompt to execute. Commands must be small. Do not repeat any rules/prompts/subagents/workflows, but instead invoke them.

### Frontmatter Fields

- `name`: Display name (defaults to directory/file name)
- `description`: Command description (helps Claude decide when to use)
- `argument-hint`: Hint for expected arguments
- `allowed-tools`: Tools Claude can use without permission when this command is active. Dangerous.
- `model`: Specific Claude model to use (`claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-8`, `inherit`)
- `disable-model-invocation`: Set to `true` to prevent Claude from automatically invoking (only manual `/command`)
- `user-invocable`: Set to `false` to hide from `/` menu (only Claude can invoke)
- `context`: Set to `fork` to run in forked subagent context
- `agent`: Which subagent type to use when `context: fork` is set
- `hooks`: Hooks scoped to this command's lifecycle

### Command Example

`.claude/commands/review.md`:

```markdown
---
description: Comprehensive code review for quality, security, and best practices
allowed-tools: Bash(git diff:*)
---

# Code Review

Review changes: !`git diff HEAD`

## Check

- Security vulnerabilities (SQL injection, XSS, exposed secrets)
- Error handling gaps
```

**Usage:** `/review`

### Command Features

**Arguments:**

```markdown
---
argument-hint: [filename] [format]
---

Convert $1 to $2 format.
```

**Usage:** `/convert app.js typescript`

**Placeholders:** `$1`, `$2`, `$3` - Positional arguments; `$ARGUMENTS` - All arguments as one string

**Bash Execution:**

```markdown
---
allowed-tools: Bash(git log:*)
---

Analyze last commit: !`git log -1`
```

**Syntax:** Prefix with `!` to execute: `!`command``. Must be in backticks and listed in `allowed-tools`.

**File References:**

```markdown
Review @src/api.ts
```

---

## Subagents (Custom AI Agents)

**Location:** `.claude/agents/`

**Format:** Markdown files with YAML frontmatter

**Invocation:** `@agent-name`

### Subagent Structure

`.claude/agents/code-reviewer.md`:

```markdown
---
name: code-reviewer
description: Reviews code for best practices, security, and maintainability
tools: ["read", "grep"]
model: claude-sonnet-4-6
---

You are a senior code reviewer.

## Review Checklist

- Security vulnerabilities (SQL injection, XSS, exposed secrets)
- Error handling gaps
```

### Configuration Fields

**YAML Frontmatter:**

- `name`: Unique identifier using lowercase letters and hyphens (required)
- `description`: When Claude should delegate to this subagent (required)
- `tools`: Array of allowed tools (optional, inherits all tools if omitted, **limits access to MCP and internal tools as well, dangerous**)
  - `"read"`: Read files
  - `"write"`: Write/modify files
  - `"read-only"`: Read without modification
  - `"bash"`: Execute shell commands
  - `"grep"`: Search in files
  - MCP and tool-specific names
- `disallowedTools`: Tools to deny, removed from inherited or specified list
- `model`: Claude model to use
  - `"claude-sonnet-4-6"`: Balanced (default)
  - `"claude-opus-4-8"`: Most capable
  - `"claude-haiku-4-5"`: Fastest, more economical
  - `"inherit"`: Use same model as main conversation (default if omitted)
- `permissionMode`: Permission behavior
  - `"default"`: Standard permission checking with prompts
  - `"acceptEdits"`: Auto-accept file edits
  - `"dontAsk"`: Auto-deny permission prompts (explicitly allowed tools still work)
  - `"bypassPermissions"`: Skip all permission checks (use with caution)
  - `"plan"`: Plan mode (read-only exploration)
- `skills`: Skills to load into subagent's context at startup (full content injected, not just made available)
- `hooks`: Lifecycle hooks scoped to this subagent

**Content:** System prompt defining agent behavior, instructions, guidelines, checklists, examples.

### Usage

**Invoke:** `@code-reviewer @src/api.ts`

---

## Agent Skills

**Location:** `.claude/skills/`

**Format:** `SKILL.md` file in skill directory

**Invocation:** Automatic (Claude decides when to use)

**Example:** `.claude/skills/api-validator/SKILL.md`:

```markdown
---
name: api-validator
description: Validate API schemas
---

Validate API endpoint schema and report violations.
```

---

## Plugins

**Location:** `.claude/plugins/`

**Management:** Use `/plugin` command

### Team Configuration

`.claude/settings.json`:

```json
{
  "plugins": ["code-standards@your-org"],
  "enabledPlugins": ["formatter", "linter"],
  "extraKnownMarketplaces": ["https://github.com/your-org/marketplace"],
  "strictKnownMarketplaces": true
}
```

**Plugin Settings:**

- `plugins`: Array of plugin names to install automatically
- `enabledPlugins`: Controls which plugins are active
- `extraKnownMarketplaces`: Adds custom plugin marketplaces beyond defaults
- `strictKnownMarketplaces`: Restricts plugins to approved marketplaces only

Team members automatically get plugins when they trust the repository.

---

## Built-in Slash Commands

**Session Management:** `/clear`, `/compact`, `/exit`, `/export`, `/resume`, `/rewind`, `/rename`

**Configuration:** `/config`, `/permissions`, `/memory`, `/theme`, `/statusline`, `/model`

**Agents & Skills:** `/agents`, Skills show as `/skill-name`

**Context & Analysis:** `/context`, `/cost`, `/stats`, `/usage`, `/todos`, `/tasks`

**Setup & Diagnostics:** `/init`, `/doctor`, `/status`, `/terminal-setup`

**Tools:** `/mcp`, `/plan`, `/teleport`

**Help:** `/help`

Type `/` in Claude Code to see the full list with autocomplete.

---

## Hooks

Claude Code hooks run scripts at lifecycle events. Full verified contract: [Claude Code Hooks reference](https://code.claude.com/docs/en/hooks).

### Hook Locations

| Path | Scope |
|------|-------|
| `.claude/settings.json` | Project |
| `.claude/settings.local.json` | Project-local (not committed) |
| `~/.claude/settings.json` | User |
| plugin `hooks/hooks.json` | Plugin-bundled |
| `"disableAllHooks": true` | Disables all hooks |

### Registration Format

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "path/to/script", "timeout": 5 } ] }
    ]
  }
}
```

`matcher`: `"*"`/`""`/omitted = match all; alphanumeric (+ `,`/`|`) = exact string or list (e.g. `"Edit|Write"`); any other character = JS regex. Handler fields: `type` (`command`\|`http`\|`mcp_tool`\|`prompt`\|`agent`), `command`, `args`, `if` (permission rule), `timeout`, `statusMessage`, `once`, `async`/`asyncRewake`, `shell`.

### Supported Events (Rosetta-relevant)

| Event | Matcher basis | Purpose |
|-------|---------------|---------|
| `SessionStart` | session source (`startup`/`resume`/`clear`/`compact`) | inject `additionalContext` |
| `PreToolUse` | tool name | deny / rewrite / advise before a tool runs |
| `PostToolUse` | tool name | inject `additionalContext`; cannot block (tool already ran) |
| `SubagentStop` | agent type | prevent a subagent from stopping (continue it) |
| `Stop` | — (no matcher, always fires) | prevent Claude from stopping (continue the turn) |
| `PreCompact` / `PostCompact` | compaction trigger (`manual`/`auto`) | before/after compaction; `PostCompact` has no decision control |

### Output (nested under `hookSpecificOutput` — `hookEventName` required)

| Field | Used on | Meaning |
|-------|---------|---------|
| `hookSpecificOutput.additionalContext` | `SessionStart` / `PreToolUse` / `PostToolUse` / `Stop` / `SubagentStop` | model-visible context; **no top-level `additionalContext` for Claude Code** (unlike Copilot) |
| `hookSpecificOutput.permissionDecision` | `PreToolUse` | `"allow"` \| `"deny"` \| `"ask"` \| `"defer"` |
| `hookSpecificOutput.permissionDecisionReason` | `PreToolUse` | **(!) REQUIRED when `permissionDecision` is `"deny"`** |
| `hookSpecificOutput.updatedInput` | `PreToolUse` | replaces tool args before execution |
| `decision` | `PostToolUse` / `Stop` / `SubagentStop` | top-level `"block"`; blocks/continues (PostToolUse: feeds reason back only, tool already ran) |
| `reason` | (with `decision`) | **(!) REQUIRED when `decision` is `"block"`** |
| `continue` | any | `false` stops Claude entirely — **(!) overrides every other decision field** |
| `stopReason` | with `continue:false` | **(!) shown to the USER only, never reaches Claude** |
| `systemMessage` | any | **(!) USER-facing warning only — NOT model context.** Put model-visible text in `additionalContext` instead |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | stdout JSON parsed as the output contract |
| `2` | **primary block mechanism.** stdout ignored; **stderr fed to Claude** as the reason. No effect on `PostToolUse` (tool already ran) |
| `1` / other non-zero | non-blocking error — action proceeds |

**(!) Choose ONE mechanism per hook — exit 0 + JSON, or exit 2 + stderr — never both.**

### Matchers

| Hook | Matches against |
|------|------------------|
| `PreToolUse` / `PostToolUse` | tool name: `Bash`, `Edit`, `Write`, `Read`, `mcp__…`, … |
| `SubagentStop` | agent type: `general-purpose`, `Explore`, `Plan`, custom names |
| `SessionStart` | session source: `startup`, `resume`, `clear`, `compact` |
| `Stop` | none — always fires |

---

## File Structure Example

```
your-project/
├── .claude/
│   ├── CLAUDE.md                  # ⚠️ ROOT INSTRUCTIONS (bootstrap)
│   ├── agents.md                  # Agent behavior rules (conditionally loaded)
│   ├── coding.md                  # Coding standards (conditionally loaded)
│   ├── rules/                     # Path-specific rules (auto-loaded)
│   │   ├── typescript.md
│   │   ├── react.md
│   │   └── mysql.md
│   ├── settings.json              # Project settings, team plugins
│   ├── commands/
│   │   ├── review.md              # Code review command
│   │   ├── deploy.md              # Deployment command
│   │   ├── test.md                # Test generation command
│   │   └── doc.md                 # Documentation command
│   ├── agents/
│   │   ├── code-reviewer.md       # Code review agent
│   │   ├── test-generator.md      # Test generation agent
│   │   └── api-designer.md        # API design agent
│   ├── skills/
│   │   └── api-validator/
│   │       └── SKILL.md           # API validation skill
│   └── plugins/
│       └── team-standards/        # Custom plugin
│           ├── .claude-plugin/
│           │   └── plugin.json
│           └── commands/
├── src/
├── tests/
└── package.json
```

---

## Configuration Best Practices

**Model Selection:**

- `claude-haiku-4-5`: Simple, repetitive tasks
- `claude-sonnet-4-6`: Most general-purpose work
- `claude-opus-4-8`: Most capable for complex reasoning

---

## Integration with Version Control

**⚠️ CRITICAL: Always commit `claude.md` first!**

### .gitignore Recommendations

```gitignore
# Don't commit local overrides or sensitive data
.claude/local.json
.claude/secrets.json
.claude/cache/
.claude/CLAUDE.local.md

# DO commit shared configuration
!.claude/CLAUDE.md
!.claude/rules/
!.claude/commands/
!.claude/agents/
!.claude/skills/
!.claude/settings.json
!.claude/plugins/
```

### Configuration Hierarchy

Claude Code reads configuration in this order:

1. **`CLAUDE.md` or `.claude/claude.md`** - Root instructions (always first, highest priority)
2. **`.claude/settings.json`** - Project settings, team plugins
3. **`.claude/commands/`** - Project custom commands
4. **`.claude/agents/`** - Project agents
5. **`.claude/skills/`** - Project skills

**The `claude.md` file is read FIRST and acts as the bootstrap for all other configuration.**

---

## Multi-Agent Orchestration & Workflows

**Single-Agent:**

```bash
@code-reviewer review authentication
```

**Multi-Agent:**

```bash
/feature-development implement OAuth2
```

---

## Community Resources

Production-ready agent and command templates for AI to reference and adapt:

- [wshobson/agents](https://github.com/wshobson/agents) - specialized agents and plugins, 26K stars. List of all plugins: https://github.com/wshobson/agents/blob/main/.claude-plugin/marketplace.json
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) - specialized AI assitants designed for specific development tasks, 9K stars. List of all plugins: https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/.claude-plugin/marketplace.json

---

## Additional Resources

- [Claude Code Overview](https://docs.claude.com/docs/claude-code/overview)
- [Claude Code Settings](https://docs.claude.com/docs/claude-code/settings)
- [Subagents Documentation](https://docs.claude.com/docs/claude-code/subagents)
- [Slash Commands Reference](https://docs.claude.com/docs/claude-code/slash-commands)
- [Agent Skills Guide](https://docs.claude.com/docs/claude-code/skills)
- [Plugins Guide](https://docs.claude.com/docs/claude-code/plugins)
