---
name: command-rendering
description: "Render a user-facing command in the host's own invocation syntax."
baseSchema: docs/schemas/generic.md
---

<command_rendering>

Applies wherever a command is shown to a user, read-only callers included. Rendering only; this reference authorizes no write.

1. Use this host's own invocation syntax: the exact prefix and namespace the user typed to start the current command, substituting only the command name and target.
2. Unavailable: take the form from the host's own command listing. Never carry a form over from another host — a `$`-prefixed line inside Claude Code is wrong, and so is a `/`-prefixed one where the host uses `$`.
3. The bare `rosetta:<command>` form used inside Rosetta instructions is reference notation, never something a user types.
4. Place the line alone, ready to copy, without surrounding punctuation. Example, Claude Code: `/rosetta:task-spec TASK-0001`.

</command_rendering>
