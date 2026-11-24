# UI-AQA state-file template

UI-AQA state-file template -- initialized by the first phase and updated by every later phase.

<ui-aqa-state-template>

`agents/TEMP/<FEATURE>/ui-aqa-state.md` -- initialized by the first phase to write it, updated by every later phase:

```markdown
# UI-AQA State - <Test Name>

**Last Updated**: [DateTime]
**Current Phase**: [1-8 or COMPLETE]
**TMS Case**: [Provider + case handle/URL, or `N/A — direct description`]
**Feature**: [Feature Name]

## Phase Completion Status

- [ ] Phase 1: Data Collection
- [ ] Phase 2: Requirements Clarification
- [ ] Phase 3: Code Analysis
- [ ] Phase 4: Selector Identification
- [ ] Phase 5: Selector Implementation
- [ ] Phase 6: Test Implementation
- [ ] Phase 7: Test Report Analysis
- [ ] Phase 8: Test Corrections

For a zero-failure run, close the final row as `- [x] Phase 8: Test Corrections — N/A, no failures`; do not leave an incomplete checkbox or invent a correction artifact.

## Key Artifacts & Facts

Resume anchor — full per-phase detail lives in each phase's own artifacts; record here only what resume-after-compaction needs. Use `N/A` / `TBD` until the producing phase runs.

| Artifact / fact | Value |
|---|---|
| Plan file (Phases 1–2) | `plans/ui-aqa-<test-name>/test-plan.md` |
| Code analysis (Phase 3) | `plans/ui-aqa-<test-name>/code-analysis.md` |
| Page sources (Phase 4) | `plans/ui-aqa-<test-name>/page-sources/` |
| Test file(s) (Phase 6) | [paths, or `TBD`] |
| Failure analysis (Phase 7) | [`plans/ui-aqa-<test-name>/failure-analysis.md` once produced, or `N/A — 0 failures`] |
| Root causes (Phase 7) | [one line per confirmed root cause; `None` when 0 failures; full detail in the failure-analysis artifact] |
| HITL approvals | [one line per gate — approving phase + ISO timestamp, e.g. `Phase 2 / 2026-… (answers)`, `Phase 8 / 2026-… (corrections)`; or `N/A`] |
| External sources | [TMS/Wiki providers + canonical handles/URLs; direct description; unavailable sources + reason] |

## Verification-Failure Overrides

[Append a row each time the parent flow's verification-failure unilateral-start override fires. If never fired, write: `None — no overrides applied.`]

- **[ISO timestamp]** — User asserted phases complete: `[user's verbatim claim]`. Failing conditions: `[which preconditions were unmet — state row missing / spot-check artifact absent / etc.]`. Phase started: `[earliest incomplete phase id]`.
```

</ui-aqa-state-template>
