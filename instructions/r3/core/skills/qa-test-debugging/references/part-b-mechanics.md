# Part B Mechanics — qa-test-debugging

Loaded on demand from SKILL.md when Part B (steps 6–8) runs. The base SKILL.md keeps the orchestration + the 3-iteration-cap governance rule + Part A validation checklist + the canonical Part B safety-boundary boundary statement; this file holds the heavier Part-B-only material so Part-A invocations don't carry it in active context.

Mirrors the lazy-loading pattern used by `aqa-test-debugging`'s sibling `references/part-b-mechanics.md`.

---

## Proposed Change template (referenced from SKILL.md step 6)

Emit one entry per Proposed Change using this template. Required fields: **Affected Tests, File, Root Cause, Current Code, Proposed Code, Reason, Impact, Risk**.

```markdown
### Proposed Change [N]: [Issue Description]

**Affected Tests**: [ATC-NNN, ATC-NNN, ...]
**File**: [File path]
**Root Cause**: [From analysis]

**Current Code**:
[Current code snippet]

**Proposed Code**:
[Proposed code snippet]

**Reason**: [Why this change fixes the issue]
**Impact**: [What this change affects]
**Risk**: [Low / Medium / High]
```

### Match fixes to root cause categories (per the 7-category catalog in references/failure-catalog.md)

- **Auth issues** → update auth helper configuration
- **Request issues** → correct request body, fix endpoint paths, add headers
- **Assertion failures** → update expected values, fix field names — NEVER silently flip assertion semantics; if API behavior is correct and the test was wrong, record as a spec update in step 7.6
- **Data setup issues** → fix factory methods, correct setup order, add cleanup
- **Config issues** → update base URL, fix env var references
- **Application bug** → escalate per `<safety_boundaries>` "Test-code-only writes" rule — Part B does NOT author app-source fixes
- **Connection / Environment** → record as environment finding; no test code change

### Prioritize Proposed Changes

1. **Pattern fixes** (resolve multiple failures) first
2. **Critical / High** priority individual fixes next
3. **Medium / Low** priority last

---

## Step 7 — Apply Approved Changes (referenced from SKILL.md step 7)

After explicit user approval per `<safety_boundaries>`:

1. **Apply changes one at a time** so each approval maps unambiguously to a single Proposed Change.
2. **Verify each change is syntactically correct** before moving to the next.
3. **Follow project coding standards** (linting + formatting + import order).
4. **Check linting after each file modification** — record the result in the `Applied Corrections` section. If lint fails, fix before moving on; if unresolvable, follow `<failure_handling>` "`execution-report.md` unwritable" or comparable branch.
5. **Verify no unintended side effects on passing tests** — passing tests should remain passing after the change; if a regression is introduced, document it.
6. **If specs were incorrect**, update `test-specs.md` with the spec-change record (this is the only acceptable form of "the test was wrong because the spec was wrong" — never a silent assertion flip).

---

## Step 8 — Iteration Cap (referenced from SKILL.md step 8)

The Part A → Part B cycle is **capped at 3 iterations**. Counter mechanics, state-file fields, and cap-enforcement protocol:

- **State file field name:** `Phase 6/7 iteration: N` (default; the calling workflow MAY override per its state schema).
- **Initial state:** if the field is absent when Part A starts, treat as iteration `1` and initialize.
- **Increment timing:** the counter is incremented at the **end of Part B** (one full apply pass = one iteration), AFTER changes have been applied and lint-validated. Write the new value back to the state file before exiting Part B.

### Cap enforcement (at the end of every Part B apply pass)

1. **Re-execution result.** Wait for the user-reported re-execution outcome.
2. **All tests pass** → mark the QA flow as **COMPLETE** in state and stop. Do not re-enter Part A.
3. **Failures remain AND iteration < 3** → return to Part A with the new test results; cycle continues.
4. **Failures remain AND iteration == 3** → **STOP** the iterate-on-corrections cycle:
   - Record the escalation in `execution-report.md`'s `## Escalation` section + the workflow state file.
   - Ask the user how to proceed.
   - **Do NOT auto-start a 4th iteration** without an explicit user waiver recorded in the state file.

