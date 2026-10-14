# API-AQA layout

API-AQA canonical session paths, {IDENTIFIER} derivation, and state-file shape.

<api-aqa-layout>

API-AQA canonical paths -- created at project-config-loading, reused verbatim downstream:

```
agents/TEMP/<FEATURE>/api-aqa-state.md                       (workflow state file -- one per QA project)
plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md           (per-session config -- inside this run's feature plan folder)
plans/api-aqa-{IDENTIFIER}/                   (per-ticket session directory)
plans/api-aqa-{IDENTIFIER}/initial-data.md   (this run's handoff artifact)
```

**`{IDENTIFIER}` derivation:** Issue Tracker key (Jira example: `PROJ-123`) → TMS case ID (TestRail example: `C12345`) → sanitized kebab-case feature (`order-lookup`); first non-empty wins; recorded once in `api-aqa-state.md`, reused as the session-dir name. Project config lives in the per-`{IDENTIFIER}` plan folder (one copy per session -- see anti-pattern); only `agents/TEMP/<FEATURE>/api-aqa-state.md` is a shared singleton (resume anchor). Slug format + underivable rule: see SKILL `<core_concepts>` (underivable trigger here = none of the three sources yields a value).

**State file `agents/TEMP/<FEATURE>/api-aqa-state.md`:** header = Last Updated / Current Phase 0-7 / Test Case Source / Feature / API Base URL (standard shape per SKILL).

</api-aqa-layout>
