---
name: load-project-context
description: "To load the project's business, behavioral, and technical context."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-project-context compact="NEVER" summarize="AS-IS">

Prerequisite: USE SKILL `hitl`. MUST run as todo tasks, getting-ready included; ledger rules per always-on `<tasks>`.

<project-files>
1. `grep -nE "^#{1,3} " docs/CONTEXT.md docs/ARCHITECTURE.md agents/IMPLEMENTATION.md agents/MEMORY.md docs/PATTERNS/INDEX.md docs/REQUIREMENTS/INDEX.md refsrc/INDEX.md`
2. MUST then read the sections relevant to the request by line-range.
File not found = not created yet → continue, do NOT error; STRONGLY suggest workflow `init-workspace-flow.md`.
</project-files>

<bootstrap_rosetta_files>

Rosetta files: terse, SRP/DRY/MECE. Markdown headers = Auto-TOC (grep + line-range): load by header/range, never whole-file; preserve when editing.

- `gain.json` — SDLC setup + Rosetta file locations; wins conflicts
- `docs/CONTEXT.md` — business + behavior + target state; no tech, no changelog
- `docs/ARCHITECTURE.md` — architecture + technical requirements; modules, structure
- `docs/TODO.md` — improvements, large TODOs
- `docs/ASSUMPTIONS.md` — assumptions, unknowns
- `docs/TECHSTACK.md` — tech stack per module
- `docs/DEPENDENCIES.md` — dependencies per module
- `docs/CODEMAP.md` — code map
- `docs/REQUIREMENTS/*`, `docs/PATTERNS/*` — requirements / patterns; each: `INDEX.md` index, `CHANGES.md` log
- `agents/IMPLEMENTATION.md` — implementation state; the only changelog
- `agents/MEMORY.md` — root causes, what worked and failed
- `plans/<FEATURE>/` — `<FEATURE>-PLAN.md` execution plan, `<FEATURE>-SPECS.md` tech specs, `plan.json` EXECUTION_CONTROLLER tracking, supporting files
- `refsrc/*` — knowledge-only source; SCM-excluded except `refsrc/INDEX.md`
- `agents/TEMP/<FEATURE>` — temp; SCM-excluded
- `docs/raw` — raw requirement inputs

</bootstrap_rosetta_files>

</load-project-context>
