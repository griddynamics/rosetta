# Terminology

- Prompts = `skills`, `agents`, `workflows`, `rules`, `templates`, `commands`
- Agents = agents or subagents

# New Folder Structure

- Every top-level folder under a release is a library **folder**. One folder exists: `core`. Plugin sets (catalog capability) bundle folders. The earlier split into subject folders is recorded in `docs/REQUIREMENTS/plugin-generator/assets/plugin-sets-split.md`.
- **Base structure:** `/instructions/r3/<folder>/<type>/<name>/[files]`
  - Folders: `core`
  - Types: `skills`, `agents`, `workflows`, `rules`, `templates`
  - Not every folder has every type.
- **Adding your own instructions:** keep them in a customization root with the same layout, `<root>/r3/core/<type>/<name>/[files]`, and build with `--customizations <root>`. Files merge into `core`; `overwrite` replaces. See `docs/ARCHITECTURE.md#instruction-structure`.
- **Resulting ResourcePath:** Strip `/instructions/<release>/<folder>/`
  - Example: `/instructions/r3/core/skills/my-skill/SKILL.md` → `skills/my-skill/SKILL.md`
  - Example: `/instructions/r3/core/skills/qa-knowledge/SKILL.md` → `skills/qa-knowledge/SKILL.md`
- **Bundling behavior:** documents sharing a ResourcePath get bundled together. Filenames are unique across the tree, so this normally returns one document
  - Optional filtering: INSTRUCTION_ROOT_FILTER env var is meant to control which folders are served (e.g., `CORE`). It is parsed but not enforced yet ([#172](https://github.com/griddynamics/rosetta/issues/172)).
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
  - Domain (the set folder under the release folder: "core", "workflows", "qe", "search", "modernization")
  - Two-level (immediate parent folder and file name: "my-skill/SKILL.md")
  - Three-level (immediate parent folder and file name: "skills/my-skill/SKILL.md", "my-skill/references/my-skill-best-practices.md")

# Set Scope

- `core` - composable skills, always-on rules, bootstrap, templates, workspace and help workflows. No agents.
- `workflows` - subagents and the orchestrated workflows that spawn them.
- `qe` - test automation and test generation.
- `search` - Solr and search engineering.
- `modernization` - conversion, upgrade, re-architecture workflows.

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
