---
name: jetbrains-junie
description: JetBrains IDEs AI Assistant and Junie configuration guide for rules, commands, and MCP integration.
---

# JetBrains IDEs - Two AI Tools: AI Assistant (Rules) & Junie (Rules, Commands, MCP) - Configuration Guide - 2026

## Overview

JetBrains IDEs (IntelliJ IDEA, PyCharm, WebStorm, Rider, Goland, etc.) offer two AI tools (and BOTH must be configured):

1. **AI Assistant** - Day-to-day coding support, chat, refactoring
2. **Junie** - Autonomous AI coding agent for complex task delegation

**Configuration locations:**
- AI Assistant: `.aiassistant/rules/*.md` (Markdown with YAML frontmatter)
- Junie: `.junie/guidelines.md` (Plain Markdown, no frontmatter)

---

## Core Files Pattern

### Two Core Agent Files

When using both tools, maintain **TWO core files** that serve as root agent rules:

1. **`.aiassistant/rules/agents.md`** - AI Assistant CORE rule (apply: always), always included.
2. **`.junie/guidelines.md`** - Junie CORE rule (this always applies), always included.

**CRITICAL:** BOTH CORE rules must be updated identically and contain very similar instructions

### Chaining References Pattern

**CRITICAL:** Core files **MUST NOT** duplicate rules. Instead, they **MUST** contain **chaining references** to other rule files using **MoSCoW prioritization**.

**Example reference in `.junie/guidelines.md`:**
```markdown
- **MUST** use `.aiassistant/rules/[rule-file-name].md` for [specific context]
```

