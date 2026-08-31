# tools-triage
Turns one issue-tracker ticket's raw text into business-confirmed requirements, a written triage assessment, and JSON write artifacts a separate executor runs later — never touching a live system itself.

## Why it exists
Handed a ticket key and Issue-Tracker-shaped intent, a capable model starts acting live: fetching the ticket, posting comments, resolving the acting identity, guessing an issue key to link against, or re-running elicitation a previous invocation already finished. This skill makes every stage compose-only and idempotent against a state file: `<core_concepts>` states "No live connection, anywhere, at any stage" and "Compose ≠ execute", and the five state fields that name a comment, key, URL, or link are recordable only as the literal `"pending — see <artifact path>"` sentinel (`<state_and_idempotency>`). The same ticket can be re-triaged any number of times without duplicating a comment or an issue.

## When to engage
Not user-invocable (`user-invocable: false`) — background knowledge for the stages of one ticket's triage, model-invocable via `USE SKILL`. Actors: the orchestrator plus the `executor`, `requirements-engineer`, and `reviewer` subagents dispatched by `prompts/tools-triage-flow.prompt.md` phases 1-6. Prerequisites: all Rosetta prep steps complete, and a `sonnet`-tier or better active model — lower tier is `STOP_AND_REPORT`, because no human is present in unattended CI to act on a switch-model demand.

## How it works
Single-file skill: everything lives in `SKILL.md` (646 lines), no `references/` and no `assets/`. Order: `<role>` → `<when_to_use_skill>` → `<core_concepts>` (the five cross-stage invariants, the stage flow, the section map) → the three stage sections → `<validation_checklist>` → `<pitfalls>`.

Stage logical flow: `intake -> elicitation -> completion_check -> (publish_questions | assess -> tool_issue)`.