---

## Part B `<safety_boundaries>` (referenced from SKILL.md `<safety_boundaries>`)

Loaded only when Part B runs (writes test source files + applies fixes). Part A invocations do not pay the resident cost. **Canonical statement** for the four Part-B write-path rules; SKILL.md's `<safety_boundaries>` Part A half (analysis-artifact redaction targets list) is the always-loaded counterpart.

- **Approval discipline — never apply a change without an explicit signal.** Acceptable signals: the calling workflow's recorded approval token, an explicit user response naming the specific Proposed Change (e.g., `apply Change 2`, `approved: Change 1 and Change 3`), or a state-file row recording the approval. Inferred approval from prose ("looks good", "ok", "go ahead", silence) is **forbidden** — re-ask once, then default to NOT applying if still ambiguous. Apply changes one at a time so each approval maps unambiguously to a single Proposed Change.
- **Stay inside the matched root-cause scope.** Each Proposed Change applies to the file(s) the root-cause analysis named, fixing the cited failure mode. Do NOT make adjacent edits ("while I'm here" cleanups, rename refactors, import reordering) outside that scope. Adjacent issues are recorded as separate Proposed Changes for separate approval.
- **Never alter test intent while fixing implementation.** Implementation can change (helper API, request construction, wait strategy); the assertion semantics of an ATC cannot. If the test spec is wrong (API actually behaves correctly), record that as a spec update in `test-specs.md` (step 7.6) — NEVER silently flip the assertion.
- **Test-code-only writes.** This skill writes only to test files, helper/utility files when the root cause is a test-utility update, `test-specs.md` for spec corrections, and the analysis artifact. It does NOT modify application/product source code under test. If a fix would touch app source, stop and report `qa-test-debugging: proposed fix is in application source <path>, not test code — escalate to product team / out-of-scope for this skill`. Application Bug findings surface in Part A's category list; Part B does not author them.

---

## Part B `<validation_checklist>` (referenced from SKILL.md `<validation_checklist>`)

Loaded only when Part B ran. All items MUST hold before Part B is declared complete:

- **Each applied change was lint-checked** (step 7 sub-step 4) and the result is recorded in the `Applied Corrections` section.
- **Each applied change was side-effect-verified** (step 7 sub-step 5) — passing tests were re-checked and no regression was introduced, OR the regression is documented for re-test.
- **Test intent unchanged** per the Never-alter-test-intent rule above — no ATC's assertion semantics were silently altered. Spec changes (when API behavior is correct and the test was wrong) were recorded as `test-specs.md` updates per step 7 sub-step 6, not silent assertion changes.
- **`test-specs.md` updates recorded** when corrections required spec changes (step 7 sub-step 6).
- **Iteration count tracked** against the 3-iteration cap (step 8). The current iteration number is recorded in the `Applied Corrections` section; if iteration 3 still left failures, the escalation note is also recorded.
- **No unrelated changes** per the Stay-inside-scope rule above — every modified file appears in `Files Modified` and traces to a Proposed Change entry approved in step 6/7.
- **No application/product source files were modified** per the Test-code-only-writes rule above — only test files, helpers/utilities, `test-specs.md`, and the analysis artifact.
- **Every applied change has an explicit approval record** per the Approval-discipline rule above — no inferred approval.

---

## Part B `<pitfalls>` (referenced from SKILL.md `<pitfalls>`)

Loaded only when Part B runs. Each item is a bare cross-reference to the canonical rule above — the full statement is not restated.

- Applying changes without explicit approval (Approval-discipline rule above)
- Making unrelated changes alongside fixes (Stay-inside-scope rule above)
- Not re-validating linting after each correction (validation-checklist item above)
- Changing test intent while fixing implementation (Never-alter-test-intent rule above)
- Modifying application/product source code instead of test code (Test-code-only-writes rule above)
- Spiraling beyond 3 correction iterations without escalating (step 8 cap-enforcement rule above)
- Not separating test code bugs from application bugs (per the 7-category catalog — Application Bug is its own category in references/failure-catalog.md)
