# Pre-Emit Validation Checklist — qa-project-config

Loaded on demand from SKILL.md `<validation_checklist>` at session-init completion. The base SKILL.md keeps the 6-step process + `<safety_boundaries>` + `<failure_handling>` + `<success_criteria>` inline (decision-time content); this file holds the proof-oriented validation items.

Mirrors the same lazy-loading pattern other data-collection skills use.

---

## Validation items

Before declaring this skill complete, all of the following must hold:

- **Session directory created:** `agents/qa/{IDENTIFIER}/` exists.
- **State file initialized:** `agents/qa-state.md` exists with the initial stub from step 2 (Last Updated / Current Phase: 0 / IDENTIFIER / Phase Completion Status table with Phase 0 checked).
- **Project config present:** `agents/qa/qa-project-config.md` (canonical project-wide path) exists and is non-empty — either pre-existing (step 3 path A) or freshly saved by step 5 (path B).
- **Initial-data file written:** `agents/qa/{IDENTIFIER}/initial-data.md` exists with all four template fields populated (Initial user prompt / Project config file / Test case reference / Additional links).
- **IDENTIFIER consistency** per step 2 — same value in (a) `agents/qa/{IDENTIFIER}/` directory name, (b) `agents/qa-state.md` IDENTIFIER field, (c) `initial-data.md` path. Any mismatch → re-run step 2.
- **No empty placeholders:** project config has real values (or explicit `TBD` where optional + explanation), not blank fields.
- **Canonical paths only:** no deprecated `<agent_folder>` placeholders; paths follow the scheme in steps 2 + 3 + 5.
- **No literal credentials persisted** per `<safety_boundaries>` Redaction-at-intake rule; any redaction noted in `## Additional Notes`.
- **No fabricated `{IDENTIFIER}`** per `<failure_handling>` — chosen value traces to a real TestRail ID / Jira key / feature reference.
