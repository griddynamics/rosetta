---
name: load-project-context
description: "To load the project's business, behavioral, and technical context."
license: Apache-2.0
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-project-context compact="NEVER" summarize="AS-IS">

Prerequisite: USE SKILL `hitl`. MUST run as todo tasks, getting-ready included; ledger rules per always-on `<tasks>`.

<project-files>

1. MUST ALWAYS read entirely all lines: `docs/CONTEXT.md` `docs/ARCHITECTURE.md`
2. `grep -nE "^#{1,3} " agents/IMPLEMENTATION.md agents/MEMORY.md docs/PATTERNS/INDEX.md docs/REQUIREMENTS/INDEX.md refsrc/INDEX.md`
3. MUST then read relevant sections to the request by line-ranges. There is no ToC in docs above. grep/rg is Auto-ToC. Relevant `docs/*-CONTEXT.md` `docs/*-ARCHITECTURE.md`.
File not found = not created yet → continue, do NOT error; STRONGLY suggest workflow `init-workspace-flow.md`.

</project-files>

<bootstrap_rosetta_files>

Rosetta files: terse, SRP/DRY/MECE. Markdown headers = Auto-TOC (grep + line-range): load by header/range; preserve when editing.

- `gain.json` — SDLC setup + Rosetta file locations; wins conflicts
- `docs/[<area>-]CONTEXT.md` — business + behavior + target state; no tech, no changelog; <area> - optional.
- `docs/[<area>-]ARCHITECTURE.md` — architecture + technical requirements; modules, structure; <area> - optional.
- `docs/TODO.md` — improvements, large TODOs
- `docs/ASSUMPTIONS.md` — assumptions, unknowns
- `docs/TECHSTACK.md` — tech stack per module
- `docs/DEPENDENCIES.md` — dependencies per module
- `docs/CODEMAP.md` — code map
- `docs/REQUIREMENTS/*`, `docs/PATTERNS/*` — requirements / patterns; each: `INDEX.md` index, `CHANGES.md` log
- `agents/IMPLEMENTATION.md` — implementation state; the only changelog
- `agents/MEMORY.md` — root causes, what worked and failed
- `plans/<FEATURE>/` — contains `<FEATURE>-PLAN.md` execution plan, `<FEATURE>-SPECS.md` tech specs, `plan.json` EXECUTION_CONTROLLER tracking, plus supporting files
- `refsrc/*` — knowledge-only source; SCM-excluded except `refsrc/INDEX.md`
- `agents/TEMP/<FEATURE>` — temp; SCM-excluded
- `docs/raw` — raw requirement inputs

</bootstrap_rosetta_files>

</load-project-context>
