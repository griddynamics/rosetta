---
name: scenarios-generation
description: To design test scenarios, cases, and specs from requirements and contracts.
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
tags: []
baseSchema: docs/schemas/skill.md
---

<scenarios-generation>

<role>

Test scenario designer and specification author. Turn requirements, acceptance criteria, and endpoint contracts into implementation-ready scenarios -- happy/negative/boundary/auth coverage, exact values, traceability -- without inventing behavior the contract does not state.

</role>

<when_to_use_skill>
Use to DESIGN test scenarios / cases / specs from requirements or API contracts: Given-When-Then API test specs, TMS-format test cases, or pushing an authored case set to a test-management system. `testing` IMPLEMENTS them; this skill only designs. Every artifact shape, path, taxonomy, and vendor binding is provided -- emit against them, never invent them.

**Inputs (provided):** the mode (`gwt_spec` | `generation` | vendor export); the artifact path(s) + section list; the input sources (raw test cases, endpoint contracts, gap-analysis/clarifications); and -- for vendor work -- the resolved vendor binding. Each mode's minimum-output shape is stated in its block below.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be fully completed and the load-context skill loaded and executed
- The output artifact (section list, file path, scenario taxonomy, coverage contract) is defined externally; emit into it, never invent its shape or path
- Per-value honesty: every concrete value (request fields, params, headers, response assertions, test data) traces to (a) a loaded contract, (b) a user clarification, or (c) an explicit `[ASSUMED: ...]` / `gap: ...` marker. No confident fabrication. Example markers: `**Then:** poll timeout `[ASSUMED: 30s — not in contract]``; `unmappable: TC-1234 targets POST /refunds — not in loaded contracts`
- Coverage is total: every input requirement / test case maps to ≥1 emitted scenario OR appears in an explicit excluded/gap section -- no silent drops
- Redaction of credentials, tokens, PII, and credentialed URLs in any emitted artifact → USE SKILL `sensitive-data` (canonical authority)

</core_concepts>

<gwt_spec>

Mode: author Given-When-Then API test specs from raw test cases + endpoint contracts + resolved clarifications. All input/output paths and the spec's section list are provided. **Minimum output:** one Given-When-Then ATC entry per scenario (all fields) + an `## Excluded Test Cases` section + file-mapping / shared-utilities / execution-order sections.

1. **Load + validate.** Read the provided inputs (raw test cases; endpoint contracts; gap analysis / clarifications). Before authoring:
   - Endpoint contracts missing/empty → stop, report `scenarios-generation: endpoint contracts not loaded`. Never fabricate request/response shapes.
   - Test case targets an endpoint not in the loaded contracts → flag `unmappable: <id> targets <METHOD> <path>`; never invent the endpoint.
   - Material gap unresolved (auth mechanism, status semantics, contested required fields) → stop and request clarification before authoring.
   - Partial completeness → author the mappable subset and emit an `## Excluded Test Cases` section listing each exclusion + reason.
2. **Scenario taxonomy.** For each test case generate 1-N scenarios across the taxonomy -- Happy Path (P0), Validation/Negative (P1), Auth (P1), Resource (P1-P2), Edge/Boundary (P2-P3). Full per-category catalog with priority defaults -- ACQUIRE `references/gwt-spec.md` FROM KB when designing coverage.
3. **Write specs.** One Given-When-Then entry per scenario using the ATC template -- ACQUIRE `references/gwt-spec.md` FROM KB at write time. Apply the per-value honesty rule (→ `<core_concepts>`) to every value.
4. **File mapping + shared utilities + execution order.** Map scenarios to test files; identify reusable auth helpers / data factories / response validators; order auth → CRUD happy → negative → edge. Templates + a worked ATC example -- ACQUIRE `references/gwt-spec.md` FROM KB.
5. **Redact + verify coverage.** Scan emitted values and redact (→ `<core_concepts>`). Confirm every input test case is an ATC entry OR in `## Excluded Test Cases`.

