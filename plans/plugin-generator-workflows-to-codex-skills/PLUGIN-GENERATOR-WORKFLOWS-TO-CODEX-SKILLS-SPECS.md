<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Plugin Generator — Workflows to Codex Skills: Technical Specification

Status: Draft — Phase 6 plan/spec approval pending.

## TL;DR

- The generator converts Codex/Antigravity workflows to skills; each `SpecEntry.target` is the sole placement owner.
- One normal, no-argument `fileWorkflowToSkill` processor reshapes its already-targeted frame.
- `PluginSpec` stays unchanged; Codex model normalization precedes the transform.
- Phases lose frontmatter while main skills retain it; Codex emits no workflows/index, bootstrap code stays unchanged, and Antigravity-only transforms stay isolated.

## Contents

1. Scope
2. Architecture-significant requirements
3. Component and interface contracts
4. Target-state behavior
5. Error and dependency contracts
6. Validation specification
7. Affected files

## 1. Scope

Actor: Rosetta plugin generator. Targets: `core-codex`, `core-antigravity`. Requirements: FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010, FR-STRUCT-0030.

In scope: generalize the existing transform; compose it in both target pipelines; remove phase frontmatter; remove only the Codex workflow-index declaration so existing absent-document handling omits its payload entry; preserve target-specific behavior.

Out of scope: `PluginSpec`, bootstrap/hook/instruction changes, other targets, dependencies, dispatch/move stages, generated-plugin hand edits, commit, or push.

## 2. Architecture-significant requirements

- SRP/DRY: `SpecEntry.target` owns placement; one `fileWorkflowToSkill` owns shared workflow/phase shape.
- KISS/YAGNI: no root argument, factory, field, flag, switch, branch, or wrapper pair.
- Determinism: ownership and output paths derive only from immutable VFS paths and incoming frame state.
- Compatibility: all existing reference-rewrite semantics and unaffected target outputs remain stable.

## 3. Component and interface contracts

### 3.1 Public processor contract

`export function fileWorkflowToSkill(frame: FileProcessingFrame, ctx: TargetContext): FileProcessingFrame`

Preconditions:

- The processor is composed only in a `source: "workflows/**"` `SpecEntry`.
- `frame.target` already contains the target selected by that `SpecEntry`.
- `ctx.vfs` contains the complete workflow VirtualFile set.

Postconditions:

- Input frame is not mutated; output uses `updateFileFrame`.
- Main workflow target: `<target-base>/<workflow-root>/SKILL.md`.
- Phase target: `<target-base>/<workflow-root>/phases/<phase-stem>.md`.
- Main content retains frontmatter; phase content is `stripFrontmatter(content)`.
- Actual owned phase references are rewritten in main and phase bodies.
- Binary/null-content behavior remains unchanged.

### 3.2 Existing helper contracts

`workflowStem(vfsPath: string): string`

- Returns the final Markdown filename without `.md`.

`findWorkflowRoot(stem: string, allStems: readonly string[]): string`

- Returns the shortest other hyphen-bounded prefix; otherwise returns `stem`.

`rewritePhaseReferences(content: string, phaseNames: readonly string[]): string`

- Pass 1 consumes `APPLY PHASE` with bare or matching-delimiter phase filename.
- Pass 2 rewrites only matching-delimiter standalone phase filenames.
- Only actual phases owned by the current workflow are eligible.
- Rewritten output is not matched twice.

### 3.3 Verified processing order

`pluginProcessSpecEntries` performs:

1. `computeTargetPath(entry.source, entry.target, vfsPath)`.
2. `createFileFrame(vf, targetPath)`.
3. File processors in declaration order.

`fileWorkflowToSkill` therefore derives target base from incoming `frame.target` before changing it; `sourcePath` supplies workflow-relative identity, not placement.

### 3.4 Target composition

Codex workflow `SpecEntry`:

- `target: ".agents/skills"`.
- processors: base read/override/bundle → `fileNormalizeCodexModels` → `fileWorkflowToSkill`.
- indexes: rules declaration only.

Antigravity workflow `SpecEntry`:

- `target: "skills"`.
- processors: base read/override/bundle → `fileWorkflowToSkill`.
- post-index frontmatter reduction and subagent-model rewrite remain Antigravity-only.

## 4. Target-state behavior

Codex:

- Workflows emit under `.agents/skills/<workflow>/`.
- No `.agents/workflows/` or workflows index exists.
- Main workflow skill retains normalized Codex model fields and other frontmatter.
- Rules index, `.codex-plugin`, TOML agents, `.codex/hooks.json` mirror/bundles, and plugin-root probe remain.
- Antigravity frontmatter/model/hook adaptations never run.

