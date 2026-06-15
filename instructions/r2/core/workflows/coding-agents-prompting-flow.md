---
name: coding-agents-prompting-flow
description: "Workflow for authoring and adapting AI-agent prompts: skills, agents, workflows, rules, etc."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<coding-agents-prompting-flow>

<description_and_purpose>
Orchestrates prompt authoring/adaptation via `discover -> extract+intake -> blueprint -> for_each_prompt_loop(draft -> hardening -> edit) -> simulate -> validate`. Every phase logs status in coding-agents-prompting-flow-state.md, Prompt Brief carries through all phases, and final output traces to request intent.
</description_and_purpose>

<workflow_phases>

Orchestrator must trust the system and skills; coordinate only sequence, artifacts, state, and approvals.
Load only references needed for the current phase.

Agent state tracker file `coding-agents-prompting-flow-state.md` is stored in FEATURE TEMP folder.

Execute phases sequentially, do not skip!

<prerequisites>

1. Preparation steps are mandatory prerequisites and must be completed before phase 1.
2. Workflow execution starts only after prerequisites are satisfied.
3. Orchestrator and subagents MUST USE SKILL `coding-agents-prompt-authoring`.
4. MUST just-in-time load each phase's skills
5. No rush, take your time, MUST FOLLOW WORKFLOW ENTIRELY, no skipping
6. This workflow MUST be used with Fable, Opus, GPT-5.5+ class models => IF NOT - DEMAND USER TO SWITCH MODEL

</prerequisites>

<discover step="1" subagent="discoverer" role="Context discoverer" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro">

1. Discover project-local context, relevant prompt-family artifacts, and required references for this request.
2. Input: request + optional existing prompt. Output: `Discovery Notes` + `Reference Set`.
3. Update `coding-agents-prompting-flow-state.md`.
4. HITL when discovered context conflicts with user intent or critical references are missing.

</discover>

<extract_intake step="2" subagent="prompt-engineer" role="Intent extractor" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Extract requirements from source prompt when present and intake clarifications from user.
2. Input: request + optional existing prompt + `Discovery Notes` + `Reference Set`. Output: `Prompt Brief` + `Open Questions`.
3. Update `coding-agents-prompting-flow-state.md`.
4. HITL explicit approval required for `Prompt Brief`.

</extract_intake>

<blueprint step="3" subagent="prompt-engineer" role="Blueprint Architect" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Design blueprint: structure, actors, contracts, and boundaries for target prompt set.
2. Input: approved `Prompt Brief`. Output: `Blueprint`.
3. Update `coding-agents-prompting-flow-state.md`.
4. HITL approval when architecture or tradeoffs are ambiguous.

</blueprint>

<for_each_prompt_loop step="4" subagent="prompt-engineer" role="Prompt Author" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Scope: `draft` target prompts
2. Input: approved `Prompt Brief` + `Blueprint`. Output: `Draft Prompt Set` + optional change-log.md in FEATURE PLAN folder.
3. Update `coding-agents-prompting-flow-state.md`.
4. HITL when loop stalls, conflicts appear, or intent becomes unclear.

</for_each_prompt_loop>

<for_each_prompt_loop step="5" subagent="prompt-engineer" role="Prompt reviewer and hardening" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Run loop for each target prompt: `hardening -> edit` until pass criteria or HITL decision.
2. This is automated review by subagent, this is not HITL review!
3. Input: approved `Prompt Brief` + `Blueprint` + `Draft Prompt Set` + prompt family information. Output: `Prompt Set` + optional change-log.md in FEATURE PLAN folder.
4. Update `coding-agents-prompting-flow-state.md`.
5. HITL when loop stalls, conflicts appear, or intent becomes unclear.

</for_each_prompt_loop>

<simulate step="6" subagent="prompt-engineer" role="Execution tracer" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Simulate realistic runs and trace context/cognitive load across the prompt chain.
2. Input: `Prompt Brief` + `Prompt Set`. Output: `Simulation Notes`.
3. Update `coding-agents-prompting-flow-state.md`.
4. HITL when simulation exposes major behavioral risk.

</simulate>

<validate step="7" subagent="prompt-engineer" role="Quality validator" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high">

1. Validate final artifacts against intent, contracts, failure modes, and traceability.
2. Input: `Prompt Brief` + `Blueprint` + `Candidate Prompt Set` + `Simulation Notes`. Output: `Final Prompt Set` + `Validation Pack` (`Checklist Results`, `Tests`, `Failure Modes`, `Traceability`; persistent report optional in FEATURE PLAN folder as validation-report.md).
3. Update coding-agents-prompting-flow-state.md and mark complete.
4. HITL final approval required before persistence; small tasks may stay in-memory and be returned in message.

</validate>

</workflow_phases>

<references>

Use `INVOKE SUBAGENT` for agents.

Subagents to use:

1. agent `discoverer`
2. agent `prompt-engineer`

Contracts:

1. Preparation steps are prerequisites before phase 1.
2. `Discovery Notes` + `Reference Set` are required before intake starts.
3. `Prompt Brief` is required input from phase 3 onward.
4. Load only references needed by current phase.
5. Workflow defines sequence/contracts; skills define execution internals.

</references>

<validation_checklist>

- `discover` runs first and produces `Discovery Notes` + `Reference Set`.
- `Prompt Brief` is approved before blueprint starts.
- Adaptation requests load `pa-adapt.md` and keep source intent traceable through the target artifact.
- `Prompt Brief` is present as input in loop, simulation, and validation phases.
- Loop explicitly runs `draft -> hardening -> edit` for each target prompt.
- Every phase has artifact evidence and state update in coding-agents-prompting-flow-state.md in FEATURE TEMP folder.
- `Validation Pack` includes checklist results, tests, failure modes, and traceability.
- Workflow stays thin: no skill-internal templates or execution internals are embedded.
- Final outputs map to request intent with explicit traceability.

</validation_checklist>

<pitfalls>

- Orchestrator executes skill internals instead of coordinating contracts.
- `discover` is skipped or delayed after intake.
- `Prompt Brief` is treated as optional in downstream phases.
- Loop is collapsed into one draft pass without hardening/edit.
- Too many references are loaded; phase-scoped loading is skipped.
- State file in FEATURE TEMP folder is stale or missing phase artifact evidence.

</pitfalls>

</coding-agents-prompting-flow>
