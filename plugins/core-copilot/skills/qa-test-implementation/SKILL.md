---
name: qa-test-implementation
description: Implement approved API test specifications as executable automated tests following project standards, with shared utilities for auth, data factories, and response validation. Workflow-agnostic — input artifact paths and approval signals are supplied by the calling workflow.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-test-implementation>

<role>Backend API test automation implementation specialist</role>

<when_to_use_skill>
Create automated API test code from approved test specifications. The skill expects an approved-specs artifact, an API-contracts artifact, and an existing-patterns artifact — supplied by the calling workflow. It does not know which workflow it runs inside; phase numbers and workflow-specific filenames are caller concerns.
</when_to_use_skill>

<prerequisites>
- Approved test specifications artifact (default filename when caller does not specify: `test-specs.md`)
- Recorded user approval for those specs (an explicit token, timestamp, or state-file row provided by the calling workflow)
- API contract artifact for endpoint details (default filename: `api-analysis.md`)
- Existing test patterns artifact OR a live repo the agent can scan (default filename: `raw-data.md`)
- Project coding standards understood (read via `repository-implementation-standards` when that skill is loaded)
</prerequisites>

<input_contract>

The calling workflow supplies input artifact paths. The defaults the skill recognizes when paths are not specified:

| Input | Default path | Required content |
|---|---|---|
| Approved test specs | `test-specs.md` (in caller's session directory) | ATC-NNN entries with steps + expected results, file mapping, shared-utility plan |
| API contracts | `api-analysis.md` | Per-endpoint contracts (method, schemas, status codes, auth) |
| Existing patterns / raw data | `raw-data.md` | Framework discovery results, naming/structure conventions, helper inventory |
| Approval signal | caller-provided (state-file row, explicit token, etc.) | Evidence that the user approved the specs in the caller's HITL step — NOT inferred by this skill |

If the calling workflow uses different filenames, it MUST pass the explicit paths; this skill never substitutes its own defaults silently when paths are explicitly provided.

Existence + non-empty + approval validation runs as process step 1 GATE.

</input_contract>

<process>

## 1. Validate Inputs (GATE)

Before writing any test code, all of the following must hold. On any failure, **stop, report which prerequisite is missing/unapproved to the calling workflow, and do not generate test code from incomplete inputs.**

- **Approved specs artifact exists and is non-empty.** If missing or empty: stop, report `qa-test-implementation: approved specs artifact missing/empty at <path>`.
- **User approval is recorded.** The approval signal supplied by the calling workflow must be present and explicit (a state-file row, a timestamp, an exact approval token — caller defines the shape). **Do NOT generate test code from unapproved specs.** If approval is missing or stale, stop and ask the calling workflow to complete its approval step.
- **API contract artifact exists and is non-empty** (or marked partial with explicit gaps per the spec-authoring skill's output). If absent, stop — tests cannot be authored against unknown endpoints.
- **Existing patterns discoverable.** Either the raw-data artifact names the framework + helpers, OR the live repo has detectable test files. If neither: stop, ask the calling workflow to provide the framework choice explicitly. Do NOT pick a framework default — wrong choice cascades into all generated test code.
- **Shared-utility conflicts identified.** If the spec calls for an auth helper / factory / validator that already exists in the codebase under a different name, record the conflict and decide (in step 3) whether to extend the existing helper or create a new one. Do NOT silently create a parallel implementation.

## 2. Consolidate Implementation Plan

From the loaded inputs, draft this outline (intermediate artifact; emitted in the hand-off summary at the end):

```markdown
### Implementation Plan

**Test Framework**: [pytest / Jest / JUnit + RestAssured / xUnit / etc. — sourced from existing patterns]
**HTTP Client**: [requests / axios / SuperTest / RestAssured / HttpClient / etc.]
**Test Files to Create/Modify**: [List with paths]
**Shared Utilities to Create/Modify**: [List with paths; mark each as `create` or `extend`]
**Implementation Order**: P0 → P1 → P2 → P3 (per spec priority tiers)
**Assumptions made**: [list any spec-omitted values the agent had to invent OR pattern ambiguities the agent resolved by picking a default. Empty list if none.]
```

## 3. Implement Shared Utilities (if needed)

Create or extend shared utilities identified in the approved specs. **Prefer extending existing helpers over creating parallel ones** — the existing-patterns artifact lists them. Canonical Auth Helper + Test Data Factory examples (Python / TypeScript / Java) live in [references/multi-language-examples.md](references/multi-language-examples.md) — load on demand at this step.

## 4. Implement Test Files

For each test file from the file mapping in the approved specs, follow existing project patterns. Canonical ATC-001 test file (Python / TypeScript / Java) in [references/multi-language-examples.md](references/multi-language-examples.md).

**Naming + traceability:** every test function name or docstring includes the ATC-NNN identifier from the approved specs. Loss of traceability between ATC and test is a regression.

## 5. Apply Implementation Rules

Apply Test Isolation / Idempotency / Assertion order / Error Response Testing / Auth Testing rules per [references/multi-language-examples.md](references/multi-language-examples.md#implementation-rules-skillmd-step-5) — load on demand at this step. Single source of truth; `<validation_checklist>` and `<pitfalls>` reference, do not restate.

## 6. Implement by Priority

P0 → P1 → P2 → P3 per [references/multi-language-examples.md](references/multi-language-examples.md#priority-order-skillmd-step-6). A spec's priority field overrides this default when present.

## 7. Record Assumptions and Flag Gaps

Before declaring complete, surface every:

- **Spec-omitted value** the agent had to invent — record it as `[ASSUMED: <field>=<value>]` in a code comment next to the use site AND in the Implementation Plan's "Assumptions made" section. Confident fabrication is forbidden; if the specs left a value undefined, name the assumption explicitly.
- **Pattern ambiguity** the agent resolved by choosing a default — e.g., "existing tests used both `pytest` fixtures and class-based setup; chose class-based to match the most recent file." Record in the same Assumptions section.
- **Existing utility extended** rather than reused as-is — record so the maintainer can verify the extension is appropriate.
- **Spec items the agent could NOT implement** (skill missing, contract gap, framework limitation) — list as `Gaps` in the hand-off summary with the per-item reason. Do NOT silently drop ATCs.

## 8. Validate Implementation

Run the `<validation_checklist>` below before declaring complete. Fix any failing item.

</process>

<output_format>

The skill's deliverable is two parts: (a) on-disk test + utility code, (b) a hand-off summary returned to the calling workflow.

**On-disk deliverable:**
- Test files created or modified at paths consistent with the project's test layout.
- Shared utility files created or modified at paths consistent with the project's helper layout.

**Hand-off summary** (returned to the calling workflow) — required fields, in this order. Each field's `[ASSUMED: ...]` marker + no-silent-ATC-drop discipline is owned by `<process>` step 7 (canonical); this section is the field-list contract only.

1. `**Test framework:**` (name + version)
2. `**Files created:**` / `**Files modified:**` (counts)
3. `### Files` — bulleted list of paths with brief annotation
4. `### ATC → test mapping` — table: ATC ID | Test file | Test function
5. `### Assumptions made` — `[ASSUMED: ...]` entries per step 7 (or `None — ...` per the populated example)
6. `### Gaps surfaced` — per-ATC entries with reason (or `None — all ATCs implemented`)
7. `### Lint / format status` — pass | fail | skipped + exact command
8. `### Ready for re-test` — yes | no (with reason if no)

**Filled worked example** (sample file names + ATC table + sample `[ASSUMED:]` markers + lint output) lives in [references/multi-language-examples.md](references/multi-language-examples.md#hand-off-summary-worked-example-skillmd-output_format) — load on demand at process step 8.

</output_format>

<validation_checklist>

**Grep-proof layer only** — rules live in step 1 GATE + `<process>` step 7 (assumptions/gaps discipline) + `<output_format>` (field list) + step 5 implementation rules (`references/multi-language-examples.md`). Items below are per-emission grep checks; no rule is restated here.

- **Step 1 GATE passed** (all 5 inputs validated; no missing/unapproved generation start).
- **ATC traceability grep:** every ATC from approved specs → either a test function mapped in `### ATC → test mapping` OR a `### Gaps surfaced` entry with reason (step 7 "no silent drop" rule).
- **ATC-NNN identifier grep:** every test function name or docstring contains its ATC ID.
- **Assertion-completeness grep** per the approved spec (status / body structure / body values / headers).
- **Auth-coverage grep:** spec's auth-failure ATCs (401 no-token / 401 bad-token / 403 insufficient-perm) all implemented for protected endpoints.
- **No hardcoded credentials / URLs / production data** grep on touched test files (synthetic data only; env vars / fixtures / config for runtime values).
- **Helper-reuse grep** per step 1 GATE shared-utility rule: parallel `AuthHelper`/`Factory`/`Validator` only when the Assumptions section records the reason.
- **Lint/format clean** grep on touched files; exact command recorded in hand-off summary.
- **`[ASSUMED: ...]` marker grep** per step 7: every Assumptions-section entry uses the marker syntax in code AND in the hand-off summary.
- **Hand-off summary emitted** per `<output_format>` field list — all 8 fields populated (or `None`/`N/A` with reason).

</validation_checklist>

<pitfalls>

Only **genuinely additive** failure modes (rules already enforced by step 1 GATE / `<process>` step 7 / `<validation_checklist>` are NOT restated):

- **Hardcoded waits / sleeps** instead of proper retry-or-condition strategies — produces flaky tests under load variance. The lint/format check rarely catches `time.sleep(2)` / `await new Promise(r => setTimeout(r, 2000))`; the checklist's "no hardcoded credentials" grep targets sensitive values, not timing primitives. Use the framework's wait/retry primitives (e.g., `pytest.retry`, `expect.poll`, `WebDriverWait`) tied to an observable condition.
- **Skipping test data cleanup** — even idempotent-looking tests can leave state that cascades into later runs (sequence-IDs, soft-delete flags, audit-log rows). Add teardown or rollback per the project's existing pattern.
- **Bypassing existing helpers to write raw HTTP calls** when utilities exist — splits the maintenance surface; a future auth-helper change misses the raw paths. The helper-reuse grep catches the *parallel-implementation* case; this pitfall covers the upstream "I'll just call requests.post directly" temptation when the helper exists but is harder to discover.
- **Not matching existing test patterns** (imports order / describe/test structure / naming convention) — the lint command catches formatting but not structural fit; downstream phases assume consistency.

</pitfalls>

</qa-test-implementation>
