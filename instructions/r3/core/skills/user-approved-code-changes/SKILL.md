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

<process>

1. USE SKILL `debugging` to align proposed edits with identified root causes.
2. USE SKILL `coding` for patch quality and consistency.
3. If the parent names a domain correction skill (e.g. test-debugging Part B), run only the **prepare / Part B planning** portion first — produce proposals, not silent writes.
4. Present each proposed change with before/after snippets and file paths; batch if small, otherwise chunk for review.
5. GATE: **WAIT** for explicit approval phrases per `hitl` (e.g. user confirms they reviewed and approve application); do not infer approval from questions or partial agreement.
6. If the user requests edits to the plan, revise proposals and re-present from step 4.
7. Apply approved changes one at a time or in small approved batches; run lint/format after each batch.
8. GATE: if lint fails, stop applying further changes until the failure is resolved or the user approves a revised approach.
9. Update workflow state: issues fixed count, files modified, approval timestamp, status `Ready for re-testing` (or parent-defined status).
10. Tell the user how to re-run verification (same command pattern as implementation handoff when applicable).
11. If failures persist, point to the parent workflow's loop target (e.g. return to execution analysis phase) without auto-looping unless approved.

</process>

<validation_checklist>

- Zero applied code changes occurred before explicit user approval
- Before/after evidence exists for every applied change
- Lint/format clean on touched files after application
- State records approval evidence and modified paths
- User received a concrete re-run or re-check instruction when relevant

</validation_checklist>

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
