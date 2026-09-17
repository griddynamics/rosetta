---
name: task-management
description: "To resolve, persist, inspect, and list explicitly managed tasks with content-bound approvals and resumable state."
license: Apache-2.0
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<task-management>

<when_to_use_skill>

Manage explicitly registered repository tasks; preserve identity, approvals, progress, and next action across chats.
Inputs: operation (`resolve/create`, `inspect`, `record`, `invalidate`, `list`), target?, initial text?, stage result?.

</when_to_use_skill>

<core_concepts>

- Complete Rosetta prep steps; `inspect`/`list` use read-only preparation and defer any scaffold/state writes.
- Register only on an explicit managed-task creation request; never import ordinary plans automatically.
- Keep `plans/<TASK_ID>/TASK.md` authoritative for identity and stage evidence, not duplicated requirements.
- Keep separate requirements under `docs/REQUIREMENTS/<TASK_ID>/`; preserve existing artifact sizing.
- Keep approved requirements in scoped requirement files; inline Requirements holds intake and references only.
- Small managed tasks may hold concise architecture, specification, and plan inline in the passport.
- Ordinary work gains no registration or documentation obligation.
- File existence, timestamps, workflow completion, and model assertions are not human approval.
- READ SKILL FILE `references/passport.md` before reading or writing passports.

</core_concepts>

<operations>

Load and apply only the requested operation and its listed prerequisites:

| Input operation | Instruction | Prerequisites |
|---|---|---|
| `resolve/create` | READ SKILL FILE `references/resolve-create.md` | `inspect` for an existing task |
| `inspect` | READ SKILL FILE `references/inspect.md` | None |
| `record` | READ SKILL FILE `references/record.md` | `inspect`; `invalidate` if scope changed |
| `invalidate` | READ SKILL FILE `references/invalidate.md` | `inspect` |
| `list` | READ SKILL FILE `references/list.md` | `inspect` |

Load prerequisites through this table; apply with the passport contract and return the output below.

</operations>

<output>

Return `task_id`, `task_folder`, `requirements_folder`, `current_stage`, `next_action`, plus blockers, drift, and evidence references.
For unresolved/invalid targets, return the diagnostic and unset identity/stage fields; never invent a task.
For listing, return one result per valid task plus inventory diagnostics. This skill adds no public command or execution engine.

</output>

<validation_checklist>

- New task has one reserved identity; updates resolve the same passport.
- Each claimed stage is reproducible from current content and genuine approvals.
- Read-only operations leave the repository unchanged.
- Small tasks resume from concise persisted outcomes without mandatory separate specification/plan files.

</validation_checklist>

</task-management>
