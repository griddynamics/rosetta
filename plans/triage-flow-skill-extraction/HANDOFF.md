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

- **New skill `instructions/r3/core/skills/tools-triage/`** (11 files, ~530 lines): `SKILL.md` (83 lines — role, cross-stage invariants, stage flow, routing list), `README.md` (maintainer doc per the `<skill_authoring>` spec), 6 `references/tt-*.md` (449 lines: intake contract · elicitation and completion · write artifacts · assessment rubrics · tool-issue binding · state and idempotency), 3 `assets/tt-*` (state skeleton, assessment skeleton, the three op JSON shapes).
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

## Active blockers
None.

## Unchanged and still deferred
Every deferred item in `plans/triage-jira-decoupling/HANDOFF.md`: wiring `tools-harness-intake/triage.yml` to call `/tools-triage-flow` and execute the `jira-writes/*.json` artifacts; the create/link field-validation home; the caller-input gap versus the old snapshot shape. `/tools-triage-flow`'s invocation contract (`{ ticket_key, reason?, ticket_details, artifacts_dir? }`) is unchanged.

## Next-session pointer
Commit and update PR #334, or review the six references first — they are the whole behavioral surface now. `content-map-verification.md` is the fastest review path: each row names a rule and where it now lives.
