# Handoff — triage-flow-skill-extraction (delivered as `tools-triage-flow` + `tools-triage`)

## Status: IMPLEMENTED, verified, then RENAMED — see §Rename. Not committed (no commit requested).

## Rename (post-implementation, at the user's request)

The user asked for a standalone, independently-named flow rather than a modified `triage-flow`. Confirmed via two questions before executing: rename into a `tools-triage` namespace (not a parallel second flow, and not a new non-`core` domain), with the prefix applied to both artifacts.

- `workflows/triage-flow.md` → **`workflows/tools-triage-flow.md`** (`git mv`; frontmatter `name` and root tag `<tools-triage-flow>` updated). Slash command is now `/tools-triage-flow`.
- `skills/ticket-triage/` → **`skills/tools-triage/`** (frontmatter `name`, root tag `<tools-triage>`, README title, and every internal reference updated). Reference and asset filenames keep the `tt-` prefix — it still reads as the skill's initials, and renaming 9 files plus the routing list would be churn for no gain.
- `docs/definitions/skills.md` → `tools-triage`; `docs/definitions/workflows.md` → `tools-triage-flow`; `agents/IMPLEMENTATION.md` entry retitled.
- The one flow-naming string inside the skill was updated to stay truthful: the intake failure now reports `tools-triage-flow/intake: ticket_details missing or empty`. Safe because no caller is wired yet — `tools-harness-intake/triage.yml` calling this flow is still deferred.
- **Runtime artifact names were deliberately NOT renamed**: `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`, `<TICKET-KEY>-TRIAGE-ASSESSMENT.md`, `<TICKET-KEY>-REQUIREMENTS.md`, and the `jira-writes/<NNN>-<op>.json` path stay as they are. They are ticket-scoped output names, still accurate, and a future executor reads the artifact path as a contract.
- **Why the rename was cheap**: nothing consumes `/triage-flow` yet, and the flow only exists on this unmerged branch (PR #334).
- **Why it was right**: the flow is deployment-specific — hardcoded `TOOL` project, `TSSM:` custom fields, Grid Dynamics tool reasoning — while `triage-flow` is a generic name in a shared namespace, and this repo already uses "triage" for PR/issue triage (`.github/workflows/repo-triage.yml`). The prefix also stops the skill from reading like a general-purpose shared skill, which is the coupling `jira-write`'s deletion was meant to end.
- **This plan folder keeps its original name.** It is the record of the extraction work. References to `triage-flow.md` / `ticket-triage` in `triage-flow-skill-extraction-SPECS.md`, `-PLAN.md`, and `content-map-verification.md` describe the pre-rename source and design state; the delivered names are the two above.

Behavior-neutral refactor per `triage-flow-skill-extraction-SPECS.md`. All six planned sessions ran; S0's 151-row invariant inventory is filled in `content-map-verification.md`, which is the authoritative evidence record and carries the honest accounting of the one check that did not come out as SPECS predicted.

## What landed

- **New skill `instructions/r3/core/skills/tools-triage/`** (2 files after both consolidations, 690 lines): `SKILL.md` (83 lines — role, cross-stage invariants, stage flow, routing list), `README.md` (maintainer doc per the `<skill_authoring>` spec), 6 `references/tt-*.md` (449 lines: intake contract · elicitation and completion · write artifacts · assessment rubrics · tool-issue binding · state and idempotency), 3 `assets/tt-*` (state skeleton, assessment skeleton, the three op JSON shapes).
- **`instructions/r3/core/workflows/tools-triage-flow.md` rewritten thin** (from `triage-flow.md`): 216 → 149 lines. Keeps frontmatter, a short purpose, prerequisites, `<subagent_policy>`, six phase blocks with their `subagent`/`role`/`subagent_required_model`/`must-be-subagent` attributes token-for-token, `<out_of_scope>`, a sequencing-and-evidence `<validation_checklist>`, and `<pitfalls>`. No contract, rubric, constant, state shape, or op JSON remains in it.
- **Six `triage-flow-*.md` phase files deleted** (`git rm`). Recoverable via `git show HEAD:instructions/r3/core/workflows/<file>`.
- **`agents/IMPLEMENTATION.md`** entry rewritten to the new layout.
- **Registries**: `tools-triage` added to `docs/definitions/skills.md`; `tools-triage-flow` added to `docs/definitions/workflows.md` — it was never registered there, a pre-existing omission on this branch.
- **Plugins regenerated** twice (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`), exit 0, all 7 targets.

## Verification evidence

- 108 automated needle checks across the 11 destination files. One miss, fixed and re-verified (see `content-map-verification.md` §S6).
- `find plugins -name "triage-flow-*"` → empty. The command-surface pollution is gone: previously all 6 phase files were emitted into every target's command folder (`plugins/core-claude/workflows/`, `plugins/core-cursor/commands/`, `plugins/core-copilot/commands/`) and nested under `plugins/core-codex/.agents/skills/triage-flow/phases/`. Exactly one `tools-triage-flow` artifact per target now, and one INDEX entry each.
- `tools-triage/` emitted with `references/` and `assets/` intact into all 7 targets, at each target's own skills path. `-light` variants carry no triage artifacts and never did.
- Zero references to the deleted phase files anywhere in `instructions/`, `docs/`, `agents/`, `plugins/`. Zero `jira-write`/`data-collection` references in the new artifacts; `instructions/r3/core/skills/data-collection/` shows zero diff from HEAD.
- Zero `SKILL FILE` / `references/` / `assets/` strings in the workflow — no deep-linking across the skill-folder boundary.
- `git status` reviewed: 6 deletions, 1 rewritten workflow, 3 edited docs/agents files, the new skill folder, the regenerated `plugins/**`. No unexpected drift.

## Decisions worth knowing

- **Skill name may not equal the flow's name.** The Codex and Antigravity targets convert the workflow into a skill of that exact name, so `tools-triage` (skill) and `tools-triage-flow` (flow) are deliberately distinct.
- **One skill, six references — not two skills, not one per phase.** A second top-level skill would recreate the independently-discoverable shared Jira skill that `jira-write`'s deletion was meant to remove; six would burn the shared ~1K-token skill-description budget for a single-caller flow. This skill is flow-owned: `tools-triage-flow` is its only caller and nothing in it is written for reuse.
- **`user-invocable: false`** — background knowledge, hidden from the `/` menu, still model-invocable via `USE SKILL`. `argument-hint` is therefore invalid and absent.
- **The workflow does not deep-link into the skill.** PLAN §S5 had it carry `READ SKILL FILE` pointers; the closed alias grammar forbids that outside a skill's own files. The workflow names the skill plus the topic per phase, and `SKILL.md`'s routing list dispatches. Deviation recorded in `content-map-verification.md` §S6.
- **`POC-SCOPE-OVERRIDE` occurrences dropped 14 → 8** in instruction files. Both distinct overrides survive with full framing; the drops were per-phase restatements of the compose override, now stated once as the contract of record. Full accounting in `content-map-verification.md` §S6 — SPECS §FR-4's count-match check fails as written, and the reason is recorded rather than smoothed over.

## Consolidation (post-rename, at the user's request)

The user challenged the PR's file count — "116 files changed why is it so I need 1 workflow?" — a fair question. The breakdown: 93 files were generated `plugins/**` output (the same set copied into 7 agent targets), 12 were authored, 8 plan docs, 3 registry/index lines. So the count was driven by the generator, not by authoring sprawl — but 12 authored files for one flow was still more than needed, and the honest number was that runtime-loaded lines had gone *up* 668 → 779 (+17%) even though the workflow itself shrank 216 → 149.

Chosen fix: consolidate the authored surface from 12 files to **6**, keeping progressive disclosure where it pays.

- The 3 `assets/` files were folded into the reference that owns each, and the `assets/` folder removed. The 6 references were merged into **3** by natural grouping, each original file becoming a named section so nothing lost its identity:
  - `tt-intake-and-state.md` — `<intake_contract>` · `<state_and_idempotency>` · `<flow_state_template>`
  - `tt-elicitation-and-assessment.md` — `<elicitation_and_completion>` · `<assessment_rubrics>` · `<assessment_template>`
  - `tt-writes-and-tool-issue.md` — `<write_artifacts>` · `<write_artifact_templates>` · `<tool_issue_binding>`
- Cross-references that used to point at another file now point at a section in the same file (`` `<write_artifacts>` above ``, `` `<flow_state_template>` at the end of this file ``). Verified: no dangling section pointer, and no `SKILL FILE` reference to a file that no longer exists.
- `SKILL.md`'s routing list went 6 entries → 3, and its `<templates>` section was dropped since the shapes now live inside the references. `README.md`'s routing map and invariants updated to match.
- Net effect: authored 12 → 6 files; skill lines 826 → 685 (the merge also removed ~140 lines of per-file headers and duplicated pointers); generated `plugins/**` 93 → 42 files; PR total 116 → ~62.
- Re-verified: 90 needles, zero misses; `POC-SCOPE-OVERRIDE` occurrences unchanged at 8; plugins regenerated clean (7 targets, exit 0) with zero stale `tt-*` or `assets/` artifacts left behind.

## Second consolidation — single-file skill (at the user's request)

After the 12 → 6 consolidation the user chose the smaller option still on the table: **3 authored files**. The three reference files were inlined into `SKILL.md` as three stage sections, and `references/` was removed.

- `SKILL.md` is now 646 lines: `<role>` → `<when_to_use_skill>` → `<core_concepts>` (five cross-stage invariants, stage flow, section map) → `<intake_and_state>` → `<elicitation_and_assessment>` → `<writes_and_tool_issue>` → `<validation_checklist>` → `<pitfalls>`. Every former file is a named section, and every former nested section kept its own tag, checklist, and pitfalls.
- `APPLY SKILL FILE` pointers became in-file section pointers (`` `<write_artifacts>` below ``, `` `<state_and_idempotency>` above ``). No `SKILL FILE` alias remains in the skill — there are no sub-files to address.
- `README.md` rewritten for the single-file shape: the routing list is now a section map, the `tt-*` filename invariant is replaced by "section tags are the routing surface", and the load cost is stated plainly.
- **Authored surface: 3 files** — `workflows/tools-triage-flow.md` (149), `skills/tools-triage/SKILL.md` (646), `skills/tools-triage/README.md` (44, maintainer doc, never loaded at runtime). Generated `plugins/**` drops to 21 files. PR total ≈ 68 → ≈ 37.
- **The trade, stated honestly**: activating the skill now loads all 646 lines — no partial loading. `README.md` records the reversal path (split the stage sections back into `references/`, turn the section map into a routing list) if the file grows much further.
- Re-verified: 90 needles zero misses; XML tags balanced with the expected top-level order; no dangling in-file pointers; `POC-SCOPE-OVERRIDE` occurrences unchanged at 8; plugins regenerated clean (7 targets, exit 0) with no stale `references/` or `assets/` left behind.

## Vendor-neutral pass (at the user's request)

"Can we replace Jira with issue tracker?" — 11 occurrences existed in the shipped artifacts, in three classes:

- **Prose (4)** — reworded to Issue Tracker: `Jira-shaped intent` in `SKILL.md` and `README.md`, "reads like a Jira task" in `SKILL.md`'s pitfalls, and phase 4's `role="Bounded Jira comment publisher"` in the workflow. That role attribute is one of the phase attributes otherwise held token-for-token (inventory row W-39) — changed deliberately here, not by drift.
- **The artifact directory (6)** — renamed **`jira-writes/` → `issue-writes/`** across `SKILL.md`, the workflow, `README.md`, and `agents/IMPLEMENTATION.md`. The delivered path is `<artifacts_dir>/<TICKET-KEY>/issue-writes/<NNN>-<op>.json`. Cheap now because the executor that reads these artifacts is unbuilt, cross-repo work; once it exists this path is a contract. **Open item I could not verify from this repo: if `tools-harness-intake` already references `jira-writes/`, it needs the same rename.**
- **One kept deliberately (1)** — the pitfall naming `agents/jira-triage.config.json`, a config file deleted earlier in this branch. It is a historical identifier, not a vendor claim, and the warning works because it names the exact file an agent primed on the old design would look for.

The op names inside the artifacts (`add_comment`, `create_issue`, `link_issues`), `target_issue_key`, and the state-file field names were already vendor-neutral. The target constants (`TOOL`, `Story`, `Action item`, `TSSM: Tool`/`TSSM: Project`) stay — they are the deployment's real values, not vendor terminology.

## Active blockers
None.

## Unchanged and still deferred
Every deferred item in `plans/triage-jira-decoupling/HANDOFF.md`: wiring `tools-harness-intake/triage.yml` to call `/tools-triage-flow` and execute the `jira-writes/*.json` artifacts; the create/link field-validation home; the caller-input gap versus the old snapshot shape. `/tools-triage-flow`'s invocation contract (`{ ticket_key, reason?, ticket_details, artifacts_dir? }`) is unchanged.

## Next-session pointer
Commit and update PR #334, or review the six references first — they are the whole behavioral surface now. `content-map-verification.md` is the fastest review path: each row names a rule and where it now lives.
