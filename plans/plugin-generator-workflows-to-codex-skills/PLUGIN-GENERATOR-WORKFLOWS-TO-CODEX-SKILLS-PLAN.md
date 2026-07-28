# Plugin Generator — Workflows to Codex Skills: Execution Plan

## Intent and boundaries

- Outcome: generate Codex and Antigravity workflows as skills through target-owned placement and one no-argument processor.
- In scope: FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030.
- Out of scope: `PluginSpec` expansion, root arguments/factories/flags/switches/branches, post-hoc moves, unrelated cleanup.
- Constraint: do not commit or push. Generated plugins are regenerated, never hand-edited.
- State: update `agents/TEMP/plugin-generator-workflows-to-codex-skills/coding-flow-state.md` at every phase.
- Approval: Phase 6 plan/spec approval is pending; Phase 7 cannot start before explicit approval.
- Assumptions/unknowns: none; Phase 3 design is approved.

## EARS requirements

- [FR-COPY-0080] WHEN a workflow target processes workflow documents, THEN the generator SHALL reshape already-targeted frames into workflow skills, strip phase frontmatter, and rewrite only actual owned phase references.
- [FR-VAR-0041] WHEN Codex generation completes, THEN the generator SHALL retain its rules index/hook mirror, emit no workflows folder/index, and rely on existing absent-document handling to omit that payload entry.
- [FR-VAR-0042] WHEN Codex processes workflows, THEN it SHALL emit `.agents/skills/<name>/`, normalize main-skill models, and exclude Antigravity-only transforms.
- [FR-HOOK-0007] WHEN any session-hook target is assembled, THEN it SHALL contain exactly one final plugin-root entry; Codex SHALL contain 8 r2 or 4 r3 entries, and Claude/Copilot 9 r2 or 5 r3.
- [FR-STRUCT-0010] WHEN Codex output is inspected, THEN its preserved/generated marketplace structure SHALL match the documented tree.
- [FR-STRUCT-0030] WHEN Antigravity output is inspected, THEN its existing structure SHALL remain and workflow phases SHALL contain no YAML frontmatter.

## Phase 7 — Implementation and build only

### 7.1 Generalize the file processor

**Priority/Predecessor/Agent**: P0 / approved specs / engineer.
**Where**: rename `src/rosettify-plugins/src/file-processors/file-antigravity-workflow-to-skill.ts` to `file-workflow-to-skill.ts`.
**Description**: retain ownership/reference helpers; make `fileWorkflowToSkill(frame, ctx)` derive the base from incoming `frame.target`; strip phase frontmatter only.
**AC/NFR**: immutable frame update; no processor configuration or target identity logic; main frontmatter preserved; deterministic forward-slash paths.
**EARS FR**: FR-COPY-0080, FR-VAR-0042, FR-STRUCT-0030.
**Watch for**: capture the target base before mutating `frame.target`; use `sourcePath` only for workflow-relative identity.
**HITL**: none; approved design is binding.

### 7.2 Compose both targets

**Priority/Predecessor/Agent**: P0 / 7.1 / engineer.
**Where**: `src/rosettify-plugins/src/spec/targets.ts`.
**Description**: Codex workflow target → `.agents/skills`; order normalization before shared processor; remove only its workflow-index declaration; Antigravity uses the same processor with target `skills`.
**AC/NFR**: `PluginSpec` unchanged; no factory/argument/flag/switch/branch/move; Antigravity-only post-index processors remain isolated.
**EARS FR**: FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030.
**Watch for**: retain Codex `includeIndexEntries: true` for the rules index; do not edit bootstrap code.
**HITL**: none; stop on any design deviation.

### 7.3 Build-only implementation evidence

**Priority/Predecessor/Agent**: P0 / 7.2 / engineer.
**Where**: `src/rosettify-plugins/`.
**Description**: run `npm --prefix src/rosettify-plugins run build`; inspect production diff only.
**AC/NFR**: build exits 0; only 7.1/7.2 production files changed; no tests are authored or executed in this phase.
**EARS FR**: FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030.
**Watch for**: do not treat build success as behavioral evidence.
**HITL**: Phase 10 is mandatory before tests.

