# tools-triage
Turns one issue-tracker ticket into business-confirmed requirements, a written triage assessment, and JSON write artifacts a separate executor runs later — never touching a live system itself.

## Why it exists
Handed a ticket key and Issue-Tracker-shaped intent, a capable model starts acting live: fetching the ticket, posting comments, resolving the acting identity, guessing an issue key to link against, or re-running elicitation a previous invocation already finished. This skill makes every stage compose-only and idempotent against a state file: `<core_concepts>` states "No live connection, anywhere, at any stage" and "Compose ≠ execute", and the five state fields that name a comment, key, URL, or link are recordable only as the literal `"pending — see <artifact path>"` sentinel (`references/tt-state-and-idempotency.md`). The same ticket can be re-triaged any number of times without duplicating a comment or an issue.

## When to engage
Not user-invocable (`user-invocable: false`) — background knowledge for the stages of one ticket's triage, model-invocable via `USE SKILL`. Actors: the orchestrator plus the `executor`, `requirements-engineer`, and `reviewer` subagents dispatched by `commands/tools-triage-flow.md` phases 1-6. Prerequisites: all Rosetta prep steps complete, and a `sonnet`-tier or better active model — lower tier is `STOP_AND_REPORT`, because no human is present in unattended CI to act on a switch-model demand.

## How it works
`SKILL.md` (~179 lines) is a router plus process: `<role>` → `<when_to_use_skill>` → `<core_concepts>` (six cross-stage invariants, the stage flow, the router table) → `<process>` (six stage blocks, decisions only) → `<validation_checklist>` → `<pitfalls>` → `<resources>` / `<templates>`.

Stage logical flow: `intake -> elicitation -> completion_check -> (publish_questions | assess -> tool_issue)`.

Everything that only fixes how a value is *spelled* lives in a sub-file, loaded at point of use through the router table — which is keyed by what the agent is **about to do**, never by stage name alone:
- `references/tt-ticket-schema.md` — the invocation input, the vendor-neutral ticket shape, the Jira mapping (by reference to `data-collection/references/issue-vendor-binding.md`), the prose degrade path, and intake redaction.
- `references/tt-state-and-idempotency.md` — state-file ownership and paths, the pending sentinel, change detection, the half-written `## Tool Issue` section, resume routing, reported values.
- `references/tt-write-artifacts.md` — the compose contract (artifact path, `NNN` sequencing), the per-artifact `dangerous-actions` gate, the no-identity rule, the questions-comment compose, and the three op JSON shapes.
- `references/tt-target-binding.md` — the five target constants, resume cases A/B/C, the link probe, the three-part description, create-payload assembly, the link attempt, report-on-receipt.
- `assets/tt-ticket-template.md` — the fill-in ticket skeleton a caller emits.
- `assets/tt-flow-state-template.md` — the 10 sections of the flow-state file.
- `assets/tt-assessment-template.md` — the assessment file's three headed sections, each restating its rubric once.

The op JSON shapes stay inside `tt-write-artifacts.md` rather than becoming a fourth reference: every compose stage needs the contract and the shapes together, so splitting them buys a second load and no progressive disclosure.

## Mental hooks & unexpected rules
- "Compose ≠ execute. A composed artifact's path is the only output any write stage ever reports" — a reported comment ID or issue key is a fabrication, not a completeness nicety, because the next invocation trusts it.
- "A field carrying a value — even the pending sentinel — is trusted and never re-derived or re-composed" (`references/tt-target-binding.md`) — inverts the usual verify-before-acting instinct: recomposing a create risks a second permanently undeletable issue, so verification is deliberately *not* this stage's job.
- "`## Tool Issue` is the one section that can be validly half-written" (`references/tt-state-and-idempotency.md`) — key-present-with-link-absent is a resumable state, and "repairing" it by clearing the section is what causes the duplicate issue.
- "An unreported artifact path is a composed create nobody can find or resume from" — the report-on-receipt rule puts the path ahead of everything else in the report, even when the rest of the stage failed.
- "`Low` — no integration effect detected. Reserved strictly for that case, never a catch-all for 'didn't look'" plus "Any nonzero risk lands here at minimum" on `Medium` — the assessment rubrics stay whole in `SKILL.md` precisely because they are written to defeat the model's pull toward a comfortable low rating under uncertainty.
- "Never re-order to make a phrase scan better — direction gives the relationship its meaning" (`references/tt-write-artifacts.md`) — `inward_key`/`outward_key` are semantic, not stylistic.
- The ticket arrives as a structured shape, and **field access is named-field access, not text-hunting** (`references/tt-ticket-schema.md`). A caller sending prose still works through a first-class degrade path: every unresolved field becomes a named gap, never a guess, and an unresolvable `summary` is still a stop.
- The change detection is deliberately coarser than a comment-ID diff, and says so: its worst case is "an unnecessary elicitation re-run on a no-op text change — never a missed genuine update." Structured `comments[]` make an id-diff possible; re-opening it is a separate, argued change, not a tidy-up.
- Two `POC-SCOPE-OVERRIDE:` markers carry different substitutions — the completion rule (`SKILL.md`) stands in for `hitl`'s explicit approval sentence; the compose gate (`references/tt-write-artifacts.md`) skips `dangerous-actions` step 5, and `assets/tt-flow-state-template.md` records that same override as a state field. Both are flagged simplifications, not rediscovered Rosetta rules.

