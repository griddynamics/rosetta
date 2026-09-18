---
name: list
description: "Apply the list operation for managed repository tasks."
baseSchema: docs/schemas/generic.md
---

<list>

1. Enumerate immediate `plans/*/TASK.md` passports and reserved `plans/TASK-<digits>/` folders lacking a passport.
   Inspect each read-only; no repairs, migrations, folder creation, fingerprint updates, or workflow execution.
2. Return ID | title | derived stage | progress/blockers | folder | next action.
   Sort valid IDs numerically; list duplicate, corrupt, misplaced, unreadable, or incomplete reservations separately with their paths.
3. Distinguish no registered tasks from unavailable/unreadable inventory. Ordinary plan folders remain unregistered.
4. READ SKILL FILE `references/command-rendering.md` and render next actions by it; use exact ID/folder, quote folders containing spaces.

</list>