### 7.4 Update workflow state

Record Phase 7 production files, build command/result, and Phase 8 current in `coding-flow-state.md`. [all six IDs]

## Phase 8 — Independent code review

### 8.1 Review implementation against approved artifacts

**Priority/Predecessor/Agent**: P0 / Phase 7 / independent reviewer.
**Where/Description**: production diff + approved specs/plan; inspect scope, processor order, target isolation, documentation, and forbidden designs.
**AC/NFR**: findings are evidence-backed; no implementation edits or test execution; major finding returns to Phase 7.
**EARS FR**: all six in-scope IDs.
**Watch/HITL**: reviewer must be independent / none.

### 8.2 Update workflow state

Record Phase 8 findings/disposition and Phase 9 current in `coding-flow-state.md`. [all six IDs]

## Phase 9 — Implementation validator

### 9.1 Validate code/spec coverage without tests

**Priority/Predecessor/Agent**: P0 / Phase 8 passed / independent validator.
**Where/Description**: production diff, build result, specs, plan, review findings; verify all six contracts and run build/local non-test checks only.
**AC/NFR**: no major gaps; no test authoring or test command before Phase 10; failures return to Phase 7.
**EARS FR**: all six in-scope IDs.
**Watch/HITL**: build success is not test evidence / none.

### 9.2 Update workflow state

Record Phase 9 evidence/gaps and Phase 10 current in `coding-flow-state.md`. [all six IDs]

## Phase 10 — User implementation approval

Present implementation, Phase 8 review, and Phase 9 validation. Require exact approval: `Yes, I approve the implementation`. Otherwise stop; no testing.

After approval, record Phase 10 approval and Phase 11 current in `coding-flow-state.md`. [all six IDs]

## Phase 11 — Tests and evidence (only after Phase 10 approval)

### 11.1 Processor contract tests

**Priority/Predecessor/Agent**: P0 / Phase 10 approved / test engineer.
**Where**: rename/update `tests/unit/file-processors/file-antigravity-workflow-to-skill.test.ts`.
**Description/NFR**: verify the pure processor contract with isolated deterministic fixtures.
**Cases/AC**: both pre-targeted bases; main/phase/no-phase; phase frontmatter removal; shortest-prefix ownership; all reference forms; unrelated refs; no double rewrite.
**EARS FR**: FR-COPY-0080, FR-VAR-0042, FR-STRUCT-0030.
**Watch/HITL**: assert placement comes from incoming target / none.

### 11.2 Target-output ownership

**Priority/Predecessor/Agent**: P0 / Phase 10 approved / test engineer.
**Where**: create `tests/unit/spec/targets-codex-output.test.ts`; update `tests/unit/spec/targets-antigravity-output.test.ts`.
**Cases/AC**: Codex skill/phase paths, normalized main frontmatter, rules index, `.codex-plugin`, `.codex/hooks.json` mirror, no workflows tree/index, no Antigravity bleed; Antigravity body-only phases and retained index/frontmatter/model/hook behavior.
**NFR/EARS FR**: deterministic isolated fixtures / FR-VAR-0041, FR-VAR-0042, FR-STRUCT-0010, FR-STRUCT-0030.
**Watch/HITL**: bootstrap production code remains untouched / none.

### 11.3 Bootstrap and Codex E2E regressions

