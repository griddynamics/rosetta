# Overview

This document describes vision of the next version of Rosetta: Rosetta Air.

Original rosetta was implemented as an opinionated monolith in times of Claude Sonnet 3.5, which is behind 5 generations of current models and very simple tooling/harness around them.

Since that Rosetta was changing and adopting, but newer models and tooling is now on completely new level.

Engineering priority changes.

# Skill hierarchy (Atomic Design Methodology)

1. Atoms - core skills, each covering one concern or area, non-opinionated, no deps, cross-cutting
   Examples: implementation, testing, debugging, discovery, backlog (entire area), etc.

2. Molecules - advanced skills, workflows for use cases, each covers one use-case, one state-machine, adopting to current context, combines atoms skills, configurable (mildly opinionated).
   Examples: review all pending PRs (orchestration + backlog + automation), coding (discovery + design + specs + planning + implementation + testing + validation), api aqa (qa structure + qa knowledge + testing), etc.

3. Organisms - full end-to-end automation of business processes, each skill is one process, opinionated, combines atoms and molecules. One organism is one autonomous software factory.
   Examples: automated development on top of kanban board, modernization (discovery, design, and multiple coding workflow sessions), bootstrapping entire knowledge layer with reverse engineering, etc.

# Priorities

1. Atoms > Molecules > Organisms
2. Self-improvement is delivered with organisms

# New directions

- Self-improvement - capture lessons learned, capture what worked, split by skill, dedicated cycle to improve prompts both shared and custom
- Self-organization - organize knowledge according to OKF bundles, split large files into smaller ones, etc.
- Based on customization - make best use of local customizations - reuses and combines atom skills to build automation for current project using provided templates of molecules and organisms skills. Molecules are adapted, Organisms are used as accelerators. Subagents and hooks are configured as per user review for their models, tools, etc. Rosetta skills defines what it needs, templates, and how to configure those. Team person uses skill to configure that all.
- Works on medium to large and beyond tasks
- Not barely integrates with, but a glue for AI-First SDLC (PdM, PdO: prepare ADR/ARD/PRD/etc; BAs: build requirements/specs; General: knowledge, backlog, maintaining the state, picking up stories, discovery, tech design, visual design, planning, implementation, testing, AQA, etc; Use cases: greenfield, brownfield, modernization, reverse engineering, building corporate version of paid service, etc).
- Rosetta is installed via `npx skills` and provide ONLY those skills (plugins retired)
- The rest are built when those are needed according to project when requested by team
- No init workflows, start ASAP, no custom context load hooks or rules instead AGENTS.md index plus CLAUDE.md/GEMINI.md with `@AGENTS.md` (include operator)
- Any workflows are optional and only to make DX better (setup, discover context, etc)
- Use cases / workflows are state-machine-like workflows
- Store plan, execution state, etc.
- Replace python/node with much faster tooling
- We build entire software factory specific to the project according to the needs of the project, from triage to implementation, review, and operations

Almost nothing is lost from old rosetta, but instead converted and pivoted.

# Old Rosetta

- Still supported and maintained without breaking compatibility
- We truly take and reuse existing artifacts
