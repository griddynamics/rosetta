---
name: research-flow
description: Rosetta workflow for project-related deep research using meta-prompting approach. Use when user requests research, analysis, or investigation that requires systematic exploration with grounded references. Contains context load, prompt crafting using reasoning, executing research with parallel subagents, and finalization.
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<research_flow>

<description_and_purpose>
Orchestrates deep research via meta-prompting: craft an optimized research prompt, then execute it in a dedicated subagent.
</description_and_purpose>

<workflow_phases>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

Orchestrator trusts the system and skills; coordinates sequence, artifacts, state, and approvals only.
Execute phases sequentially.

Agent state tracker file `research-flow-state.md` is stored in FEATURE TEMP folder.

<context_load phase="1" subagent="researcher" role="Context gatherer for research scope">

1. Read all lines from CONTEXT.md, ARCHITECTURE.md, and IMPLEMENTATION.md.
2. Input: user research request. Output: loaded project context.
3. Update `research-flow-state.md`.

</context_load>

<prompt_craft phase="2" subagent="researcher" role="Research prompt architect" subagent_recommended_model="claude-opus-4-6, gpt-5.3-codex-high, gemini-3.1-pro-high">

1. Create an optimized research prompt for the user request.
2. Save as `research-prompt.md` in FEATURE PLAN folder. Output ONLY the optimized prompt.
3. Input: user request + project context. Output: `research-prompt.md`.
4. Required skills: `reasoning`
5. Update `research-flow-state.md`.
6. HITL approval of research prompt before execution.

</prompt_craft>

<execute_research phase="3" subagent="researcher" role="Deep research executor" subagent_recommended_model="claude-sonnet-4-6, gpt-5.3-codex-medium, gemini-3.1-pro">

1. Execute the approved research prompt as a separate subagent.
2. Input: approved `research-prompt.md`. Output: `docs/<feature>-research.md`.
3. Required skills: `research`
4. Update `research-flow-state.md`.

</execute_research>

<finalize phase="4" subagent="researcher" role="Research finalizer">

1. Finalize `docs/<feature>-research.md`.
2. Input: completed research document. Output: finalized research document.
3. Update `research-flow-state.md` and mark complete.

</finalize>

</workflow_phases>

</research_flow>
