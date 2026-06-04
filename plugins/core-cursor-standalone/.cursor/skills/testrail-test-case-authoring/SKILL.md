---
name: testrail-test-case-authoring
description: TestRail-compatible test case format — template, field rules, naming conventions, and examples.
tags: ["testing", "testrail", "format"]
baseSchema: docs/schemas/skill.md
---

<testrail-test-case-authoring>

<role>TestRail test case format specialist</role>

<when_to_use_skill>
Use when test cases must be written in TestRail-compatible format. Provides the template, field rules, naming conventions, and examples.
</when_to_use_skill>

<success_criteria>
Complete when `<format_rules>` + `<naming_conventions>` + `<epistemic_honesty>` (gap-marker discipline) + `<safety_boundaries>` (redaction) all hold per `<validation_checklist>` greps. NOT complete if any rule is violated.
</success_criteria>

<input_contract>

The skill expects the calling workflow / upstream phase to supply:

| Input | Required? | Drives which template fields |
|---|---|---|
| Scenario / test case intent | **required** | TC title, Type, Steps, Expected Results, Preconditions |
| Requirements document (with `US-N`, `FR-N`, `NFR-N` IDs) OR explicit "no requirements traced" signal | **required** (one of) | `Related Requirement`, Traceability `User Story` / `Functional Requirement` / `Non-Functional Requirement` |
| Acceptance criteria list (`AC1` / `AC2` / ... per user story) OR explicit "no AC traced" signal | recommended | Traceability `Acceptance Criterion` |
| Priority signal (P0-P3) from upstream | recommended | `Priority` field |
| Parameterization decision (single vs parameterized vs split) | derived during authoring; capped at 5 parameter sets per case | `Preconditions` execution-count clause + `Test Data` table |

If requirements / ACs are not supplied (either as documents or as an explicit "no traceability available" signal), apply `<failure_handling>` "no requirement/AC mapping available" — do NOT invent IDs. If the scenario intent itself is missing, the skill cannot produce a case — stop and ask the calling workflow.

</input_contract>

<format_rules>

- **MUST** use Steps + Expected Results format
- **MUST NOT** use BDD Given-When-Then format
- **MUST NOT** include "Post-conditions" field
- **MUST NOT** include "Automation" field
- Each step is a single user action; each expected result states the observable outcome after that step
- Steps must be numbered sequentially
- Expected results must reference which step they follow

</format_rules>

<test_case_template>

```markdown
### TC-[N]: [Test Case Title]
**Related Requirement**: [US-X / FR-X / NFR-X]
**Type**: Happy Path / Edge Case / Negative / Integration / Performance / Security
**Priority**: P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Preconditions**:
- [Setup requirement 1]
- [Setup requirement 2]
- [For parameterized]: Execute this test case [N] times with different parameters (see Test Data)

**Steps**:
1. [Action step 1]
2. [Action step 2]
3. [Action step 3]

**Expected Results**:
- After step 1: [Expected outcome]
- After step 2: [Expected outcome]
- After step 3: [Expected outcome]

**Test Data** (if parameterized):
| Parameter | Value 1 | Value 2 | Value 3 |
|-----------|---------|---------|---------|
| [Param 1] | [Val]   | [Val]   | [Val]   |

**Traceability**:
- **User Story**: US-[N]
- **Acceptance Criterion**: AC[N]
- **Functional Requirement**: FR-[N]
- **Non-Functional Requirement**: NFR-[N] (if applicable)

**Notes**: [Additional context]
```

</test_case_template>

<naming_conventions>

Include test type in parentheses. Use descriptive titles referencing the key action or entity.

**Good names**:
- "User Login with Valid Credentials (Happy Path)"
- "User Login with Invalid Credentials (Negative)"
- "Unauthorized Roles Cannot Create Job Post (Negative)"
- "Search with Empty Query Returns All Results (Edge Case)"

**Poor names**:
- "Test Login"
- "Check Search"
- "TC for Admin"

</naming_conventions>

<examples>

