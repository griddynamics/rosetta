---
name: security-flow-readiness
description: "Phase 0 Readiness of security-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["security", "workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<security_flow_readiness>

<description_and_purpose>
Establish minimal context and gate secret-bearing files before model source ingestion.
</description_and_purpose>

<workflow_context>
Phase 0. Mandatory `executor`; bounded metadata and commands only.
</workflow_context>

<phase_steps>
1. Inventory request metadata
2. Inventory available tools
3. Run filename-only secret gate
4. Return gate decision
</phase_steps>

<execute_readiness step="0.1" subagent="executor" role="Bounded readiness and secret-gate operator" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. USE SKILL `sensitive-data`.
4. Read request metadata only: target names, paths, environment labels, requested review type.
5. List installed/reachable tools without installation, authentication, or network calls.
6. Prefer an approved filename-only secret scanner.
7. Otherwise USE SKILL `security` for its filename-only fallback.
8. Return affected filenames only, never matches or content.
9. Classify environment from approved metadata, not file values.

</execute_readiness>

<gate step="0.2">

- No candidate files: PASS.
- DEV/QA only: NEEDS-HITL; recommend exclusions.
- Above-QA or ambiguous: STOP-HIGH-RISK.
- Scanner unusable: STOP; do not ingest source.

</gate>

<validation_checklist>
- No source content entered agent context.
- Output contains filenames and metadata only.
- Tool inventory records availability, not assumptions.
- Gate decision matches the strictest environment.
</validation_checklist>

</security_flow_readiness>
