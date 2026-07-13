# UI-QA state-file template

UI-QA state-file template -- initialized by the first phase and updated by every later phase.

<ui-qa-state-template>

`agents/TEMP/<FEATURE>/ui-qa-state.md` -- initialized by the first phase to write it, updated by every later phase:

```markdown
# UI-QA State - <Test Name>

**Last Updated**: [DateTime]
**Current Phase**: [1-8 or COMPLETE]
**TestRail Case**: [Test Case ID/URL]
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

## Key Artifacts & Facts

Resume anchor — full per-phase detail lives in each phase's own artifacts; record here only what resume-after-compaction needs. Use `N/A` / `TBD` until the producing phase runs.

| Artifact / fact | Value |
|---|---|
| Plan file (Phases 1–2) | `plans/ui-qa-<test-name>/test-plan.md` |
| Code analysis (Phase 3) | `plans/ui-qa-<test-name>/code-analysis.md` |
| Page sources (Phase 4) | `plans/ui-qa-<test-name>/page-sources/` |
| Test file(s) (Phase 6) | [paths, or `TBD`] |
| Failure analysis (Phase 7) | [`plans/ui-qa-<test-name>/failure-analysis.md` once produced, or `N/A — 0 failures`] |
| Root causes (Phase 7) | [one line per confirmed root cause; `None` when 0 failures; full detail in the failure-analysis artifact] |
| HITL approvals | [one line per gate — approving phase + ISO timestamp, e.g. `Phase 2 / 2026-… (answers)`, `Phase 8 / 2026-… (corrections)`; or `N/A`] |

## Verification-Failure Overrides

[Append a row each time the parent flow's verification-failure unilateral-start override fires. If never fired, write: `None — no overrides applied.`]

- **[ISO timestamp]** — User asserted phases complete: `[user's verbatim claim]`. Failing conditions: `[which preconditions were unmet — state row missing / spot-check artifact absent / etc.]`. Phase started: `[earliest incomplete phase id]`.
```

</ui-qa-state-template>
