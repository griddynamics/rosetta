# rosettify -- Review Findings

plan_name: rosettify
phase: 3 (review)
date: 2026-04-05
reviewer: Full Reviewer (automated)
artifacts_reviewed:
  - plans/rosettify/rosettify-SPECS.md
  - plans/rosettify/rosettify-PLAN.md
  - plans/rosettify/discovery-notes.md
  - docs/requirements/rosettify/ (ARCH, PLAN, HELP, CLI, MCP, PKG, NFR, SHARED)

---

## Overall Assessment: APPROVE WITH MINOR FIXES

The SPECS and PLAN are comprehensive, well-structured, and align closely with all 8 approved requirement files. All 22 error codes are cataloged. All requirement IDs are traced via the traceability matrix (SPECS section 14). Plan step dependencies are logically correct. The few findings below are clarification gaps that will not block implementation but should be addressed to prevent ambiguity during coding.

Confidence: 0.92

---

## Findings

### F-01 [MEDIUM] Missing data-parsing step in SPECS subcommand behaviors

**Source:** FR-PLAN-0015, FR-PLAN-0010, SPECS section 5.4, discovery notes section 5
**Issue:** The `PlanInput.data` field is typed as `string | Record<string, unknown>`, and the Python reference has an explicit `_parse_data_payload` function that JSON-parses string data and returns `invalid_data` on malformed JSON. The SPECS error catalog includes `invalid_data` but no subcommand behavior section explicitly states that string `data` must be JSON-parsed before use, nor that malformed JSON yields `invalid_data`.
**Risk:** An implementor could skip the string-to-object parsing step and only handle object data, breaking CLI usage where data arrives as a JSON string argument.
**Recommendation:** Add a note to SPECS section 5.4 (before the subcommand behaviors) stating: "When `data` is a string, it SHALL be parsed as JSON. If parsing fails or the result is not an object, return `err('invalid_data', true)`." Alternatively, add a `parseDataPayload` entry to the validation functions table in section 5.5.

### F-02 [MEDIUM] validatePlanName does not reject empty/whitespace-only names

**Source:** FR-PLAN-0001 (name: required, non-empty), SPECS section 5.5, Python `_validate_plan_name`
**Issue:** The Python implementation rejects empty or whitespace-only names with `invalid_plan_name`. The SPECS `validatePlanName` function (section 5.5) only checks `name.length <= 256`. The error catalog does not include `invalid_plan_name`. While `create` defaults to "Unnamed Plan" when name is absent, an explicit `upsert` with `name: ""` or `name: "   "` would pass validation but violate FR-PLAN-0001's "required, non-empty" constraint.
**Risk:** Empty plan names could be written to disk, violating the data model contract.
**Recommendation:** Either (a) add empty/whitespace name rejection to `validatePlanName` using error code `size_limit_exceeded` (consistent with length check) or a new code `invalid_plan_name`, or (b) explicitly state that empty names are allowed in upsert patches since the original name remains if not overwritten. Option (a) is safer.

### F-03 [MINOR] Create overwrite behavior not explicit in SPECS

**Source:** NFR-REL-0002, FR-PLAN-0010, SPECS section 5.4 (create)
**Issue:** NFR-REL-0002 states "Creating an already-existing plan SHALL overwrite." The SPECS create section says "Writes via optimistic concurrency -- on create, no prior updated_at check needed (new file)." The phrase "new file" could mislead an implementor into thinking create should error on existing files.
**Risk:** Implementor might add an existence check that rejects overwrites.
**Recommendation:** Add one sentence to SPECS section 5.4 (create): "If the plan file already exists, it is overwritten (NFR-REL-0002). No existence check is performed."

### F-04 [MINOR] pre_commit.py integration details only in discovery notes

**Source:** NFR-INT-0001, PLAN P7-S01, discovery notes section 1
**Issue:** The SPECS has no dedicated section for pre_commit.py integration. The implementor must consult discovery notes section 1 for the exact `run_rosettify_typecheck()` and `run_rosettify_tests()` functions and the `--prefix` approach.
**Risk:** Low -- discovery notes are part of the plan artifacts and explicitly referenced by P7-S01. But if an implementor only reads the SPECS, they lack integration details.
**Recommendation:** Either add a brief section 15 to SPECS referencing the exact integration pattern, or ensure P7-S01 explicitly says "implementation per discovery notes section 1."