The section map in `<core_concepts>` routes by stage. Each stage section carries its rules, its own checklist and pitfalls, and the shape of the file it produces:
- `<intake_and_state>` — `<intake_contract>` (the `{ ticket_key, reason?, ticket_details, artifacts_dir? }` shape, key-pattern validation, the direct `sensitive-data` pass, the redaction-evidence rule) · `<state_and_idempotency>` (state ownership, the SHA-256 change detection, the half-written section, resume routing) · `<flow_state_template>` (the 10 state sections)
- `<elicitation_and_assessment>` — `<elicitation_and_completion>` (one iteration via `requirements-authoring`, then the empty/non-empty routing decision) · `<assessment_rubrics>` (the three blocks and their level definitions) · `<assessment_template>` (the assessment file's three headed sections with their rubrics restated inline)
- `<writes_and_tool_issue>` — `<write_artifacts>` (the artifact path and `NNN` sequencing, the per-artifact `dangerous-actions` gate, the `POC-SCOPE-OVERRIDE`, the no-identity rule, the questions-comment compose) · `<write_artifact_templates>` (the `add_comment` / `create_issue` / `link_issues` JSON shapes) · `<tool_issue_binding>` (resume cases A/B/C, the link probe, the three-part description, the target constants, the two-step create-then-link)

**Consequence of the single-file shape**: activating this skill loads all 646 lines — there is no partial loading. That is a deliberate trade for a small authored surface (3 files: `SKILL.md`, `README.md`, and the workflow that calls it). If it ever needs to grow much past this, split the stage sections back out into `references/` and turn the section map into a routing list.

## Mental hooks & unexpected rules
- "Compose ≠ execute. A composed artifact's path is the only output any write stage ever reports" — a reported comment ID or issue key is a fabrication, not a completeness nicety, because the next invocation trusts it.
- "A field carrying a value — even the pending sentinel — is trusted and never re-derived or re-composed" (`<tool_issue_binding>`) — inverts the usual verify-before-acting instinct: recomposing a create risks a second permanently undeletable issue, so verification is deliberately *not* this stage's job.
- "`## Tool Issue` is the one section that can be validly half-written" (`<state_and_idempotency>`) — key-present-with-link-absent is a resumable state, and "repairing" it by clearing the section is what causes the duplicate issue.
- "An unreported artifact path is a composed create nobody can find or resume from" — the report-on-receipt rule puts the path ahead of everything else in the report, even when the rest of the stage failed.
- "`Low` — no integration effect detected. Reserved strictly for that case, never a catch-all for 'didn't look'" plus "Any nonzero risk lands here at minimum" on `Medium` (`<assessment_rubrics>`) — the rubric is written to defeat the model's pull toward a comfortable low rating under uncertainty.
- "Never re-order to make a phrase scan better — direction gives the relationship its meaning" (`<write_artifact_templates>`) — `inward_key`/`outward_key` are semantic, not stylistic.
- "There is no fixed schema and no file to read" (`<intake_contract>`) — the ticket arrives as free prose the caller composes; every downstream field (`TSSM: Tool`, Summary, assignee, existing links) is located inside that text, never by a new read.
- The change detection is deliberately coarser than a comment-ID diff, and says so: its worst case is "an unnecessary elicitation re-run on a no-op text change — never a missed genuine update."
- Two `POC-SCOPE-OVERRIDE:` markers carry different substitutions — the completion rule stands in for `hitl`'s explicit approval sentence; the compose gate skips `dangerous-actions` step 5. Both are flagged simplifications, not rediscovered Rosetta rules.

## Invariants — do not change
- Frontmatter `name: tools-triage` equals the folder name and is registered in `docs/definitions/skills.md`. **The name `tools-triage-flow` is unavailable to this skill**: the Codex and Antigravity plugin targets convert `prompts/tools-triage-flow.prompt.md` into a skill of that exact name, so an authored skill sharing it would collide on generation. `tools-triage` and `tools-triage-flow` are two distinct artifacts in every target — the skill is this folder, the flow is the workflow.
- `user-invocable: false` keeps this out of the `/` menu; with it set, `argument-hint` is invalid per `docs/schemas/skill.md`. Frontmatter `description` stays dense and ≤ ~25 tokens — all skills share ~1K tokens of always-visible description text.
- Root wrapper `<tools-triage>` must equal the skill name.
- **Section tags are the routing surface.** `<core_concepts>`'s section map names them, and sections point at each other by tag (`` `<write_artifacts>` below ``, `` `<state_and_idempotency>` above ``). Renaming a tag without updating the map and every pointer orphans the section.
- Both `POC-SCOPE-OVERRIDE:` markers must stay legible and keep naming what they substitute for — they are the documented removal points, and there is no config flag behind either ("the override is this prose").
- The pending sentinel's exact string, the target constants (`TOOL`, `Story`, `TSSM: Tool`/`TSSM: Project`, `Action item`, `link_inward: new_issue`), the key pattern `^[A-Z][A-Z0-9]+-\d+$`, the `agents/TEMP` and `"manual invocation"` defaults, and the artifact path `<artifacts_dir>/<TICKET-KEY>/issue-writes/<NNN>-<op>.json` are external contracts a future executor reads.
- `prompts/tools-triage-flow.prompt.md` names this skill and its topics, never a path into this folder — `READ|APPLY SKILL FILE` never carries a skill name, and with no sub-files here there is nothing to deep-link to in any case.
- Inbound coupling (`grep -rn "tools-triage" instructions/r3/core docs --include="*.md" -l`): `prompts/tools-triage-flow.prompt.md` (its only caller, prerequisites step 3), `docs/definitions/skills.md`.

## Editing guide
Safe: prose inside any one stage section, and `<role>`/`<when_to_use_skill>`/`<pitfalls>`, as long as the section map still names every section it points to. Handle with care: the section map, the two override markers, the target constants and the sentinel string (a future executor parses them), and `<state_and_idempotency>`'s resume routing — it is what keeps a re-invocation from re-opening a finalized ticket. New rubric or stage detail belongs in the owning stage section; a new output shape belongs in that section's template block. Anything about phase dispatch, subagent choice, or model tier belongs in `prompts/tools-triage-flow.prompt.md`, not here — this skill does not know which workflow runs it.
