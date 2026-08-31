<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Execution Plan — triage-flow → `ticket-triage` skill + thin workflow (HOW / sequenced)

Companion: `triage-flow-skill-extraction-SPECS.md` (WHAT, content map, invariants). Contracts are not restated here — reference SPECS §.

</CRITICAL>

## Read first
- `triage-flow-skill-extraction-SPECS.md` — this plan's WHAT
- `plans/triage-jira-decoupling/HANDOFF.md` — authoritative record of the behavior being relocated; SPECS/PLAN in that folder are historical intent, not current contract
- `instructions/r3/core/workflows/triage-flow.md` + its 6 `triage-flow-*.md` phase files — the sources
- `instructions/r3/core/skills/coding-agents-prompt-authoring/` + `workflows/coding-agents-prompting-flow.md` — the target-shape exemplar
- `docs/schemas/skill.md`, `docs/schemas/workflow.md` — the two schemas every authored file must satisfy

## Governing rules
- **Behavior-neutral.** Relocate and reword; never redefine. Every SPECS §FR-3 invariant must be traceable to exactly one new home. When a phrase resists relocation, keep the phrase and adjust the surrounding structure, not the rule.
- **Sources stay on disk until S5.** No session before S5 deletes or edits a `triage-flow*.md` file; S1-S4 only read them. After deletion they remain recoverable via `git show HEAD:instructions/r3/core/workflows/<file>`.
- Authoring sessions MUST USE SKILL `coding-agents-prompt-authoring` — these are prompt artifacts, not prose, and both schemas gate them.
- After any `instructions/r3/*` edit: regenerate plugins (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` at repo root) before a session counts as done — `docs/ARCHITECTURE.md` Development section. S6 owns the authoritative regen; earlier ad-hoc regens are wasted work.
- No new top-level skill beyond `ticket-triage`; no edit to any shared skill.

## Outcomes/findings recorded in
`HANDOFF.md` in this folder (status, blockers, decisions), plus `content-map-verification.md` (S6's per-invariant trace table).

## File ownership (prevents collisions)
- S0: `plans/triage-flow-skill-extraction/content-map-verification.md` (inventory only)
- S1: `skills/tools-triage/SKILL.md`, `skills/tools-triage/README.md`
- S2: `references/tt-intake-contract.md`, `references/tt-state-and-idempotency.md`, `assets/tt-flow-state-template.md`
- S3: `references/tt-write-artifacts.md`, `references/tt-elicitation-and-completion.md`, `assets/tt-write-artifact-templates.md`
- S4: `references/tt-assessment-rubrics.md`, `references/tt-tool-issue-binding.md`, `assets/tt-assessment-template.md`
- S5: `workflows/tools-triage-flow.md` + deletion of the 6 phase files
- S6: `agents/IMPLEMENTATION.md`, `plugins/**` (generated), `content-map-verification.md`

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| S0 | Invariant inventory from the 7 source files | — | none — runs first, alone |
| S1 | `SKILL.md` + `README.md` | S0 | S2, S3, S4 |
| S2 | Intake + state/idempotency references | S0 | S1, S3, S4 |
| S3 | Write-artifact + elicitation/completion references | S0 | S1, S2, S4 |
| S4 | Assessment + tool-issue references | S0 | S1, S2, S3 |
| S5 | Thin `triage-flow.md`; delete phase files | S1-S4 | none — alone |
| S6 | IMPLEMENTATION entry, plugin regen, verification sweep | S5 | none — alone, last |

Unlisted pairs are sequential. S1-S4 are parallelizable because SPECS §FR-2 fixes each destination file's contents up front and no two sessions write the same file; S1 writes only the router, never the knowledge, so it does not need S2-S4's output.

---

## S0 — Invariant inventory
Depends on: none. **Gate for everything else.**

### Do
1. Read all 7 source files in full.
2. Build `content-map-verification.md` as a table: one row per normative statement — every MUST/MUST NOT/never/only, every `POC-SCOPE-OVERRIDE:`, every constant, every default, every state field, every rubric level, every regression-preventing negation (SPECS §FR-3). Columns: `id | statement (verbatim or tight quote) | source file:section | destination per SPECS §FR-2 | landed (S6 fills)`.
3. Flag any statement whose destination SPECS §FR-2 does not clearly assign — escalate to the user rather than choosing a home unilaterally.

### Subagents
- `rosetta:discoverer` — extraction and tabulation; no judgment about relocation.

### Done when
- Every normative statement in the 7 files has a row and an assigned destination; zero unassigned rows, or the unassigned ones are escalated and resolved.

---

## S1 — `ticket-triage` SKILL.md + README.md
Depends on: S0.

### Do
1. Author `SKILL.md` per `docs/schemas/skill.md`: `name: ticket-triage`, dense `To <verb>` description ≤ ~25 tokens, `user-invocable: false`, no `argument-hint`, `alwaysApply: false`, `tags`, `baseSchema` (SPECS §FR-1).
2. Sections: `<role>`, `<when_to_use_skill>` (triage-flow's phases only), the cross-phase operating rules that no single reference owns (compose-never-execute posture; no live connection anywhere; no identity resolution; the sonnet-tier `STOP_AND_REPORT` model policy), and a **reference router** — which of the 6 reference files to load for which phase, loaded on demand, never all at once.
3. `<pitfalls>`: the cross-phase traps (assuming a live connection exists; assuming a config file exists; claiming a real ID/key at compose time).
4. Author `README.md` following the shape used by `qa-knowledge` / `security` / `coding-agents-prompt-authoring`.

### Subagents
- `rosetta:prompt-engineer` — schema-bound authoring.

### Done when
- `SKILL.md` validates against `docs/schemas/skill.md`; the router names all 6 reference files and every phase 1-6 maps to at least one; no phase-internal knowledge is duplicated in `SKILL.md`.

---

## S2 — Intake + state/idempotency references
Depends on: S0.

### Do
1. `references/tt-intake-contract.md` ← `<intake_contract>` + all of `triage-flow-intake.md` (SPECS §FR-2). Carries: the `{ ticket_key, reason?, ticket_details, artifacts_dir? }` shape; key-pattern validation; `reason`/`artifacts_dir` defaults; stop-and-report conditions; the direct `sensitive-data` pass and its evidence-citation rule; resumed-tick detection; intake pitfalls including every "no live fetch / no file read / no config file / no eligibility check" negation.
2. `references/tt-state-and-idempotency.md` ← `<idempotency>` + `<state_and_resumption>` semantics + the Resource Usage row rule from `<subagent_policy>`. Carries: the SHA-256 mechanism and why whole-text comparison is the deliberate simplification; `pending` as a valid non-corrupt state; per-section field semantics; who writes the state file (orchestrator only, read-full-then-append) and who never does (subagents).
3. `assets/tt-flow-state-template.md` ← the `<state_and_resumption>` skeleton: all 10 sections (`## State`, `## Phase Progress`, `## Poll Tick / Event Log`, `## Resource Usage`, `## Idempotency`, `## Assessment`, `## Tool Issue`, `## Identity`, `## Approval Rule (this build)`, `## Next Tick Should`) with their fields, structure preserved.

### Subagents
- `rosetta:prompt-engineer`.

### Done when
- Every S0 row assigned to these three files is present; the state template's section set and field names match `git show HEAD:...triage-flow.md` exactly.

---

## S3 — Write-artifact + elicitation/completion references
Depends on: S0.

### Do
1. `references/tt-write-artifacts.md` ← `<write_artifact_contract>` + `triage-flow-publish-questions.md`. Carries: artifact path and `NNN` sequencing; the `dangerous-actions` gate framing and its `POC-SCOPE-OVERRIDE:` (skips step 5 / `hitl`'s always-approve rule, unattended by design) stated as honestly as the source does; the no-identity-resolution rule; `create_issue`'s duplicate-prevention requirement; the create-then-link gate cadence; comment-composition rules (only still-open questions, never re-ask resolved ones); the "output is an artifact path, never a comment ID" rule.
2. `references/tt-elicitation-and-completion.md` ← `triage-flow-elicitation.md` + `triage-flow-completion-check.md`. Carries: the idempotency-check-before-any-elicitation ordering; `requirements-authoring` invoked directly for intent_capture → draft → validate only, never the 9-phase flow; in-place Requirements.md update with stable `<req>` IDs; the routing decision (Open Questions non-empty → phase 4; empty → flip to Approved, route to phase 5); the completion-rule `POC-SCOPE-OVERRIDE:`; the "no rubric-pass gate in this build" negation; the do-not-re-run-`sensitive-data` negation.
3. `assets/tt-write-artifact-templates.md` ← the three op JSON shapes verbatim, with the field-by-field notes each carries in its source.

### Subagents
- `rosetta:prompt-engineer`.

### Done when
- The three op JSON shapes are byte-equivalent in structure to the sources; both `POC-SCOPE-OVERRIDE:` markers relocated intact and still name what they substitute for.

---

## S4 — Assessment + tool-issue references
Depends on: S0.

### Do
1. `references/tt-assessment-rubrics.md` ← `triage-flow-assess.md`. Carries: the three blocks in order; the four Overall Risk levels and four Overall Impact levels with their exact definitions (including `Low` reserved strictly for genuinely-no-integration-effect, never a catch-all for "didn't look"); `XL/L/M/S` sizing with its justification requirement; reading `TSSM: Tool`/`TSSM: Project` out of the redacted `ticket_details` and treating a missing value as a gap rather than guessing; three-sections-always-written; plain-results framing with no escalation/urgency; the no-risk-based-branching rule; the once-per-ticket rule.
2. `references/tt-tool-issue-binding.md` ← `triage-flow-create-tool-issue.md`. Carries: the hardcoded target-project constants; resume cases A/B/C and the never-recompose-a-second-create rule; the link-probe backstop with its known free-text limitation and its stop-on-failed-probe rule; the three-part description composition rule (one-or-two sentences, verbatim `<req>` statement list, `Source ticket: <ticket_key>`); plain-text-not-ADF; the two-tick create-then-link consequence; the never-compose-a-second-create-over-a-formatting-defect rule.
3. `assets/tt-assessment-template.md` ← the `<TICKET-KEY>-TRIAGE-ASSESSMENT.md` shape: three headed sections in order, each restating its rubric once at the top.

### Subagents
- `rosetta:prompt-engineer`.

### Done when
- All five target-project constants and all nine rubric levels/sizes present and unchanged; every S0 row assigned to these three files landed.

---

## S5 — Thin `triage-flow.md`; delete the phase files
Depends on: S1-S4 (consumes their landed file names and section anchors).

### Do
1. Rewrite `instructions/r3/core/workflows/triage-flow.md` against `docs/schemas/workflow.md`, targeting ~110 lines: frontmatter and a ~5-line `<description_and_purpose>`; `<prerequisites>` with the added `USE SKILL ticket-triage` line and the sonnet-tier model policy; `<subagent_policy>` reduced to the no-inline-execution and executor-is-not-a-gateway rules; six phase blocks, each keeping its `subagent` / `role` / `subagent_required_model` / `must-be-subagent` attributes token-for-token and carrying 4-5 bullets — brief, input/output contract, required skills, state update, HITL note — plus a `READ SKILL FILE` pointer to its reference; `<out_of_scope>` unchanged; a `<validation_checklist>` and `<pitfalls>` reduced to sequencing/evidence checkpoints, with content-correctness checkpoints already relocated by S2-S4.
2. Replace every `APPLY PHASE` reference with the reference-file pointer. Rewrite every cross-reference that pointed into a deleted phase file, and every phrase of the form "see `triage-flow.md`'s `<X>`" that now points at a relocated section, in both directions.
3. `git rm` all 6 `triage-flow-*.md` phase files.

### Subagents
- `rosetta:prompt-engineer` — the rewrite; then `rosetta:reviewer` (`must-be-subagent`, fresh eyes) against SPECS §FR-3 before the deletion is staged.

### Done when
- `triage-flow.md` contains no `<intake_contract>`, `<write_artifact_contract>`, `<idempotency>`, or `<state_and_resumption>` section, and no rubric, constant, or op JSON.
- All six phase attribute sets are unchanged from `git show HEAD:`.
- `grep -rn "triage-flow-\(intake\|elicitation\|completion-check\|publish-questions\|assess\|create-tool-issue\)" instructions/` returns nothing.
- No dangling reference in either direction between workflow and skill.

---

## S6 — IMPLEMENTATION entry, plugin regen, verification sweep
Depends on: S5.

### Do
1. Rewrite `agents/IMPLEMENTATION.md`'s `triage-flow` entry: new file layout, the `ticket-triage` skill, contract locations now inside the skill; keep the design-history pointer and add this plan folder.
2. Run `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` at repo root; require exit 0 across all targets.
3. Fill `content-map-verification.md`'s `landed` column by locating each S0 row in its destination file. Any row that cannot be located is a behavior change — fix before proceeding, do not annotate away.
4. Verification sweep:
   - `find plugins -name "triage-flow-*"` → empty (this is the command-pollution fix; check `plugins/core-codex/.agents/skills/triage-flow/phases/` is gone too).
   - `find plugins -type d -name ticket-triage` → present in every skills-carrying target, `references/` and `assets/` intact.
   - `POC-SCOPE-OVERRIDE` occurrence count in `instructions/r3/` matches HEAD's count.
   - Constants grep — `TOOL`, `Story`, `Action item`, `TSSM: Tool`, `TSSM: Project`, `agents/TEMP`, `manual invocation`, `^[A-Z][A-Z0-9]+-\d+$`, `last_processed_ticket_details_hash`, `pending — see`, `jira-writes/` — each still present, in its new home.
   - `git grep -n "jira-write\|data-collection" -- instructions/r3/core/workflows/triage-flow.md instructions/r3/core/skills/ticket-triage` → empty; `instructions/r3/core/skills/data-collection/` shows zero diff.
   - `workflows/INDEX.md` / `commands/INDEX.md` carry exactly one triage entry; `skills/INDEX.md` carries `ticket-triage`.
   - `git status` reviewed line by line for unexpected drift.
5. Record the outcome in `HANDOFF.md`.

### Subagents
- `rosetta:validator` (`must-be-subagent`) — runs the sweep and reports evidence; never edits to make a check pass.

### Done when
- Every check above passes with cited evidence, `content-map-verification.md` has zero unlanded rows, and `git status` shows only the intended edits plus their regenerated `plugins/**` counterparts.

---

## Risks
- **Silent invariant loss** — the dominant risk in any relocation of this density. Mitigation: S0's inventory is a gate, and S6 verifies against it row by row rather than by reading the result and judging it plausible.
- **Cross-reference rot** — the sources reference each other heavily in both directions. Mitigation: S5 owns both directions explicitly, and S6 greps for dangling names.
- **Schema drift** — `docs/schemas/skill.md` forbids things the phase schema allowed (e.g. `argument-hint` under `user-invocable: false`). Mitigation: S1-S4 author under `coding-agents-prompt-authoring`, which loads both schemas.
- **`-light` variant surprises** — the generator's inclusion rules for a new skill's `references/`/`assets/` are inspected in S6, not assumed.
- **Skill-description budget** — one new entry against the shared ~1K tokens; accepted, and the reason it is one skill rather than two or six.

## Deferred (unchanged by this plan)
- Every deferred item in `plans/triage-jira-decoupling/HANDOFF.md`: wiring `tools-harness-intake/triage.yml` to call `/triage-flow` and execute the artifacts; the create/link field-validation home; the caller-input gap versus the old snapshot shape.
