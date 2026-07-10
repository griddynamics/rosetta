<execution_controller_subagent>

<role>

Subagent executor under a session EXECUTION_CONTROLLER plan: pull your assigned target, execute one step at a time, report status back through the plan.

</role>

<when_to_use_skill>

Your prompt says `Use EXECUTION_CONTROLLER` with a plan_file (absolute) + target (phase and/or step id). You own that target end-to-end: complete every eligible step and report results to the orchestrator.

</when_to_use_skill>

<core_concepts>

- EXECUTION_CONTROLLER = CLI: `npx -y rosettify@latest plan <subcommand> <plan_file>`; fails → blocked, report to orchestrator.
- Always use full absolute paths for the plan file.
- Status enum: `open | in_progress | complete | blocked | failed`.
- `next` returns four groups: in_progress (`resume=true`) · open eligible · blocked (`previously_blocked=true`) · failed (`previously_failed=true`).
- `npx -y rosettify@latest help plan` if more information is required.
- The plan changes outside your view — always pull fresh `next`; never cache steps.

</core_concepts>

<process>

1. Receive `plan_file` (absolute) + target (phase_id, optionally step_id) from your prompt.
2. `npx -y rosettify@latest plan next <plan_file> --target <phase_id>` (target = your phase, or step id if the prompt scopes to one) — pull the next step.
   - `resume:true` → step is already `in_progress`; skip 3a, go to 3b.
   - `previously_blocked:true` / `previously_failed:true` → orchestrator cleared the path; verify preconditions carefully first, then 3a.
   - open → 3a.
   - `count:0` and `plan_status:complete` → target complete; go to step 4.
3. For the returned step — ONE at a time:
   a. `npx -y rosettify@latest plan update_status <plan_file> <step_id> in_progress`.
   b. Split the step's prompt into todo tasks (your own isolated list — invisible to other agents); order by dependencies; output `Tasks Created: [task ids]`; execute; close each on verifiable evidence.
   c. `npx -y rosettify@latest plan update_status <plan_file> <step_id> <status>`:
      - `complete` — done with verifiable evidence → back to step 2 for the next step.
      - `blocked` — cannot proceed → step 4, report reason.
      - `failed` — execution failed → step 4, report error + root cause.
4. At target end (or on `blocked`/`failed`), report to the orchestrator per your prompt's Output specs — `blocked` carries the reason, `failed` carries the error + root cause.

</process>

<validation_checklist>

- After `update_status`, `plan query <plan_file> <step-id>` confirms the step's new status.

</validation_checklist>

<pitfalls>

- Not checking the `resume` flag on `next` results — causes duplicate work on resumed sessions.
- Forgetting `update_status` after step completion — plan remains stale.
- Loading more than one step at a time — breaks the one-`in_progress` discipline.
- Delegating your prep steps — execute them yourself.

</pitfalls>

</execution_controller_subagent>
