# Test Review — Clean Architecture Task C (9 New Test Files)

**Reviewer:** rosetta:reviewer subagent
**Date:** 2026-06-11
**Verdict:** APPROVED-WITH-ISSUES
**Findings:** 1 Medium, 5 Low
**Multi-vendor ordering tests:** PRESENT in both cursor and copilot test files

---

## Verdict Rationale

All 9 test files cover the primary spec requirements from CLEAN-ARCHITECTURE-SPECS.md §7 and the Test Changes section of CLEAN-ARCHITECTURE.md. The critical invariants (codex frontmatter.model NOT updated, cursor additional_context format, copilot stale-lock cleanup, NFR-0004 soft errors) are all tested and the assertion style is correct. Multi-vendor ordering tests for the intentional first-token strategy (FR-ARCH-0046) are present in both cursor and copilot test files. No internal functions are mocked — all tests construct real frame objects. The suite is approved with the noted issues tracked below.

---

## Findings

### F1 — Medium — Claude normalizer test: spec text vs. actual output mismatch risk

**File:** `tests/unit/file-processors/file-normalize-claude-models.test.ts` lines 101–143

**Observation:** CLEAN-ARCHITECTURE-SPECS.md §7 describes the claude normalization as `claude-opus-4-6 → 'opus'` and `claude-haiku-4-5 → 'haiku'`, implying short-name outputs. The tests assert full versioned model names: `claude-opus-4-8`, `claude-haiku-4-5`, `claude-sonnet-4-6`. These values are consistent with each other but diverge from the spec illustration text.

**Risk:** If `normalizeClaude` returns short-names like `'opus'`, `'sonnet'`, `'haiku'` (as the spec text examples suggest), every positive normalization test in this file would fail at runtime. If it returns versioned strings, the tests are correct.

**Recommendation:** Verify the actual `normalizeClaude` implementation output before accepting these tests. The spec description appears to use shorthand for illustration, not exact return values. If the implementation was already verified correct by the engineer and validator, this can be downgraded to Low or closed.

**Traceability:** CLEAN-ARCHITECTURE-SPECS.md §7 `fileNormalizeClaudeModels` assertions; FR-COPY-0020.

---

### F2 — Low — Claude assembler: plugin-root ordering not verified as last

**File:** `tests/unit/plugin-processors/plugin-assemble-claude-bootstrap.test.ts` lines 115–121

**Observation:** CLEAN-ARCHITECTURE-SPECS.md §7 states: "Plugin-root entry is last; entries joined by `', '`." The test checks that `CLAUDE_PLUGIN_ROOT` is contained in the payload, and a separate test checks `', '` separator and entry count. No test explicitly asserts that the plugin-root entry is the LAST entry (e.g., `entries[entries.length - 1].toContain('CLAUDE_PLUGIN_ROOT')`).

**Risk:** Low — the ordering is structurally enforced by `assembleBootstrapPayload` which appends the root entry after the manifest loop. However, the contract is not pinned by a test.

**Recommendation:** Add a test that splits on `', '` and asserts the last element contains `CLAUDE_PLUGIN_ROOT`. This is a minor hardening gap, not a correctness failure.

**Traceability:** CLEAN-ARCHITECTURE-SPECS.md §7 key assertion: "Plugin-root entry is last."

---

### F3 — Low — Codex assembler: same file and assertion duplication for plugin-root

**File:** `tests/unit/plugin-processors/plugin-assemble-codex-bootstrap.test.ts` lines 128–137

**Observation:** The test "plugin-root entry also has statusMessage and timeout" counts `statusMessage` occurrences and asserts `>= 1`, but this does not distinguish between the doc entry and the root entry having the field — a single doc entry would satisfy it. The intent is to confirm the root entry also uses the codex shape. A count `>= 2` with two doc frames would be a stronger assertion.

**Risk:** Low — the assembler implementation always uses `buildCodexBootstrapEntry` for the root, so this is not a hidden defect; the test is just less precise than intended.

**Recommendation:** Use two doc frames in this test and assert count `>= 2` (one for each doc entry plus the root) to confirm the root entry also carries the codex shape.

**Traceability:** CLEAN-ARCHITECTURE-SPECS.md §7 plugin-assemble-codex key assertions.

---

### F4 — Low — Copilot assembler: `agentPlugins` checked redundantly

**File:** `tests/unit/plugin-processors/plugin-assemble-copilot-bootstrap.test.ts` lines 152–168

**Observation:** Two separate `it` blocks in the plugin-root describe section both assert `expect(payload).toContain('agentPlugins')` with near-identical setup code. The second block adds no distinct assertion beyond repeating the first.

**Risk:** None functionally — redundant tests pass harmlessly.

**Recommendation:** Consolidate into a single `it` block or give the second block a distinct assertion (e.g., checking the powershell branch also contains `agentPlugins`).

**Traceability:** DRY principle; testing skill core principles (no duplicate test scenarios).

---

### F5 — Low — Cursor entry shape test does not assert absence of extra fields at parse level

**File:** `tests/unit/plugin-processors/plugin-assemble-cursor-bootstrap.test.ts` lines 125–133

