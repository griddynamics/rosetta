<arrangement_workspace_reference_source_code>

<description_and_purpose>
Onboard read-only reference code the agent cannot otherwise see into `refsrc/`, documented in `refsrc/INDEX.md`.
</description_and_purpose>

<workflow_context>
Phase 2 of 6. Optional — applies only when `arrangement-state.md` records layout = Single Repo Workspace (Option 1); otherwise skip. Validates and updates `refsrc/`, `refsrc/INDEX.md`, `.gitignore`.
</workflow_context>

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

<ask_for_reference_code step="2.3">
1. USE SKILL `hitl`.
2. Tell the user, briefly: the agent can't see code outside this repo — reference code (backend for a frontend repo, corporate/private libraries, a recently-changed public framework) lets it read without writing to it.
3. Ask if there is reference code to add; if not, record no-op and stop.
4. If yes, ask repo URL/path per codebase; guide: clone read-only into `refsrc/<name>`.
</ask_for_reference_code>

<finalize_new_code step="2.4">
1. Confirm each newly cloned codebase sits under `refsrc/<name>` and stays read-only.
2. Re-apply `validate_existing` checks (gitignore + `refsrc/INDEX.md`) for the new entries.
3. Update `arrangement-state.md`.
</finalize_new_code>

<validation_checklist>
- `.gitignore` carries all three refsrc exceptions.
- Every `refsrc/*` folder has a `refsrc/INDEX.md` entry, and vice versa.
- User was asked about additional reference code.
- `arrangement-state.md` updated.
</validation_checklist>

<pitfalls>
- Treating composite-workspace sibling submodules/folders as `refsrc/` candidates.
- Writing to a `refsrc/` folder instead of the writable workspace.
</pitfalls>

</arrangement_workspace_reference_source_code>