## Invariants — do not change
- Frontmatter `name: tools-triage` equals the folder name and is registered in `docs/definitions/skills.md`. **The name `tools-triage-flow` is unavailable to this skill**: the Codex and Antigravity plugin targets convert `commands/tools-triage-flow.md` into a skill of that exact name, so an authored skill sharing it would collide on generation. `tools-triage` and `tools-triage-flow` are two distinct artifacts in every target — the skill is this folder, the flow is the workflow.
- `user-invocable: false` keeps this out of the `/` menu; with it set, `argument-hint` is invalid per `docs/schemas/skill.md`. Frontmatter `description` stays dense and ≤ ~25 tokens — all skills share ~1K tokens of always-visible description text.
- Root wrapper `<tools-triage>` must equal the skill name; each sub-file carries its own matching wrapper tag.
- **The router table is the routing surface.** `<core_concepts>` ends with it, keyed by the action the agent is about to take, one `READ SKILL FILE` target per row; `<resources>` / `<templates>` list the same files. A mechanic a stage needs with no row pointing at it is an orphaned contract, and a renamed sub-file must be updated in the router, in both lists, and in the cross-references sub-files make to each other. A router keyed vaguely enough that everything gets loaded anyway is the failure this layout exists to fix.
- Both `POC-SCOPE-OVERRIDE:` markers must stay legible and keep naming what they substitute for — they are the documented removal points, and there is no config flag behind either ("the override is this prose"). The workflow's three phase-level markers mirror them.
- The pending sentinel's exact string, the target constants (`TOOL`, `Story`, `TSSM: Tool`/`TSSM: Project`, `Action item`, `link_inward: new_issue`), the key pattern `^[A-Z][A-Z0-9]+-\d+$`, the `agents/TEMP` and `"manual invocation"` defaults, and the artifact path `<artifacts_dir>/<TICKET-KEY>/issue-writes/<NNN>-<op>.json` are external contracts a future executor reads. They live in the reference that owns them, never restated in `SKILL.md`.
- The ticket input is a defined structured shape with a prose degrade path — **not** the earlier "no fixed schema, everything located inside free text" rule. `summary` missing is the only field absence that stops an invocation; every other absence is a recorded gap.
- `commands/tools-triage-flow.md` names this skill and its topics, never a path into this folder. Sub-files now exist to deep-link to, and the closed alias grammar still forbids it: `READ|APPLY SKILL FILE` is skill-internal and never carries a skill name. The split is invisible to the caller.
- Inbound coupling (`grep -rn "tools-triage" instructions/r3/core docs --include="*.md" -l`): `commands/tools-triage-flow.md` (its only caller, prerequisites step 3) and `docs/definitions/skills.md`; `docs/definitions/workflows.md` matches only via the flow's own name. The reference/asset split added no external coupler — sub-files are reachable only from `SKILL.md`.

## Editing guide — the keep/move test
Apply it line by line to anything you add or change here:
- **Stays in `SKILL.md`** — it changes what the agent *decides*: rubric levels and their definitions, routing branches, degradation rules ("Summary missing → stop; any other field missing → omit and record a gap"), stop conditions, and any negation that names a past failure (`Low` is never a catch-all for "didn't look"; never re-order inward/outward; never recompose a create).
- **Belongs in `references/` or `assets/`** — it only fixes a *spelling*: a path, an extension, a filename, a field name, a JSON key, an algorithm, a regex, a numbering scheme, a template skeleton.

Safe: prose inside any one reference section, and `<role>`/`<when_to_use_skill>`/`<pitfalls>`. Handle with care: the router table, the two override markers, the target constants and the sentinel string (a future executor parses them), and `tt-state-and-idempotency.md`'s resume routing — it is what keeps a re-invocation from re-opening a finalized ticket. New rubric or branch detail goes into the owning stage in `SKILL.md`; a new output shape goes into the reference or asset that owns that shape, with a router row if no existing row already leads there. Anything about phase dispatch, subagent choice, or model tier belongs in `commands/tools-triage-flow.md`, not here — this skill does not know which workflow runs it.