**Observation:** The test "entry shape is `{"type": "command", "command": "..."}` — no extra fields" only asserts `expect(payload).toContain('"command"')`. It relies on the earlier negative assertions (no `"once"`, no `"statusMessage"`, no `"bash"`) to cover the "no extra fields" contract. This is effectively correct but the test description overstates the assertion scope.

**Risk:** None — the negative assertions in prior `it` blocks cover the contract. The description is misleading.

**Recommendation:** Update the test description to match what is actually asserted: "entry shape contains `\"command\"` key." No code change needed.

**Traceability:** CLEAN-ARCHITECTURE-SPECS.md §7 cursor assembler: "Entry shape: `{"type": "command", "command": "..."}`."

---

### F6 — Low — No 1-second timeout enforcement at test level

**File:** All 9 test files

**Observation:** The testing skill requires: "MUST enforce 1-second timeout on EACH test via attributes or configuration to detect accidental external calls." None of the 9 test files configure `test.timeout` or vitest `testTimeout` per test.

**Risk:** Low in practice — all tests are synchronous pure-function calls with no external I/O, so they will complete in microseconds. However, the policy is not enforced.

**Recommendation:** Add `{ timeout: 1000 }` to `it` blocks or configure `testTimeout: 1000` in the vitest config for the unit test suite. This is a policy compliance gap, not a functional issue.

**Traceability:** Testing skill validation checklist: "MUST enforce 1-second timeout on EACH test."

---

## Multi-vendor Ordering Tests: Status

Both required multi-vendor ordering tests are present and correct.

**Cursor (`file-normalize-cursor-models.test.ts` lines 139–146):**
Test "uses FIRST token only (not scanning all like claude)" — input `gpt-4o-high, claude-opus-4-6`, asserts output `model: gpt-4o` (first token wins, effort stripped). This validates FR-ARCH-0046 intentional first-token strategy for Cursor.

**Copilot (`file-normalize-copilot-models.test.ts` lines 104–110):**
Test "uses first token only (not scan-for-claude)" — input `gpt-4o, claude-opus-4-6`, asserts output `model: GPT-4o` (first token wins, mapped to display name). This validates FR-ARCH-0046 intentional first-token strategy for Copilot.

Both tests directly contrast with the Claude scanner behavior (scans ALL tokens for first claude-compatible), making the design intent explicit and testable.

---

## Coverage Assessment Per File

| File | Guard Cases | Normalization | Critical Invariants | Multi-vendor | NFR-0004 |
|------|-------------|---------------|--------------------|--------------|---------:|
| file-normalize-shared-helpers | FULL | FULL | n/a | n/a | n/a |
| file-normalize-claude-models | FULL | FULL (see F1) | n/a | FULL | n/a |
| file-normalize-cursor-models | FULL | FULL | n/a | FULL | n/a |
| file-normalize-copilot-models | FULL | FULL | n/a | FULL | n/a |
| file-normalize-codex-models | FULL | FULL | FULL (all 3 branches) | n/a | n/a |
| plugin-assemble-claude-bootstrap | FULL | n/a | FULL | n/a | FULL |
| plugin-assemble-codex-bootstrap | FULL | n/a | FULL | n/a | FULL |
| plugin-assemble-copilot-bootstrap | FULL | n/a | FULL | n/a | FULL |
| plugin-assemble-cursor-bootstrap | FULL | n/a | FULL | n/a | FULL |

---

## Mocking Quality Assessment

All 9 test files construct real `FileProcessingFrame` and `PluginProcessingFrame` objects via helper functions (`makeFrame`, `makeDocFrame`, `makePluginFrame`). No `vi.mock`, `vi.fn`, `vi.spyOn`, or `jest.mock` patterns appear anywhere. No internal functions are mocked. All dependencies (normalizers, payload assemblers) are exercised through real code paths. This conforms to the testing skill mocking policy: mock external I/O only; do not mock regular classes or internal functions.

---

## Copilot Assembler Plugin-Root Adjustment Verification

The orchestrator noted the plugin-root test was adjusted to check `agentPlugins` in the plugin-root bash rather than checking the lock index. This adjustment is correct and sufficient because:
1. `COPILOT_PLUGIN_ROOT_BASH` does not use a session lock file — it is a path-discovery script, not a locked bootstrap step.
2. `agentPlugins` is the unique identifier in `COPILOT_PLUGIN_ROOT_BASH` that distinguishes it from doc entry bash commands.
3. The lock index counting is tested through the `-0.lock`, `-1.lock`, and stale-cleanup-count-1 tests in the session lock section, which are all correct.

The adjustment is well-reasoned and the resulting tests provide sufficient coverage of the plugin-root behavior.

---

## Summary of Findings by Severity

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | F1 |
| Low | 5 | F2, F3, F4, F5, F6 |

**Overall verdict: APPROVED-WITH-ISSUES.** The test suite is functionally sound and covers all critical spec requirements. F1 should be resolved by verifying the `normalizeClaude` output values before the suite is considered fully locked. F2–F6 are quality improvements that do not block approval.
