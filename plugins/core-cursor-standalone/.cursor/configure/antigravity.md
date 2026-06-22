---
name: antigravity
description: Antigravity or Google IDX Gemini supports custom rules, workflows, and skills through repository-committed configuration files.
---

# Antigravity - Skills, Rules, Workflows Configuration Guide - 2025

## Overview

Antigravity supports custom rules, workflows, and skills through repository-committed configuration files.

Antigravity is IDE Google IDX Gemini.

**⚠️ CRITICAL: `.agent/rules/agents.md` is the CORE WORKSPACE RULES FILE**

**Configuration Locations:**

- `.agent/rules/` - Workspace rules
- `.agent/workflows/` - Automation workflows
- `.agent/skills/` - Agent skills

---

## Workspace Rules

**Location:** `.agent/rules/` folder in workspace or git root

**File Format:** Markdown files with YAML frontmatter

**Purpose:** Define constraints and guidance for the Agent specific to your workspace

**File Limit:** 12,000 characters per file

### Core Rules File

`.agent/rules/agents.md` - Primary rules file for workspace-wide constraints:

```markdown
---
trigger: always_on
---

# Project Rules

## Tech Stack

- Use Next.js 14 App Router
- TypeScript for all code
- Tailwind CSS for styling
- Prisma ORM with PostgreSQL

## Code Standards

- Functional components only
- No var, use const/let
- 80% test coverage minimum
- JSDoc for all public functions

## Design Philosophy

- Dark mode by default
- Smooth animations and transitions
```

---

## Rule Activation Modes

Rules support different activation modes via YAML frontmatter:

### Always On

Rule is always applied to all agent interactions:

```markdown
---
trigger: always_on
---

# Your rules here
```

### Model Decision

Agent decides whether to apply the rule based on description:

```markdown
---
trigger: model_decision
description: Apply when working with React components and UI code
---

# UI-specific rules here
```

### Glob Pattern

Rule applies only to files matching the pattern:

```markdown
---
trigger: glob
globs: src/**/*.ts
---

# TypeScript-specific rules here
```

### Manual Activation

Rule is activated via `@rule-name` mention in Agent input:

```markdown
---
trigger: manual
---

# Specialized rules for specific scenarios
```

### @ Mentions in Rules

Rules can reference other files using `@filename` syntax. Relative paths resolve from the Rules file location, absolute paths resolve from system root or workspace root.

---

## Workflows

Workflows define a series of steps to guide the Agent through repetitive tasks, such as deploying a service or running tests. Workflows are invoked via slash commands.

**Location:** `.agent/workflows/`

**File Format:** Markdown with YAML frontmatter

```
---
description: description of the workflow
---

<definition of the workflow>
```

**File Naming:** `workflow-name.md` → invoked as `/workflow-name`

**File Limit:** 12,000 characters per file

### Example Workflow Files

**`.agent/workflows/setup-feature.md`:**

```markdown
---
description: Create new feature branch synchronized with main
---

1. Ask user for feature name
2. Switch to main branch
3. Run `git checkout main`
4. Pull latest changes
5. Run `git pull origin main`
6. Create and switch to feature branch
7. Run `git checkout -b feature/[feature-name]`
```

### Workflow Structure

**YAML Frontmatter:**
- `description`: Required. Brief workflow description

**Content:**
- Numbered steps with clear instructions
- Use `[placeholder]` for user input variables
- Can call other workflows using `/workflow-name`

**Chaining Workflows:**

Workflows can invoke other workflows:

```markdown
---
description: Complete deployment process
---

1. Run tests first
2. Call /run-tests
3. If tests pass, deploy
4. Call /deploy-production
5. Verify deployment
```

---

## Skills

Skills are reusable packages of knowledge that extend agent capabilities. Agent automatically discovers and applies skills based on task relevance.

**Location:** `.agent/skills/<skill-folder>/`

**File Format:** Folder containing `SKILL.md` with YAML frontmatter

**Discovery:** Agent sees list of available skills at conversation start, reads full content when relevant to task

### Skill File Structure

**Required:** `SKILL.md` file:

```markdown
---
name: my-skill
description: Helps with a specific task. Use when you need to do X or Y.
---

# My Skill

Detailed instructions for the agent.

## When to use this skill
- Use this when...
- This is helpful for...

## How to use it
Step-by-step guidance, conventions, and patterns.
```

**YAML Frontmatter:**
- `name`: Optional. Defaults to folder name. Lowercase, hyphens for spaces
- `description`: Required. What the skill does and when to use it. Used for agent's decision-making

**Optional Structure:**

```
.agent/skills/my-skill/
├── SKILL.md          # Main instructions (required)
├── scripts/          # Helper scripts the agent can execute (optional)
├── examples/         # Reference code/implementations the agent can read (optional)
└── resources/        # Templates, configs, and other assets the agent can use (optional)
```

**Optional Folders:**
- `scripts/`: Executable helper scripts. SKILL.md instructs agent to run scripts (e.g., with `--help` flag first)
- `examples/`: Reference implementations, code samples. Agent reads these as examples when following skill instructions
- `resources/`: Templates, configuration files, reference documents. Agent can read and use these as assets when executing skill

Agent can read and reference all files in skill folder when following SKILL.md instructions.

### Activation Pattern

1. **Discovery:** Agent sees skills list with names and descriptions
2. **Activation:** Agent reads full SKILL.md if task appears relevant
3. **Execution:** Agent follows skill instructions

No explicit invocation needed - agent decides based on context.

---

## File Structure Example

```
your-project/
├── .agent/
│   ├── rules/
│   │   ├── agents.md         # CORE WORKSPACE RULES
│   │   ├── typescript.md     # Language-specific rules
│   │   └── testing.md        # Testing rules
│   ├── workflows/
│   │   ├── setup-feature.md
│   │   ├── reset-deps.md
│   │   ├── create-component.md
│   │   └── deploy.md
│   └── skills/
│       ├── code-review/
│       │   └── SKILL.md
│       └── testing-strategy/
│           ├── SKILL.md
│           ├── scripts/
│           └── examples/
```

---

## Additional Examples

### Language-Specific Rules

**`.agent/rules/typescript.md`:**

```markdown
---
trigger: glob
globs: "**/*.ts,**/*.tsx"
---

# TypeScript Rules

- Use strict null checks
- Prefer interfaces over types for object shapes
- Always define return types for functions
- Use const assertions where appropriate
```

### Testing Rules

**`.agent/rules/testing.md`:**

```markdown
---
trigger: model_decision
description: Apply when writing or modifying test files
---

# Testing Standards

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Maintain 80%+ code coverage
```

### Code Review Skill

**`.agent/skills/code-review/SKILL.md`:**

```markdown
---
name: code-review
description: Reviews code changes for bugs, style issues, and best practices. Use when reviewing PRs or checking code quality.
---

# Code Review Skill

When reviewing code, follow these steps:

## Review checklist

1. **Correctness**: Does the code do what it's supposed to?
2. **Edge cases**: Are error conditions handled?
3. **Style**: Does it follow project conventions?
4. **Performance**: Are there obvious inefficiencies?

## How to provide feedback

- Be specific about what needs to change
- Explain why, not just what
- Suggest alternatives when possible
```

---

## Version

Configuration format for Antigravity as of January 2025 (based on official documentation).
