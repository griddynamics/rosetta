---
name: research-flow
description: "Workflow for deep project research with grounded references, parallel exploration, etc."
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

<research_flow>

<description_and_purpose>
Orchestrates deep research via meta-prompting: craft an optimized research prompt, then execute it in a dedicated subagent.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0", applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
2. MUST use todo tasks for reliability
3. Orchestrator trusts the system and skills; coordinates sequence, artifacts, state, and approvals only.
4. Execute phases sequentially.
5. Agent state tracker file `research-flow-state.md` is stored in FEATURE TEMP folder.
6. If `/goal` is set repeat phases 3-4 until goal is met.

</prerequisites>

<context_load phase="1" subagent="researcher" role="Context gatherer for research scope" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

1. Read all lines from CONTEXT.md, ARCHITECTURE.md, and IMPLEMENTATION.md.
2. Input: user research request. Output: loaded project context.
3. Update `research-flow-state.md`.

</context_load>

<prompt_craft phase="2" subagent="researcher" role="Research prompt architect" subagent_required_model="claude-opus-4-8, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">

1. Create an optimized research prompt for the user request.
2. Save as `research-prompt.md` in FEATURE PLAN folder. Output ONLY the optimized prompt.
3. Input: user request + project context. Output: `research-prompt.md`.
4. Required skills: `reasoning`
5. Update `research-flow-state.md`.
6. HITL approval of research prompt before execution.

</prompt_craft>

<execute_research phase="3" subagent="researcher" role="Deep research executor" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

1. Execute the approved research prompt as a separate subagent.
2. Input: approved `research-prompt.md`. Output: `docs/<feature>-research.md`.
3. Required skills: `research`
4. Update `research-flow-state.md`.

</execute_research>

<finalize phase="4" subagent="researcher" role="Research finalizer" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

1. Finalize `docs/<feature>-research.md`.
2. Input: completed research document. Output: finalized research document.
3. Update `research-flow-state.md` and mark complete.

</finalize>

</workflow_phases>

</research_flow>
