<security_flow_readiness>

<description_and_purpose>
Establish minimal context and gate secret-bearing files before model source ingestion.
</description_and_purpose>

<workflow_context>
Phase 1. Mandatory `executor`; bounded metadata and commands only.
</workflow_context>

<phase_steps>
1. Inventory request metadata
2. Inventory available tools
3. Run filename-only secret gate
4. Return gate decision
</phase_steps>

<execute_readiness step="1.1" subagent="executor" role="Bounded readiness and secret-gate operator" subagent_required_model="gpt-5.4, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. USE SKILL `sensitive-data`.
4. Read request metadata only: target names, paths, environment labels, requested review type.
5. List installed/reachable tools without installation, authentication, or network calls.
6. Prefer an approved filename-only secret scanner.
7. Otherwise USE SKILL `security` for its filename-only fallback.
8. Return affected filenames only, never matches or content.
9. Classify environment from approved metadata, not file values.
10. Update `security-flow-state.md`.

</execute_readiness>

<gate step="1.2">

Return exactly one token:

- No candidate files: PASS.
- DEV/QA envs only: NEEDS-HITL; recommend exclusions.
- Above-QA or ambiguous: STOP-HIGH-RISK.
- Scanner unusable or scanner exit 2: STOP-SCANNER-UNUSABLE; do not ingest source.

</gate>

<validation_checklist>
- No source content entered agent context.
- Output contains filenames and metadata only.
- Tool inventory records availability, not assumptions.
- Gate decision matches the strictest environment.
</validation_checklist>

</security_flow_readiness>
