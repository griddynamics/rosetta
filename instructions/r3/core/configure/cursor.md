---
name: cursor
description: Cursor is an AI-powered code editor that supports custom rules, commands, subagents, and skills to enhance your development workflow.
---

# Cursor - Commands, Subagents, Skills, Rules Configuration Guide - 2026

## Overview

Cursor is an AI-powered code editor that supports custom rules, commands, subagents, and skills to enhance your development workflow. This guide covers how to configure each component at the project/workspace level.

---

## Rules Configuration

### Project Rules

Project-specific rules are stored in the `.cursor/rules` directory within your project. Each rule is a Markdown file with the `.mdc` extension that includes YAML frontmatter for metadata.

**Location:** `.cursor/rules/`

**File Format:** `.mdc` (Markdown with YAML frontmatter)

**Root Core Rule:** `.cursor/rules/agents.mdc`

**CRITICAL** The CORE root rule file for Cursor is `.cursor/rules/agents.mdc`.

#### Example Rule File

`.cursor/rules/typescript-standards.mdc`:

```markdown
---
description: Enforce TypeScript usage and coding standards
globs: **/*.ts, **/*.tsx
alwaysApply: true
---

- Use TypeScript for all new files.
- Prefer functional components in React.
- Use interfaces for object types, not type aliases.
- Always define return types for functions.
- Use strict null checks.
```

#### Rule File Structure

**YAML Frontmatter:**
- `description`: Brief description of the rule's purpose
- `globs`: Array of file patterns (glob syntax) where the rule applies, note it is NOT YAML ARRAY
  - Example: `**/*.js, **/*.ts` for all JavaScript and TypeScript files
  - Example: `src/**/*.tsx` for React components in src directory
- `alwaysApply`: Boolean - if `true`, the rule is always active; if `false`, it's context-dependent

**Content:**
- Markdown content below the frontmatter
- Can include bullet points, code examples, or detailed instructions
- Used by the AI agent to guide code generation and suggestions

#### Scoping Rules

Rules can be scoped in three ways:

1. **Always Apply:** Set `alwaysApply: true` in frontmatter
2. **Path Patterns:** Use `globs` to apply to specific files/directories
3. **Manual Invocation:** Reference the rule manually when needed

#### Best Practices

- Keep rules specific and focused on single concerns
- Use clear, actionable language
- Provide code examples where helpful
- Organize rules by domain (e.g., `testing.mdc`, `api-design.mdc`, `security.mdc`)
- Use glob patterns to target specific file types or directories

### User Rules

User rules define global preferences that apply across all projects. These are ideal for personal coding conventions, communication styles, or general preferences.

**Location:** Cursor Settings → Rules section (accessed via UI)

**Examples:**
- Preferred communication style (e.g., "Be concise and technical")
- Language preferences (e.g., "Use British English spelling")
- Universal coding standards (e.g., "Always use const over let when possible")

---

## Subagents Configuration

Subagents are independent AI assistants that the main Cursor agent can delegate tasks to. Each operates in its own context window and can be configured with custom prompts, tool access, and models.

**Purpose:** Break down complex tasks, run work in parallel, preserve main conversation context.

### Custom Subagents

Subagents are defined as individual Markdown files in the `.cursor/agents/` directory.

**Location:** `.cursor/agents/`

**File Format:** Markdown files (`.md`) with YAML frontmatter

**Compatibility:** `.claude/agents/` and `.codex/agents/` are also supported for cross-tool compatibility. Make sure to not create duplicates!

#### Subagent File Structure

Each subagent is a separate file: `.cursor/agents/subagent-name.md`

```markdown
---
name: debugger
description: Debugging specialist for errors and test failures. Use when encountering issues.
model: fast
readonly: false
is_background: false
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach

Focus on fixing the underlying issue, not symptoms.
```

#### Frontmatter Configuration Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | No | string | Unique identifier (lowercase, hyphens). Defaults to filename without extension. |
| `description` | No | string | Explains when to use this subagent. Agent reads this to decide delegation. |
| `model` | No | string | Model to use: `fast`, `inherit`, or specific model ID. Defaults to `inherit`. See Models section below. |
| `readonly` | No | boolean | If `true`, subagent runs with restricted write permissions. |
| `is_background` | No | boolean | If `true`, subagent runs in background without waiting for completion. |

#### Models

The `model` field accepts the following values:
- `fast` - Uses a faster/cheaper model (default for explore subagent)
- `inherit` - Inherits model from parent agent (default)
- `composer-1` - Cursor's proprietary model
- `claude-4.5-opus-high-thinking` - Anthropic Claude 4.5 Opus (most capable, with extended reasoning)
- `claude-4.5-sonnet` - Anthropic Claude 4.5 Sonnet
- `claude-4.5-sonnet-thinking` - Anthropic Claude 4.5 Sonnet with extended reasoning
- `claude-4.5-haiku` - Anthropic Claude 4.5 Haiku
- `claude-4.5-haiku-thinking` - Anthropic Claude 4.5 Haiku with thinking
- `gpt-5.1-codex-max` - OpenAI GPT 5.1 Codex Max
- `gpt-5.1-codex-mini` - OpenAI GPT 5.1 Codex Mini
- `gpt-5.2-codex-max` - OpenAI GPT 5.2 Codex Max
- `gpt-5.2-codex-max-high` - OpenAI GPT 5.2 Codex Max High
- `gpt-5.3-codex-medium` - OpenAI GPT 5.3 Codex Medium
- `gpt-5.3-codex-max-high` - OpenAI GPT 5.3 Codex Max High
- `grok-code-fast-1` - xAI Grok Code Fast
- `gemini-3.1-pro` - Google Gemini 3 Pro