This is an example. You **MUST** use MoSCoW (MUST/SHOULD/COULD/WON'T) in all references.

---

## Junie Configuration

### Location

**File:** `.junie/guidelines.md` (project root)

### Format Requirements

**CRITICAL:** Follow the format **EXACTLY**. Do NOT convert to:
- YAML arrays
- Square brackets syntax
- Different line breaks or indentation

Use plain Markdown format as shown below.

### Structure Example

```markdown
# Junie Guidelines

## AI Assistant Rules Integration (MoSCoW Prioritization)

Must include coding rules AND implementation flow in the core set of rules in the beginning.

This project uses both Junie and AI Assistant. Follow rules in `.aiassistant/rules/` with priorities:

### MUST (Required - Always Enforce)
- **MUST** follow all rules in `.aiassistant/rules/agents.md`
- **MUST** use `.aiassistant/rules/[rule-file-1].md` for [context-1]
- **MUST** use `.aiassistant/rules/[rule-file-2].md` for [context-2]

### SHOULD (Important - Strongly Recommended)
- **SHOULD** use `.aiassistant/rules/[rule-file-3].md` for [context-3]
- **SHOULD** use `.aiassistant/rules/[rule-file-4].md` for [context-4]

### COULD (Optional - Apply When Appropriate)
- **COULD** use `.aiassistant/rules/[rule-file-5].md` for [context-5]

### WON'T (Explicitly Excluded)
- **WON'T** apply `.aiassistant/rules/[rule-file-6].md` (reason)

[The rest of the core rules content]
```

**Replace:**
- `[rule-file-N]` with actual rule file names
- `[context-N]` with when/where to apply the rule

---

## Junie Commands Configuration

### Location

**Directory:** `.junie/commands/` (project root)

### Format Requirements

Each custom command is a separate Markdown file with YAML front matter.

**File naming:** `command-name.md` (e.g., `explain.md` for `/explain` command)

### Structure Example

```markdown
---
description: Explains code in a given file
---
Explain the code in $file and suggest improvements.
```

### Variables

Commands support variables in prompts:
- `$file` - File path argument
- `$selection` - Selected code
- Other custom variables as needed

### Usage

1. Create `.junie/commands/explain.md` with the format above
2. Use in Junie: `/explain file=src/main.kt`
3. Commit to version control for team sharing

**Note:** User-global commands can be stored in `~/.junie/commands/` but are not project-specific.

---

## AI Assistant Configuration

### Location

**Directory:** `.aiassistant/rules/`

### Format Requirements

**CRITICAL:** Follow YAML frontmatter format **EXACTLY**. Do NOT modify the frontmatter structure.

### Root Core Rule

**File:** `.aiassistant/rules/agents.md`

**Required frontmatter:**
```markdown
---
apply: always
---
```

### Root Rule Structure Example

```markdown
---
apply: always
---

# Project Agents Rule

## Bootstrap Instructions
[Bootstrap content]

## KnowledgeBase Sync
[Sync instructions]

## Core Project Guidelines
[Core guidelines]

## Rule File References (MoSCoW Prioritization)

This project uses multiple rule files. Apply them as follows:

- **MUST** use `.aiassistant/rules/[rule-file-1].md` for [context-1]
- **SHOULD** use `.aiassistant/rules/[rule-file-2].md` for [context-2]
- **COULD** use `.aiassistant/rules/[rule-file-3].md` for [context-3]

[The rest of the core rules content]
```

## Junie Integration

This project also uses Junie AI agent. The Junie configuration is in `.junie/guidelines.md` and it references the rules in `.aiassistant/rules/` with MoSCoW prioritization.

### Additional Rule Files

**Apply Types:**

**Always:**
```markdown
---
apply: always
---

# [Rule content]
```

**By File Patterns:**
```markdown
---
apply: by file patterns
patterns: **/*.ts, **/*.tsx
---

# [Rule content]
```

**By Model Decision:**
```markdown
---
apply: by model decision
instructions: [Instruction for when to apply]
---

# [Rule content]
```

**Manual:**
```markdown
---
apply: manually
---

# [Rule content]
```

**Format rules:**
- Patterns: comma-separated, use glob syntax
- Do NOT use YAML arrays `[...]` for patterns
- Use exact format: `patterns: **/*.ts, **/*.tsx`

---

## File Structure

### Both Tools

```
project-root/
├── .junie/
│   ├── guidelines.md              # Junie core (references .aiassistant/rules/)
│   ├── commands/                  # Junie custom slash commands
│   │   ├── [command-1].md         # Custom command
│   │   └── [command-n].md         # Custom command
│   └── mcp/
│       └── mcp.json               # MCP server configuration
├── .aiassistant/
│   └── rules/
│       ├── agents.md              # AI Assistant core (references other rules)
│       ├── [rule-file-1].md       # Specific rule
│       ├── [rule-file-2].md       # Specific rule
│       └── [rule-file-n].md       # Specific rule
└── .aiignore                      # Optional: exclude files
```

---

## Key Requirements

### Use Both Tools

1. **Authoritative Source:** AI Assistant rules (`.aiassistant/rules/`) are authoritative
2. **Mandatory Cross-Reference:** `.junie/guidelines.md` **MUST** reference AI Assistant rules
3. **MoSCoW Required:** All references **MUST** use MoSCoW prioritization
4. **No Duplication:** Do NOT duplicate rules - use chaining references
5. **Format Compliance:** Follow formats **EXACTLY** - no conversions
6. Use MoSCoW prioritization in all references with context

---

## AI Actions / Commands

AI Actions are IDE settings only (not project files). They support variables:

- `$SELECTION` - Currently selected code
- `$FILE` - Current file path or content
- `$GIT_BRANCH_NAME` - Current Git branch name

Cannot be managed via project files.

---

## Additional Resources

### Junie

- [Official Documentation](https://www.jetbrains.com/help/junie/customize-guidelines.html)
- [Community Guidelines](https://github.com/JetBrains/junie-guidelines)
- [JetBrains Guide](https://www.jetbrains.com/guide/ai/article/junie/)
- [Custom Commands Reference](https://junie.jetbrains.com/docs/junie-cli-usage.html#custom-slash-commands)

### AI Assistant

- [Configure Project Rules](https://www.jetbrains.com/help/ai-assistant/configure-project-rules.html)
- [Prompt Library](https://www.jetbrains.com/help/ai-assistant/prompt-library.html)
- [Installation Guide](https://www.jetbrains.com/help/ai-assistant/installation-guide-ai-assistant.html)
