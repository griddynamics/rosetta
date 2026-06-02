# Part B Mechanics — aqa-test-debugging

Loaded on demand from `SKILL.md` when Part B (steps 7–9) runs. The base `SKILL.md` keeps the orchestration steps + the canonical taxonomy (step 3) + safety boundaries + success criteria + validation checklist; this file holds the heavier Part-B-only material so Part-A invocations don't carry it in active context.

---

## Proposed Change record template (referenced from SKILL.md step 7 + `<output_format>` + Part-B `<validation_checklist>`)

**Single source of truth for the Proposed Change field set.** Step 7 emits one entry per Proposed Change using this template; `<output_format>`'s `### Proposed Corrections` section embeds them; the Part-B validation checklist verifies the 6 fields are populated.

```markdown
### Proposed Change <N>: <one-line title>

**File**: <path/to/file>
**Current Code**:
```
<snippet of code being replaced>
```

**Proposed Code**:
```
<snippet of replacement code>
```

**Reason**: <one-line — how this fix addresses the cited root cause>
**Impact**: <what this change affects — only the cited test? other tests sharing the helper? page-object consumers?>
**Risk**: Low | Medium | High
```

**Required fields (6):** File, Current Code, Proposed Code, Reason, Impact, Risk. Partial entries are validation failures per the checklist.

**Matching fixes to root cause categories** (per the canonical taxonomy in `SKILL.md` step 3):

- Selector / Locator issues → update page objects (escalates to the selector-implementation phase if a new selector is needed)
- Timing / Visibility issues → add waits or adjust timing strategy
- Assertion failures → fix logic or expected values (NEVER silently flip assertion semantics — see `<safety_boundaries>` "Never alter test intent")
- Setup / Data issues → fix preconditions / fixtures / session
- Test code issues → fix implementation / helper API / await-async
- Application bug → escalate per `<safety_boundaries>` "Test-code-only writes" — Part B does NOT author app-source fixes
- Unknown → no Proposed Change emitted; record under `<failure_handling>` "evidence missing" instead

---

## Step 9 Iteration-Cap State-File Protocol (referenced from SKILL.md step 9)

The Part A → Part B cycle may loop (analysis → corrections → re-execution → analysis again on still-failing tests). The cycle is **capped at 3 iterations** to prevent runaway diagnose/patch loops that mask deeper application bugs or fundamental spec mismatches.

### Counter mechanics

- **State file field name:** `Phase 7/8 iteration: N` (default; the parent workflow MAY override the field name in its state schema).
- **Initial state:** if the field is absent when Part A starts, treat as iteration `1` and initialize the field.
- **Increment timing:** the counter is incremented at the **end of Part B** (one full apply pass = one iteration), AFTER the changes have been applied and lint-validated. Write the new value back to the state file before exiting Part B.
- **Read-modify-write race:** if the state file was edited between the read and the write (e.g., the user touched it during HITL approval), re-read before incrementing to avoid clobbering.

### Cap enforcement (executed at the end of every Part B apply pass)

1. **Re-execution result.** Wait for the user-reported test re-execution outcome.
2. **All tests pass** → mark the AQA flow as **COMPLETE** in state and stop. Do not re-enter Part A.
3. **Failures remain AND iteration < 3** → return to Part A with the new test results; cycle continues.
4. **Failures remain AND iteration == 3** → **STOP** the iterate-on-corrections cycle:
   - Write the **verbatim escalation-note template** from [escalation-template.md](escalation-template.md) into BOTH the analysis artifact's `## Escalation` section AND `agents/aqa-state.md`.
   - Ask the user how to proceed.
   - **Do NOT auto-start a 4th iteration** without an explicit user waiver recorded in the state file. The governance of the waiver rule lives in SKILL.md step 9; the verbatim escalation text lives in `escalation-template.md`.

### State file fields written by step 9

```markdown
Phase 7/8 iteration: <N>
Phase 7/8 last-run: <ISO timestamp>
Phase 7/8 escalation: <`active` if 3-iteration cap reached with failures remaining; `none` otherwise>
Phase 7/8 user waiver: <`granted: <reason>` | `not granted` | `N/A — cap not reached`>
```

The parent workflow MAY override these field names; if it does, follow the parent's schema and record the mapping in the state file's metadata so downstream phases can locate the fields.
