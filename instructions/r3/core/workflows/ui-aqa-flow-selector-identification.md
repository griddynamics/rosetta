---
name: ui-aqa-flow-selector-identification
description: "Phase 4 Selector Identification of ui-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<ui_aqa_flow_selector_identification>

<description_and_purpose>
Identify missing UI selectors from frontend source code or page-source HTML and record the selector map with values and strategy. Conditionally requests page-source capture from the user. Read-only identification — no page-object writes (that is Phase 5).
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `ui-aqa-flow`
- Input: test plan `plans/ui-aqa-<test-name>/test-plan.md` with assertions; Phase 3 code analysis at `plans/ui-aqa-<test-name>/code-analysis.md`
- Output: the `## Selector Management` section (Part A subsections) written into the test plan
- Prerequisite: Phases 1-3 complete
- HITL: conditional — only if frontend code is unavailable or selectors are not found
- Read-only scope (single SSoT): identify only. NO writes to page objects, test files, or frontend source.
- Paths + `<test-name>` slug resolution + the page-sources capture path/naming contract are owned by `qa-structure`'s UI layout reference.
- Required skills: `qa-knowledge` (`implementation_modes` — selector mode Part A, read-only identification; page-source capture message), `qa-structure` (`<test-name>` + page-sources path), `sensitive-data` (page-source redaction)
- Recommended skills: `testing`
</workflow_context>

<failure_handling>
If the code-analysis file is missing, the slug stays ambiguous in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, or more than one plausible `plans/ui-aqa-*/code-analysis.md` exists: stop Phase 4, record the gap in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, ask the user once for the canonical `<test-name>` or to re-run Phase 3 — do not guess (slug rules per `qa-structure`).
</failure_handling>

<phase_steps>
1. Resolve `<test-name>` and verify the Phase 3 code-analysis file (step 4.0)
2. Execute selector identification (step 4.1)
3. Handle page source request if needed (step 4.2)
4. Update state (step 4.3)
</phase_steps>

<resolve_inputs step="4.0">
1. USE SKILL `qa-structure` and resolve `<test-name>` per its UI layout slug rules (the slug matches the Phase 1 run folder; use `ui-aqa-state.md` if unclear).
2. Verify `plans/ui-aqa-<test-name>/code-analysis.md` exists and is the single canonical input for this run.
3. If verification fails: apply `<failure_handling>`.
</resolve_inputs>

<execute_identification step="4.1" subagent="engineer" role="Selector identification specialist">
1. USE SKILL `testing` and USE SKILL `qa-knowledge` (`implementation_modes` — selector mode, Part A: read-only identify) with the parent-supplied bindings: test plan path; code-analysis path; page-sources directory + capture contract = `qa-structure`'s UI layout; output = the `## Selector Management` section's Part A subsections in the test plan.
2. Execute Part A only (Interaction Map → Selector Availability → frontend-source search → page-source analysis for still-missing selectors). If all selectors are found in frontend code, skip step 4.2.
3. Honor the read-only scope (`<workflow_context>`).

**Part A deliverables** (written into the test plan's `## Selector Management` — the contract Phase 5 reads):
- **Interaction Map** — test step → required UI interactions.
- **Selector Availability** — ✅ EXISTS / ❌ MISSING / ❌ UNRESOLVABLE per interaction.
- **Identified Selectors** — Selector / Type / Source (file:line or page-source file) / Usage / Stability per selector, using the 4-tier strategy (`data-testid` > `id` > stable class/ARIA > XPath).
- **Fragile Selectors Flagged** — any selector matching a fragile pattern, with reason + recommendation, for Phase 5's fragile-selector gate.

**Blocking-infeasibility check.** If the test's core interactions are **UNRESOLVABLE because the target elements/flow are absent from the app** — page source was captured but contains no matching elements (not merely a not-yet-captured page source) — the test cannot be authored without inventing selectors or modifying product source. Trigger the workflow's **Blocking infeasibility HARD-STOP** (`ui-aqa-flow.md`): escalate to the user with the options and WAIT for an explicit choice. Do NOT fabricate selectors, do NOT on your own initiative default to a pending/`fixme` spec, and do NOT advance to Phase 5 — even if the user earlier said "skip clarification".
</execute_identification>

<handle_page_source step="4.2" condition="selectors still missing">

1. Create directory `plans/ui-aqa-<test-name>/page-sources/` (same `<test-name>` slug resolved in step 4.0; path/naming contract per `qa-structure`).

2. **Send the user the verbatim capture-instruction message** — USE SKILL `qa-knowledge` to send its page-source capture instructions verbatim. Do NOT paraphrase; non-technical users rely on the literal F12 / right-click steps.

3. **STOP AND WAIT** for the user to add the page-source files. Acceptable resumption signals: the user replies with "captured" + the filename list, OR the user replies with a single filename and a "more coming" signal (partial-resumption allowed once the user confirms the rest).

4. Verify the files exist at `plans/ui-aqa-<test-name>/page-sources/` with the kebab-case naming (`<page-name>.html`). If any file is missing, malformed, or saved with the wrong name, ask the user once for a corrected filename or content; do NOT proceed to selector analysis on incomplete page-source coverage.

5. **Redaction pre-read gate (fail-closed):** authenticated page-source HTML routinely embeds session/CSRF tokens and PII. USE SKILL `sensitive-data`: scan every saved page-source file and redact in place BEFORE reading or referencing any of it — no scan → no read. Then continue Part A analysis.

</handle_page_source>

<update_state step="4.3">
1. **GATE — do NOT mark Phase 4 complete or advance to Phase 5 until** the test plan's `## Selector Management` section carries the Part A deliverables (Interaction Map · Selector Availability · Identified Selectors · Fragile Selectors Flagged). If absent, return to the identification step and write them — Phase 5 reads this section as its contract; completing Phase 4 without it leaves Phase 5 with no selectors to implement.
2. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`:
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
- Missing selectors identified from page source (if needed); page sources validated against `qa-structure`'s page-sources contract or stopped per `<handle_page_source>`
- Selector strategy documented; fragile selectors flagged with reason + recommendation
- No page objects, test files, or frontend source modified (read-only scope)
- Redaction pre-read gate ran on captured page sources — `sensitive-data` scan executed (fail-closed) before any page-source content was read or referenced; no literal tokens/PII remain
</validation_checklist>

</ui_aqa_flow_selector_identification>
