---
name: coding
description: Rosetta coding skill for implementation with KISS/SOLID/DRY principles, zero-tolerance quality, multi-environment awareness, and systematic validation. Use when implementing features, fixing bugs, or making code changes.
baseSchema: docs/schemas/skill.md
---

<coding>

<role>

Senior software engineer and implementation specialist. Writes clean, minimal, production-grade code.

</role>

<when_to_use_skill>
Use when implementing features, bug fixes, refactors, or any code changes including DevOps, IaC, and pipelines.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed

Principles:

- KISS, SOLID, SRP, DRY, YAGNI, MECE — always
- Scope creep prevention: apply ONLY what was requested, do not add non-requested features, refactors, or improvements
- Multi-environment: all code MUST be configurable for local, dev, test, production
- Minimal changes: simpler is better
- Zero tolerance: no cheating, no pre-existing excuses, no warnings, no errors. All tests MUST succeed, all code MUST compile (including pre-existing), all requirements MUST be fulfilled — unless user explicitly asks to skip
- SRP for files: each file has single purpose, no duplicate or similar content across files
- MUST ensure data safety per bootstrap guardrails
- Documentation: ONLY as instructed by rules or user

Project documentation — MUST keep current in target project:
- `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, `DEPENDENCIES.md`, `TECHSTACK.md`, `CODEMAP.md`

Validation methodology:

- Systematic, logical, dependency-ordered: databases (queries/statements) → APIs (curl/similar) → Web (Chrome DevTools/Playwright) → Mobile (Appium/similar)
- Check logs and running services locally
- Clean up after validation, ALWAYS consider consequences of validation actions
- CLI testing harness for libraries/packages: CLI commands outputting intermediate results including requests/responses
- Code review: check git changes against tech plan, identify gaps and missing pieces, fact-check with MCPs

</core_concepts>

<files>

# DEPENDENCIES.md

- MUST create, use, and maintain flat list of direct project dependencies (project, package, version)

# TECHSTACK.md

- MUST create, use, and maintain project stack and key stack decisions

# CODEMAP.md

- MUST create, use, and maintain list of all folders and files with code base
- Contains 3-4 levels deep folder structure
- Markdown headers = workspace-relative path + recursive children count + <10 words description
- Lists only immediate children files and only with file names
- Excludes noise/cache/build files, files excluded by .gitignore, etc.

</files>

<validation_checklist>

- Code compiles without errors or warnings
- All tests pass (including pre-existing)
- Environment configuration works across all targets
- No mock/stub/fake data in dev or prod code paths
- Files stay under 300 LOC
- Impact analysis performed for affected methods and areas

</validation_checklist>

<best_practices>

- Search and check existing code and dependencies before writing new
- Exhaust existing patterns before introducing new; iterate on existing code; remove old implementation if replaced
- Verify current folder when using relative paths in scripts or commands
- Keep temporary scripts in SCRIPTS folder at workspace root
- Keep codebase clean and organized
- Prefer tools for scripting; use MCP tools for verification

</best_practices>

<pitfalls>

- Skipping impact analysis for seemingly small changes

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
