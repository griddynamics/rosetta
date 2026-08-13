---
name: arrange-workspace-flow
description: "Workflow for arranging a workspace: layout, reference source code, business/technical context, ecosystem setup."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<arrange-workspace-flow>

<description_and_purpose>
Guide user through workspace arrangement: layout, reference code, business/technical context, modernization docs (if applicable), ecosystem tools. Close gaps, contradictions, undocumented decisions in `CONTEXT.md`/`ARCHITECTURE.md`.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">
1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `hitl`.
3. MUST maintain a task ledger. Phases MUST run JIT: load phase → execute → update state file → load next phase.
4. Flow state MUST be saved to `agents/TEMP/<FEATURE>/arrange-state.md`.
</prerequisites>

<choose_workspace_layout phase="1" applies="ALL">

1. Show layout options verbatim, help user pick one, guide setup actions.
2. APPLY PHASE `arrange-workspace-flow-choose-workspace-layout.md` 
3. No choice recorded → re-ask, do not default.
4. Update `arrange-state.md`.

</choose_workspace_layout>

<reference_source_code phase="2" applies="Single Repo Workspace (Option 1)">
1. Onboard read-only reference code into `refsrc/`, documented in `refsrc/INDEX.md`.
2. Layout ≠ Single Repo Workspace (Option 1) → skip, record skip reason, proceed to phase 3.
3. APPLY PHASE `arrange-workspace-flow-reference-source-code.md`
4. Update `arrange-state.md`.

</reference_source_code>

<business_context phase="3" applies="ALL">
1. Interview user to gather missing business context into `CONTEXT.md`.
2. APPLY PHASE `arrange-workspace-flow-business-context.md`
3. Update `arrange-state.md`.
</business_context>

<technical_context phase="4" applies="ALL">
1. Interview user to gather missing technical context into `ARCHITECTURE.md`.
2. APPLY PHASE `arrange-workspace-flow-technical-context.md`
3. Update `arrange-state.md`.
</technical_context>

<modernization phase="5" applies="modernization goal">
1. Extend `CONTEXT.md`/`ARCHITECTURE.md`/`PATTERNS/` with modernization facts and pattern mapping.
2. Project goal ≠ modernization → skip, record skip reason, proceed to phase 6.
3. APPLY PHASE `arrange-workspace-flow-modernization.md`
4. Update `arrange-state.md`.
</modernization>

<configure_ecosystem phase="6" applies="ALL">
1. Show MCP/CLI/plugin recommendations; guide install only if user decides to.
2. APPLY PHASE `arrange-workspace-flow-configure-ecosystem.md`
3. Update `arrange-state.md`.
</configure_ecosystem>

</workflow_phases>

<next_steps>
1. DEMAND user as MUST to start new chat session (highly visible message, red icon, bold, ASCII art, it must standout).
2. DEMAND user to study (USAGE GUIDE)[https://griddynamics.github.io/rosetta/docs/usage-guide/]
3. DEMAND user to review examples for the next steps for user and EMPHASIS on "/slash-commands":
   
   ```md
   # Coding Workflow

   **WHAT**: Majority of tasks are actually coding tasks, including unit tests. Just ask exactly what is required.

   "/coding-flow Implement left navigation sidebar on the home page, ..."

   "/coding-flow Identify and implement fix, ..."

   "/coding-flow Improve unit tests coverage to 85% for ..."

   # Business and Technical Requirements

   **WHY**: Requirements - is the source of truth for code and tests. Going requirements first is the most effective. In brownfield start with extracting.

   "/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."

   "/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."

   # Modernization

   **FIRST**: Document modernization goals in CONTEXT.md, document target services technical aspects in ARCHITECTURE.md, document where source code should be created, keep refsrc populated with reference code source (old code, new code, reusable libraries, configuration and documentation files, and similar).

   **NOTE**: All phases are must. All phases to be implemented one-by-one with proper review. Phase 3: Pre-Modernization Test Coverage is a must (and must include both unit and integration/e2e tests).

   "/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents." 

   "/modernization-flow Perform modernization phase 2 to analyze service module ... using subagents. Target microservice name is ... ."

   "/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must USE FLOW `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."
   ```
</next_steps>

<pitfalls>
- Confusing this with `init-workspace-flow`: this flow assumes Rosetta setup is done and only arranges layout/context/ecosystem, not shells/discovery/patterns/code-graph.
- Skipping a phase's gate condition (`applies=` / inline skip rule) instead of evaluating it.
</pitfalls>

<completion>
Complete only when every applicable phase passes, skipped phases carry a recorded skip reason, `arrange-state.md` reflects every phase.
</completion>

</arrange-workspace-flow>