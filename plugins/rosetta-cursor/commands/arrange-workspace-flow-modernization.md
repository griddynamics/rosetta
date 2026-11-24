---
name: arrange-workspace-flow-modernization
description: "Phase 5 Modernization of arrange-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrange", "workspace", "modernization", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrange_workspace_modernization>

<description_and_purpose>
Interview user to gather modernization facts not yet in `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/PATTERNS/`.
</description_and_purpose>

<phase_steps>
1. Interview user about what's missing in `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/PATTERNS/` — use `starter_topics`. Follow Questioning process in `hitl` SKILL.
2. Record confirmed answers per `doc_contract` and `patterns_contract`. Unconfirmed inferences → `docs/ASSUMPTIONS.md`.
3. Ask old-code location, guide clone into `refsrc/<name>`, recommend `init-workspace-flow` on it in a new chat.
4. Update `arrange-state.md`.
</phase_steps>

<starter_topics>
Starter topics (add project-specific questions as needed):

Context (→ `docs/CONTEXT.md`):
- The modernization or migration goals and the process followed.

Architecture (→ `docs/ARCHITECTURE.md`):
- The pattern followed (e.g. component replacement, strangler fig, API gateway routing old/new).
- The limits of the modernization.
- A reference to a separate target architecture document defining how the new app is structured.
- What stays, what changes, and how (e.g. old state management → new state management).
- Practical tips (e.g. copy CSS then adapt, skip onboarding UI, use data generation).
- How unit and e2e tests are handled: copied and fixed, or fully regenerated.
- How the modernized application is introduced and deployed.
- Side-by-side or big-bang deployment, and routing between old and new.

Patterns (→ `docs/PATTERNS/`):
- Old → new ("to be") equivalent for every pattern in `docs/PATTERNS/INDEX.md`, and what concretely changes.
</starter_topics>

<doc_contract>
- Append modernization bullets to existing `docs/CONTEXT.md` (goals/process, no technical details) and `docs/ARCHITECTURE.md` (target/pattern, no business details) — extend, never replace.
- <=100 lines each; overflow → index to per-feature `<FEATURE>-CONTEXT.md`/`<FEATURE>-ARCHITECTURE.md`.
</doc_contract>

<patterns_contract>
- Record old → to-be mapping in existing `docs/PATTERNS/<pattern>.md`; net-new patterns → create file + `INDEX.md` entry.
- Write `docs/PATTERNS/INDEX.md` — all patterns with one-line descriptions, `## Pattern Name - short description`.
- Write `docs/PATTERNS/CHANGES.md` — `## [YYYY-MM-DD] Brief changes made`.
- Composite Workspace layout (Option 2 or 3) → extract per sub-repo; top-level `INDEX.md` references sub-repo folders.
</patterns_contract>

<validation_checklist>
- `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` carry modernization facts, <=100 lines (or indexed).
- Old codebase location captured; clone into `refsrc/<name>` recommended.
- `arrange-state.md` updated.
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`/`docs/ARCHITECTURE.md`/`docs/PATTERNS/`.
</pitfalls>

</arrange_workspace_modernization>
