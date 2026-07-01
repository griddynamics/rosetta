<rosetta_overall_flow scope="Applies ONLY to Rosetta prompts itself, user may be authoring for other systems or projects">

This is additional context on how those prompts will be triggered if those prompts are implemented for Rosetta itself.
Rosetta repo names are `rosetta`, `cto-ims-kb`, `RulesOfPower`.
These are not instructions for YOU to follow, you are META prompting engineer understanding this process and designing using it.

# Rosetta Load Procedure

1. User input or subagent input.
2. Bootstrap loads (bootstrap-core-policy.md, bootstrap-execution-policy.md, bootstrap-guardrails.md, bootstrap-hitl-questioning.md, bootstrap-rosetta-files.md) with PREP steps to complete. bootstrap.md (for MCP setup) xor plugin-files-mode.md (for plugins and in-repo standalone) is also injected. AI loads few more skills based on skill description only (usually only 1-2).
3. Prep steps include steps:
   - to load CONTEXT, ARCHITECTURE, GREP headers of other files
   - to list workflows and select the best matching
4. Load respective workflow, subagents, skills, commands, rules, etc.
5. AI coding agent makes a decision, plans execution flow.

The prompts you modify will also start with prep steps, but you must ensure workflows and commands clearly state this dependency!

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
5. Full specs are in `bootstrap-rosetta-files.md`, rely on it, do not repeat, use TERM references:
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

Any file stored inside of `instructions` will be uploaded to Rosetta Server, and will only be available via ACQUIRE/SEARCH/LIST commands maintaining similar folder structure (without CORE/GRID). If you know prefix path prefer listing. The only that will be in context are shells of SKILL (acquires SKILL.md internally), SUBAGENT (acquires agents/<agent>.md). All other references must be wrapped in commands or told to be ACQUIRE'd.

# Rosetta Command Aliases

Rosetta define command aliases so that it works with ALL IDEs/CodingAgents, you must follow it as it is critical requirement:

1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.agent.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
4. `USE SKILL <skill-name>` to use the skill, note skill is matching name of SKILL.md frontmatter. skill folder name must match that skill name, no .md extension!
5. `INVOKE SUBAGENT <agent-name>` to call or execute subagent, no .md extension!
6. `USE FLOW <flow-name>` to use a workflow or command, no .md extension!
7. `ACQUIRE <file[.md]> ABOUT <PROJECT>` to read project-scoped documentation, PROJECT is a repository name with fallback to logical project name
8. `QUERY <KEYWORDS> IN <PROJECT>` to search project documentation by keywords
9. `STORE <file[.md]> TO <PROJECT>` to create or update a file in project documentation

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
- **Classification-First** - Clear and simple request classification with easy extensibility
- **Hierarchical Structure** - Prompts organized in layers (bootstrap → classification → domain-specific)
- **Single-Command Onboarding** - Automated setup with version control and easy upgrades
- **Feature Alignment** - Adopts to agent-specific features (rules in Cursor, subagents in Claude Code) and simulates missing features

</rosetta_overall_flow>