</gwt_spec>

<generation>

Mode: produce test scenarios/cases into the provided artifact in the provided format (e.g. TMS-compatible Steps + Expected-Result cases, or scenario tables). The case taxonomy, field schema, naming, parameterization cap, and coverage matrix are given; this skill fills them. **Minimum output:** cases in the given format (every required field populated or `gap:`-marked) + coverage confirmation (each input requirement → ≥1 case or a flagged gap).

1. Read the provided requirement source and format binding (inline schema, or a resolved vendor FORMAT binding → `<vendor_binding>`). Scenario intent missing → stop and ask; never author from an absent source.
2. Generate cases covering the given taxonomy; merge redundant cases via parameterization when requested (respect the parameter-set cap).
3. Apply the per-value honesty rule and the no-silent-drop coverage rule (→ `<core_concepts>`). A field that cannot be sourced gets a visible `gap: <reason>` marker -- never a fabricated value (e.g. invented `FR-99` traceability).
4. Redact emitted values (→ `<core_concepts>`), then verify every input requirement maps to ≥1 case or a flagged coverage gap.

</generation>

<vendor_binding>

When the artifact format or destination is a specific TMS vendor (TestRail, etc.), the vendor is resolved from project config upstream (config-key precedence, stop at first non-empty hit; e.g. `tms_export_skill` / `testrail_export_skill` / `test_case_management_mcp`, plus in-scope signals like `testrail_base_url` / `testrail_project_id`) and provided as a resolved binding. This skill never hardcodes the vendor and never reads config itself.

- **FORMAT binding** (`generation` mode) → ACQUIRE `references/<vendor>-format.md` FROM KB for the case template, field rules, naming conventions, and worked examples.
- **EXPORT binding** (export mode) → ACQUIRE `references/<vendor>-export.md` FROM KB for connection verify, priority/type field mappings, MCP API signatures, ID formats, and the destructive-write confirmation gate.

If the binding is empty but scope is active, config is re-read upstream; still absent → skip the work as `SKIPPED_NO_CONFIG`. Never improvise a vendor.

Currently shipped bindings: `references/testrail-format.md`, `references/testrail-export.md`.

</vendor_binding>

<validation_checklist>

- Coverage total: every input test case / requirement maps to ≥1 emitted scenario OR an explicit excluded/gap entry -- no silent drops
- Per-value honesty holds: no vague filler (`"valid data"` / `"works correctly"`); every concrete value traces to a contract/clarification or carries `[ASSUMED: ...]` / `gap: ...`
- gwt_spec: every ATC has Source, Priority, Type, Endpoint, Given, When, Then, Test Data, Dependencies, Assumptions -- none blank; auth-protected endpoints have ≥1 auth-failure ATC; file mapping + shared utilities + execution order all emitted
- generation: the given format/field rules (or resolved FORMAT binding) satisfied; required fields populated or gap-marked; parameter-set cap respected
- vendor export: destructive-write confirmation gate passed per the EXPORT binding before any write; post-export IDs written back in the vendor's ID format
- Redaction scan ran on the emitted artifact (→ `<core_concepts>`)

</validation_checklist>

<pitfalls>

- Inventing the artifact's section list / path instead of emitting into the provided contract (→ `<core_concepts>`)
- Confident fabrication of values, or fabricated traceability IDs, instead of an `[ASSUMED: ...]` / `gap: ...` marker (→ `<core_concepts>`)
- Silently dropping an unmappable test case instead of recording it in the excluded/gap section (→ `<core_concepts>`)
- Skipping negative/auth/boundary coverage -- these catch most real defects (→ `<gwt_spec>` step 2)
- Hardcoding the TMS vendor instead of using the provided resolved binding (→ `<vendor_binding>`)
- Treating this as implementation -- runnable test code is `testing`, not this skill (→ `<when_to_use_skill>`)

</pitfalls>

</scenarios-generation>
