<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Spec — extract triage-flow's HOW into one dedicated skill wrapped by a thin workflow (WHAT)

Companion: `triage-flow-skill-extraction-PLAN.md` (HOW/sessions). Predecessor: `plans/triage-jira-decoupling/HANDOFF.md` (authoritative record of the behavior being relocated). Scope: rosetta repo only. **Behavior-neutral refactor** — relocation and rewording only; no rule, rubric, constant, gate, or state field changes meaning.

**Delivered names (renamed after implementation, at the user's request):** the flow is **`tools-triage-flow`** and the skill is **`tools-triage`**. `triage-flow` and `ticket-triage` below describe the pre-rename source and design state; the rationale for the rename is in `HANDOFF.md` §Rename.

</CRITICAL>

## Problem

`feat/triage-flow-source` (PR #334) delivers `triage-flow` as 7 files, all under `instructions/r3/core/workflows/`: `triage-flow.md` (216 dense lines) plus 6 `triage-flow-<phase>.md` phase files. Three defects follow from that shape:

- **Layer inversion.** `docs/schemas/workflow.md` states the workflow "file must be small and short, skills already define how things work". `triage-flow.md` instead carries `<intake_contract>`, `<write_artifact_contract>`, `<idempotency>`, and a 42-line `<state_and_resumption>` file shape — HOW, not orchestration. The flow owns **no skill at all**: the earlier correction that deleted the shared `jira-write` skill inlined its knowledge into the workflow rather than into a flow-owned skill.
- **Command-surface pollution.** The 6 phase files are emitted flat into every target's command folder — `plugins/core-claude/workflows/triage-flow-{intake,elicitation,completion-check,publish-questions,assess,create-tool-issue}.md` and the same under `plugins/core-cursor/commands/` and `plugins/core-copilot/commands/`. Their `disable-model-invocation: true` / `user-invocable: false` frontmatter is carried through verbatim, but Cursor and Copilot command frontmatter has no such keys, so `/triage-flow-intake` and its five siblings are reachable there as user commands. Only Codex nests them (`.agents/skills/triage-flow/phases/`).
- **Always-loaded phase mass.** Phase internals cannot be loaded on demand from a command folder the way skill `references/` can.

## Target state

One dedicated, flow-owned skill + one thin slash-callable workflow — the shape `coding-agents-prompting-flow` + `coding-agents-prompt-authoring` already establishes in this repo.

```
instructions/r3/core/skills/tools-triage/
  SKILL.md                            role, when_to_use, operating rules, reference router, pitfalls   (~130 lines)
  README.md                           per repo convention (qa-knowledge, security, prompt-authoring)
  references/                         (authored as 6 references + 3 assets, then consolidated to 3)
    tt-intake-and-state.md            input contract + redaction + state semantics + state skeleton
    tt-elicitation-and-assessment.md  elicitation iteration + completion rule + rubrics + assessment skeleton
    tt-writes-and-tool-issue.md       artifact contract + op JSON shapes + target-project binding

instructions/r3/core/workflows/
  tools-triage-flow.md                thin orchestration, 6 inline phase blocks                        (~110 lines)
  triage-flow-{6 phases}.md           DELETED
```

## FR-1 — Skill identity

- Folder and `name`: `tools-triage`; the flow is `tools-triage-flow`. **A skill may not take the flow's own name** — the Codex and Antigravity targets convert the workflow into a skill of that exact name, so an authored skill sharing it would collide on generation. The `tools-` prefix marks both artifacts as one self-contained, deployment-specific unit and leaves the generic name `triage-flow` free (this repo already uses "triage" for PR/issue triage in `.github/workflows/repo-triage.yml`).
- `description`: generic `To <verb>` form, ≤ ~25 tokens, dense — the ~1K shared skill-description budget absorbs exactly one new entry here, which is the accepted cost of this refactor.
- `user-invocable: false` — flow-internal background knowledge, hidden from the `/` menu. Model invocation stays enabled (default) so `USE SKILL ticket-triage` resolves. No `argument-hint` (invalid when `user-invocable: false`).
- The skill is **flow-owned, not shared**: `triage-flow` is its only caller, and nothing in it is written to be reusable by `aqa-flow`/`testgen-flow`/`qa-knowledge`. This satisfies the standing constraint that produced `jira-write`'s deletion — the objection was a *shared, independently-discoverable* Jira skill, not a flow's own knowledge file.

## FR-2 — Content map (normative; nothing is dropped, nothing is invented)

| Source (current file → section) | Destination |
|---|---|
| `triage-flow.md` → frontmatter, `<description_and_purpose>` | `triage-flow.md` (compressed to ~5 lines) |
| `triage-flow.md` → `<prerequisites>` | `triage-flow.md`, plus one new line: orchestrator and subagents MUST USE SKILL `ticket-triage` |
| `triage-flow.md` → `<subagent_policy>` (no inline execution, `executor` is not a gateway) | `triage-flow.md` |
| `triage-flow.md` → `<subagent_policy>` (Resource Usage row per `INVOKE SUBAGENT`) | `references/tt-state-and-idempotency.md` |
| `triage-flow.md` → `<intake_contract>` | `references/tt-intake-contract.md` |
| `triage-flow.md` → `<write_artifact_contract>` | `references/tt-write-artifacts.md`; op JSON → `assets/tt-write-artifact-templates.md` |
| `triage-flow.md` → `<idempotency>` | `references/tt-state-and-idempotency.md` |
| `triage-flow.md` → `<state_and_resumption>` | semantics → `references/tt-state-and-idempotency.md`; file skeleton → `assets/tt-flow-state-template.md` |
| `triage-flow.md` → 6 phase blocks | `triage-flow.md`, rewritten: `APPLY PHASE` → phase brief + `READ SKILL FILE` pointer |
| `triage-flow.md` → `<out_of_scope>` | `triage-flow.md` (flow-scope boundary, stays with the flow) |
| `triage-flow.md` → `<validation_checklist>` | split: sequencing/evidence checkpoints stay in `triage-flow.md`; content-correctness checkpoints move to the owning reference |
| `triage-flow-intake.md` (all steps, checklist, pitfalls) | `references/tt-intake-contract.md` |
| `triage-flow-elicitation.md` + `triage-flow-completion-check.md` | `references/tt-elicitation-and-completion.md` |
| `triage-flow-publish-questions.md` | `references/tt-write-artifacts.md` |
| `triage-flow-assess.md` | `references/tt-assessment-rubrics.md`; output skeleton → `assets/tt-assessment-template.md` |
| `triage-flow-create-tool-issue.md` | `references/tt-tool-issue-binding.md` |

Per-phase `subagent` / `role` / `subagent_required_model` / `must-be-subagent` attributes are **orchestration**, not knowledge: they stay in `triage-flow.md`'s phase blocks, unchanged token-for-token.

## FR-3 — Invariants that MUST survive verbatim or reworded-not-changed

Enumerated so the verification sweep in PLAN §S6 has a fixed target:

- Every `POC-SCOPE-OVERRIDE:` marker, each still legible and each still naming what it substitutes for (completion rule vs `hitl` approval sentence; unattended compose vs `dangerous-actions` step 5).
- Key validation pattern `^[A-Z][A-Z0-9]+-\d+$`; `reason` default `"manual invocation"`; `artifacts_dir` default `agents/TEMP`.
- Redaction-evidence rule: type/count/location only, never the masked value, not even as "originally X".
- Idempotency: SHA-256 of the redacted `ticket_details`, compared against `last_processed_ticket_details_hash`; whole-text content comparison, never author- or comment-ID-based.
- Artifact contract: path `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`; `NNN` derived from the highest existing sequence, zero-padded, from `001`, never reused or guessed; the three op shapes (`add_comment`, `create_issue`, `link_issues`) exactly as written; `composed_at` ISO8601.
- The `"pending — see <artifact path>"` sentinel is the only permitted value for `last_agent_comment_id` / `assessment_comment_id` / `tool_issue_key` / `link_id`; no real ID or key is ever claimed at compose time; no `resolved_acting_identity` is ever resolved or reported.
- Target-project constants: `project_key: TOOL`, `issue_type: Story`, `carry_fields: [TSSM: Tool, TSSM: Project]`, `link_type: Action item`, `link_inward: new_issue`.
- Phase 6 resume cases A/B/C, the link-probe backstop's stop-on-failed-probe rule, and the documented two-tick create-then-link consequence.
- Assessment rubrics: the four Overall Risk levels, the four Overall Impact levels (including `Low` reserved strictly for genuinely-no-exposure), the `XL/L/M/S` sizes, the three-sections-always-written rule, and the plain-results/no-escalation-framing rule.
- Model policy: sonnet-tier orchestrator requirement with `STOP_AND_REPORT` on violation.
- Every negation that exists to prevent regression — "no live search or fetch", "no config file in this build", "do not run `requirements-authoring-flow.md`'s 9 phases", "do not re-run `sensitive-data` in phase 2", "no rubric-pass gate in phase 3" — survives in its new home. A dropped negation is a behavior change even though nothing positive was removed.

## FR-4 — Generated-plugin outcome

After regeneration (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`):

- Exactly one `tools-triage-flow` command per target; **zero** `triage-flow-*` phase files anywhere under `plugins/`, including `plugins/core-codex/.agents/skills/triage-flow/phases/`.
- `skills/tools-triage/` present in every target that carries skills, with `references/` and `assets/` intact; its `SKILL.md` reachable and its reference files loadable on demand.
- `workflows/INDEX.md`, `commands/INDEX.md`, and `skills/INDEX.md` regenerate consistently: one triage workflow entry, one new `tools-triage` skill entry.
- `-light` variants: whatever the generator's existing inclusion rules produce — this refactor sets no new policy for them, but the result is inspected rather than assumed.

## Out of scope

- Any behavior change, gap closure, or deferred item from `plans/triage-jira-decoupling/HANDOFF.md` (create/link field validation home; the caller-input gap; artifact execution against real Jira).
- Touching any shared skill, other workflow, or other flow's phase files.
- Changing the invocation contract — `{ ticket_key, reason?, ticket_details, artifacts_dir? }` is unchanged. (The flow's *name* was deliberately changed after implementation: `/triage-flow` → `/tools-triage-flow`; see `HANDOFF.md` §Rename.)
