---
name: arrangement-workspace-flow-modernization
description: "Phase 5 Modernization of arrangement-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrangement", "workspace", "modernization", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrangement_workspace_modernization>

<description_and_purpose>
Extend `CONTEXT.md`/`ARCHITECTURE.md`/`PATTERNS/` with modernization facts, pattern mapping, and old-code reference-source onboarding.
</description_and_purpose>

<workflow_context>
Phase 5 of 6 in `arrangement-workspace-flow`. Optional — applies only when the project goal is modernization; otherwise skip.
</workflow_context>

<phase_steps>
1. Find gaps against required topics
2. Interview user on gaps only
3. Extend CONTEXT.md, ARCHITECTURE.md, and PATTERNS
4. Ask old-code location, guide clone + new-chat init
</phase_steps>

<context_topics>
- The modernization or migration goals and the process followed.
</context_topics>

<architecture_topics>
- The pattern followed (example: component replacement, strangler fig, API gateway routing old/new).
- The limits of the modernization.
- A reference to a separate target architecture document defining how the new app is structured and organized.
- What stays, what changes, and how it changes (example: old state management -> new state management).
- Practical tips (example: copy CSS then adapt, skip onboarding UI, use data generation).
- How unit and e2e tests are handled: copied and fixed, or fully regenerated.
- How the modernized application is introduced and deployed.
- Side-by-side or big-bang deployment, and routing between old and new.
</architecture_topics>

<patterns_topics>
- Old -> new ("to be") equivalent for every pattern in `docs/PATTERNS/INDEX.md`, and what concretely changes.
</patterns_topics>

<modernization_interview_style>
1. Interview the user relentlessly until there is full shared understanding.
2. Walk each design branch one-by-one and resolve dependencies between decisions.
3. For each question, provide recommended and alternative answers that are enterprise-ready, strict, specific, and best-practice.
4. Ask questions one at a time.
5. If a question can be answered by web search or workspace exploration, do that first.
6. Keep facts concise, valuable, highly compressed, and phrased with common terms and patterns.
</modernization_interview_style>

<find_gaps step="5.1">
1. Read existing `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/PATTERNS/INDEX.md`.
2. Compare against `context_topics`, `architecture_topics`, and `patterns_topics`.
3. Note which topics are already covered vs missing or partial.
</find_gaps>

<interview_gaps step="5.2">
1. USE SKILL `hitl`.
2. USE SKILL `questioning`.
3. Follow `modernization_interview_style` exactly across `context_topics`, `architecture_topics`, and `patterns_topics`.
4. Interview only on missing or partial topics; skip covered topics.
</interview_gaps>

<doc_contract>
- Append modernization bullets to existing `docs/CONTEXT.md` (goals/process, no technical details) and `docs/ARCHITECTURE.md` (target/pattern, no business details) — extend, never replace.
- Limit each to 100 lines; if MORE => keep the core file plus an index to per-feature `<FEATURE>-CONTEXT.md`/`<FEATURE>-ARCHITECTURE.md` files.
</doc_contract>

<patterns_contract>
- Record the old -> to-be mapping inside the existing `docs/PATTERNS/<pattern>.md`; if the pattern is net-new, create the file plus its `docs/PATTERNS/INDEX.md` entry.
- Write docs/PATTERNS/INDEX.md — all patterns with one-line descriptions, one header per each pattern `## Pattern Name - short description`
- Write docs/PATTERNS/CHANGES.md — created/updated/skipped, one header per each change `## [YYYY-MM-DD] Brief changes made`
- If state.composite = true, extract per sub-repository; top-level INDEX.md references sub-repo folders
</patterns_contract>

<edit_context step="5.3">
1. Follow `doc_contract` to extend `docs/CONTEXT.md` and `docs/ARCHITECTURE.md`, per user answers.
2. Follow `patterns_contract` to update `docs/PATTERNS/`, per user answers.
</edit_context>

<reference_source step="5.4">
1. Ask the user where the old codebase lives (repo URL or local path).
2. Guide the user to clone it into `refsrc/<name>` as a read-only subfolder.
3. Recommend running `init-workspace-flow` on `refsrc/<name>` in a new chat, to avoid context limits.
4. Update `arrangement-state.md`.
</reference_source>

<validation_checklist>
- `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` carry modernization facts.
- `docs/CONTEXT.md`/`docs/ARCHITECTURE.md` stay <=100 lines, or are an index to `docs/*-CONTEXT.md`/`docs/*-ARCHITECTURE.md` files.
- Old codebase location captured; clone into `refsrc/<name>` and new-chat init recommended.
- `arrangement-state.md` is updated.
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`/`docs/ARCHITECTURE.md`/`docs/PATTERNS/`.
</pitfalls>

</arrangement_workspace_modernization>
