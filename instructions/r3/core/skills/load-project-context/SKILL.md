---
name: load-project-context
description: "To load the project's business, behavioral, and technical context."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-project-context compact="NEVER" summarize="AS-IS">

<prerequisites>
- USE SKILL `hitl`
</prerequisites>

<tasks>
Tasks = execution ledger — survives dropped steps & compaction.
MUST run as todo tasks — getting-ready included:
- list up front · one `in_progress` · close before next · never skip
- re-read to resume · update as facts surface
- close on evidence, not assumption (coded ≠ done)
</tasks>

<project-files>
1. `echo "=== docs/CONTEXT.md ==="; cat docs/CONTEXT.md; echo "=== docs/ARCHITECTURE.md ==="; cat docs/ARCHITECTURE.md`
2. `grep -nE "^#{1,3} " agents/IMPLEMENTATION.md agents/MEMORY.md docs/PATTERNS/INDEX.md docs/REQUIREMENTS/INDEX.md refsrc/INDEX.md`
Prefer built-in tools over bash where available.
</project-files>

<troubleshooting>
File not found — it does not exist yet. Continue, do NOT error; STRONGLY suggest workflow `init-workspace-flow.md`.
</troubleshooting>

<bootstrap_rosetta_files>

Rosetta files load in context: SRP/DRY/MECE, terse; md headers give grep + line-range loading (Auto-TOC) — read by header/range, not whole-file, and preserve that property when editing.

- `gain.json` — SDLC setup + Rosetta file locations; wins conflicts.
- `docs/CONTEXT.md` — business + behavior + target state; no tech, no changelog.
- `docs/ARCHITECTURE.md` — architecture + technical requirements; modules, structure.
- `docs/TODO.md` — improvements, large TODOs.
- `docs/ASSUMPTIONS.md` — assumptions, unknowns.
- `docs/TECHSTACK.md` — tech stack per module.
- `docs/DEPENDENCIES.md` — dependencies per module.
- `docs/CODEMAP.md` — code map.
- `docs/REQUIREMENTS/*` — requirements; `INDEX.md` index, `CHANGES.md` log.
- `docs/PATTERNS/*` — patterns; `INDEX.md` index, `CHANGES.md` log.
- `agents/IMPLEMENTATION.md` — implementation state; the only changelog.
- `agents/MEMORY.md` — root causes, what worked and failed.
- `plans/<FEATURE>/<FEATURE>-PLAN.md` — execution plan.
- `plans/<FEATURE>/<FEATURE>-SPECS.md` — tech specs.
- `plans/<FEATURE>/plan.json` — Operation manager execution tracking file.
- `plans/<FEATURE>/*` — supporting files.
- `refsrc/*` — knowledge-only source; SCM-excluded except `refsrc/INDEX.md`.
- `agents/TEMP/<FEATURE>` — temp; SCM-excluded.
- `docs/raw` — raw requirement inputs.

</bootstrap_rosetta_files>

</load-project-context>
