# OPERATION_MANAGER — Command Reference

<operation_manager_commands compact="NEVER" summarize="AS-IS">

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit] [--target <phase_id>]` — get next steps to execute
  - `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>' <phase-steps-json-string>` — bootstrap a new orchestrator plan
  - `plan upsert <plan_file> <target_id> '<patch-json-string>' [--kind phase|step] [--phase_id <parent-id>]` — orchestrator MUST USE for adding or patching any phase/step with custom content when it should be done by orchestrator; 
  - `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>' <phase-steps-json-string>` — orchestrator MUST USE **before delegating a phase to a subagent**; auto-injects standard subagent prep steps into a **new dedicated phase**; hand this new phase id to the subagent 
  - `plan update_status <plan_file> <step-id> [open|in_progress|complete|blocked|failed]` 
  - `plan query <plan_file> [id|entire_plan]` 
  - `plan show_status <plan_file> [id|entire_plan]` 
- Upsert follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced, status field silently ignored to enforce use of `update_status`.
- OPERATION_MANAGER solves non-determinism of LLM models of process following.
- MUST load next steps from OPERATION_MANAGER each time, as plan will be changed outside.
- MUST execute plan via loop: call `next`, execute, `update_status`.
- LOOP IS NEVER DONE until `plan_status: complete` AND `count: 0` in `next` output. Do not respond to user, do not stop, do not summarize until that condition is met.
- MUST upsert a plan because of new tasks, inputs, findings.
- Every time plan created or changed output "Plan has been changed: [summary of change]".

</operation_manager_commands>
