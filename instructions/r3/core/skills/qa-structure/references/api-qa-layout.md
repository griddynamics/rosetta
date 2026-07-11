# API-QA layout

API-QA canonical session paths, {IDENTIFIER} derivation, and state-file shape.

<api-qa-layout>

API-QA canonical paths -- created at project-config-loading, reused verbatim downstream:

```
agents/TEMP/<FEATURE>/api-qa-state.md                       (workflow state file -- one per QA project)
plans/api-qa-{IDENTIFIER}/api-qa-project-config.md           (per-session config -- inside this run's feature plan folder)
plans/api-qa-{IDENTIFIER}/                   (per-ticket session directory)
plans/api-qa-{IDENTIFIER}/initial-data.md   (this run's handoff artifact)
```

**`{IDENTIFIER}` derivation:** Jira key (`PROJ-123`) → TestRail case ID (`C12345`) → sanitized kebab-case feature (`order-lookup`); first non-empty wins; recorded once in `api-qa-state.md`, reused as the session-dir name. Project config lives in the per-`{IDENTIFIER}` plan folder (one copy per session -- see anti-pattern); only `agents/TEMP/<FEATURE>/api-qa-state.md` is a shared singleton (resume anchor). Slug format + underivable rule: see SKILL `<core_concepts>` (underivable trigger here = none of the three sources yields a value).

**State file `agents/TEMP/<FEATURE>/api-qa-state.md`:** header = Last Updated / Current Phase 0-7 / Test Case Source / Feature / API Base URL (standard shape per SKILL).

</api-qa-layout>
