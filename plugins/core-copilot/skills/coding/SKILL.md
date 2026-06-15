---
name: coding
description: "To implement features, fix bugs, and refactor with KISS/SOLID/DRY and systematic validation."
license: Apache-2.0
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

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Principles and validation methodology below are canonical — single source of truth; other sections reference, do not restate

Principles:

- KISS, SOLID, SRP, DRY, YAGNI, MECE — always
- Scope creep prevention: apply ONLY what was requested, do not add non-requested features, refactors, or improvements
- Multi-environment: all code MUST be configurable for local, dev, test, production
- Minimal changes: simpler is better
- Zero tolerance: no cheating, no pre-existing excuses, no warnings, no errors. All tests MUST succeed, all code MUST compile (including pre-existing), all requirements MUST be fulfilled — unless user explicitly asks to skip
- SRP for files: each file has single purpose, no duplicate or similar content across files
- MUST ensure data safety per bootstrap guardrails
- IaC (Terraform, Pulumi, CloudFormation, ARM, Bicep, Helm, etc.): MUST follow `assets/iac.md`
- Documentation: ONLY as instructed by rules or user
- Address root cause, if you think you found it, investigate more
- Prefer consistent and reliable solutions
- Use background terminal when starting services to prevent getting stuck, MUST for copilot. If multiple services: write a start and stop shell scripts in SCRIPTS directory, which run services in background, report PIDs and ports, terminates existing processes to prevent port blocking, keep low timeouts 5-15 seconds, output PIDs, logs to AGENTS TEMP folder files.

Project documentation — MUST keep current in target project:
- `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, `DEPENDENCIES.md`, `TECHSTACK.md`, `CODEMAP.md`

Validation methodology:

- Systematic, logical, dependency-ordered: databases (queries/statements) → APIs (curl/similar) → Web (Chrome DevTools/Playwright) → Mobile (Appium/similar), solid foundation first.
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

<implementation_modes>

Two named coding-discipline modes the calling workflow PHASE binds to. The PHASE is SSoT for the in-scope file set, artifact paths, approval-token set, proposed-change template, root-cause source, and iteration cap, and owns the step sequence; this skill applies the discipline below against those bindings — it does not restate the phase's procedure, approval vocabulary, or root-cause analysis.

- **standards-first mode** — before authoring/extending code, read the repository's OWN standards as authority: root canonical docs when present + the closest existing examples in the same framework/layer; repo docs beat model defaults on every conflict (surface + record conflicts); record reference paths (≤6, no large quotes) + extracted rules into the phase artifact. GATE: no readable standards → stop and ask for substitutes; never proceed on model defaults.
- **approved-apply mode** — prepare each fix as a minimal before/after proposal in the phase's template (present, do NOT write); WAIT for explicit approval per the phase's bound token set (never infer from "looks good"/silence/a question); apply approved changes one at a time with lint after each (lint failure → revert/re-prepare, never leave a file broken); honor the in-scope file set + iteration cap; hand off re-verification (exact re-run command; update state without closing the workflow). Each edit's root-cause alignment is sequenced by the workflow's debugging step before apply — not performed here.

</implementation_modes>

<validation_checklist>

- Code compiles without errors or warnings
- All tests pass (including pre-existing)
- Environment configuration works across all targets
- No mock/stub/fake data in dev or prod code paths
- Files stay under 300 LOC
- Impact analysis performed for affected methods and areas
- standards-first mode: at least one repo doc read (or user-confirmed substitute); reference example paths + extracted rules recorded; doc-vs-code conflicts surfaced and resolved
- approved-apply mode: every applied change had explicit approval per the phase's token set; before/after evidence exists; only in-scope files touched; lint clean (or failure resolved); re-run instruction given; state updated without closing the workflow

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
- skill `debugging` — root-cause analysis (the workflow sequences it before approved-apply; not invoked from here)
- skill `hitl` — approval-gate authority for approved-apply mode (not restated here)
- skill `testing` — test quality bar when implementing/extending tests
- skill `planning` — for implementation planning
- skill `tech-specs` — for technical specifications

</resources>

</coding>
