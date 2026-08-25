---
name: opencode
description: OpenCode terminal-based AI coding assistant with workspace config files, agents, commands, skills, tools, plugins.
---

# OpenCode - Commands, Subagents, Skills, Tools, Plugins, Rules Configuration Guide - 2026

## Overview

OpenCode: Terminal-based AI coding assistant with workspace config files, agents, commands, skills, tools, plugins.

**⚠️ CRITICAL: `AGENTS.md` = ROOT CORE RULES FILE**

**Workspace Config Locations:**
- `AGENTS.md` - ROOT INSTRUCTIONS (bootstrap, always applied)
- `opencode.json` - Project settings/config
- `.opencode/agent/` - Custom agents
- `.opencode/command/` - Custom commands
- `.opencode/skill/<name>/SKILL.md` - Agent skills
- `.opencode/tool/` - Custom tools (TS/JS)
- `.opencode/plugins/` - Plugins (TS/JS)

**Architecture:** Two-level agent hierarchy
- **Primary agents** - Main assistants (Build, Plan, custom)
- **Subagents** - Specialized assistants (General, Explore, custom)
- Primary can spawn subagents. Subagents CANNOT spawn subagents.

---

## Root Config (AGENTS.md)

**Location:** `AGENTS.md` (project root)

**Purpose:** Bootstrap, core rules, always read first, shared via git

**Contains:** Project context, structure, code standards, workflows, references to custom config

**Fallback:** `CLAUDE.md` (Claude Code compatibility)

**External instructions:** Use `instructions` field in `opencode.json` to reference files/patterns (glob support, remote URLs)

---

## Project Config (opencode.json)

**Location:** `opencode.json` (project root)

**Format:** JSON/JSONC

**Example:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "build",
  "instructions": ["CONTRIBUTING.md", "docs/*.md"],
  "share": "manual",
  "autoupdate": true,
  "permission": {
    "edit": "allow",
    "bash": {
      "git push": "ask",
      "git status": "allow",
      "*": "ask"
    },
    "skill": "ask",
    "webfetch": "allow"
  },
  "formatter": {
    "prettier": { "disabled": true },
    "custom": {
      "command": ["npx", "prettier", "--write", "$FILE"],
      "extensions": [".js", ".ts"]
    }
  }
}
```

---

## Custom Agents

**Location:** `.opencode/agent/`

**Format:** Markdown with YAML frontmatter

**Types:**
- `mode: primary` - Main assistants
- `mode: subagent` - Specialized (invoked by primary or `@mention`)

**Built-in:**
- Primary: **Build** (default, all tools), **Plan** (restricted, analysis)
- Subagent: **General** (research), **Explore** (fast codebase)

**Example:** `.opencode/agent/code-reviewer.md`

```markdown
---
description: Reviews code for best practices, security, maintainability
mode: subagent
model: anthropic/claude-sonnet-4-5
temperature: 0.1
tools:
  write: false
  edit: false
  bash: false
permission:
  edit: deny
---

Senior code reviewer. Focus on:
- Security vulnerabilities
- Performance bottlenecks
- Code quality issues
- Test coverage gaps

Provide severity levels (Critical/High/Medium/Low) with line numbers and actionable fixes.
```

**Config fields:**
- `description` - Required. Brief purpose.
- `mode` - Required: primary/subagent/all
- `model` - Override model
- `temperature` - 0.0-1.0 (0.1=focused, 0.7=creative)
- `maxSteps` - Max iterations
- `prompt` - Custom prompt file
- `tools` - Tool availability
- `permission` - Permission overrides
- `disable` - Disable agent
- `hidden` - Hide from @ menu (subagents only)
- Additional provider options passed through

**Invocation:**
- Primary: Tab cycles between primary agents
- Subagent: `@agent-name` syntax or automatic by primary

---

## Custom Commands

**Location:** `.opencode/command/`

**Format:** Markdown with YAML frontmatter

**Invocation:** `/command-name`

**Example:** `.opencode/command/test.md`

```markdown
---
description: Run tests with coverage
agent: build
---

Run full test suite with coverage. Show failures and suggest fixes.
```

**Features Example:** `.opencode/command/review-changes.md`

```markdown
---
description: Review file changes with test results
agent: plan
---

Review recent changes for $1 component:

File content:
@src/components/$1.tsx

Recent commits:
!`git log --oneline -5 -- src/components/$1.tsx`

Test results:
!`npm test -- $1`

Analyze: $ARGUMENTS
```

**Features:**
- **Args:** `$ARGUMENTS` (all args), `$1`, `$2`, `$3` (positional)
- **Shell:** `!`command`` (inject output)
- **Files:** `@filepath` (include content)

**Config fields:**
- `description` - Brief description
- `template` - Required (JSON config only)
- `agent` - Which agent executes
- `subtask` - Force subagent invocation
- `model` - Override model

---

## Agent Skills

**Location:** `.opencode/skill/<name>/SKILL.md` or `.claude/skills/<name>/SKILL.md` (Claude-compatible)

**Invocation:** Automatic (agent decides)

**Example:** `.opencode/skill/git-release/SKILL.md`

```markdown
---
name: git-release
description: Create consistent releases and changelogs
---

