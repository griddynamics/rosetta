---
name: aqa-flow-selector-identification
description: Phase 4 of AQA workflow - Selector Identification (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_selector_identification>

<description_and_purpose>
Identify missing UI selectors from frontend source code or page-source HTML and record the selector map with values and strategy. Conditionally requests page-source capture from the user. Read-only identification — no page-object writes (that is Phase 5).
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `aqa-flow`
- Input: test plan `agents/plans/aqa-<test-name>.md` with assertions; Phase 3 code analysis at `agents/plans/aqa-<test-name>-code-analysis.md`
- Output: the `## Selector Management` section (Part A subsections) written into the test plan
- Prerequisite: Phases 1-3 complete
- HITL: conditional — only if frontend code is unavailable or selectors are not found
- Read-only scope (single SSoT): identify only. NO writes to page objects, test files, or frontend source.
</workflow_context>

<recommended_skills>
- `testing` — selector mode Part A (read-only identification) performs the interaction map → availability check → frontend search → page-source analysis below.
</recommended_skills>

<page_sources_contract>
The phase OWNS the page-sources output path and capture contract (`testing` declares page sources as an input but does not own the capture protocol).

- **Path:** `agents/plans/aqa-<test-name>-page-sources/` (one HTML file per page the test visits).
- **Naming:** `<page-name>.html`, kebab-case (e.g. `login.html`, `checkout-payment.html`, `order-confirmation.html`).
- **Validation:** the directory + files must exist with the kebab-case naming before Part A's page-source analysis runs. If missing AND frontend source is also unavailable, do NOT fabricate selectors — stop and request capture per `<handle_page_source>`.
</page_sources_contract>

<input_resolution>
`<test-name>` matches the Phase 1 plan `agents/plans/aqa-<test-name>.md`; use `agents/aqa-state.md` if the slug is unclear. **Example:** `agents/plans/aqa-login-redirect-code-analysis.md` → `<test-name>` = `login-redirect`.
</input_resolution>

<failure_handling>
If the code-analysis file is missing, the slug stays ambiguous in `agents/aqa-state.md`, or more than one plausible `agents/plans/aqa-*-code-analysis.md` exists: stop Phase 4, record the gap in `agents/aqa-state.md`, ask the user once for the canonical `<test-name>` or to re-run Phase 3 — do not guess.
</failure_handling>

<phase_steps>
1. Resolve `<test-name>` and verify the Phase 3 code-analysis file (step 4.0)
2. Execute selector identification (step 4.1)
3. Handle page source request if needed (step 4.2)
4. Update state (step 4.3)
</phase_steps>

<resolve_inputs step="4.0">
1. Resolve `<test-name>` per `<input_resolution>`.
2. Verify `agents/plans/aqa-<test-name>-code-analysis.md` exists and is the single canonical input for this run.
3. If verification fails: apply `<failure_handling>`.
</resolve_inputs>

<execute_identification step="4.1" subagent="engineer" role="Selector identification specialist">
1. USE SKILL `testing` (selector mode, Part A — read-only identify) with the parent-supplied bindings: test plan path; code-analysis path; page-sources directory + contract = `<page_sources_contract>`; output = the `## Selector Management` section's Part A subsections in the test plan.
2. Execute Part A only (Interaction Map → Selector Availability → frontend-source search → page-source analysis for still-missing selectors). If all selectors are found in frontend code, skip step 4.2.
3. Honor the read-only scope (`<workflow_context>`).

**Part A deliverables** (written into the test plan's `## Selector Management` — the contract Phase 5 reads):
- **Interaction Map** — test step → required UI interactions.
- **Selector Availability** — ✅ EXISTS / ❌ MISSING / ❌ UNRESOLVABLE per interaction.
- **Identified Selectors** — Selector / Type / Source (file:line or page-source file) / Usage / Stability per selector, using the 4-tier strategy (`data-testid` > `id` > stable class/ARIA > XPath).
- **Fragile Selectors Flagged** — any selector matching a fragile pattern, with reason + recommendation, for Phase 5's fragile-selector gate.

**Blocking-infeasibility check.** If the test's core interactions are **UNRESOLVABLE because the target elements/flow are absent from the app** — page source was captured but contains no matching elements (not merely a not-yet-captured page source) — the test cannot be authored without inventing selectors or modifying product source. Trigger the workflow's **Blocking infeasibility HARD-STOP** (`aqa-flow.md`): escalate to the user with the options and WAIT for an explicit choice. Do NOT fabricate selectors, do NOT on your own initiative default to a pending/`fixme` spec, and do NOT advance to Phase 5 — even if the user earlier said "skip clarification".
</execute_identification>

<handle_page_source step="4.2" condition="selectors still missing">

This step's content is **user-facing instruction** — preserved verbatim in the workflow (the `testing` skill declares page sources as an input but does NOT own the capture protocol). Non-technical users need the literal capture steps + naming convention + message, not an abstract pointer.

1. Create directory `agents/plans/aqa-<test-name>-page-sources/` (same `<test-name>` slug resolved in step 4.0, per `<page_sources_contract>`).

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

3. **STOP AND WAIT** for the user to add the page-source files. Acceptable resumption signals: the user replies with "captured" + the filename list, OR the user replies with a single filename and a "more coming" signal (partial-resumption allowed once the user confirms the rest).

4. Verify the files exist at `agents/plans/aqa-<test-name>-page-sources/` with the kebab-case naming (`<page-name>.html`). If any file is missing, malformed, or saved with the wrong name, ask the user once for a corrected filename or content; do NOT proceed to selector analysis on incomplete page-source coverage. Then continue Part A analysis.

</handle_page_source>

<update_state step="4.3">
1. **GATE — do NOT mark Phase 4 complete or advance to Phase 5 until** the test plan's `## Selector Management` section carries the Part A deliverables (Interaction Map · Selector Availability · Identified Selectors · Fragile Selectors Flagged). If absent, return to the identification step and write them — Phase 5 reads this section as its contract; completing Phase 4 without it leaves Phase 5 with no selectors to implement.
2. Update `agents/aqa-state.md`:
   - Total Selectors Needed: [count]
   - Existing: [count]
   - Found in Frontend: [count]
   - Page Source Required: [yes/no]
   - Selector Strategy: [preferred method]
   - Phase 4 completion timestamp
3. Mark Phase 4 complete, Phase 5 current.
</update_state>

<validation_checklist>
- All required UI interactions mapped
- Existing selectors checked in page objects (✅ / ❌ / UNRESOLVABLE per interaction)
- Frontend source code searched first (if available)
- Missing selectors identified from page source (if needed); page sources validated against `<page_sources_contract>` or stopped per `<handle_page_source>`
- Selector strategy documented; fragile selectors flagged with reason + recommendation
- No page objects, test files, or frontend source modified (read-only scope)
</validation_checklist>

</aqa_flow_selector_identification>
