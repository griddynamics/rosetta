---
name: coding
description: "Implement features, fix bugs, and refactor code with environment-aware configuration (local/dev/test/prod), dependency-ordered validation (databases → APIs → browser → mobile), and project documentation updates. Use when making code changes in a Rosetta-managed workspace, including application code, DevOps scripts, or CI/CD pipelines."
baseSchema: docs/schemas/skill.md
---

<coding>

<role>

Senior software engineer and implementation specialist. Writes clean, minimal, production-grade code.

</role>

<when_to_use_skill>

Use when implementing features, fixing bugs, refactoring code, updating DevOps scripts, or modifying CI/CD pipelines in a Rosetta-managed workspace. Also use for code review, impact analysis, and validation of existing changes.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Apply minimal, scope-limited changes — no unrequested features, refactors, or improvements
- All code MUST be configurable for local, dev, test, and production environments
- Zero tolerance: all tests MUST pass, all code MUST compile, all requirements MUST be fulfilled — unless user explicitly asks to skip
- Each file has a single purpose — no duplicate or similar content across files
- MUST ensure data safety per bootstrap guardrails
- Documentation: ONLY as instructed by rules or user

</core_concepts>

<process>

## Implementation workflow

1. **Load context** — run load-context skill; read `CONTEXT.md`, `ARCHITECTURE.md`, `CODEMAP.md`
2. **Analyse impact** — identify affected methods, files, and downstream dependencies; check existing code and patterns before writing new
3. **Implement changes** — exhaust existing patterns before introducing new; remove old implementation if replaced; keep files under 300 LOC
4. **Validate** — follow dependency order:
   - Databases: run queries/statements, verify schema changes
   - APIs: `curl` or equivalent against local endpoints
   - Browser: use Playwright MCP or Chrome DevTools MCP
   - Mobile: use Appium or similar
   - Check logs and running services; clean up after validation
5. **Review** — diff git changes against tech plan, identify gaps, fact-check with MCPs
6. **Update docs** — keep current: `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, `DEPENDENCIES.md`, `TECHSTACK.md`, `CODEMAP.md`

If validation fails → diagnose root cause using skill `debugging` → fix → re-validate from step 4.

</process>

<files>

# DEPENDENCIES.md

- Flat list of direct project dependencies (project, package, version)

# TECHSTACK.md

- Project stack and key stack decisions

# CODEMAP.md

- 3-4 levels deep folder structure
- Markdown headers = workspace-relative path + recursive children count + <10 words description
- Lists only immediate children files by name
- Excludes noise/cache/build files and .gitignore entries

</files>

<validation_checklist>

- Code compiles without errors or warnings
- All tests pass (including pre-existing)
- Environment configuration works across local, dev, test, production
- No mock/stub/fake data in dev or prod code paths
- Files stay under 300 LOC
- Impact analysis performed for affected methods and areas

</validation_checklist>

<pitfalls>

- Skipping impact analysis for seemingly small changes — a one-line fix can break callers
- Introducing new patterns when existing codebase patterns already solve the problem
- Forgetting to validate across all target environments after changes
- Using relative paths in scripts without verifying current working directory

</pitfalls>

<resources>

- MCP `Context7` — library documentation
- MCP `DeepWiki` — external documentation and knowledge
- MCP `Playwright` — browser testing and validation
- MCP `Chrome-DevTools` — browser debugging and inspection
- MCP `GitNexus` — codebase knowledge graph
- MCP `Serena` — semantic code retrieval at symbol level
- skill `debugging` — for issues during implementation
- skill `planning` — for implementation planning
- skill `tech-specs` — for technical specifications

</resources>

</coding>
