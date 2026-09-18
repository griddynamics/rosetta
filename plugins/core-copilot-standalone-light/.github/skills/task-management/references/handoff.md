---
name: handoff
description: "End a stage in files; hand the user one next command."
baseSchema: docs/schemas/generic.md
---

<handoff>

1. A stage boundary is a hard stop. Do not ask whether to continue, do not offer the next stage as an option, and do not begin it in this conversation. An original request naming the whole path, an earlier approval, and decision-bound continuation authorize work inside the invoked stage only, never across its boundary.
2. Stop at a real boundary: the stage's own approval gate passed, or the stage cannot finish. Mid-stage work continues normally; a pending user decision is raised in place, never deferred to a new chat.
3. Before reporting, `record` everything the next chat needs from files alone: approved artifacts with their evidence, decisions and rationale, consultation advice, residual risks, unresolved questions, and the derived next action. Context that exists only in this conversation does not survive it; leaving it unsaved is a defect, not a handoff.
4. Report what the stage produced, the task folder and requirements folder as paths, what is approved, and what remains open.
5. Then tell the user to open a new chat, and give exactly one command line to type there. Say why plainly: the next stage resumes from the recorded files, and a fresh context keeps it accurate.
6. READ SKILL FILE `references/command-rendering.md` and render that line, and every other command shown here, by it.
7. Stage blocked or incomplete: same stop and same rendering, but hand back the continuation command for the current stage together with the decisions or inputs still required.
8. Accepted and complete task: report acceptance and offer the listing command; a finished task needs no new chat.

</handoff>
