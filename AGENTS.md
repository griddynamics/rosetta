Main goal: cover E2E AI PDLC engineering workflows at foundation level for AI-First SDLC in enterprise.
Top-level or orchestrator agents MUST READ `docs/ARCHITECTURE.md` contains technical details and guidance, and `docs/CONTEXT.md` - business context. Subagents - when needed.
Monorepo with multiple solution components in `src` and golden instructions in `instructions`. R3 is current, R2 is KTLO.
Defines reusable plugins/mcp for AI coding agents (claude code, codex, copilot, cursor, antigravity, etc) which users (engineers, developers) invoke on THEIR target repositories.
`instructions` folder contains AI coding agent **instructions** for another repository (skills, subagents, rules, workflows), it is **not documentation**. 

How it works: 
1. User installs Rosetta plugin(s) xor mcp. 
2. On any user session start: AI Coding Agents load `instructions/r3/core/rules/bootstrap-alwayson.md` and one mode-specific file (`plugin-files-mode.md`, `mcp-files-mode.md`, `local-files-mode.md`).
3. User uses `/` or `$` commands to do his work on his repo with any or all our instructions (skills, subagents, workflows, rules).
