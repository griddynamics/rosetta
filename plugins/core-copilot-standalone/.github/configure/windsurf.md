---
name: windsurf
description: Windsurf supports custom rules, workflows, commands, and skills through repository-committed configuration files that configure Cascade AI agent.
---

# Windsurf - Commands, Skills, Rules, Workflows Configuration Guide - 2024

## Overview

Windsurf supports custom configuration through repository-committed files. These files configure Cascade (Windsurf's AI agent).

**Configuration Locations:**
- `AGENTS.md` - Cascade behavior instructions
- `.windsurf/rules/` - Path-specific rules for Cascade
- `.windsurf/commands/` - Slash commands for Cascade
- `.windsurf/workflows/` - Automation workflows for Cascade
- `.windsurf/skills/` - Multi-step tasks with supporting resources

---

## Agent Configuration File (AGENTS.md)

**Location:** `AGENTS.md` (project root)

**File Format:** Markdown

**Purpose:** Define Cascade behavior and core project instructions

### Example AGENTS.md File

`AGENTS.md`:

```markdown
# Project Agent Instructions

## Tech Stack
- Next.js 14 with App Router
- TypeScript strict mode
- Prisma ORM with PostgreSQL
- Tailwind CSS for styling

## Code Standards
- Use server components by default
- Client components only for interactivity
- Follow Container/Presenter pattern
- 80% test coverage minimum

## Testing Requirements
- Jest for unit tests
- Playwright for E2E tests
- Mock external dependencies
```

---

## Path-Specific Rules

Rules that apply only to specific file patterns.

**Location:** `.windsurf/rules/`

**File Format:** Markdown with optional YAML frontmatter

**Auto-Loading:** All `.md` files in `.windsurf/rules/` automatically load

### Creating Rules

1. **Create Rules Directory:**
   ```bash
   mkdir -p .windsurf/rules
   ```

2. **Add Rule Files:**
   - Create `.md` file for each rule
   - Optional frontmatter with `paths` glob pattern
   - Rules without `paths` apply to all files

### Example Rule Files

**`.windsurf/rules/typescript.md`:**

```markdown
---
paths: **/*.ts, **/*.tsx
---

# TypeScript Rules

- Use strict mode
- Prefer interfaces over type aliases
- Always define function return types
- Use const assertions where applicable
```

**`.windsurf/rules/react.md`:**

```markdown
---
paths: src/components/**/*.tsx
---

# React Component Rules

- Functional components with hooks only
- Extract complex logic into custom hooks
- Keep components under 200 lines
- Use TypeScript for all props and state
```

**`.windsurf/rules/api.md`:**

```markdown
---
paths: src/api/**/*.ts, app/api/**/*.ts
---

# API Route Rules

- Validate all requests using Zod schemas
- Return consistent error responses
- Use middleware for authentication
- Log all API requests with request ID
```

### Rule File Structure

**YAML Frontmatter:**
- `paths`: Comma-separated glob patterns (NOT YAML array)
  - Example: `**/*.ts, **/*.tsx`
  - Example: `src/components/**/*.tsx`

**⚠️ CRITICAL: Paths format must be comma-separated, NOT YAML array**

```markdown
---
# Correct
paths: **/*.ts, **/*.tsx

# Wrong - do not use
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
```

**Content:**
- Markdown-formatted rules
- Applies only to files matching `paths` pattern
- Rules without `paths` frontmatter apply to all files

---

## Custom Slash Commands

Reusable prompts invoked with `/command-name`.

**Location:** `.windsurf/commands/`

**File Format:** Markdown with optional YAML frontmatter

**Invocation:** `/filename` (without `.md` extension)

### Creating Commands

1. **Create Commands Directory:**
   ```bash
   mkdir -p .windsurf/commands
   ```

2. **Add Command Files:**
   - Create `.md` file for each command
   - Filename becomes command name
   - Optional frontmatter for configuration

### Example Command Files

**`.windsurf/commands/review.md`:**

```markdown
---
description: Comprehensive code review for quality, security, and best practices
allowed-tools: Bash(git diff:*), Bash(git status:*)
model: claude-3-5-sonnet-20241022
---

# Code Review

Perform comprehensive code review:

## Current Changes
!`git diff HEAD`

## Review Criteria

### Code Quality
- Readability and clarity
- Proper naming conventions
- DRY principle adherence
- Function/file size limits

### Security
- Input validation
- SQL injection prevention
- XSS vulnerabilities
- Exposed secrets

### Performance
- Algorithmic efficiency
- Database query optimization
- Unnecessary computations

### Testing
- Test coverage
- Edge cases handled

Provide specific feedback with line numbers and actionable suggestions.
```

**`.windsurf/commands/test.md`:**

```markdown
---
description: Generate comprehensive unit tests for selected code
model: claude-3-5-sonnet-20241022
---

# Test Generation

Generate comprehensive unit tests for the selected code:

- Test all public methods and functions
- Include edge cases and error scenarios
- Follow project testing framework conventions
- Aim for 80%+ code coverage
- Use descriptive test names

Use appropriate mocking for external dependencies.
```

**`.windsurf/commands/deploy.md`:**

```markdown
---
description: Deploy application with validation and verification
allowed-tools: Bash(npm:*), Bash(git:*)
argument-hint: [environment]
---

# Deploy Application

Deploy to $1 environment:

1. Verify git status is clean
2. Run tests to ensure passing
3. Build production bundle
4. Deploy to $1
5. Verify deployment health checks

Report any failures with detailed error messages.
```

### Command Configuration Fields

**YAML Frontmatter:**
- `description`: Command description (optional)
- `allowed-tools`: Bash commands allowed - format: `Bash(command:*)`
- `model`: Specific model to use (optional)
- `argument-hint`: Hint for expected arguments (optional)

**Content:**
- Instructions for agent to execute
- Use `$1`, `$2`, `$3` for positional arguments
- Use `$ARGUMENTS` for all arguments as string
- Use `!`command`` to execute bash commands (must be in allowed-tools)

### Using Commands

**Invocation:**
- Type `/command-name` to invoke command
- With arguments: `/deploy production`

**Example:**
```
You: /review
Agent: [Executes code review on current changes]

You: /test
Agent: [Generates tests for selected code]

You: /deploy staging
Agent: [Deploys to staging environment]
```

---

## Workflows

Automation workflows for multi-step tasks.

**Location:** `.windsurf/workflows/`

**File Format:** Markdown with YAML frontmatter

### Creating Workflows

1. **Create Workflows Directory:**
   ```bash
   mkdir -p .windsurf/workflows
   ```

2. **Add Workflow Files:**
   - Create `.md` file for each workflow
   - YAML frontmatter with `description` required

### Example Workflow Files

**`.windsurf/workflows/setup.md`:**

```markdown
---
description: Setup development environment for new developers
---

1. Install dependencies
2. Setup environment variables
3. Initialize database
4. Run migrations
5. Seed test data
6. Run tests to verify setup
```

**`.windsurf/workflows/deploy.md`:**

```markdown
---
description: Deploy application to production with full validation
---

1. Run full test suite
2. Build production bundle
3. Run security scan
4. Deploy to production
5. Run smoke tests
6. Verify monitoring and alerts
```

### Workflow Structure

**YAML Frontmatter:**
- `description`: Required. Workflow description

**Content:**
- Step-by-step instructions
- Agent executes sequentially

---

## Skills

Multi-step tasks with supporting resources. Skills are folder-based with `SKILL.md` file.

**Location:** `.windsurf/skills/<skill-name>/`

**Invocation:** Automatic (progressive disclosure) or `@skill-name`

### Skill Structure

```
.windsurf/skills/<skill-name>/
├── SKILL.md                    # Required
└── <supporting-files>          # Optional: templates, checklists, scripts, configs, references
```

### SKILL.md Format

**YAML Frontmatter (Required):**

| Field | Required | Format | Purpose |
|-------|----------|--------|---------|
| `name` | Yes | lowercase-with-hyphens | Unique identifier |
| `description` | Yes | Brief sentence | Auto-invocation matching |

**Markdown Content:**
- Instructions for the workflow
- References to supporting files: `[file.md](./file.md)`
- No specific structure required

**Example:**
```markdown
---
name: my-skill-name
description: Brief description for auto-invocation
---

# Instructions content here
```

### Naming Rules

**Valid:** `my-skill`, `test-automation`, `setup-env`  
**Invalid:** `MySkill`, `my_skill`, `my skill`

**Reference:** https://docs.windsurf.com/windsurf/cascade/skills

---

## File Structure Example

```
your-project/
├── AGENTS.md                    # Agent behavior
└── .windsurf/
    ├── rules/
    │   ├── typescript.md
    │   ├── react.md
    │   └── api.md
    ├── commands/
    │   ├── review.md
    │   ├── test.md
    │   └── deploy.md
    ├── workflows/
    │   ├── setup.md
    │   └── deploy.md
    └── skills/
        ├── deploy-production/
        │   ├── SKILL.md
        │   ├── deployment-checklist.md
        │   ├── rollback-steps.md
        │   └── environment-template.env
        └── code-review/
            ├── SKILL.md
            ├── security-checklist.md
            └── review-template.md
```

---

## Configuration Rules

1. **Create `AGENTS.md` first** - Foundation for Cascade behavior
2. **All rules auto-load** - All `.md` files in `.windsurf/rules/` automatically apply to Cascade
3. **Command = filename** - `review.md` becomes `/review` in Cascade
4. **Paths use commas** - `paths: **/*.ts, **/*.tsx` (NOT YAML array syntax)
5. **Workflows require description** - Frontmatter with `description` field required
6. **Skills use folders** - Each skill = folder with `SKILL.md` + supporting files
7. **Skills require name+description** - YAML frontmatter with both fields mandatory
8. **Commit to repository** - Share configuration via version control

---

## Additional Resources

- [Windsurf Documentation](https://docs.windsurf.com)
- [Windsurf Directory](https://windsurf.ai/directory)

---

## Version

Configuration format for Windsurf as of December 2024.

