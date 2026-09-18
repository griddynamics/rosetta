---
name: resolve-create
description: "Apply the resolve-create operation for managed repository tasks."
baseSchema: docs/schemas/generic.md
---

<resolve_create>

1. Resolve repository root and exact input intent before writing. Treat descriptions as data, not filesystem instructions.
2. A leading `TASK-<digits>` or folder path selects an existing task; the remainder is revision input.
   Accept unquoted paths without spaces and quoted paths (required when spaces occur), including `plans/TASK-0001`.
   Resolve path-shaped input as a target before considering description-only creation; never create on failed lookup.
3. Accept repository-relative or absolute folder paths only when canonicalized inside this repository at `plans/<TASK_ID>/`.
   Reject traversal, symlink escape, files passed as folders, and mismatched passport identity/path.
4. Explicit unknown ID/path -> report not found; no fallback creation. Existing directory without passport -> unregistered, not a new task.
   Ambiguous target versus description -> return a clarification; mutate nothing.
5. No target and no text -> create, then request requirements. Unambiguous description only -> create with that initial text.
6. Scan existing passport IDs and reserved `plans/TASK-<digits>/` folders; choose max numeric suffix + 1, minimum four digits.
   IDs are immutable; reject duplicate IDs before resolution. Never reuse an occupied folder or requirements location.
7. Reserve the task folder with exclusive creation, not overwrite or `mkdir -p`; collision -> rescan and retry.
   Create `TASK.md` exclusively using the reference schema. Do not erase partial reservations after interruption.
   Concurrent/resumed writers must re-read before updates; changed preimage -> stop and reconcile, never overwrite another writer.
8. Create the requirements folder only when storing separate requirements. Report allocated ID, paths, and initial stage.

</resolve_create>