### F-05 [MINOR] PLAN P2-S02 places plan types in shared infrastructure phase

**Source:** PLAN Phase 2 step P2-S02, SPECS section 3.2
**Issue:** `src/commands/plan/types.ts` is implemented in Phase 2 (Shared Infrastructure) rather than Phase 3 (Plan Command). This is intentional -- the types are needed by shared infrastructure modules (dispatch validates against them, envelope wraps them). However, the phase name "Shared Infrastructure" may confuse an implementor who expects all plan-related code in Phase 3.
**Risk:** Cosmetic confusion only. The dependency chain is correct.
**Recommendation:** No change needed. This is noted for awareness.

### F-06 [LOW] Package version 0.1.0 vs NFR-STAB-0001

**Source:** NFR-STAB-0001, SPECS section 11.1
**Issue:** The SPECS specifies `"version": "0.1.0"` in package.json. NFR-STAB-0001 prohibits "v0.x" but applies to dependencies, not the package itself.
**Risk:** None. The constraint is on dependencies only.
**Recommendation:** No change needed.

### F-07 [LOW] Help version field source unspecified in PLAN

**Source:** FR-HELP-0001 (returns version), SPECS section 6.2
**Issue:** The help run delegate returns `{tool: "rosettify", version, ...}`. The PLAN has no step specifying how `version` is read at runtime (import from package.json, hardcode, or use a generated file).
**Risk:** Trivial implementation detail. Most TypeScript projects use `createRequire` or a build-time constant.
**Recommendation:** No change needed. Implementor can resolve this trivially.

### F-08 [LOW] MCP SDK import paths are version-specific

**Source:** SPECS section 9.1, PLAN risk register
**Issue:** Import paths `@modelcontextprotocol/sdk/server/index.js` and `@modelcontextprotocol/sdk/server/stdio.js` may change between SDK versions.
**Risk:** Already mitigated by PLAN risk register entry for P6-S01.
**Recommendation:** No change needed.

---

## Checklist Results

| Check | Result |
|---|---|
| SPECS covers all FR-ARCH-* (0001-0013) | PASS |
| SPECS covers all FR-PLAN-* (0001-0025) | PASS |
| SPECS covers all FR-HELP-* (0001-0003) | PASS |
| SPECS covers all FR-CLI-* (0001-0005) | PASS |
| SPECS covers all FR-MCP-* (0001-0004) | PASS |
| SPECS covers all FR-PKG-* (0001-0004) | PASS |
| SPECS covers all FR-SHRD-* (0001-0006) | PASS |
| SPECS covers all NFR-* (14 requirements) | PASS |
| TypeScript interfaces complete and correct | PASS |
| File structure aligned with discovery notes | PASS |
| PLAN covers all SPECS sections | PASS |
| Plan step dependencies logically correct | PASS |
| Optimistic concurrency spec correct (FR-SHRD-0006) | PASS -- 1 initial + 3 retries = 4 attempts |
| Upsert status-field stripping specced (FR-PLAN-0015) | PASS |
| Next blocked/failed surfacing specced (FR-PLAN-0011) | PASS |
| phase_status_is_derived error specced (FR-PLAN-0012) | PASS |
| All 22 error codes in catalog | PASS -- 22 codes verified |
| ESM/NodeNext import constraints mentioned | PASS -- SPECS section 3, PLAN P7-S06 |
| pre_commit.py integration specced | PASS (via PLAN + discovery notes) |
| E2E MCP harness specced (NFR-INT-0003) | PASS -- PLAN P6-S03 |
| E2E CLI harness specced (NFR-INT-0004) | PASS -- PLAN P5-S04 |
| No implementation-blocking gaps | PASS |

---

## Summary

- **Findings total:** 8 (2 medium, 3 minor, 3 low)
- **Blocking findings:** 0
- **Medium findings (F-01, F-02):** Both relate to input validation edge cases that should be clarified before implementation to prevent bugs. Neither blocks starting work -- they can be addressed as the SPECS is finalized.
- **All checklist items pass.** The traceability matrix in SPECS section 14 maps every approved requirement to a spec section. The PLAN covers all spec sections with correctly ordered steps and valid dependencies. The error catalog is complete at 22 codes. E2E harnesses for both CLI and MCP are planned.

**Verdict: APPROVE WITH MINOR FIXES** -- Address F-01 and F-02 before or during implementation. All other findings are informational.
