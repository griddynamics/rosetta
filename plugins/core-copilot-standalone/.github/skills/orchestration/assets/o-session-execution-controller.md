<execution_controller_orchestrator>

<role>

Senior session-level execution planner: author and own the plan (plan ⊃ phases ⊃ steps ⊃ tasks), track it, adapt it, keep it authoritative. Subagents own execution of assigned targets.

</role>

<when_to_use_skill>

The orchestration LARGE band (session-level plan across many files/areas). You build phases/steps; delegate targets to subagents.

</when_to_use_skill>

<core_concepts>

- EXECUTION_CONTROLLER = CLI: `npx -y rosettify@latest plan <subcommand> <plan_file>`; if it fails MUST FALLBACK to built-in todo tasks — see `<todo-tasks-fallback>`.
- Always use full absolute paths for the plan file.
- Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`.
- Help: `npx -y rosettify@latest help plan` provides full help JSON — run first to learn which subcommands each model supports.
- Phases are sequential: steps from a later phase do not appear until all steps in earlier phases are complete.
- Status propagation: bottom-up only (steps → phases → plan); plan root status is always derived, never set directly.
- `upsert` follows RFC 7396: null removes keys, nested objects merge (not replace), scalars replace; status fields in a patch are silently ignored — only `update_status` modifies status.
- The plan changes outside your view (subagents, upserts) — always pull fresh `next`; never cache steps.

</core_concepts>

<process>

1. `npx -y rosettify@latest help plan` to confirm available subcommands/models.
2. Create plan: `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>' '<phase-steps-json>'` — seeds the `ph-prep` phase and appends your actual work steps to it.
3. Add every new phase via `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>' '<phase-steps-json>'` — seeds the subagent prep steps and appends your actual steps; plain `upsert` only for follow-up steps and patching existing items. Adapt continuously — reorder, re-analyze, add, re-scope as discovery/subagent returns shift reality. Every plan create/change → output `Plan has been changed: [summary]`.
4. Delegate a target to a subagent: provide plan_file + phase_id (optionally step_id). Subagent owns that target end-to-end. Decide which phases run in parallel — parallel subagents MUST each own a distinct phase (collision-free).
5. Loop: `next` → dispatch/execute → `update_status` — not done until `plan_status: complete` AND `count: 0` in `next` output.
6. Track: `show_status` / `query` for state; clear `blocked`/`failed` steps so subagents can retry.
7. Close: confirm the plan derives to `complete` (never set root directly), verify via `show_status`/`query`; keep the plan and core Rosetta files current as phases land.

</process>

<subagent_prompt_additions only-if="EXECUTION_CONTROLLER is active">

Additive to `<subagent_prompt_template>` — insert after the `You are <role>...` line:

```
Use EXECUTION_CONTROLLER. Plan: <abs path plan.json> · Phase: <id> · [Step: <id>]
```

Tasks now live in the EXECUTION_CONTROLLER plan: `Tasks*` contains only phase/step id refs — never repeat their content (DRY).

</subagent_prompt_additions>

<validation_checklist>

- `npx -y rosettify@latest help plan` exits without error and returns structured help JSON.
- After `update_status`, `show_status` phase status matches the aggregate of its steps.
- `plan query <plan_file> [entire_plan | phase-id | step-id]` to verify the entire plan, a phase, or a step.

</validation_checklist>

<pitfalls>

- Forgetting `update_status` after step completion — plan remains stale.
- Delegating `ph-prep` steps — every agent executes its own prep, never delegates it.
- Setting plan root status directly — it is always derived from phases.
- Setting phase status directly — rejected as `phase_status_is_derived`.

</pitfalls>

<schema>

Plan JSON structure (author phases/steps via `create`/`upsert`):

```
plan: name(req) · description("") · status(derived) · created_at(ISO8601) · updated_at(ISO8601)
  phases[]: id(req, unique plan-wide) · name(req) · description("") · status(derived from steps)
            · depends_on[phase-id]([]) · subagent? · role? · model?
    steps[]: id(req, unique plan-wide) · name(req) · prompt(req) · status(open)
             · depends_on[step-id]([], cross-phase allowed) · subagent? · role? · model?
```

Status enum: `open | in_progress | complete | blocked | failed`.

Propagation (bottom-up, steps → phases → plan root; root always derived):

| Children condition | Derived status |
|---|---|
| All `complete` | `complete` |
| Any `failed` | `failed` |
| Any `blocked` | `blocked` |
| Any `in_progress` or `complete` | `in_progress` |
| Otherwise | `open` |

Dependencies:

- `depends_on` step-level = step IDs (cross-phase allowed); phase-level = phase IDs.
- A step/phase is eligible only when all `depends_on` IDs have `status: complete`.
- IDs unique across the entire plan (phases and steps share one namespace).

Constants: max 100 phases/plan · 100 steps/phase · 50 deps/item · 20000 chars/string field · 256 chars/name field.

</schema>

<todo-tasks-fallback>

CLI unavailable → carry the plan on built-in todo tasks:

- Mirror plan ⊃ phases ⊃ steps as todo tasks; adapt them as you would the plan.
- Subagent prompts: `<subagent_prompt_additions>` does not apply — `Tasks*` carries full task content.
- Each agent's todo list is isolated and invisible to others — subagents still receive targets via prompt only.
- After creating tasks output: `Tasks Created: [task ids]`.

</todo-tasks-fallback>

</execution_controller_orchestrator>