## What I do
- Draft release notes from PRs
- Propose version bump
- Provide `gh release create` command

## When to use
Preparing tagged release. Ask if versioning unclear.
```

**Config fields:**
- `name` - Required, lowercase alphanumeric with hyphens, < 64 chars, must match dir
- `description` - Required, < 1024 chars
- `license` - Optional
- `compatibility` - Optional
- `metadata` - Optional key-value map

**Permissions:** Pattern-based with `allow`, `ask`, `deny`. Per-agent override via `permission.skill`. Disable with `tools.skill: false`.

---

## Custom Tools

**Location:** `.opencode/tool/`

**Format:** TypeScript/JavaScript (can invoke any language)

**Example:** `.opencode/tool/database.ts`

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Query project database",
  args: {
    query: tool.schema.string().describe("SQL query"),
  },
  async execute(args, context) {
    // DB logic
    return `Executed: ${args.query}`
  },
})
```

**Multiple tools:** Export named functions (creates `filename_exportname` tools)

---

## Plugins

**Location:** `.opencode/plugins/`

**Format:** TypeScript/JavaScript

**Purpose:** Extend OpenCode via event hooks (session, tool, message, file, permission events)

**Dependencies:** `.opencode/package.json` (auto-installed at startup)

**Example:** `.opencode/plugins/example.ts`

```typescript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Hook implementation
    },
  }
}
```

---

## Tools & Permissions

**Built-in tools:** `bash`, `edit`, `write`, `read`, `grep`, `glob`, `list`, `lsp`, `patch`, `skill`, `todowrite`, `todoread`, `webfetch`, `question`, `multiedit`

**Notes:**
- `edit` permission covers `write`, `patch`, `multiedit`
- `todowrite`/`todoread` disabled for subagents by default
- Default `.env` files denied

**Permission levels:** `allow`, `ask`, `deny`

**Patterns:** `*` and `?` wildcards supported. Last matching rule wins.

**Config pattern:**

```json
{
  "tools": {
    "write": true,
    "bash": true,
    "mymcp_*": false
  },
  "permission": {
    "edit": "ask",
    "bash": {
      "git push": "ask",
      "git status": "allow",
      "*": "deny"
    },
    "skill": {
      "internal-*": "deny",
      "experimental-*": "ask",
      "*": "allow"
    },
    "webfetch": "ask",
    "doom_loop": "ask",
    "external_directory": "ask"
  },
  "agent": {
    "build": {
      "tools": { "write": true },
      "permission": {
        "bash": { "git push": "allow" },
        "skill": { "internal-*": "allow" }
      }
    }
  }
}
```

**Wildcards:** `*` (zero or more chars), `?` (one char)

---

## MCP Servers

**⚠️ WARNING:** MCP adds significant context. Use sparingly.

**OAuth:** Automatic on 401. Use `oauth: {}` for auto-detection or `oauth: {clientId, clientSecret, scope}` for pre-registered credentials. Set `oauth: false` for API keys.

**Config:**

```json
{
  "mcp": {
    "local-mcp": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-command"],
      "enabled": true,
      "environment": { "MY_VAR": "value" },
      "timeout": 5000
    },
    "remote-mcp": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "enabled": true,
      "headers": { "Authorization": "Bearer KEY" },
      "timeout": 5000
    },
    "oauth-mcp": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "clientId": "{env:CLIENT_ID}",
        "clientSecret": "{env:CLIENT_SECRET}",
        "scope": "tools:read tools:execute"
      }
    }
  },
  "permission": { "my-mcp*": "ask" },
  "agent": {
    "my-agent": {
      "permission": { "my-mcp*": "allow" }
    }
  }
}
```

---

## File Structure

```
your-project/
├── AGENTS.md                     # ⚠️ ROOT (bootstrap)
├── opencode.json                 # Config
├── .opencode/
│   ├── agent/
│   │   ├── code-reviewer.md
│   │   └── test-generator.md
│   ├── command/
│   │   ├── test.md
│   │   └── review.md
│   ├── skill/
│   │   └── git-release/
│   │       └── SKILL.md
│   ├── tool/
│   │   ├── database.ts
│   │   └── math.ts
│   ├── plugins/
│   │   └── example.ts
│   └── package.json              # Plugin dependencies
├── src/
└── tests/
```

---

## Resources

- [Agents](https://opencode.ai/docs/agents)
- [Commands](https://opencode.ai/docs/commands)
- [Skills](https://opencode.ai/docs/skills)
- [Custom Tools](https://opencode.ai/docs/custom-tools)
- [Plugins](https://opencode.ai/docs/plugins)
- [Tools](https://opencode.ai/docs/tools)
- [Permissions](https://opencode.ai/docs/permissions)
- [Rules (AGENTS.md)](https://opencode.ai/docs/rules)
- [MCP Servers](https://opencode.ai/docs/mcp-servers)
- [Config](https://opencode.ai/docs/config)
