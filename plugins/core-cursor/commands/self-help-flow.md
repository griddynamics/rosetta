---
name: self-help-flow
description: "Workflow for Rosetta self-help: explain capabilities and usage, then run any discovered workflow."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<self_help_flow>

<description_and_purpose>

Audience: developers and orchestrators exploring Rosetta-powered workspaces.
Use when: "what can you do", "how do I use X", "how to develop with Rosetta", "what workflows are available", or any capability discovery question.
Provides: live overview of available skills, workflows, and agents; detailed guidance on matched capabilities; seamless handoff to any discovered workflow within the same session.

</description_and_purpose>

<invocation_guidance>

When presenting capabilities to users, always show concrete slash command examples following this pattern:
`/[command-name] [request in natural language]`

QUICKSTART REFERENCE PATTERN — use this exact style for all examples shown to users:
```
/coding-flow Implement side bar on the home page, ...
/coding-flow Identify and implement fix, ...
/coding-flow Improve unit tests coverage to 85% for ...
/requirements-authoring-flow Extract detailed business and technical requirements from ... using subagents.
/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents.
/research-flow Investigate OAuth 2.0 implementation options for our stack
/aqa-flow Create QA automation for the checkout flow
```

HOW WORKFLOWS EXECUTE:
Workflows are multi-phase pipelines. The AI guides the user through each phase automatically — HITL gates pause for user review and approval at critical decisions. Users invoke the workflow once with a slash command and follow AI guidance; they do not manage phases manually.

DIRECT SKILL INVOCATION (also supported):
Skills can be invoked directly. Slash command = folder name of the skill.
Naming rule: `skills/[folder-name]/SKILL.md` → `/[folder-name] [request]`

WHAT MAKES A VALID DIRECT SKILL EXAMPLE — a valid request must have all three:
1. Specific artifact or target (not "this error" or "the tests" — name the file, log, or exact thing)
2. Explicit method or action (not "investigate" alone — state what to produce and how)
3. Explicit scope constraint (state what NOT to do, or what the boundary is)

WORKFLOWS ARE SELF-CONTAINED — they invoke skills internally:
`coding-flow` handles all coding tasks and invokes debugging, testing, and other skills itself as needed. Similarly, every other workflow invokes its own skills internally. Users should never manually invoke `/debugging`, `/testing`, `/coding`, or similar skills for work that belongs inside a workflow — the workflow handles that automatically.

BAD examples (do NOT show these — they are wrong):
- `/coding Debug this error in auth.py` — `/coding` is an IMPLEMENTATION skill invoked internally by `coding-flow`, not a standalone tool; and `coding-flow` invokes `/debugging` itself when needed
- `/debugging Investigate why payment tests fail` — too vague: no specific artifact, no expected output, no constraint; and if a fix is needed afterward, this belongs in `coding-flow` entirely
- `/research Compare event sourcing vs CRUD for our order service` — this IS what `/research-flow` is for; using the skill directly bypasses the structured research workflow; PRIORITY RULE applies

GOOD examples:
- `/natural-writing Rewrite the executive summary in docs/CONTEXT.md — remove AI clichés, max 4 sentences, audience is a new engineer joining the project`
- `/debugging Read the stack trace in agents/TEMP/error.log — identify root cause only, do NOT propose fixes, report findings`

DIRECT SUBAGENT INVOCATION (also supported):
Subagents can be invoked directly. Slash command = file name without `.md`.
Naming rule: `agents/[name].md` → `/[name] [request]`

Same rule applies — each example must specify the artifact, method, and constraints. Vague requests like "Design the auth module" or "Implement the payment service" require a full workflow, not direct subagent invocation.

GOOD examples:
- `/architect Question me and initialize as a loop a project-brief.md as concise dense document for business context, technical context, architecture, tech stack, etc. No coding.`
- `/reviewer Check current git changes, understand what was changed and why, validate against AC, find gaps or possible issues according to DoD`
- `/reviewer Validate implemented changes by actually running the code and using manual QA by AI`

PRIORITY RULE — WORKFLOWS ARE PREFERRED:
When a workflow and a skill or subagent share a similar name or purpose, always recommend the WORKFLOW.
Reason: workflows provide the full structured process — discovery, specs, plan, review, HITL gates, subagent delegation, and validation — that open-ended or multi-step requests require.
Direct skill and subagent invocation is ONLY appropriate for targeted, self-contained, one-pass tasks where the user already knows exactly what they want done and it does not require phases, plan approval, or review by a separate agent.

</invocation_guidance>

<workflow_phases>

All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed.
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
2. For each match, `ACQUIRE <selected TAG> FROM KB` (e.g., `ACQUIRE commands/coding-flow.md FROM KB`, `ACQUIRE skills/coding/SKILL.md FROM KB`, `ACQUIRE agents/engineer.md FROM KB`).
3. Extract: purpose, when to use, what to expect, inputs/outputs, HITL gates.
4. Input: user request + `Capability Catalog`. Output: `Matched Capabilities`.
5. Recommended skills: any currently useful.

</match_and_acquire>

<guide phase="3" subagent="discoverer" role="Capability guide">

1. Synthesize `Capability Catalog` and `Matched Capabilities` into developer-friendly guidance at 101 level.
   - Brief table of all capabilities.
   - Matched: what it does, when to use, what to expect, how to invoke.
   - For "how to invoke": MUST follow the slash command pattern in `<invocation_guidance>` — show real examples using the QUICKSTART format.
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
