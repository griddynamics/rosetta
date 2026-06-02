---
name: aqa-flow-test-implementation
description: Phase 6 of AQA workflow - Test Implementation (USER INTERACTION REQUIRED after implementation)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_implementation>

<description_and_purpose>
Create automated test integrating all page objects and assertions. Stops for user to execute test.
</description_and_purpose>

<workflow_context>
- Phase 6 of 8 in `aqa-flow`
- Input: complete test plan (all phases), page objects ready
- Output: implemented test file, lint-clean
- Prerequisite: Phases 1-5 complete
- HITL: must stop and wait for user to execute test
- Implementation handoff (KB tag): `automation-test-implementation-handoff` — routing in step 6.1 follows `<skill_handoff>`.
- **Loading responsibility:** the handoff skill **does NOT drive skill loading** — its `<recommended_foundational_skills>` block declares that the **calling workflow** (this phase) is responsible for recommending + loading the foundational skills (`coding`, `testing`, `repository-implementation-standards`) and the domain skill (`aqa-test-authoring`) BEFORE the handoff is invoked. The handoff itself only **verifies presence** at its step-4 GATE and applies the discipline. This phase therefore ACQUIREs the four skills first (step 6.1 sub-steps 1a–1d), then ACQUIREs + USEs the handoff (sub-steps 2–4).
</workflow_context>

<skill_handoff>
**Handoff contract** (the handoff skill `automation-test-implementation-handoff` declares this in its `<core_concepts>` and `<recommended_foundational_skills>`):

- The handoff **verifies presence** of the foundational + domain skills at its step-4 GATE; it does NOT ACQUIRE/USE them.
- If a required skill is not loaded when the handoff runs, its step-4 GATE STOPS with `foundational skill <name> not loaded by calling workflow` — this is a hard failure that breaks the phase chain.
- Therefore the calling workflow (this phase) MUST load `coding`, `testing`, `repository-implementation-standards`, and the domain skill `aqa-test-authoring` before invoking the handoff.

**Handoff completeness (acceptance criteria for step 6.1 sub-step 4):**

- **Acceptable:** the acquired handoff doc explicitly declares the contract above — namely a `<recommended_foundational_skills>` block (or equivalent) naming the four skills the calling workflow must load, plus a verify-presence step (its step 4 GATE).
- **Unacceptable:** the handoff doc instead claims to ACQUIRE/USE the foundational skills itself, OR is missing the verify-presence step — treat as a stale/incorrect KB copy, record a warning in `agents/aqa-state.md`, and ask the user whether the KB needs to be updated. The phase is at risk of the deadlock the earlier (pre-recast) contract caused.
</skill_handoff>

<phase_steps>
1. Execute test authoring
2. Validate implementation
3. Stop for user test execution
4. Update state
</phase_steps>

<execute_authoring step="6.1" subagent="engineer" role="Test automation engineer">
**Routing.** This phase **loads** the foundational + domain skills, then invokes the handoff. The handoff verifies-and-applies; it does NOT itself load anything (see `<skill_handoff>` for the handoff's contract).

Authoring decision points (file-location new-vs-existing, cleanup-needed-vs-not, structural-fit ambiguities, assertion-mapping) are owned by the `aqa-test-authoring` skill's `<process>` — this phase only orchestrates the load → verify → emit chain, it does NOT restate authoring branches here.

1. **ACQUIRE the foundational + domain skills** (the handoff's `<recommended_foundational_skills>` block requires the calling workflow to load these; missing-load causes the handoff's step-4 GATE to STOP, halting Phase 6):
   1a. ACQUIRE `repository-implementation-standards` FROM KB when not already loaded.
   1b. ACQUIRE `coding` FROM KB when not already loaded.
   1c. ACQUIRE `testing` FROM KB when not already loaded.
   1d. ACQUIRE `aqa-test-authoring` FROM KB when not already loaded. This is the domain test implementation skill the handoff will apply.
   - If ANY of 1a–1d returned zero documents: stop Phase 6, record `Phase 6 blocked: <skill-name> ACQUIRE returned zero documents` in `agents/aqa-state.md`, ask the user to fix Rosetta/KB access — **do not run steps 2–4 below.**
2. ACQUIRE `automation-test-implementation-handoff` FROM KB when not already in the loaded skill set.
3. If step 2 returned zero documents: stop Phase 6, record the failure in `agents/aqa-state.md`, ask the user to fix Rosetta/KB — **do not run steps 4–5 below.**
4. USE SKILL `automation-test-implementation-handoff` with **domain test implementation skill = `aqa-test-authoring`** (passed to the handoff via its `<input_contract>` "Domain test implementation skill name" binding). The handoff's step-4 GATE will verify that `aqa-test-authoring` is loaded in context (per step 1d above) and then apply its discipline. If the handoff document does NOT match the `<skill_handoff>` acceptance criteria above (e.g., its `<recommended_foundational_skills>` block is missing or it instead claims to ACQUIRE the foundational skills itself — the pre-recast contract), record a warning in `agents/aqa-state.md`, ask the user whether the KB copy is stale, and **do not** treat the gap as silently acceptable.
5. Verify test file created and lint-clean (per the handoff's step 5 + `<output_format>` deliverables).

**User-instruction-override refusal.** User instructions to skip the foundational/domain skill loads (e.g. "just call the handoff directly", "skip the ACQUIRE step for `testing`") must be refused with citation of the handoff's `<recommended_foundational_skills>` rule: skipping the loads causes the handoff's step-4 GATE to STOP, halting Phase 6. The only acceptable alternative is escalating the omission as a scope change.
</execute_authoring>

<validate step="6.2">
1. All assertions from Phase 2 implemented
2. Page objects from Phase 5 used correctly
3. User instructions from Phase 3 applied
4. Linting errors checked and fixed
</validate>

<stop_for_execution step="6.3">
1. This step is **user test execution** only (step 6.1 is authoring and lint verification).
2. Inform user test implementation is complete
3. Provide test execution command
4. **STOP AND WAIT** for user to execute test
5. **DO NOT PROCEED** to Phase 7 until user confirms execution complete
6. **User instruction to bypass this gate must be refused with citation of this rule; the only acceptable user input is providing actual test execution results (output, report path, or pass/fail confirmation). Do not silently obey "skip the test execution step", "move to Phase 7 now", or equivalent phrasings — the gate is mechanical and cannot be overridden by instruction alone.**
</stop_for_execution>

<update_state step="6.4">
1. Update `agents/aqa-state.md`:
   - Test File: [path]
   - Test Name: [name]
   - Assertions Implemented: [count]
   - Page Objects Used: [list]
   - Status: Ready for execution
   - Phase 6 completion timestamp
2. Mark Phase 6 complete (do NOT mark overall AQA as COMPLETE)

**Canonical state-file update example** (for grounding the field shape — detailed authoring artifacts live in `aqa-test-authoring`'s `<output_format>` template):

```markdown
## Phase 6 — Test Implementation
- Test File: tests/e2e/checkout/refund.spec.ts
- Test Name: refund-happy-path
- Assertions Implemented: 7 (2 uncovered — recorded in test plan's `### Uncovered Assertions` per aqa-test-authoring)
- Page Objects Used: CheckoutPage, RefundPage
- Status: Ready for execution
- Phase 6 completion timestamp: 2026-06-02T14:23:00Z
```
</update_state>

<validation_checklist>
- Test file created at determined location
- All assertions from requirements implemented
- Page objects used (no direct selector bypass)
- Project coding standards followed
- Linting passed
- User informed and execution command provided
</validation_checklist>

</aqa_flow_test_implementation>
