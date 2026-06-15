---
name: qa-layout
description: QA (backend API) canonical session paths, {IDENTIFIER} derivation, and state-file shape.
---

<qa-layout>

QA (backend API) canonical paths — created/seeded at Phase 0, reused verbatim downstream:

```
agents/qa-state.md                       (workflow state file — one per QA project)
agents/qa/qa-project-config.md           (project-wide config — shared across ALL tickets)
agents/qa/{IDENTIFIER}/                   (per-ticket session directory)
agents/qa/{IDENTIFIER}/initial-data.md   (this run's handoff artifact)
```

**`{IDENTIFIER}` derivation:** prefer Jira key (`PROJ-123`) → TestRail case ID (`C12345`) → sanitized kebab-case feature (`order-lookup`); first non-empty wins; recorded once in `qa-state.md` and reused as the session-dir name everywhere. The project config is project-wide, NOT per-`{IDENTIFIER}` — every session reads the one shared file.

**State file `agents/qa-state.md`:** header (Last Updated / Current Phase 0-7 / Test Case Source / Feature / API Base URL) + 8-row `## Phase Completion Status` + per-phase append blocks. Seed skeleton is kept inline in `qa-flow-project-config-loading.md` (Phase 0, step 0.1) — tiny + always-needed, so not a separate asset. Each phase appends only its own delta.

</qa-layout>
