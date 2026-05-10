---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap_core_policy severity="CRITICAL" use="ALWAYS" execute="always" modes="all" planning_mode="MUST USE" execution_mode="MUST USE" default_mode="MUST USE" research_mode="MUST USE" auto_mode="MUST USE" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<OPERATION_MANAGER>

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools.
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit]` lists next steps
  - `plan create <plan_file> '<json>'`, `plan upsert <plan_file> [target: entire_plan|<phase-id>] [phase|step] '<json>'`, `plan update_status <plan_file> <step-id> [open|in_progress|complete|blocked|failed]`, `query <plan-file> [id|entire_plan]`, `show_status <plan-file> [id|entire_plan]`
- Upsert follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced, status field silently ignored to enforce use of `update_status`.
- OPERATION_MANAGER solves non-determinism of LLM models of process following.
- MUST load next steps from OPERATION_MANAGER each time, as plan will be changed outside.
- MUST execute plan via loop: call `next`, execute, `update_status`.
- MUST upsert a plan because of new tasks, inputs, findings.
- Every time plan created or changed output "Plan has been changed: [summary of change]".

</OPERATION_MANAGER>

<upsert_context_steps>

All agents (orchestrators and subagents) upsert the following steps into the existing plan's `ph-prep` phase using OPERATION_MANAGER `upsert <plan_file> ph-prep '<json>'`; if not available, MUST FALLBACK to built-in todo task tools:

```json
{
  "steps": [
    {
      "id": "s-upgrade-check",
      "name": "Rosetta upgrade check",
      "prompt": "Rosetta server contains R3 of the rules; strongly suggest upgrade if workspace is older by asking user to type in a new session 'Initialize this repository using Rosetta (upgrade Rx to R3)'",
      "depends_on": []
    },
    {
      "id": "s-read-docs",
      "name": "Read project context",
      "prompt": "USE SKILL `load-context` as the canonical current context loader. Using the skill is REQUIRED. MUST ALWAYS read the FULL CONTENT ALL LINES of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT. MUST ALWAYS grep `^#{1,3}` headers of IMPLEMENTATION.md and AGENT MEMORY.md. Grep headers of other Rosetta files when needed. MUST use and validate REQUIREMENTS (if exist). If CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, or MEMORY.md files are missing, STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`.",
      "depends_on": ["s-upgrade-check"]
    },
    {
      "id": "s-request-size",
      "name": "Identify request size and route",
      "prompt": "Classify request as SMALL (1-2 file changes/activities and only one area affected), MEDIUM (up to ~10 file changes/activities and only one area affected), or LARGE (more than 10 file changes/activities or multiple areas affected). Regardless of size load rosetta workflow (it uses request sizing). Reevaluate request size and workflow when scope changes or new information is received and output user 'Request size changed' or 'Workflow changed'. YOU MUST USE subagents for MEDIUM AND LARGE.",
      "depends_on": ["s-read-docs"]
    },
    {
      "id": "s-orchestrator-only-contract",
      "name": "Load orchestrator-only contract",
      "prompt": "MUST USE SKILL `orchestrator-contract` as first action before dispatching any subagents. MUST USE SKILL `hitl` unless explicitly requested in prompt with exactly `No HITL`.",
      "depends_on": ["s-request-size"]
    },
    {
      "id": "s-orchestrator-only-load-workflow",
      "name": "Load orchestrator-only workflow and check state",
      "prompt": "MUST ACQUIRE <workflow TAG from available workflows, example: workflows/coding-flow.md> FROM KB TO LOAD THE MOST MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS DEFINITION FOR ALL REQUEST SIZES. Load workflow state if requested to continue. Handle planning and auto mode correctly (distinguish auto vs No HITL). OPERATION_MANAGER upsert workflow phases/steps into the plan with separate, dedicated, detailed, and specific todo tasks based on loaded workflow phases, steps to restore state, steps to resume NOW. Proceed executing all accumulated phases/steps.",
      "depends_on": ["s-orchestrator-only-contract"]
    },
    {
      "id": "s-subagent-only-contract",
      "name": "Load subagent-only contract",
      "prompt": "MUST USE SKILL `subagent-contract` to understand and to follow scope boundaries, input/output contracts, and escalation protocol. Create todo tasks to track sub-activities within each assigned step before starting execution. MUST execute todo tasks and adopt changes. Proceed with request and activities.",
      "depends_on": ["s-request-size"]
    }
  ]
}
```

Attention:

1. If you are subagent exclude "s-orchestrator-only-\*" steps.
2. If you are NOT subagent exclude "s-subagent-only-\*" steps.
3. NONE other steps allowed to be skipped.

</upsert_context_steps>

<process_enforcement_rules>

1. Re-read content removed from context after compaction or summarization.
2. Do not read the same files in context again and again.
3. Be professionally direct; do not allow profanity; require politeness.
4. Proactively use available MCPs, incorporate in plan.
5. Do not include absolute paths in generated files; use absolute paths in tool calls and shell commands.
6. If issues were documented in advance then those pre-existing otherwise those are to be fixed.

</process_enforcement_rules>

<additional_requirements>

1. Grep headers of REFSRC, PATTERNS, and REQUIREMENTS INDEX.md, CODEMAP.md, and TECHSTACK.md files, if available.
2. Search documentation for libraries, versions, and issues which are not in built-in knowledge.
3. Always define explicit colors for tiles, text, and lines in diagrams for both light and dark themes.
4. Prefer built-in tools over shell commands.

</additional_requirements>

</rosetta:bootstrap_core_policy>
