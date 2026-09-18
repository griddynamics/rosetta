# task-management

Persists explicitly managed tasks and derives their next stage from current approved evidence.

## Why it exists

A folder or old approval does not prove current requirements are ready. This skill separates
task identity, supplementary progress, current approval receipts, and immutable prior evidence.
It makes task resumption and listing use the same passport contract.

## When to engage

- An orchestrator creates, resolves, inspects, updates, or lists explicitly managed tasks.
- Rosetta preparation must be complete; the caller supplies operation, target, and available input.
- Ordinary work stays unregistered. Existing plan folders are not automatically imported.

## How it works

`consultation` routes to `references/consultation.md`: prepare a task/conversation-scoped brief, restore it from current durable evidence, and preserve advice as execution notes. The workflow dispatches the consultant; this skill does not spawn agents or grant approvals. SMALL can keep notes in `## History`; detailed reports belong to `artifacts.execution` with a handoff reference.

`SKILL.md` routes the caller's intent through resolution/creation, inspection, recording,
invalidation, or read-only listing, loading only the matching private operation reference and its listed prerequisites.
`references/passport.md` defines the YAML frontmatter,
Markdown sections, receipts, and recovery; `references/fingerprints.md` defines content selectors.

The passport lives at `plans/<TASK_ID>/TASK.md`; separate requirement artifacts live under
`docs/REQUIREMENTS/<TASK_ID>/`. Approved requirements remain there; inline Requirements is intake/links.
Small managed tasks may keep concise architecture, specification, and plan inline.
Separate specifications and plans follow existing sizing rules.

Inspection derives requirements-needed, spec-needed, implementation-needed, or done;
corrupt records remain unknown. Progress and blockers supplement the result.

## Mental hooks & unexpected rules

- "File existence, timestamps, workflow completion, and model assertions are not human approval."
  Stage advancement needs content-bound evidence, not a plausible status label.
- "Do not hash `TASK.md` as a whole" keeps progress updates from invalidating stage content.
- "Never restore invalidated pointers automatically" prevents an old approval reviving after a revert.
- "Existing directory without passport -> unregistered" prevents accidental task creation/import.
- "Read-only operations leave the repository unchanged" keeps inspection separate from repairs.
- Normative selectors exclude only defined execution metadata; completing work does not revoke its requirements.
- Receipt inventories are stage-owned; creating a specification cannot invalidate requirements.
- Interrupted review/testing/validation repeats unless complete current verification proves freshness.

## Invariants — do not change

- Skill name and folder: `task-management`; `user-invocable: false` keeps it an internal method.
- Operations: resolve/create, inspect, record, invalidate, list, consultation; callers address these through the skill.
- Output fields: task_id, task_folder, requirements_folder, current_stage, next_action.
- Identity is immutable; folders use `plans/<TASK_ID>` and `docs/REQUIREMENTS/<TASK_ID>`.
- Schema version 1 and current receipt kinds have one definition in `references/passport.md`.
- Existing plain workflows gain no registration or document obligation.

## Editing guide

Keep routing and externally consumed output in `SKILL.md`; put passport representation and
binding semantics in the reference. Treat identity, stage derivation, approval invalidation,
and read-only listing as compatibility-sensitive. Consumers are the task command workflows;
they invoke this skill without linking its private reference. This is an instruction contract,
not an executable task database or a new public command.
