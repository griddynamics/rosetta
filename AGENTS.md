Main goal: cover E2E AI PDLC engineering workflows at foundation level for AI-First SDLC in enterprise.
Context files. Top-level and orchestrator agents MUST READ `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` in full. Subagents read the sections their task touches. Read an area file when the task touches that area. Sections listed below; keep them in sync when headers change.
- `docs/CONTEXT.md`: business purpose, users, requirements, target state; read before any product or scope decision. Why Rosetta Exists · What Rosetta Is · Value Delivery (engineers, managers, directors, VPs) · Business Requirements (speed, simplicity, scale, governance, quality) · Domain and Operating Context · Target State · Edition · Design Philosophy
- `docs/ARCHITECTURE.md`: structure, components, build and release rules; read before any change in `src/`, `instructions/`, `plugins/` or `.github/`. Two Repositories · System Overview · Key Principles · Command Aliases · Bootstrap Flow · Versioning · Rosettify · Rosettify Prompts · Curiocity · Instruction Structure · Workspace Files · Plugin Delivery Flow · Development (Prerequisites, Plugins, Hooks Runtime) · Pipelines · Extension Points · Tradeoffs
- `docs/MCP-ARCHITECTURE.md`: read when the task touches `rosetta-mcp`, RAGFlow, `rosetta-cli`, OAuth, Redis or VFS/tags. System Overview · Rosetta MCP Server · Environments · RAGFlow · Rosetta CLI · Authentication · Redis Schema Migrations · VFS and Tags · MCP Tools · Bundler · Listing · Context Overflow Prevention · MCP Delivery Flow · Development · Tradeoffs
- `docs/MCP-CONTEXT.md`: read when the task concerns self-hosted MCP adoption or its data handling. When You Need This · Opt-In Features and Data Responsibility · Value Delivery Specific to Self-Hosted MCP
- `docs/AUTOMATION-ARCHITECTURE.md`: read when the task touches the board pipelines (`repo-analysis`, `repo-plan`, `repo-implement`, `repo-triage` workflows). Status lanes · Why the lanes are shaped this way · Debounce before claiming · The two gates are the user's · Priority · coding-flow is split across the two runs · Agent switch · Headless constraints these pipelines must respect · Failure is loud · Terminal states · Pushing workflow files · Scoping a run · Triggers
Monorepo with multiple solution components in `src` and golden instructions in `instructions`. R3 is current, R2 is KTLO.
Defines reusable plugins/mcp for AI coding agents (claude code, codex, copilot, cursor, antigravity, etc) which users (engineers, developers) invoke on THEIR target repositories.
`instructions` folder contains AI coding agent **instructions** for another repository (skills, subagents, rules, workflows), it is **not documentation**. 

How it works: 
1. User installs Rosetta plugin(s) xor mcp. 
2. On any user session start: AI Coding Agents load `instructions/r3/core/rules/bootstrap-alwayson.md` and one mode-specific file (`plugin-files-mode.md`, `mcp-files-mode.md`, `local-files-mode.md`).
3. User uses `/` or `$` commands to do his work on his repo with any or all our instructions (skills, subagents, workflows, rules).

Bump versions for changes in `src` folder if not bumped already, prefer patch increase (`scripts/bump_versions.sh`).
