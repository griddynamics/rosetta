---
name: aqa-flow-selector-identification
description: Phase 4 of AQA workflow - Selector Identification (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_selector_identification>

<description_and_purpose>
Identify missing selectors from frontend source code or page source HTML. Conditionally requests page source from user.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `aqa-flow`
- Input: test plan with assertions; Phase 3 code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md`
- Output: complete selector map with values and strategy
- Prerequisite: Phases 1-3 complete
- HITL: conditional — only if frontend code unavailable or selectors not found
</workflow_context>

<input_resolution>
`<test-name>` matches the Phase 1 plan `agents/plans/aqa-<test-name>.md`; use `agents/aqa-state.md` if the slug is unclear. **Example:** `agents/plans/aqa-login-redirect-code-analysis.md` → `<test-name>` = `login-redirect`.
</input_resolution>

<failure_handling>
If the code-analysis file is missing, the slug stays ambiguous in `agents/aqa-state.md`, or more than one plausible `agents/plans/aqa-*-code-analysis.md` exists: stop Phase 4, record the gap in `agents/aqa-state.md`, ask the user once for the canonical `<test-name>` or to re-run Phase 3 — do not guess.
</failure_handling>

<phase_steps>
1. Resolve `<test-name>` and verify the Phase 3 code-analysis file (see `<input_resolution>` / `<failure_handling>`)
2. Execute selector identification (Part A of skill)
3. Handle page source request if needed
4. Update state
</phase_steps>

<resolve_inputs step="4.0">
1. Resolve `<test-name>` per `<input_resolution>`.
2. Verify `agents/plans/aqa-<test-name>-code-analysis.md` exists and is the single canonical input for this run.
3. If verification fails: apply `<failure_handling>`.
</resolve_inputs>

<execute_identification step="4.1" subagent="engineer" role="Selector identification specialist">
1. USE SKILL `aqa-selector-management`
2. Execute Part A (Selector Identification) only
3. If all selectors found in frontend code, skip step 4.2

**Part A deliverables owned by the skill** (verified — no in-phase schema duplication needed; named here so Phase 5 readers see the contract Phase 4 produces):
- **Interaction mapping** (test step → required UI interactions): `aqa-selector-management` SKILL.md step 1
- **Existing-page-object availability check** (✅ EXISTS / ❌ MISSING / ❌ UNRESOLVABLE per interaction): SKILL.md step 2 + `<validation_checklist>`
- **Selector-strategy preference order** (4-tier: `data-testid` > `id` > stable class/ARIA > XPath): `references/strategy-and-template.md` "Selector Strategy — 4-Tier Table"
- **Selector-map output schema** (Selector / Type / Source / Usage / Stability per identified selector): `references/strategy-and-template.md` "Identified Selectors" section. This is the schema Phase 5 reads from the test plan's `## Selector Management` section.
</execute_identification>

<handle_page_source step="4.2" condition="selectors still missing">

This step's content is **user-facing instruction** — it is preserved in the workflow rather than deferred to a skill because `aqa-selector-management` declares page-sources as an input but does NOT own the capture protocol (verified). Compression rules protect user-facing output: non-technical users need the verbatim capture steps + naming convention + message template, not an abstract pointer.

1. Create directory `agents/plans/aqa-<test-name>-page-sources/` (using the same `<test-name>` slug resolved in step 4.0 per `<input_resolution>`).

2. **Send the user the verbatim capture-instruction message below.** Do NOT paraphrase; non-technical users rely on the literal F12 / right-click steps.

   ```text
   I need the HTML source of the page(s) under test to verify selectors. Please capture them as follows:

   **For each page involved in the test:**

   1. Open the page in your browser (Chrome / Edge / Firefox / Safari — any modern browser works).
   2. Open Developer Tools:
      - **Keyboard:** press F12 (Windows / Linux) or Cmd+Opt+I (macOS).
      - **OR menu:** right-click anywhere on the page → "Inspect" / "Inspect Element".
   3. In Developer Tools, switch to the **Elements** (Chrome / Edge) or **Inspector** (Firefox / Safari) tab.
   4. **Find the test target element** — the element your test interacts with (button, input, link, etc.). Use the element-picker icon (⌖) and click on the element in the rendered page; Developer Tools highlights it in the tree.
   5. **Include 2–3 parent levels for context.** In the Elements tree, walk up the tree 2–3 levels above the target (so the surrounding container, form, or section is captured along with the target) — selectors often depend on parent structure, not just the target node.
   6. **Right-click the chosen parent node** → "Copy" → **"Copy outerHTML"** (Chrome / Edge / Firefox) or "Copy HTML" (Safari). This copies the parent + the target + all descendants as one HTML fragment.
   7. **Save the HTML into a new file** using this naming convention:

      `agents/plans/aqa-<test-name>-page-sources/<page-name>.html`

      where `<page-name>` is a **kebab-case** short name for the page (e.g. `login.html`, `checkout-payment.html`, `order-confirmation.html`). Save **one file per page** the test visits.

   8. Paste the URL of each captured page into the conversation when you confirm the files are saved, so I can cross-reference page → file.

   **When you've saved all the page-source files, reply with "captured" + the list of `<page-name>.html` filenames you created.** I will then verify the directory and continue selector identification.
   ```

3. **STOP AND WAIT** for the user to add the page-source files. Acceptable resumption signals: the user replies with "captured" + the filename list, OR the user replies with a single filename and a "more coming" signal (in which case partial-resumption is allowed once the user confirms the rest).

4. Verify the files exist at `agents/plans/aqa-<test-name>-page-sources/` with the kebab-case naming above (`<page-name>.html`). If any file is missing, malformed, or saved with the wrong name, ask the user once for a corrected filename or content; do NOT proceed to selector analysis on incomplete page-source coverage. Then continue Part A analysis.

</handle_page_source>

<update_state step="4.3">
1. Update `agents/aqa-state.md`:
   - Total Selectors Needed: [count]
   - Existing: [count]
   - Found in Frontend: [count]
   - Page Source Required: [yes/no]
   - Selector Strategy: [preferred method]
   - Phase 4 completion timestamp
2. Mark Phase 4 complete, Phase 5 current
</update_state>

<validation_checklist>
- All required UI interactions mapped
- Existing selectors checked in page objects
- Frontend source code searched first (if available)
- Missing selectors identified from page source (if needed)
- Selector strategy documented
</validation_checklist>

</aqa_flow_selector_identification>
