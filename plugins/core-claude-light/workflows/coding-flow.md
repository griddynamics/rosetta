---
name: coding-flow
description: "Workflow for all coding: features, fixes, refactors, unit tests, etc.; scales small to large."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<coding_flow>

<description_and_purpose>

PROFILE TEST CONTENT — lightweight profile.

This document exists to prove that a profile-scoped FilenameDirective supersedes the base document.
If you are reading this inside a generated plugin, the active profile is `lightweight` and the
`profile-lightweight-only` + `overwrite` tokens resolved as intended.

</description_and_purpose>

<workflow_phases>

<prepare phase="1" priority="must">

1. USE SKILL `load-project-context`, `hitl`
2. Restate the request and confirm scope with the user.

</prepare>

<implement phase="2" priority="must">

1. Make the change.
2. Run the project's checks.

</implement>

<validate phase="3" priority="must">

1. Confirm the change works.
2. Report what was done and what was skipped.

</validate>

</workflow_phases>

</coding_flow>