Antigravity:

- Existing `skills/<workflow>/` structure and workflow-derived skills index remain.
- Workflow `SKILL.md` is later reduced to `name` + `description`.
- Phase documents contain body only.
- Always-on bootstrap and Antigravity hook exclusions remain.

Shared:

- A zero-phase workflow emits only `SKILL.md`.
- Unrelated `*.md` mentions remain unchanged.
- Source-skill/output collisions continue through the existing hard-error detector.
- The other five targets remain unchanged.

Bootstrap:

- `plugin-assemble-codex-bootstrap.ts` and `bootstrap-manifest.ts` do not change.
- Removing the Codex workflow index declaration makes that manifest document absent.
- Existing absent-document logic skips it.
- The separate plugin-root entry remains final.
- Expected Codex entry counts: r2 = 8; r3 = 4. (Claude/Copilot are 9 and 5 at the same releases; r3 is lower across all targets because it consolidates the five split `bootstrap-*` rules into one `bootstrap-alwayson.md`, and `BOOTSTRAP_MANIFEST_ORDER` skips the four absent basenames.)

## 5. Error and dependency contracts

- No new error/recovery contract or runtime/dev dependency.
- Existing malformed-frontmatter and target-conflict behavior remains authoritative; VFS paths stay forward-slash and no move stage is introduced.

## 6. Validation specification

| Case | Expected result | Requirements |
| --- | --- | --- |
| Codex main + phase | `.agents/skills/<root>/SKILL.md` and body-only `phases/<phase>.md` | FR-COPY-0080, FR-VAR-0042 |
| Antigravity main + phase | `skills/<root>/SKILL.md` and body-only phase | FR-COPY-0080, FR-STRUCT-0030 |
| No phase | `SKILL.md` only; no `phases/` | FR-COPY-0080 |
| Nested prefix stems | Shortest hyphen-bounded workflow owns every phase | FR-COPY-0080 |
| Reference forms | Full/bare/delimited forms rewrite once; unrelated refs survive | FR-COPY-0080 |
| Codex frontmatter | Model normalized; non-model fields preserved; no Antigravity reduction | FR-VAR-0042 |
| Codex structure | Rules index and `.codex-plugin` present; workflows absent; `.codex/hooks.json` mirror preserved | FR-VAR-0041, FR-STRUCT-0010 |
| Session-hook roots | `plugin-assemble-claude-bootstrap.test.ts`, `plugin-assemble-cursor-bootstrap.test.ts`, `plugin-assemble-copilot-bootstrap.test.ts`, `plugin-assemble-codex-bootstrap.test.ts`: exactly one final root entry each; Codex r2=8/r3=4, Claude/Copilot r2=9/r3=5 | FR-HOOK-0007 |
| Antigravity isolation | Existing index/frontmatter/model/hooks behavior remains | FR-STRUCT-0030 |
| All-target parity | Other five outputs remain structurally unchanged | FR-STRUCT-0010 |
| Codex E2E | `parity-derive-structure.ts` independently derives workflow/phase skill paths and removes `.agents/workflows/**`/INDEX; unchanged `parity.e2e.test.ts` checks the tree; `sample.e2e.test.ts` owns generated-content/hook assertions using the dedicated additive main/phase fixture | FR-COPY-0080, FR-VAR-0041, FR-VAR-0042, FR-HOOK-0007, FR-STRUCT-0010 |

## 7. Affected files

- `src/rosettify-plugins/src/file-processors/file-antigravity-workflow-to-skill.ts` → `file-workflow-to-skill.ts`.
- `src/rosettify-plugins/src/spec/targets.ts`.
- Add `tests/fixtures/sample-instructions/r2/core/workflows/workflow-skill-fixture-flow.md`: tagged main workflow containing a reference to its phase.
- Add `tests/fixtures/sample-instructions/r2/core/workflows/workflow-skill-fixture-flow-phase.md`: owned phase with YAML frontmatter and a distinct body, proving Codex/Antigravity emit body-only phase resources.
- E2E fixtures are additive: edit no existing fixture; specifically leave `coding-flow.md` untouched and do not add `coding-flow-step.md`. Update `tests/e2e/parity-derive-structure.ts` and `sample.e2e.test.ts`; existing `parity.e2e.test.ts` consumes the derivation unchanged. Requirement records update only after evidence.

</CRITICAL>
