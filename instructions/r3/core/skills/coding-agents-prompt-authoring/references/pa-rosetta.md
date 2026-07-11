<rosetta_overall_flow scope="Applies ONLY to Rosetta prompts itself, user may be authoring for other systems or projects">

This is additional context on how those prompts will be triggered if those prompts are implemented for Rosetta itself.
Rosetta repo names are `rosetta`, `cto-ims-kb`, `RulesOfPower`.
These are not instructions for YOU to follow, you are META prompting engineer understanding this process and designing using it.

# Rosetta Load Procedure

1. User input starts a top-agent session.
2. Minimal `bootstrap-alwayson.md` + exactly one mode file is active: `mcp-files-mode.md` xor `plugin-files-mode.md` xor `local-files-mode.md`.
3. Execute `Rosetta Prep Steps` once per session, as bound by that mode file:
   - MCP: `get_context_instructions` (blocking) → USE SKILL `load-project-context` → USE SKILL `hitl`
   - Plugin: USE SKILL `load-project-context` → USE SKILL `hitl` (`bootstrap-alwayson.md` auto-loaded)
   - Local: read `bootstrap-alwayson.md` → USE SKILL `load-project-context` → USE SKILL `hitl`
4. The user chooses the entry: plain request → lean path; `/rosetta` → classify and route through `rosetta`; `/<workflow>` → invoke that workflow directly and bypass `rosetta`.
5. Load only the selected skills, workflow, phases, subagents, rules, and templates; built-in todo tasks track execution.

Rosetta workflows and commands MUST declare `Rosetta Prep Steps` as a prerequisite without restating or renumbering them.

Spawned subagents do NOT run this startup chain: they start with only `bootstrap-alwayson.md` + the orchestrator's dispatch prompt, MUST USE SKILL `subagent-directives`, and load `load-project-context` or other skills only when the prompt requires them.

# Instructions Folder Structure and Canonical Lists

Instructions folder structure is defined in `docs/definitions/folder-structure.md`.

Must check canonical lists of workflows, templates, subagents, skills, rules Rosetta has or to be implemented (you must use them as if those are already exist):

- `docs/definitions/workflows.md`
- `docs/definitions/templates.md`
- `docs/definitions/agents.md`
- `docs/definitions/skills.md`
- `docs/definitions/rules.md`

This list above defines what should be what, you must read it.

Rosetta runs with AI coding agents on top of target repository. All rosetta prompts are coding-agent-agnostic.

Rosetta uses the following folders on target repository:

1. `docs` - all repo documentation (must be present)
2. `docs/REQUIREMENTS` - requirements (may be missing)
3. `agents` - agents memory, including implementation, state files, etc. Use sub-folders `agents/<FEATURE>` if multiple files are needed.
4. `plans` - planning, specs, briefs, intake forms, intermediate results, analytics, and similar artifacts. Use sub-folders `plans/<FEATURE>`. Define exact non-template-based file names in this subfolder.
5. Full specs are in SKILL `load-project-context` (`<bootstrap_rosetta_files>`); rely on it, do not repeat, use TERM references:
   - `docs/CONTEXT.md` => `CONTEXT.md`
   - `docs/ARCHITECTURE.md` => `ARCHITECTURE.md`
   - `docs/REVIEW.md` => `REVIEW.md`
   - `docs/ASSUMPTIONS.md` => `ASSUMPTIONS.md`
   - `docs/TECHSTACK.md` => `TECHSTACK.md`
   - `docs/DEPENDENCIES.md` => `DEPENDENCIES.md`
   - `docs/CODEMAP.md` => `CODEMAP.md`
   - `agents/IMPLEMENTATION.md` => `IMPLEMENTATION.md`
   - `agents/MEMORY.md` => `AGENT MEMORY.md`
   - `plans/<FEATURE>/` or `plans/<FEATURE>/<file>` => `FEATURE PLAN folder`
   - `agents/TEMP/` => `TEMP folder`
   - `agents/TEMP/<FEATURE>/` => `FEATURE TEMP folder`
   - `docs/REQUIREMENTS/` => `REQUIREMENTS`
   - `docs/PATTERNS/` => `PATTERNS`
   - `docs/raw/` => `RAW DOCS`
   - `refsrc/` => `refsrc`

Rosetta definitions policy:

- Applies only to Rosetta prompts
- Use names from `docs/definitions/*.md`
- Missing name: ask explicit user question
- Do not auto-add out-of-list items
- Reference prompts by logical name only
- Do not explain referenced prompt internals
- Use mandatory wording for required behavior
- Avoid optional qualifiers for required behavior

