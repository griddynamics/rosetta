---
name: user-approved-code-changes
description: "Rosetta pattern for preparing code changes, presenting before/after, requiring explicit user approval, applying incrementally with lint checks, and handing off re-verification."
license: Apache-2.0
tags: ["workflow", "hitl", "coding"]
baseSchema: docs/schemas/skill.md
---

<user_approved_code_changes>

<role>

Disciplined patch author who never silently mutates code after a review gate.

</role>

<when_to_use_skill>

Use whenever a workflow applies fixes after analysis (test corrections, small remediations) and must not merge changes without explicit human approval.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Preparation and application are separate steps; USE SKILL `hitl` for approval vocabulary
- Works for tests, page objects, or other code the parent workflow allows in scope

</core_concepts>

<success_criteria>

Complete when **all of** the following hold:

- Every applied change had an explicit approval record per `<input_contract>` approval-token set (no inferred approval from "looks good" / silence — see step 5 + `<failure_handling>`).
- Before/after evidence exists in the proposal record for every applied change.
- Lint/format clean on every touched file (or the lint failure was resolved with user approval per step 8).
- The state file records approval evidence, modified paths, issues-fixed count, approval timestamp, and the parent-defined post-apply status (default `Ready for re-testing`).
- The user received a concrete re-run instruction per step 10.
- No file outside the parent-supplied **in-scope file set** was modified.

The skill is **NOT complete** if any applied change lacks an approval token, any touched file lies outside the in-scope set, lint failures were ignored, or the state file omits the approval evidence.

</success_criteria>

<input_contract>

The parent workflow supplies all bindings below. Missing required values trigger `<failure_handling>` stops.

| Input | Required? | Source | Used by |
|---|---|---|---|
| Proposed-change source (analysis artifact) | **required** | Parent workflow (e.g. `execution-report.md`, `failure-analysis.md`) | Step 1 (root-cause alignment) + step 4 (before/after presentation) |
| Approval token set | **required** | Parent workflow phase file (e.g. exact tokens `approve` / `apply` / explicit named references like `apply Change 2`) | Step 5 GATE — re-ask if user response doesn't match the bound tokens; never infer |
| Domain correction skill name | optional (when applicable) | Parent workflow phase file (e.g. `aqa-test-debugging` Part B, `qa-test-debugging` Part B) | Step 3 (load its prepare/planning portion for proposal authoring) |
| State file path | **required** | Parent workflow phase file (e.g. `agents/aqa-state.md`, `agents/qa-state.md`) | Step 9 state update |
| In-scope file set | **required** | Parent workflow phase file (test files only / test + page-object files / etc.) | Step 7 application — files outside this set MUST NOT be modified |
| Loop target | optional | Parent workflow phase file | Step 11 (where to route on persistent failures) |
| Post-apply status label | optional (default `Ready for re-testing`) | Parent workflow phase file | Step 9 state update |

**Required-input failure rule.** If the proposed-change source, approval token set, state file path, or in-scope file set is missing, this skill cannot run safely — apply `<failure_handling>` "missing required input". Do NOT pick defaults for these — silent guesses defeat the safety gate.

</input_contract>

<process>

1. USE SKILL `debugging` to align proposed edits with identified root causes.
2. USE SKILL `coding` for patch quality and consistency.
3. If the parent names a domain correction skill (e.g. test-debugging Part B), run only the **prepare / Part B planning** portion first — produce proposals, not silent writes.
4. Present each proposed change with before/after snippets and file paths; batch if small, otherwise chunk for review.
5. GATE: **WAIT** for explicit approval phrases per `hitl`; if the parent workflow defines an exact approval token set, require those exact tokens and re-ask otherwise. Do not infer approval from questions or partial agreement.
6. If the user requests edits to the plan, revise proposals and re-present from step 4.
7. Apply approved changes one at a time or in small approved batches; run lint/format after each batch.
8. GATE: if lint fails, stop applying further changes until the failure is resolved or the user approves a revised approach.
9. Update workflow state: issues fixed count, files modified, approval timestamp, status `Ready for re-testing` (or parent-defined status).
10. Tell the user how to re-run verification (same command pattern as implementation handoff when applicable).
11. If failures persist, point to the parent workflow's loop target (e.g. return to execution analysis phase) without auto-looping unless approved.

</process>

<output_format>

Two deliverables: per-proposed-change records (used at step 4 + step 9 application log) and a state-update block (step 9). Templates below; parent workflow may override.

**Proposed Change record (step 4 — one per proposed change, presented to user before approval):**

```markdown
### Proposed Change <N>: <one-line title>

- **Source root cause:** <reference to analysis-artifact entry, e.g. `execution-report.md F3`>
- **File:** <path/to/file>
- **In-scope per parent:** yes | no (if `no`, STOP — file is outside the in-scope set per `<input_contract>`)
- **Change type:** selector-update | wait-strategy | assertion-fix | data-setup | other

**Current code:**
```diff
- <removed line(s)>
```

**Proposed code:**
```diff
+ <added line(s)>
```

- **Reason:** <one-line — how this fix addresses the root cause>
- **Impact:** <what this change affects — only the cited test? other tests sharing the helper? page-object consumers?>
- **Risk:** Low | Medium | High
- **Approval status:** pending | approved (token: `<exact user token>`) | rejected | partial (only hunks <list>)
```

