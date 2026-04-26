---
name: bootstrap-rosetta-files
description: Defines workspace rosetta files.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "rosetta", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_rosetta_files attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

All rosetta files below: SRP, DRY, MECE, very concise. Each file starts with a self-describing sentence of its purpose. Grep-friendly topical headers. Headers include status. No explicit ToC. All committed to SCM unless stated otherwise.
It must be possible to grep by headers and receive useful information and ToC.

1. `gain.json` defines and overrides general SDLC setup and locations of Rosetta files; this file wins in conflicts.
2. `docs/CONTEXT.md`. Business and overall context, target state only, no technical details, no change log, no explanation of changes.
3. `docs/ARCHITECTURE.md`. Architecture, and all technical requirements. Modules, workspace structure, testing architecture, styling, building blocks, etc.
4. `docs/TODO.md`. Improvements, suggestions, large TODOs, etc. Create if missing.
5. `docs/ASSUMPTIONS.md`. Assumptions, Unknowns, etc.
6. `docs/TECHSTACK.md`. Tech stack of all modules.
7. `docs/DEPENDENCIES.md`. Dependencies of all modules.
8. `docs/CODEMAP.md`. Code map of the workspace.
9. `docs/REQUIREMENTS/*`. Original requirements. May be missing. `docs/REQUIREMENTS/INDEX.md` is index. `docs/REQUIREMENTS/CHANGES.md` is change log.
10. `docs/PATTERNS/*`. Coding and architectural patterns. May be missing. `docs/PATTERNS/INDEX.md` is index. `docs/PATTERNS/CHANGES.md` is change log.
11. `agents/IMPLEMENTATION.md`. Current state of implementation very concise. Structure to prevent git conflicts. The only change log.
12. `agents/MEMORY.md`. Very brief root causes of errors and mistakes, brief actions tried and actions succeeded, both positive and negative. Create if missing.
13. `plans/<FEATURE>/<FEATURE>-PLAN.md`. Execution plan.
14. `plans/<FEATURE>/<FEATURE>-SPECS.md`. Tech specs.
15. `plans/<FEATURE>/plan.json`. Plan manager execution tracking file.
16. `plans/<FEATURE>/*`. Feature implementation supporting files.
16. `refsrc/*`. Source code used only for knowledge! Exclude from SCM with single exception `refsrc/INDEX.md` to be committed.
17. `agents/TEMP/<FEATURE>`. Temporary folder used during feature implementation. Exclude `agents/TEMP` from SCM.

</bootstrap_rosetta_files>
