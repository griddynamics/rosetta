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
- Test files created or modified at paths consistent with the project's test layout
- Shared utility files created or modified at paths consistent with the project's helper layout

**Hand-off summary** (returned to the calling workflow):

```markdown
## qa-test-implementation deliverable

**Test framework:** [name + version]
**Files created:** [count]
**Files modified:** [count]

### Files
- `tests/api/users.test.ts` (created, 8 tests)
- `tests/helpers/auth.ts` (modified — extended existing AuthHelper with `getAdminToken`)

### ATC → test mapping
| ATC ID  | Test file                  | Test function                              |
|---------|----------------------------|--------------------------------------------|
| ATC-001 | `tests/api/users.test.ts`  | `test_create_user_with_valid_data`         |
| ATC-002 | `tests/api/users.test.ts`  | `test_create_user_missing_required_field`  |

### Assumptions made
- `[ASSUMED: max_username_length=64]` — spec did not specify; chose 64 to match the user-table column constraint observed in the existing schema migration.
- `[ASSUMED: test isolation via class-scoped setup]` — both class-based and function-scoped patterns exist in the codebase; chose class-scoped to match the most recent file.
- (If none: `None — all values derived from approved specs and existing patterns.`)

### Gaps surfaced
- `ATC-017` — not implemented; depends on `/api/v1/admin/audit-log` endpoint not present in `api-analysis.md`. Calling workflow should re-run API spec analysis to cover this endpoint.
- (If none: `None — all ATCs implemented.`)

### Lint / format status
- [pass | fail | skipped] — exact command run: `<command>`
- If failed: paste the relevant error output.

### Ready for re-test
- yes | no (with reason if no)
```

</output_format>

<validation_checklist>

Run as process step 8 before declaring complete. All items must hold:

- **All inputs were validated** per step 1 GATE; no input was missing/unapproved when generation began.
- **Every ATC from approved specs is mapped to a test function** OR surfaced in the `### Gaps` section with a reason. No silent ATC drops.
- **Every test function name or docstring contains its ATC-NNN identifier** — traceability preserved.
- **All assertions from the approved spec are encoded** in the test function (status code + body structure + body values + headers as specified). Missing assertions are spec violations.
- **Auth coverage matches spec:** for each protected endpoint, the spec's auth-failure ATCs (401 no-token, 401 bad-token, 403 insufficient-perm when applicable) are implemented.
- **No hardcoded URLs / credentials / production data** in test files. Use env vars, fixtures, or config files. Synthetic test data only.
- **Existing helpers extended, not duplicated.** If a parallel `AuthHelper`/`Factory`/`Validator` was created, the reason is recorded in Assumptions.
- **Imports correct; lint/format clean** on touched files. Run the project's lint/format command and record the result in the hand-off summary.
- **Assumptions section populated** — every spec-omitted value or pattern-ambiguity decision is recorded with `[ASSUMED: ...]` markers in code AND in the hand-off summary. Empty list is acceptable; absence of the section is not.
- **Hand-off summary emitted** per `<output_format>` — Test framework / Files / ATC→test mapping / Assumptions / Gaps / Lint / Ready-for-re-test fields all populated (or marked `None`/`N/A` with reason).

</validation_checklist>

<pitfalls>
- Generating test code from unapproved specs because the approval signal looked "probably there" — the step 1 GATE requires an explicit approval signal from the calling workflow, not inference.
- Bypassing existing helpers to write raw HTTP calls when utilities exist
- Missing assertions from the test specification
- Not matching existing test patterns (imports, structure, naming)
- Hardcoding URLs, credentials, or test data that should be configurable
- Skipping test data cleanup — causes cascading failures in test suite
- Not referencing ATC spec IDs in test names/comments — loses traceability
- Adding hardcoded waits/sleeps instead of proper retry strategies
- Inventing spec values without an `[ASSUMED: ...]` marker — confident fabrication that the maintainer cannot trace back
- Silently dropping ATCs that can't be implemented — they belong in the `### Gaps` section of the hand-off summary
- Picking a test framework default when existing patterns are absent or ambiguous — the step 1 GATE requires the caller to provide the framework choice explicitly
</pitfalls>

</qa-test-implementation>
