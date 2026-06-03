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

---

## Part B `<safety_boundaries>` (referenced from SKILL.md `<safety_boundaries>`)

Loaded only when Part B runs (writes test source files + applies fixes). Part A invocations do not pay the resident cost. **Canonical statement** for the four Part-B write-path rules; SKILL.md's `<safety_boundaries>` Part A half (analysis-artifact redaction) is the always-loaded counterpart.

- **Approval discipline — never apply a code change without an explicit approval signal.** **HITL is governed by the `hitl` skill** (workspace-wide authority — single source of truth for ask-before-action defaults, full-automation opt-out, and re-ask protocol); the signal taxonomy below is a **Part-B-specific specialization** of that contract, not a parallel mechanism. Acceptable signals: the calling workflow's recorded approval token, an explicit user response naming the specific Proposed Change (e.g., `apply Change 2`, `approved: Change 1 and Change 3`), or a workflow state-file row recording the approval. Inferred approval from prose ("looks good", "ok", "go ahead", silence) is **forbidden** — re-ask once per `hitl` defaults, then default to NOT applying if still ambiguous. Apply changes one at a time so each approval maps unambiguously to a single Proposed Change. When `hitl` is loaded and the workspace opted into full automation, defer to `hitl`'s automation contract rather than the named-signal list above.
- **Stay inside the matched root-cause scope.** Each Proposed Change applies to the file(s) the root-cause analysis named, fixing the cited failure mode. Do NOT make adjacent edits ("while I'm here" cleanups, rename refactors, import reordering, formatting passes) outside that scope. Adjacent issues are recorded as separate Proposed Changes for separate approval.
- **Never alter test intent while fixing implementation.** Implementation can change (selector value, wait strategy, helper call); the assertion semantics of an ATC cannot. If the test plan / spec is wrong (the API or UI actually behaves correctly and the test was wrong), record that as a spec update — do NOT silently flip the assertion.
- **Test-code-only writes.** This skill writes only to test files, page-object files when the root cause is a selector update agreed with the user, and the analysis artifact. It does NOT modify application/product source code under test. If a fix would touch app source, stop and report `aqa-test-debugging: proposed fix is in application source <path>, not test code — escalate to product team / out-of-scope for this skill`. Application bugs surface as Application Bug findings in Part A's category list; Part B does not author them.

---

## Part B `<validation_checklist>` (referenced from SKILL.md `<validation_checklist>`)

Loaded only when Part B ran. All items below MUST hold before Part B is declared complete:

- Every Proposed Change carries File / Current Code / Proposed Code / Reason / Impact / Risk fields populated — no partial entries.
- Every applied change has an explicit approval record (token, named reference, or state-file row) per the Part-B Approval-discipline rule above — no inferred approval.
- Lint/format was re-run after each modified file; the result is recorded.
- Test intent unchanged — no ATC's assertion semantics were silently altered. If a spec change was required (API behavior is correct, test was wrong), it was recorded as a spec update, not as a silent assertion flip (per the Never-alter-test-intent rule above).
- No application/product source files were modified — only test files (and page-object files when the root cause was a selector update agreed with the user) (per the Test-code-only-writes rule above).
- Iteration count tracked against the 3-iteration cap; if iteration 3 still left failures, the escalation note is recorded per step 9.

---

## Part B `<pitfalls>` (referenced from SKILL.md `<pitfalls>`)

Loaded only when Part B runs. Each item is a bare cross-reference to the canonical rule above — the full statement is not restated.

- Applying changes without explicit approval (Approval-discipline rule above)
- Making unrelated changes alongside fixes (Stay-inside-scope rule above)
- Not re-validating linting after each correction (validation-checklist item above)
- Changing test intent while fixing implementation (Never-alter-test-intent rule above)
- Modifying application/product source code instead of test code (Test-code-only-writes rule above)