**Priority/Predecessor/Agent**: P0 / Phase 10 approved / test engineer.
**Where**: update all four `tests/unit/plugin-processors/plugin-assemble-*-bootstrap.test.ts`, `tests/e2e/parity-derive-structure.ts`, and `tests/e2e/sample.e2e.test.ts`; add `tests/fixtures/sample-instructions/r2/core/workflows/workflow-skill-fixture-flow.md` and `workflow-skill-fixture-flow-phase.md`. Existing `parity.e2e.test.ts` needs no source edit.
**Fixture contract**: the new main is workflow-tagged and references `workflow-skill-fixture-flow-phase.md`; the new owned phase has YAML frontmatter plus a distinct body. Fixtures are additive: edit no existing fixture, leave `coding-flow.md` untouched, and do not add `coding-flow-step.md`.
**Cases/AC**: assembler suites assert exactly one final root entry. Real-instruction payload totals (Codex r2=8/r3=4; Claude/Copilot r2=9/r3=5) are asserted where the suite consumes real `instructions/` content; suites driven by synthetic fixtures keep asserting their own fixture-derived totals rather than these numbers. `parity-derive-structure.ts` owns the independent expected-path mapping: every Codex workflow maps to `.agents/skills/<workflow>/SKILL.md`, owned phases map to `.agents/skills/<workflow>/phases/<phase>.md`, and `.agents/workflows/**` plus its `INDEX.md` is absent.
**E2E AC**: unchanged `parity.e2e.test.ts` consumes the derivation and asserts the generated `core-codex` path set. `sample.e2e.test.ts` owns content assertions for the dedicated fixture in both Codex and Antigravity: main/phase placement and bodies, rewritten phase reference, phase frontmatter removal; it also asserts absent Codex workflows tree/index, `.codex-plugin`, `.codex/hooks.json`, and no `Rosetta Workflows Index` in `.codex-plugin/hooks.json` SessionStart hooks.
**NFR/EARS FR**: independent oracle; deterministic payload order / FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030.
**Watch/HITL**: do not import production mapping into parity / none.

### 11.4 Execute tests

**Priority/Predecessor/Agent**: P0 / 11.1,11.2,11.3 / test engineer.
**Where/Description**: `src/rosettify-plugins/`; run targeted-to-full validation in order.
**Commands**:

- `npm --prefix src/rosettify-plugins run typecheck`
- `npm --prefix src/rosettify-plugins test -- tests/unit/file-processors/file-workflow-to-skill.test.ts tests/unit/spec/targets-codex-output.test.ts tests/unit/spec/targets-antigravity-output.test.ts tests/unit/plugin-processors/plugin-assemble-{claude,cursor,copilot,codex}-bootstrap.test.ts`
- `npm --prefix src/rosettify-plugins test -- tests/e2e/parity.e2e.test.ts tests/e2e/sample.e2e.test.ts`
- `npm --prefix src/rosettify-plugins test`

**AC/NFR**: every command exits 0; deterministic output; no uncovered in-scope criterion.
**EARS FR**: all six in-scope IDs.
**Watch/HITL**: stop on first failure and diagnose before retry / none.

### 11.5 Update workflow state

Record authored tests, commands/results, coverage, and Phase 12 current in `coding-flow-state.md`. [all six IDs]

## Phase 12 — Independent test review

Independent reviewer inspects scenarios, edge cases, isolation, idempotency, assertions, and requirement coverage. Major findings return to Phase 11; no production edits. [all six IDs]

Record Phase 12 findings/disposition and Phase 13 current in `coding-flow-state.md`.

## Phase 13 — Final validator and evidence

Independent validator reads full specs/plan, reviews code/tests/findings, runs the Phase 11 command set, inspects generated Codex/Antigravity trees, and confirms all six acceptance surfaces.

After all evidence passes, update only the six requirement records in `docs/requirements/plugin-generator/{FR-COPY.md,FR-VAR.md,FR-HOOK.md,STRUCTURES.md}` to `Implemented` with concise file/test evidence.

Record Phase 13 results, requirement updates, residual gaps, and final coverage gate current in `coding-flow-state.md`. No commit, push, staging, or PR.

## Final coverage HITL

Present Phase 12 review, Phase 13 validation, requirement traceability, and final diff. Explicit human acceptance is required; uncovered criteria block closure.
