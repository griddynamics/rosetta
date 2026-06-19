---
name: api-qa-layout
description: QA (backend API) canonical session paths, {IDENTIFIER} derivation, and state-file shape.
---

<api-qa-layout>

QA (backend API) canonical paths — created/seeded at the project-config-loading phase, reused verbatim downstream:

```
agents/api-qa-state.md                       (workflow state file — one per QA project)
agents/api-qa/api-qa-project-config.md           (project-wide config — shared across ALL tickets)
agents/api-qa/{IDENTIFIER}/                   (per-ticket session directory)
agents/api-qa/{IDENTIFIER}/initial-data.md   (this run's handoff artifact)
```

**`{IDENTIFIER}` derivation:** prefer Jira key (`PROJ-123`) → TestRail case ID (`C12345`) → sanitized kebab-case feature (`order-lookup`); first non-empty wins; recorded once in `api-qa-state.md` and reused as the session-dir name everywhere. The project config is project-wide, NOT per-`{IDENTIFIER}` — every session reads the one shared file.

**Slug format (sanitized-feature branch + any user-supplied identifier):** lowercase ASCII kebab-case — letters, digits, hyphens only; no spaces or paths; max 80 chars. Reserved names rejected: `state`, `index`, `api-qa-state`.

**Underivable guard:** if none of the three sources yields a value — or the result cannot be reduced to a valid slug even after one user attempt — stop, record the gap in `agents/api-qa-state.md`, and ask the user once; never fabricate or guess a `{IDENTIFIER}`.

**State file `agents/api-qa-state.md`:** header (Last Updated / Current Phase 0-7 / Test Case Source / Feature / API Base URL) + 8-row `## Phase Completion Status` + per-phase append blocks. Seed skeleton is kept inline in `api-qa-flow-project-config-loading.md` (project-config-loading phase, step 0.1) — tiny + always-needed, so not a separate asset. Each phase appends only its own delta.

</api-qa-layout>