Three worked entries — **Happy Path**, **Negative with parameterized test data**, and **Role-based parameterized (merged)** — live in [references/examples-and-redaction.md](references/examples-and-redaction.md#worked-examples-referenced-from-examples). Load on demand when a field-shape question arises during authoring. Each entry shows how `<test_case_template>` fills in for its case shape (parameterization counts, Test Data tables, traceability fields, synthetic-placeholder use).

</examples>

<pitfalls>
(Each item is a pointer; the rule lives in the cited section.)
- BDD / Given-When-Then format → `<format_rules>` MUST NOT.
- Multi-action steps OR vague expected results → `<format_rules>` step / expected-result discipline.
- Parameterization without execution-count clause or Test Data ref → `<format_rules>` parameterization.
- >5 parameter sets → split per `<failure_handling>` cap rule.
- Fabricated requirement / US / AC IDs → `<epistemic_honesty>` gap markers (canonical).
- Literal credentials / PII in case body → `<safety_boundaries>` (downstream `testrail-test-case-export` writes verbatim to TestRail — irreversible if leaked).
</pitfalls>

<epistemic_honesty>

When a template field cannot be sourced from inputs, **leave a visible gap marker** — do NOT invent a plausible value. The marker carries the reason so reviewers can fix it.

Markers per field:

- `Related Requirement`: write `gap: no requirement traced — <reason>` (e.g., "scenario sourced from manual exploratory pass, no formal requirement exists") instead of inventing `FR-X`.
- `Traceability — User Story`: write `gap: no user story traced — <reason>` instead of inventing `US-X`.
- `Traceability — Acceptance Criterion`: write `gap: AC unknown — not in source` if the requirements document doesn't list ACs for this story, or `gap: AC not provided` if upstream simply didn't pass them.
- `Traceability — Functional Requirement` / `Non-Functional Requirement`: same pattern — `gap: FR not in source` / `gap: not applicable — <reason>`.
- `Priority`: write `gap: priority not supplied — defaulting to P2 pending review` AND set the Priority field to P2 (the explicit-default fallback) — this is the one field where a flagged default is acceptable because every TestRail case requires a priority, but the gap marker forces a reviewer pass.

A test case carrying gap markers is still complete per `<success_criteria>` — the gaps are visible and reviewable. A test case carrying a fabricated `FR-99` is not — it presents false traceability.

</epistemic_honesty>

<safety_boundaries>

Test cases authored here are written verbatim into a tracked artifact (and pushed to TestRail by `testrail-test-case-export`, an external shared system visible to every project user). Treat the case body as **PUBLIC by default** — no literal credentials, no real PII.

**Operational rules** (decision-time guidance an agent needs without lazy-loading):

- **No literal sensitive values** in Steps / Expected Results / Test Data / Preconditions — passwords, tokens, API keys, real PII, credentialed URLs, real DB connection strings. Use shape-preserving placeholders instead.
- **Structural content stays verbatim** — endpoint paths, HTTP methods, status codes, error message templates (e.g. `"Invalid credentials"` is a UI string, not a secret), field names, and feature names. Redaction targets sensitive **values**, not the structural test description.
- **If a real production value would be the natural example, replace it with a clearly-fake placeholder of the same shape** — better an obviously-fake placeholder in TestRail than a leaked real one that downstream phases or human testers act on.

**Catalog moved to references** (load on demand when actively applying redaction): the **5-category targets-to-placeholder table** (passwords/tokens/keys + real PII + credentialed URLs + DB connection strings + service-account JSONs/private keys), the **placeholder vocabulary** with per-case-shape guidance, and the **safety re-scan grep targets** all live in [references/examples-and-redaction.md](references/examples-and-redaction.md#redaction-catalog-referenced-from-safety_boundaries) — the single source of truth for what to scan and which placeholders to use.

</safety_boundaries>

<failure_handling>

- **No requirement / AC mapping available** OR **Priority signal missing**: apply `<epistemic_honesty>` (canonical SSoT — gap-marker discipline per field, including the Priority P2-with-gap-marker fallback). Do NOT restate the rule here.
- **Parameter sets exceed the 5-set cap:** split into multiple test cases. Number sequentially (TC-A, TC-B, TC-C, ...) and reuse the same Related Requirement / Traceability set across the split unless parameter-group semantics genuinely differ. Note in each split case's Notes: `Split from <N>-set parameterization (1 of M, 2 of M, ...)`.
- **Scenario intent ambiguous** (vague "test the login flow" without happy/negative/edge specification): stop, ask for the test type (Happy Path / Negative / Edge Case / Integration / Performance / Security). Do NOT pick a default — naming per `<naming_conventions>` includes the type and guessing pollutes the suite organization.
- **Step decomposition impossible** (high-level scenario like "user pays for cart" with no detail on cart / payment method / success criterion): stop, ask the calling workflow for the action sequence. Do NOT invent steps — fabricated steps fail at execution.

</failure_handling>

<validation_checklist>

**Grep-proof layer only** — rules live in `<format_rules>` / `<epistemic_honesty>` / `<safety_boundaries>`; items below are per-case grep checks that verify those rules. No rule is restated here.

- **Format compliance grep** per `<format_rules>` MUST/MUST-NOT: re-grep for `Given `, `When `, `Then `, `Post-conditions`, `Automation` — none must appear.
- **Step / expected-result discipline grep** (operational sub-rule of `<format_rules>`): sequential numbering; every expected result references its step (`After step N: ...`); no orphan; no step with multi-action `and`/comma joins.
- **Naming grep** per `<naming_conventions>`: parenthesized type label present.
- **Parameterization grep** per `<format_rules>`: when Test Data present → Preconditions states execution count + references Test Data + set count ≤ 5 (else split per `<failure_handling>`).
- **Gap-marker grep** per `<epistemic_honesty>` (covers both Traceability honesty AND required-field populated-or-gap-marked — single canonical contract): every Traceability field and every required field (Related Requirement, Type, Priority, Preconditions, Steps, Expected Results) is either real or carries a `<epistemic_honesty>` gap marker. No fabrication.
- **Safety re-scan grep** per `<safety_boundaries>` (target list + placeholder vocabulary in `references/examples-and-redaction.md`).
- **Notes accuracy** (structural artifact check, no canonical rule): split-from-N-set parameterization recorded; defaulted-to-P2 Priority gap visible.

</validation_checklist>

</testrail-test-case-authoring>