Any file stored inside of `instructions` will be uploaded to Rosetta Server, and will only be available via the typed command aliases below, maintaining similar folder structure (without CORE/GRID). If you know the folder, prefer LIST. The only files in context are shells of SKILL (loads SKILL.md internally), SUBAGENT (loads agents/<agent>.md); shells are MCP-only copy-paste proxies and keep the raw `MUST ACQUIRE … FROM KB` form internally. All other (authored) references must use the typed aliases.

# Rosetta Command Aliases

Rosetta defines command aliases so that it works with ALL IDEs/CodingAgents. In plugin mode they need NO mapping — typed aliases operate natively on the plugin files; the MCP (`mcp-files-mode.md`) and local (`local-files-mode.md`) mode files map each alias to their mechanisms. You must follow it as it is critical requirement. Verbs: `READ` = load into context, no execution · `APPLY` = load + FULLY execute · `USE`/`INVOKE` = activate typed artifact. Plural = plural noun + comma list (`READ RULES a.md, b.md`); `APPLY PHASES` forbidden — phases are one-at-a-time. The set below is CLOSED — never invent aliases outside it:

1. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension! `READ SKILL <skill-name>` loads it without executing (e.g. to install a copy).
2. `USE FLOW <flow-name>.md` to use a workflow or command, full filename with .md! `READ FLOW <flow-name>.md` loads it without executing (e.g. to browse/advise).
3. `INVOKE SUBAGENT <agent-name>` to call or execute subagent, no .md extension! `READ SUBAGENT <agent-name>` loads the definition only.
4. `APPLY PHASE <file>.md` to load + FULLY execute the next phase body of a running workflow. Filename only, never a folder path.
5. `READ RULE <file>.md` / `APPLY RULE <file>.md` to load / load+execute a rule. Full filename with .md.
6. `READ TEMPLATE <file>.md` to load a template.
7. `READ CONFIGURE <tool>.md` to load an IDE/CodingAgent configure spec.
8. `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` for a file of the CURRENT skill (`assets/…`, `references/…`). NEVER carries a skill name — only a skill's own files may use it; any other artifact expresses intent ("run validation using the `X` skill's rubric") and lets the skill route (skill isolation is grammar-enforced). Cross-skill resolution: NEVER name another skill's internal files or paths (file names change) — express intent with the typed alias plus the topic keywords the target skill routes on: `USE SKILL \`solr-extending\` to apply plugin wiring`, never `solr-extending/references/06-plugin-wiring.md`.
9. `LIST <folder>` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing when you know the folder in advance.

Project-scoped verbs (`ACQUIRE … ABOUT`, `QUERY … IN`, `STORE … TO`) are NOT part of the contract — never author them (dropped: security/privacy; a separate plugin will own project datasets).

# Rosetta Principles

- **Security, Quality, and Reliability** - top priority, if user can rely on it - it will delegate, if not - nothing else matters
- **Progressive Disclosure** - Instructions load progressively to prevent context overflow and guarantee proper execution
- **Process Enforcement** - AI has tendency to skip steps, ignore items in bulleted lists, AI does not know what it fails with, AI knows a lot but it NEVER follows its own knowledge => define and enforce meta-processes for AI to follow to address issues and mistakes (examples: *in-depth* discovery, *review* after authoring, *read* business and technical context, provide steps one-by-one, subagent orchestration, etc)
- **Meta-Prompting** - Automatically adapts prompts and rules to project-specific needs by providing aspects of thinking, best practices, meta processes engineering, and areas for AI to figure out first, fill the template, and then use that information to resolve actual user task
- **Reverse Prompting** - Make AI to figure out information itself via discovery of code base, web searches, ask from user, etc (instead of making user to provide full specs upfront)
- **Tell How to think, not what to do** - Hardcoding tools, prompts, tech stack, solutions, etc is a wrong path => instead make AI to think and provide proper reasoning aspects
- **Scope control** - Pass original intent with Q&A, architecture brief, current context of execution and the task to phases and subagents
- **Agent-Agnostic** - Works across Cursor, Claude Code, GitHub Copilot, JetBrains AI, and any MCP-compatible IDE
- **Evidence-Based** - Tackles hallucinations with required references, assumptions documentation, and unknowns tracking
- **User-Invoked Rigor** - Classify and route only `/rosetta`; plain requests legitimately stay lean
- **Hierarchical Structure** - Minimal bootstrap → on-demand skills → user-selected workflow/domain process
- **Single-Command Onboarding** - Automated setup with version control and easy upgrades
- **Feature Alignment** - Adopts to agent-specific features (rules in Cursor, subagents in Claude Code) and simulates missing features

</rosetta_overall_flow>
