---
name: self-help-flow
description: Rosetta self-help. Ask about capabilities, learn how to use them, get guidance on developing with Rosetta, or seamlessly switch to executing any discovered workflow. Answers "what can you do", "how do I use X", "how modernization works", "what workflows are available", etc.
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<self_help_flow>

<description_and_purpose>

Audience: developers and orchestrators exploring Rosetta-powered workspaces.
Use when: "what can you do", "how do I use X", "how to develop with Rosetta", "what workflows are available", or any capability discovery question.
Provides: live overview of available skills, workflows, and agents; detailed guidance on matched capabilities; seamless handoff to any discovered workflow within the same session.

</description_and_purpose>

<workflow_phases>

Rosetta prep steps completed.
Phases are sequential. Orchestrator coordinates; trust skills and subagents to execute.
Scale: conversational — output is a message, no files, no state tracking.

<list_capabilities phase="1" subagent="discoverer" role="KB catalog lister">

1. List capabilities from KB with XML format:
   - `LIST workflows IN KB`
   - `LIST skills IN KB`, then `LIST skills/<name> IN KB` for each.
   - `LIST agents IN KB`
2. Build `Capability Catalog`: name, type (workflow/skill/agent), description — from frontmatter only.
3. Input: user request. Output: `Capability Catalog`.
4. Recommended skills: any currently useful.

</list_capabilities>

<match_and_acquire phase="2" subagent="discoverer" role="Capability matcher">

1. Match user request against `Capability Catalog`.
2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE workflows/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
5. Recommended skills: any currently useful.

</match_and_acquire>

<guide phase="3" subagent="discoverer" role="Capability guide">

1. Synthesize `Capability Catalog` and `Matched Capabilities` into developer-friendly guidance at 101 level.
   - Brief table of all capabilities.
   - Matched: what it does, when to use, what to expect, how to invoke.
   - Concrete next actions relevant to user request.
2. Input: `Capability Catalog` + `Matched Capabilities` + user request. Output: guidance message.
3. USE SKILL `natural-writing` for final user-facing output.
4. Recommended skills: `reasoning`, and any currently useful.
5. HITL: present guide; ask if deeper drill-down is needed.

</guide>

<handoff phase="4" optional="true" type="orchestrator">

1. Triggered when user shifts from help to action (e.g., "run that workflow", "let's do coding").
2. `ACQUIRE <selected TAG> FROM KB` for target workflow if not already acquired.
3. Adopt acquired workflow as active flow; start from its phase 1.
4. Self-help-flow yields control — does not wrap the adopted workflow.

</handoff>

</workflow_phases>

<references>

Subagents:
- INVOKE SUBAGENT `discoverer` — KB listing, acquisition, and guidance

Skills:
- USE SKILL `reasoning`
- USE SKILL `natural-writing`

</references>

</self_help_flow>
