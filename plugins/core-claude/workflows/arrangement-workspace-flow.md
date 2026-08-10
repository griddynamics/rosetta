---
name: arrangement-workspace-flow
description: "Workflow for arranging a workspace: layout, reference source code, business/technical context, ecosystem setup."
tags: ["workflow", "arrangement"]
baseSchema: docs/schemas/workflow.md
---

<arrangement-workspace-flow>

<description_and_purpose>
Arrange a workspace: layout, reference source code, business/technical context. End with closed `docs/CONTEXT.md`/`docs/ARCHITECTURE.md` gaps and `arrangement-state.md` tracking every decision.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">
1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `security`, `orchestration`, `hitl`, `sensitive-data`.
3. `orchestration` runs as team manager with NO EXECUTION CONTROLLER — use todo tasks instead.
4. Treat all invocation inputs as optional.
5. Select and combine what the task needs.
6. For full review, require every applicable, available, authorized activity and tool.
7. Maintain a task ledger and run phases JIT.
8. Every question and approval follows the loaded `hitl` skill.
9. Flow state MUST be saved to AGENTS TEMP FEATURE folder as `arrangement-state.md`; every phase updates it before the next starts.
</prerequisites>

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

<choose_workspace_layout phase="1" applies="ALL" subagent="executor" role="Workspace-layout guide and setup helper" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna" type="HITL" must-be-subagent>
- Purpose: Present workspace layout options and guide the user through the chosen layout's setup actions.
- Input: repo/workspace structure; `arrangement-state.md`.
- Output: chosen layout applied; `arrangement-state.md` records the layout.
- INVOKE SUBAGENT `executor` to APPLY PHASE `arrangement-workspace-flow-choose-workspace-layout.md` + present layout options and guide setup.
- Expect: chosen layout name (Option 1/2/3) and setup-actions completion state.
- Control: Option 2/3 chosen → confirm `large-workspace-handling` skill was engaged before advancing; no choice recorded → re-ask, do not default.
</choose_workspace_layout>

<reference_source_code phase="2" applies="Single Repo Workspace (Option 1)" subagent="executor" role="Reference-source curator and refsrc/INDEX.md author" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna" type="HITL" must-be-subagent>
- Purpose: Onboard read-only external codebases the agent needs into `refsrc/`, documented in `refsrc/INDEX.md`.
- Input: `arrangement-state.md`; existing `refsrc/`, `refsrc/INDEX.md`, `.gitignore`.
- Output: validated/updated `refsrc/`, `refsrc/INDEX.md`, `.gitignore`, `arrangement-state.md`.
- INVOKE SUBAGENT `executor` to APPLY PHASE `arrangement-workspace-flow-reference-source-code.md` + onboard/validate reference codebases into `refsrc/`.
- Expect: layout recorded in `arrangement-state.md`; `refsrc/`/`.gitignore`/`refsrc/INDEX.md` state, or a no-op reason.
- Control: layout ≠ Single Repo Workspace (Option 1) → skip, record skip reason, proceed to phase 3; layout = Option 1 → apply and validate before advancing.
</reference_source_code>

<business_context phase="3" applies="ALL" subagent="requirements-engineer" role="Business-context interviewer and CONTEXT.md author" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL" must-be-subagent>
- Purpose: Capture non-technical and engineering behavior facts about the project in `docs/CONTEXT.md`.
- Input: existing `docs/CONTEXT.md`.
- Output: updated `docs/CONTEXT.md`.
- INVOKE SUBAGENT `requirements-engineer` to APPLY PHASE `arrangement-workspace-flow-business-context.md` + close gaps against required topics via gap-only interview.
- Expect: `docs/CONTEXT.md` <=100 lines; gap-only interview completed.
- Control: topics already covered → skip re-interview; `docs/CONTEXT.md` incomplete/missing → block advance until gaps closed.
</business_context>

<technical_context phase="4" applies="ALL" subagent="architect" role="Technical-context interviewer and ARCHITECTURE.md author" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL" must-be-subagent>
- Purpose: Capture technical facts about the project in `docs/ARCHITECTURE.md`.
- Input: existing `docs/ARCHITECTURE.md`.
- Output: updated `docs/ARCHITECTURE.md`.
- INVOKE SUBAGENT `architect` to APPLY PHASE `arrangement-workspace-flow-technical-context.md` + close gaps against required topics via gap-only interview.
- Expect: `docs/ARCHITECTURE.md` <=100 lines; gap-only interview completed.
- Control: topics already covered → skip re-interview; `docs/ARCHITECTURE.md` incomplete/missing → block advance until gaps closed.
</technical_context>

<modernization phase="5" applies="modernization goal" subagent="architect" role="Modernization strategist and CONTEXT.md/ARCHITECTURE.md author" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL" must-be-subagent>
- Purpose: Capture modernization goals, target architecture, and patterns in `docs/CONTEXT.md`/`docs/ARCHITECTURE.md`/`docs/PATTERNS/`.
- Input: existing `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/PATTERNS/INDEX.md`.
- Output: extended `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/PATTERNS/`.
- INVOKE SUBAGENT `architect` to APPLY PHASE `arrangement-workspace-flow-modernization.md` + confirm modernization goal, close gaps, capture old-code reference source.
- Expect: confirmed goal or no-op reason; extended docs; old-codebase location captured when applicable.
- Control: user confirms goal is not modernization → skip, record skip reason, proceed to phase 6; confirmed → apply and validate before advancing.
</modernization>

<configure_ecosystem phase="6" applies="ALL" subagent="executor" role="Ecosystem guidance presenter and install helper" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna" must-be-subagent>
- Purpose: Show MCP/CLI/plugin recommendations verbatim; guide install only if the user decides to.
- Input: `docs/CONTEXT.md`.
- Output: user guided through ecosystem choices; `docs/CONTEXT.md` note of installs; `arrangement-state.md` updated.
- INVOKE SUBAGENT `executor` to APPLY PHASE `arrangement-workspace-flow-configure-ecosystem.md` + show guidance verbatim and guide install only on user request.
- Expect: guidance shown verbatim; any installs noted in `docs/CONTEXT.md`.
- Control: user declines install → no-op, workflow completes; user requests install → guide step-by-step, never install directly.
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
- Orchestrator reading/executing a phase file itself instead of dispatching the assigned subagent (violates `subagent_policy`).
- Ignoring a phase's `Control` branch (skip/apply/gate condition) instead of following it exactly.
- Ending the flow without showing `next_steps` guidance to the user.
</pitfalls>

<completion>
Complete only when every applicable phase passes, skipped phases carry a recorded skip reason, `arrangement-state.md` reflects every phase, and `next_steps` guidance has been shown to the user.
</completion>

</arrangement-workspace-flow>