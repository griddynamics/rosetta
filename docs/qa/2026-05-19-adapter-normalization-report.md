# QA Report — Hook Input Normalization Adapter
Date: 2026-05-23 | Branch: qa/adapter-validation-2026-05-19 | Status: PARTIAL

> **NOTE FOR REVIEWER:** This report is in progress. Live E2E sections (rows 6, 8, 11, 13, 14)
> are marked PENDING — see `docs/qa/2026-05-19-adapter-evidence/HANDOFF.md` for step-by-step
> instructions to complete them.

---

## 1. Scope

IDEs validated offline: claude-code, codex, cursor, windsurf, copilot
IDEs validated live: PENDING (Tasks 4-7 not yet executed)
IDEs deferred: Antigravity, Gemini CLI, OpenCode, JetBrains/Junie, VS Code

Gap-issues filed:
- https://github.com/griddynamics/rosetta/issues/93 — Gemini CLI
- https://github.com/griddynamics/rosetta/issues/94 — Antigravity docs contradiction
- https://github.com/griddynamics/rosetta/issues/95 — unknown-tool fallback
- https://github.com/griddynamics/rosetta/issues/96 — adapter not public consumable (OUT-OF-SCOPE)
- https://github.com/griddynamics/rosetta/issues/97 — OpenCode + JetBrains/Junie
- https://github.com/griddynamics/rosetta/issues/98 — VS Code in CONTEXT.md but no adapter

---

## 2. Traceability Matrix

| # | Mapping | Method | Result |
|---|---------|--------|--------|
| 1 | Adapter consumable at documented path | preflight-decisions.md | OUT-OF-SCOPE (issue #96 pending) |
| 2 | cursor hook_event_name 'postToolUse' → NormalizedInput.event 'PostToolUse' | vitest toMatchObject | PASS |
| 3 | claude-code toolKind 'Write' → 'write' | vitest toMatchObject | PASS |
| 4 | codex toolKind 'Bash' → 'bash' | vitest toMatchObject | PASS |
| 5 | copilot event inferred from toolResult | vitest toMatchObject | PASS |
| 6 | Live E2E: Claude Code PostToolUse captured | e2e-claude-code.md | **PENDING** |
| 7 | MultiEdit fixture → toolKind 'multi-edit' | vitest toMatchObject | PASS |
| 8 | Live E2E: Cursor (or fallback) | e2e-cursor*.md | **PENDING** |
| 9 | tool_input paths preserved per IDE | vitest toMatchObject | PASS |
| 10 | dedupKey() idempotent for same input | vitest dedupKey tests | PASS |
| 11 | Live dedup: 2 hooks, 1 invocation each | e2e-dedup-verification.md | **PENDING** |
| 12 | formatOutput() per-IDE shape preserved | format-output-snapshot.log | PASS |
| 13 | Live E2E: Codex (or fallback) | e2e-codex*.md | **PENDING** |
| 14 | Live E2E: Copilot | e2e-copilot.md | **PENDING** |

> **M8 note:** Row #2 — cursor hook_event_name normalization is intentional design
> (reverseLookupEvent in ide-registry.ts:13-18 normalizes camelCase to PascalCase semantic key).

---

## 3. Acceptance Criteria Trace

| AC | Status | Evidence |
|----|--------|----------|
| 5 IDEs with normalize() tests | PASS | hooks/tests/adapter.test.ts |
| Live E2E capture ≥ 4 IDEs | **PENDING** | e2e-ide-matrix.txt |
| dedupKey() verified | PASS (unit) / PENDING (live) | vitest + Task 7.5 |
| Gap-issues filed | PASS (6 issues: #93-#98) | see Section 1 |
| Evidence sanitized | PENDING (no live data yet) | docs/qa/2026-05-19-adapter-evidence/ |

---

## 4. B6 Sign-off

Status: OBTAINED
Contact: akoziar (ticket requester, self-sign-off)
Date: 2026-05-23

---

## 5. Overall Verdict

**VALIDATION PARTIAL** — Live E2E captures (Tasks 4-7) not yet executed.
Update this section after completing HANDOFF.md steps.

Template for final verdict:
```
VALIDATION COMPLETE — all rows PASS/PASS-with-caveat, B6 sign-off obtained
```
or
```
VALIDATION PARTIAL — [reason]
```
