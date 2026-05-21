# Terminology

- Prompts = `skills`, `agents`, `workflows`, `rules`, `templates`, `commands`
- Agents = agents or subagents

# New Folder Structure

- **Base structure:** `/instructions/r2/core/<type>/<name>/[files]`
  - Types: `skills`, `agents`, `workflows`, `rules`, `commands`
  - Base = Rosetta instruction source
- **Organization-specific customizations:** `/instructions/r2/<org>/<type>/<name>/[files]`
  - Organizations: `acme` (ACME Corp), etc.
  - Organization files extend or override core implementations (layered customization, not multi-tenancy)
- **Resulting ResourcePath:** Strip `/instructions/r2/core/` OR `/instructions/r2/<org>/` prefix
  - Example: `/instructions/r2/core/skills/my-skill/SKILL.md` → `skills/my-skill/SKILL.md`
  - Example: `/instructions/r2/acme/skills/my-skill/SKILL.md` → `skills/my-skill/SKILL.md`
- **Bundling behavior:** Core + Organization files with same ResourcePath get bundled together
  - Optional filtering: INSTRUCTION_ROOT_FILTER env var controls which organizations to include (e.g., `CORE,ACME` includes only base + ACME Corp)
  - Default file sort_order: 1000000 always
  - If there are MORE than 5 files matching, bundler outputs just XML list and instruction to load required files one-by-one
- **Relationships:**
  - Workflows invoke subagents
  - Subagents use skills
  - Workflows, subagents, skills reference rules
  - Templates are part of skills
  - Guardrails are rules
  - All file names are unique, including inside of skills sub-folders (use abbreviation prefix)
  - All file names are lower case, split words with dashes
- **Examples:**
  - `core/skills/<name>/SKILL.md` - Skill definition
  - `core/agents/<name>.md` - Subagent definition
  - `core/workflows/<name>.md` - Workflow template
  - `core/workflows/<name>-<phase>.md` - Workflow phase template
  - `core/rules/<name>.md` - Rules and guardrails
- Automatic path-based tags (all lower case):
  - All parent folder names
  - File name with extension
  - Release (folder name "r0.0", "r1", "r2.1", "r13")
  - Domain (folder under the release folder, such as "core")
  - Two-level (immediate parent folder and file name: "my-skill/SKILL.md")
  - Three-level (immediate parent folder and file name: "skills/my-skill/SKILL.md", "my-skill/references/my-skill-best-practices.md")

# Core Scope

- init.md (onboarding initialization of the repository)
- coding.md (implementation flow)
- adhoc.md (adhoc requests, minor changes)
- help.md (built-in help system => convert to self-help.md)
- all common (guardrails.md, planning.md, questions.md, reasoning.md, techspecs.md)
- agents.md (converted from request classification to execution planning based on recombined matching flow templates)

# How Rosetta MCP uses New Folder Structure

AI agents use Rosetta MCP as a consultant.

Example setup:

```
/CORE      -- THIS IS OSS
   /SKILLS
       /PLANNING
          PROMPT
          TEMPLATE

/GRID      -- GRID DYNAMICS KNOW-HOW
   /SKILLS
       /PLANNING
          PROMPT
          TEMPLATE-OVERRIDE

/ACME  -- CLIENTS GLOBAL CUSTOMIZATIONS
   /SKILLS
       /PLANNING
          PROMPT
```

MCP was requested to provide PLANNING skill.
MCP provides the following logical output:
PROMPT: BUNDLING(/CORE/SKILLS/PLANNING/PROMPT CONCAT /GRID/SKILLS/PLANNING/PROMPT CONCAT /ACME/SKILLS/PLANNING/PROMPT)
TEMPLATE: BUNDLING(/GRID/SKILLS/PLANNING/TEMPLATE-OVERRIDE)