**Concrete example (illustrates a single Proposed Change in approved state):**

```markdown
### Proposed Change 1: Update logout-button selector

- **Source root cause:** execution-report.md F3 (selector-locator, FACT)
- **File:** tests/auth/logout.spec.ts
- **In-scope per parent:** yes
- **Change type:** selector-update

**Current code:**
```diff
- await page.locator('[data-testid="logout-btn"]').click();
```

**Proposed code:**
```diff
+ await page.locator('[data-testid="logout-button"]').click();
```

- **Reason:** Frontend renamed the data-testid from `logout-btn` to `logout-button` in commit abc1234; page-source confirms the new value.
- **Impact:** logout.spec.ts only — no other tests reference the old selector.
- **Risk:** Low
- **Approval status:** approved (token: `apply Change 1`)
```

**State-update block (step 9 — written to the parent-supplied state file path):**

```markdown
## <phase or feature name> (Corrections — applied)
- **Status:** <parent-defined, default `Ready for re-testing`>
- **Approval timestamp:** <YYYY-MM-DD HH:MM>
- **Approval evidence:** <exact user token(s) recorded, or named state-file row(s)>
- **Issues fixed:** <count>
- **Files modified:**
  - <path/to/file/A>
  - <path/to/file/B>
- **Lint/format:** pass | failed-and-resolved (with note)
- **Re-run instruction provided:** <one-line of the command the user can paste>
- **Loop target (if persistent failures expected):** <parent-supplied target, or `None`>
```

</output_format>

<validation_checklist>

- Zero applied code changes occurred before explicit user approval (step 5 GATE)
- Every applied change carries an approval-token record per `<input_contract>` — inferred approval is forbidden
- Before/after evidence exists in the Proposed Change record for every applied change
- Lint/format clean on touched files after application (or step-8 GATE was triggered, lint failure resolved, and user approved the revised approach)
- Every modified file is inside the parent-supplied in-scope file set — no out-of-scope writes
- State file records approval evidence, modified paths, issues-fixed count, approval timestamp, and the post-apply status per `<output_format>`
- User received a concrete re-run instruction per step 10
- No partial-batch approval was treated as full-batch approval — only explicitly named hunks were applied (per `<failure_handling>`)

</validation_checklist>

<failure_handling>

- **Missing required input** per `<input_contract>` (proposed-change source, approval token set, state file path, or in-scope file set absent): stop, report `user-approved-code-changes: required input missing — <name>`, ask the parent workflow / user to supply. Do NOT pick defaults; the safety gate depends on these bindings being explicit.
- **No approval response** (user has not responded to the step 5 GATE after a reasonable wait): re-ask **once** with a clear list of the pending Proposed Changes and the bound approval tokens. If still no response, stop without applying anything, record `Approval pending — no user response after re-ask` in the state file, and surface to the parent workflow. Do NOT proceed on silence.
- **Ambiguous approval** (response doesn't match the bound approval tokens — e.g., `looks good`, `ok`, `go ahead`, `proceed`, questions, partial agreement): treat as **not approved**. Re-ask once, citing the exact tokens the parent bound (e.g., `Please respond with one of: 'approve all', 'apply Change <N>', or 'reject'`). On continued ambiguity, default to **not applying** and record the ambiguous response verbatim in the state file.
- **Partial-batch approval** (user approves some Proposed Changes by name but not others — e.g., `apply Change 1 and Change 3`): apply ONLY the explicitly named hunks. Do NOT extrapolate consent to unnamed changes. Record each change's individual approval status (`approved` / `pending` / `rejected`) in its Proposed Change record per `<output_format>`.
- **Apply failure / merge conflict** (the edit cannot land cleanly — context drift, file changed since proposal authored, encoding issue): stop applying the affected change, record the apply error in the state file along with the file state at attempt time, ask the user how to proceed (re-author proposal with current context / abort the change / accept a degraded version). Do NOT force-apply or rewrite surrounding context to "make it fit".
- **Lint failure that can't be auto-fixed** (step 8 GATE): stop further applications, surface the unfixable error, ask the user whether to (a) hand-edit before continuing, (b) accept the imperfection with a recorded gap, (c) revert the offending change. Do NOT proceed to the next change with unresolved compile-blocking errors.
- **In-scope violation attempted** (a Proposed Change targets a file outside the parent-supplied in-scope set): refuse the change at step 4 — present it to the user as `OUT-OF-SCOPE: this change would touch <path> which is not in the in-scope file set; escalate to the parent workflow for scope amendment`. Do NOT apply the change even if the user approves it inline; scope amendment is the parent workflow's decision.

</failure_handling>

<best_practices>

- Keep proposals minimal: smallest diff that addresses the linked root cause
- Separate mechanical refactors from behavioral fixes unless the user approves both

</best_practices>

<pitfalls>

- Treating "looks good" on one hunk as approval for the whole batch when the user did not say so
- Applying changes while tests are still running

</pitfalls>

<resources>

- skill `hitl` — mandatory approval and no-assumption rules
- skill `coding`, skill `debugging` — implementation and diagnosis quality
- Parent workflow phase file — scope boundaries and domain correction skill

</resources>

</user_approved_code_changes>
