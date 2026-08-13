---
name: arrange-workspace-flow-reference-source-code
description: "Phase 2 Reference Source Code of arrange-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrange", "workspace", "refsrc", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrange_workspace_reference_source_code>

<description_and_purpose>
Onboard read-only reference code the agent cannot otherwise see into `refsrc/`, documented in `refsrc/INDEX.md`.
</description_and_purpose>

<phase_steps>
1. Identify existing reference source code
2. Validate it is defined correctly, fix gaps
3. Ask user for additional reference source code
4. Validate and finalize what user provides
</phase_steps>

<identify_existing step="2.1">
1. Read `docs/ARCHITECTURE.md`/`docs/CONTEXT.md` for mentions of external/reference code, if they already exist.
2. List existing `refsrc/*` folders and existing `refsrc/INDEX.md` entries.
</identify_existing>

<validate_existing step="2.2">
1. Confirm root `.gitignore` has these exceptions; add any missing:
```
agents/TEMP/
refsrc/
!refsrc/INDEX.md
```
2. Confirm every `refsrc/*` folder has a matching `refsrc/INDEX.md` header; add missing entries.
3. Flag any `refsrc/INDEX.md` entry with no matching folder.
</validate_existing>

<ask_for_reference_code step="2.3" type="HITL">
1. Tell the user, briefly: the agent can't see code outside this repo — reference code (backend for a frontend repo, corporate/private libraries, a recently-changed public framework) lets it read without writing to it.
2. Ask if there is reference code to add; if not, record no-op and stop.
3. If yes, ask repo URL/path per codebase; guide: clone read-only into `refsrc/<name>`.
</ask_for_reference_code>

<review_reference step="2.4">
1. Confirm each newly cloned codebase sits under `refsrc/<name>` and stays read-only.
2. Re-apply `validate_existing` checks (gitignore + `refsrc/INDEX.md`) for the new entries.
</review_reference>

<validation_checklist>
- `.gitignore` carries all three refsrc exceptions.
- Every `refsrc/*` folder has a `refsrc/INDEX.md` entry, and vice versa.
- User was asked about additional reference code.
</validation_checklist>

<pitfalls>
- Treating composite-workspace sibling submodules/folders as `refsrc/` candidates.
- Writing to a `refsrc/` folder instead of the writable workspace.
</pitfalls>

</arrange_workspace_reference_source_code>
