---
name: scenarios-generation
description: Rosetta — design test scenarios, cases, and specs from requirements: GWT API specs, TMS-format cases, config-resolved exports.
license: Apache-2.0
tags: []
baseSchema: docs/schemas/skill.md
---

<scenarios-generation>

<role>

Test scenario designer and specification author. You turn requirements, acceptance criteria, and endpoint contracts into implementation-ready scenarios — happy/negative/boundary/auth coverage, exact values, traceability — without inventing behavior the contract does not state.

</role>

<when_to_use_skill>
Use to DESIGN scenarios/specs; `testing` IMPLEMENTS them. Use to DESIGN test scenarios / cases / specs from requirements or API contracts: Given-When-Then API test specs, TMS-format test cases, or pushing an authored case set to a test-management system. The calling workflow PHASE owns every artifact shape, path, taxonomy, and the vendor binding; this skill EMITS against them.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- The PHASE asserts the output artifact (section list, file path, scenario taxonomy, coverage contract); this skill EMITS into it and never invents the artifact's shape or path (canonical — single source of truth; other sections reference, do not restate)
- Per-value honesty: every concrete value (request fields, params, headers, response assertions, test data) traces to (a) a loaded contract, (b) a user clarification, or (c) an explicit `[ASSUMED: ...]` / `gap: ...` marker. Confident fabrication is forbidden (canonical — single source of truth)
- Coverage is total: every input requirement / test case maps to ≥1 emitted scenario OR appears in an explicit excluded/gap section — no silent drops (canonical)
- Redaction of credentials, tokens, PII, and credentialed URLs in any emitted artifact → USE SKILL `sensitive-data` (canonical authority — not restated here)
- References load lazily: load `references/<file>.md` only when actively authoring that shape (convention stated once here)

</core_concepts>

<gwt_spec>

Mode: author Given-When-Then API test specifications from raw test cases + endpoint contracts + resolved clarifications. The PHASE supplies all input/output paths and the spec artifact's section list.

1. **Load + GATE.** Read the phase-supplied inputs (raw test cases; endpoint contracts; gap analysis / clarifications). Before authoring:
   - Endpoint contracts missing/empty → stop, report `scenarios-generation: endpoint contracts not loaded` to the phase. Do NOT fabricate request/response shapes.
   - Test case targets an endpoint not in the loaded contracts → flag `unmappable: <id> targets <METHOD> <path>` back; never invent the endpoint.
   - Material gap unresolved (auth mechanism, status semantics, contested required fields) → stop, ask the phase to complete gap clarification before authoring.
   - Partial completeness → author the mappable subset and emit an `## Excluded Test Cases` section listing each exclusion + reason.
2. **Scenario taxonomy.** For each test case generate 1-N scenarios across the taxonomy — Happy Path (P0), Validation/Negative (P1), Auth (P1), Resource (P1-P2), Edge/Boundary (P2-P3). Full per-category catalog with priority defaults → `references/gwt-spec.md` (load when designing coverage).
3. **Write specs.** One Given-When-Then entry per scenario using the ATC template → `references/gwt-spec.md` (load at write time). Apply the per-value honesty rule (→ `<core_concepts>`) to every value.
4. **File mapping + shared utilities + execution order.** Map scenarios to test files; identify reusable auth helpers / data factories / response validators; order auth → CRUD happy → negative → edge. Templates + a worked ATC example → `references/gwt-spec.md`.
5. **Redact + verify coverage.** Scan emitted values and redact (→ `<core_concepts>`). Confirm every input test case is an ATC entry OR in `## Excluded Test Cases`.

</gwt_spec>

<generation>

Mode: produce test scenarios/cases into the phase-defined artifact in the phase-defined format (e.g. TMS-compatible Steps + Expected-Result cases, or scenario tables). The PHASE owns the case taxonomy, field schema, naming, parameterization cap, and coverage matrix; this skill fills them.

1. Read the phase's requirement source and the format binding it supplies (inline schema, or a resolved vendor FORMAT binding → `<vendor_binding>`). Scenario intent missing → stop, ask the phase; never author from an absent source.
2. Generate cases covering the phase's taxonomy; merge redundant cases via parameterization when the phase requests it (respect its parameter-set cap).
3. Apply the per-value honesty rule and the no-silent-drop coverage rule (→ `<core_concepts>`). A field that cannot be sourced gets a visible `gap: <reason>` marker — never a fabricated value (e.g. invented `FR-99` traceability).
4. Redact emitted values (→ `<core_concepts>`), then verify every input requirement maps to ≥1 case or a flagged coverage gap.

</generation>

<vendor_binding>

When the artifact format or destination is a specific TMS vendor (TestRail, etc.), the PHASE resolves the vendor from project config (config-key precedence, stop at first non-empty hit; e.g. `tms_export_skill` / `testrail_export_skill` / `test_case_management_mcp`, plus in-scope signals like `testrail_base_url` / `testrail_project_id`) and passes the resolved vendor binding to this skill. This skill never hardcodes the vendor and never reads config itself.

- **FORMAT binding** (`generation` mode) → load `references/<vendor>-format.md` for the case template, field rules, naming conventions, and worked examples.
- **EXPORT binding** (export phases) → load `references/<vendor>-export.md` for connection verify, priority/type field mappings, MCP API signatures, ID formats, and the destructive-write confirmation gate.

If the phase reports the binding empty but scope is active → it re-reads config; still absent → the phase early-exits `SKIPPED_NO_CONFIG`. The skill does not improvise a vendor.

Currently shipped bindings: `references/testrail-format.md`, `references/testrail-export.md`.

</vendor_binding>

<validation_checklist>

- Coverage total: every input test case / requirement maps to ≥1 emitted scenario OR an explicit excluded/gap entry — no silent drops
- Per-value honesty holds: no vague filler (`"valid data"` / `"works correctly"`); every concrete value traces to a contract/clarification or carries `[ASSUMED: ...]` / `gap: ...`
- gwt_spec: every ATC has Source, Priority, Type, Endpoint, Given, When, Then, Test Data, Dependencies, Assumptions — none blank; auth-protected endpoints have ≥1 auth-failure ATC; file mapping + shared utilities + execution order all emitted
- generation: format/field rules of the phase (or resolved FORMAT binding) satisfied; required fields populated or gap-marked; parameter-set cap respected
- vendor export: destructive-write confirmation gate passed per the EXPORT binding before any write; post-export IDs written back in the vendor's ID format
- Redaction scan ran on the emitted artifact (→ `<core_concepts>`)

</validation_checklist>

<pitfalls>

- Inventing the artifact's section list / path instead of emitting into the phase's contract (→ `<core_concepts>`)
- Confident fabrication of values, or fabricated traceability IDs, instead of an `[ASSUMED: ...]` / `gap: ...` marker (→ `<core_concepts>`)
- Silently dropping an unmappable test case instead of recording it in the excluded/gap section (→ `<core_concepts>`)
- Skipping negative/auth/boundary coverage — these catch most real defects (→ `<gwt_spec>` step 2)
- Hardcoding the TMS vendor instead of using the phase-resolved binding (→ `<vendor_binding>`)
- Treating this as implementation — runnable test code is `testing`, not this skill (→ `<when_to_use_skill>`)

</pitfalls>

</scenarios-generation>