#### Invocation

Subagents can be invoked:
1. **Automatically:** Based on description matching the task context
2. **Explicitly:** Using `/subagent-name` syntax in chat
3. **Naturally:** Mentioning the subagent in conversation

#### Built-in Subagents

Cursor includes three built-in subagents (no configuration needed):
- **Explore:** Fast parallel codebase searching
- **Bash:** Runs shell commands, isolates verbose output
- **Browser:** Browser automation via MCP tools

---

## Skills Configuration

Skills are portable packages that teach agents how to perform domain-specific tasks. They can include instructions and executable scripts.

**Purpose:** Provide reusable, on-demand domain knowledge and workflows. Uses progressive disclosure (saving context and using only when needed).

### Custom Skills

Skills are defined in folders containing a `SKILL.md` file within `.cursor/skills/`.

**Location:** `.cursor/skills/`

**File Format:** Markdown file (`SKILL.md`) with YAML frontmatter, plus optional directories

**Compatibility:** `.claude/skills/` and `.codex/skills/` are also supported. Do not create duplicates!

#### Skill Directory Structure

Each skill is a folder containing at minimum a `SKILL.md` file:

```
.cursor/skills/
└── my-skill/
    ├── SKILL.md           # Required: Skill definition
    ├── scripts/           # Optional: Executable code
    │   ├── deploy.sh
    │   └── validate.py
    ├── references/        # Optional: Additional documentation
    │   └── REFERENCE.md
    └── assets/            # Optional: Templates, configs, data
        └── config.json
```

#### SKILL.md File Format

`.cursor/skills/deploy-app/SKILL.md`:

```markdown
---
name: deploy-app
description: Deploy the application to staging or production environments. Use when deploying code or when the user mentions deployment.
license: MIT
compatibility: Requires docker and kubectl
disable-model-invocation: false
---

# Deploy App

Deploy the application using the provided scripts.

## When to Use

- Use this skill when deploying to environments
- Use when the user mentions releases or deployments

## Instructions

Run the deployment script: `scripts/deploy.sh <environment>`

Where `<environment>` is either `staging` or `production`.

## Pre-deployment Validation

Before deploying, run: `python scripts/validate.py`
```

#### Frontmatter Configuration Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Skill identifier (lowercase, numbers, hyphens). Must match parent folder name. |
| `description` | Yes | string | What the skill does and when to use it. Agent uses this to determine relevance. |
| `license` | No | string | License name or reference to bundled license file. |
| `compatibility` | No | string | Environment requirements (system packages, network access, etc.). |
| `metadata` | No | object | Arbitrary key-value mapping for additional metadata. |
| `disable-model-invocation` | No | boolean | If `true`, skill only included when explicitly invoked via `/skill-name`. |

#### Optional Directories

| Directory | Purpose |
|-----------|---------|
| `scripts/` | Executable code that agents can run (any language) |
| `references/` | Additional documentation loaded on demand |
| `assets/` | Static resources like templates, images, or data files |

#### Invocation

Skills can be invoked:
1. **Automatically:** Agent applies when relevant based on description (unless `disable-model-invocation: true`)
2. **Explicitly:** Type `/skill-name` in chat (like slash commands)

#### Skills vs Commands

- **Skills:** Can include executable scripts, loaded progressively, supports references/assets
- **Commands:** Simple prompt templates (still supported for backward compatibility)

---

## Commands

Cursor supports custom slash commands that allow you to create reusable prompts and standardize workflows across your team.

### Custom Slash Commands

Custom commands are defined as Markdown files in the `.cursor/commands` directory.

**Location:** `.cursor/commands/`

**File Format:** `.md` (Markdown files)

#### Creating Custom Commands

1. **Create Commands Directory:**
   ```bash
   mkdir -p .cursor/commands
   ```

2. **Add Command Files:**
   - Create a `.md` file for each custom command
   - File name becomes the command name (e.g., `review-code.md` → `/review-code`)
   - Use descriptive names that reflect the command's function

3. **Define Command Content:**
   - Write the prompt or instructions in the Markdown file
   - The content is what the AI agent will execute when the command is invoked

#### Example Command Files

**`.cursor/commands/review-code.md`:**
```markdown
Please review the following code for:
- Potential improvements and best practices
- Security vulnerabilities
- Performance optimizations
- Code readability and maintainability

Provide specific suggestions with code examples.
```

