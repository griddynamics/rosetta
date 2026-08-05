---
name: arrangment-workspace-flow
description: TODO
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<arrangement-workspace-flow>

<description_and_purpose>
TODO
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">
1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `orchestration`, `hitl`, `sensitive-data`.
3. Every question and approval follows the loaded `hitl` skill.
4. Flow state MUST be saved to AGENTS TEMP FEATURE folder as `arrangement-state.md`; every phase updates it before the next starts.
<prerequisites>

<subagent_policy required="true" inline_execution="prohibited">

- Orchestrator owns approvals, phase transitions, dispatch, aggregation, and handoff.
- Phase files are assigned-subagent-only; orchestrator MUST NOT load, read, summarize, or execute them.
- Every declared subagent is mandatory.
- Every subagent MUST USE SKILL `subagent-directives`.
- Subagents use tools required by their own assignment.
- `executor` is never a gateway for full agents.
- Reject incomplete phase contracts before advancing.
- If required subagent invocation is unavailable, stop and report the unmet prerequisite.

</subagent_policy>

<business_context phase="1" subagent="requirements-engineer" role="Business-context interviewer and CONTEXT.md author" type="HITL" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">
1. Purpose: Capture non-technical and engineering behavior facts about the project in `docs/CONTEXT.md`.
2. Input: existing `docs/CONTEXT.md` 
3. Output: updated `docs/CONTEXT.md` 
4. INVOKE SUBAGENT to APPLY PHASE `arrangement-workspace-flow-business-context.md`.
</business_context>

<technical_context phase="2" subagent="architect" role="Technical-context interviewer and ARCHITECTURE.md author" type="HITL" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">
1. Purpose: Capture technical facts about the project in `docs/ARCHITECTURE.md`.
2. Input: existing `docs/ARCHITECTURE.md` 
3. Output: updated `docs/ARCHITECTURE.md`
4. INVOKE SUBAGENT to APPLY PHASE `arrangement-workspace-flow-technical-context.md`.
</technical_context>

<modernization phase="3" optional="true" subagent="architect" role="Modernization strategist and CONTEXT.md/ARCHITECTURE.md author" type="HITL" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">
1. Purpose: Capture modernization goals, target architecture, and patterns in `docs/CONTEXT.md`/`docs/ARCHITECTURE.md`.
2. Applicability: confirm with user that the project goal is modernization; not applicable => skip this phase, record skip reason in `arrangement-state.md`, proceed to next phase.
3. Input: existing `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`
4. Output: extended `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`
5. INVOKE SUBAGENT to APPLY PHASE `arrangement-workspace-flow-modernization.md`.
</modernization>

<reference_source_code phase="4" subagent="executor" role="Reference-source curator and refsrc/INDEX.md author" type="HITL" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna">
1. Purpose: Onboard read-only external codebases the agent needs into `refsrc/`, documented in `refsrc/INDEX.md`.
2. Input: `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`, existing `refsrc/`, `refsrc/INDEX.md`, `.gitignore`
3. Output: validated/updated `refsrc/`, `refsrc/INDEX.md`, `.gitignore`, `arrangement-state.md`
4. INVOKE SUBAGENT to APPLY PHASE `arrangement-workspace-flow-reference-source-code.md`.
</reference_source_code>

<configure_ecosystem phase="5" subagent="executor" role="Ecosystem guidance presenter and install helper" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna">
1. Purpose: Show MCP/CLI/plugin recommendations verbatim; guide install only if the user decides to.
2. Input: `docs/CONTEXT.md`
3. Output: user guided through ecosystem choices; `docs/CONTEXT.md` note of installs; `arrangement-state.md` updated
4. INVOKE SUBAGENT to APPLY PHASE `arrangement-workspace-flow-configure-ecosystem.md`.
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
TODO
</pitfalls>

</arrangment-workspace-flow>