**`.cursor/commands/write-tests.md`:**
```markdown
Generate comprehensive unit tests for the selected code:
- Test all public methods and functions
- Include edge cases and error scenarios
- Follow the project's testing framework conventions
- Aim for 80%+ code coverage
- Use descriptive test names
```

**`.cursor/commands/add-docs.md`:**
```markdown
Add comprehensive documentation to the selected code:
- JSDoc/docstring comments for all public APIs
- Inline comments for complex logic
- Usage examples
- Parameter and return type descriptions
```

**`.cursor/commands/refactor.md`:**
```markdown
Refactor the selected code to:
- Follow SOLID principles
- Improve readability and maintainability
- Reduce code duplication (DRY)
- Extract reusable functions/components
- Maintain existing functionality (no breaking changes)
```

#### Using Custom Commands

1. Open Cursor chat interface
2. Type `/` to see the list of available commands
3. Your custom commands appear in the dropdown
4. Select a command to execute it

#### Command Best Practices

- **Be Specific:** Write clear, detailed instructions in command files
- **Include Context:** Specify what to check, what standards to follow
- **Add Examples:** Show expected output format when relevant
- **Reusable:** Design commands for common, repeatable tasks
- **Team Standards:** Use commands to enforce team conventions
- **Version Control:** Commit `.cursor/commands/` to share with team

#### Built-in Commands

Cursor also provides built-in commands like `/edit`, `/add`, `/review`, `/explain`, `/fix`, `/test`, and `/commit`. Custom commands supplement these with project-specific workflows.

### Context Selection with @

The `@` symbol allows you to reference files and folders in your prompts:

- `@filename.ts` - Include specific file in context
- `@directory/` - Include entire directory
- `@directory/**/*.ts` - Include TypeScript files in directory
- Multiple selections: `@src/api @tests/api`

---

## File Structure Example

```
your-project/
├── .cursor/
│   ├── rules/
│   │   ├── agents.mdc              # CRITICAL: Core root rule
│   │   ├── typescript-standards.mdc
│   │   ├── testing-conventions.mdc
│   │   ├── api-design.mdc
│   │   └── security-practices.mdc
│   ├── commands/
│   │   ├── review-code.md
│   │   ├── write-tests.md
│   │   ├── add-docs.md
│   │   └── refactor.md
│   ├── agents/
│   │   ├── debugger.md
│   │   ├── verifier.md
│   │   ├── security-auditor.md
│   │   └── test-runner.md
│   └── skills/
│       ├── deploy-app/
│       │   ├── SKILL.md
│       │   ├── scripts/
│       │   │   ├── deploy.sh
│       │   │   └── validate.py
│       │   └── assets/
│       │       └── config.json
│       └── generate-docs/
│           └── SKILL.md
├── src/
├── tests/
└── package.json
```

---

## Configuration Tips

1. **Be Specific:** Clear, specific instructions produce better AI behavior
2. **Use Examples:** Include code examples in rules for clarity
3. **Single Responsibility:** Each subagent/skill should have one clear purpose
4. **Invest in Descriptions:** Frontmatter descriptions determine when agents delegate - be specific
5. **Version Control:** Commit `.cursor/` directory to share configuration with team
6. **Start Small:** Begin with 2-3 focused subagents/skills, add more only when needed
7. **Iterate:** Refine based on actual usage and test with representative tasks

---

## Migration and Sharing

### Sharing Configuration

To share Cursor configuration with your team:

1. Commit the entire `.cursor/` directory to version control:
   - `.cursor/rules/` - Project-specific rules (including `agents.mdc`)
   - `.cursor/commands/` - Custom slash commands
   - `.cursor/agents/` - Custom subagents
   - `.cursor/skills/` - Custom skills with scripts and assets
2. Team members clone the repository with configuration included
3. Rules, commands, subagents, and skills automatically apply to the project

### User vs. Project Configuration

- **User Configuration:** Personal preferences, apply to all projects
  - `~/.cursor/rules/`, `~/.cursor/agents/`, `~/.cursor/skills/`
- **Project Configuration:** Team-shared standards, specific to repository
  - `.cursor/rules/`, `.cursor/agents/`, `.cursor/skills/`
- Project configuration takes precedence when names conflict

### Cross-Tool Compatibility

For compatibility with other AI coding tools:
- `.claude/agents/` and `.claude/skills/` - Claude compatibility
- `.codex/agents/` and `.codex/skills/` - Codex compatibility
- `.cursor/` takes precedence when multiple locations exist

---

## Additional Resources

- [Cursor Documentation - Rules](https://cursor.com/docs/context/rules)
- [Cursor Documentation - Subagents](https://cursor.com/docs/context/subagents)
- [Cursor Documentation - Skills](https://cursor.com/docs/context/skills)
- [Cursor Documentation - Commands](https://cursor.com/docs/context/commands)
- [Agent Skills Standard](https://agentskills.io)
- [Cursor Changelog](https://cursor.com/changelog)

---

## Version

This guide is based on Cursor 2.4 configuration (January 2026). Check official documentation for latest features and changes.

**Important:** The old `.cursor/modes.json` agent configuration format has been superseded by the new subagents system (`.cursor/agents/*.md`) as of Cursor 2.4.

