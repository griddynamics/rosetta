# requirements-use
Turns approved requirement units into an execution contract: every task, test, and result must map to a requirement ID, with ambiguity escalated via HITL instead of assumed.

## Why it exists
Failure mode fixed: a model told to "implement the feature" starts from prose intent, fills silence with its own guesses, treats a Draft requirement as if it were Approved, and leaves traceability implicit or backfilled at the end. `requirements-use` forces the opposite: "Use only Approved units for execution," "No scope without requirement ID," and "Draft units require explicit user decision" (`requirement_usage_rules`, `core_principles_to_enforce`). Without it, priority (Must/Should/Could/Wont) and status (Draft/Approved/Deprecated/Removed) would be read as commentary rather than as gates.

## When to engage
`when_to_use_skill`: "Use when implementing from approved requirements, planning work from requirement IDs, or auditing requirement-to-delivery traceability. Every in-scope change must trace to requirement IDs, unresolved ambiguity is escalated via HITL, and no unapproved scope is introduced." Actor: `requirements-engineer`/`reviewer` (frontmatter `agent:`). Prerequisites (`<dependencies>`): approved requirements as source of truth, plus CONTEXT/ARCHITECTURE/IMPLEMENTATION docs; if requirements are missing or unclear, USE SKILL `questioning` rather than proceeding on assumption.

## How it works
Single flat `SKILL.md`, no `references/` subfolder. `<process>` is 9 steps: validate intake (Approved status on all in-scope IDs) -> map requirement IDs to tasks -> detect ambiguity/conflicts and escalate via HITL -> execute with continuous matrix updates ("do not batch") -> update implementation status/notes -> report coverage gaps and over-implementation risk -> run the validation rubric -> HITL final coverage approval. Two `assets/` files back this: `ru-traceability-matrix.md` is a per-requirement-ID coverage row (Requirement ID/Ticket ID/Priority/Status/Task-Change Ref/Acceptance Criteria Ref/Test-Evidence Ref/Coverage Status/Notes); `ru-change-log.md` is a kept/removed/added/clarified/assumptions/risks_hitl delta log for *interpretation* decisions, explicitly not a saved artifact. `<requirement_unit_template>` embeds the `<req>` shape this skill consumes (not authors): id `FR-AREA-0001`, type/level/ticketId/classification, title/statement/rationale/source, priority, status, approved_by/changed, verification, acceptance criteria, depends, implementation/implementationNotes, notes.

## Mental hooks & unexpected rules
- "Requirements are always referenced and only via code comments" (`core_principles_to_enforce`) — traceability lives inline in code, not in a side document.
- `ru-change-log.md`: "Only show this to user, do not save in documents" — the change log is deliberately ephemeral output, not a repo artifact.
- Process step 5: "Execute with continuous matrix updates (do not batch)" — forbids reconstructing traceability after the fact.
- Two vocabularies that must not be conflated: MoSCoW priority `Must|Should|Could|Wont` (no apostrophe in "Wont") versus statement modality — "Interpret shall as mandatory," "should as preferred," "may as optional."
- `<pitfalls>` names three failure modes verbatim: "Treating Draft as Approved," "Assuming unspecified behavior," "Ignoring requirement priority and status."

## Invariants — do not change
- `name: requirements-use` equals the folder name; registered in `docs/definitions/skills.md:26`.
- Description ("To consume approved requirements for planning, implementation, and validation, with traceability and HITL.") fits the schema's ~25-token budget — unlike `hitl`, this skill claims no CRITICAL-form exception.
- `disable-model-invocation: false` / `user-invocable: true` — both explicit per `docs/schemas/skill.md`.
- `<req id="FR-AREA-0001" .../>` ID scheme (`FR-AREA-NNNN`) is byte-identical to `requirements-authoring/assets/ra-requirement-unit.xml`; this skill consumes what `requirements-authoring` produces, so the two ID grammars must stay in lockstep.
- Asset filenames `ru-traceability-matrix.md`, `ru-change-log.md` use the `ru-` prefix convention (mirrors `ra-` in `requirements-authoring`) — other files load them by exact path via `<resources>`.
- `<resources>` uses the nameless canonical alias `READ SKILL FILE \`assets/...\`` (no separate alias name), the generic-schema grammar for a skill's own files.
- No `USE FLOW`/workflow reference anywhere in this SKILL.md — it stays a leaf skill that workflows load via `USE SKILL \`requirements-use\``, never the reverse (effect observed; intent not documented).
- Root `<requirements-use>` wrapper tag matches the skill name, the shared `<[the_skill_name]>` convention.
- Frontmatter carries exactly one top-level `tags:` list (plus a separate `metadata.tags` string) — do not reintroduce a second top-level `tags:` key.

## Editing guide
- Safe to change: prose inside `<core_concepts>`, `<best_practices>`, bullet order in `requirement_usage_rules`/`traceability_rules`/`ambiguity_and_conflict_rules` (nothing references a bullet by number).
- Handle with care: `<process>` step order (step 5's no-batching rule and step 9's HITL-last placement are behavioral); the `<req>` template field names (external producers/consumers key off exact tags); the shall/should/may mapping.
- New content belongs directly in `SKILL.md`; if it grows, split templates into `assets/` following the existing `ru-` naming, mirroring `requirements-authoring`.
- Referenced by (do not break without checking): `commands/coding-flow.md` (`USE SKILL \`requirements-use\`` when a workflow targets REQUIREMENTS), `agents/architect.md` (validates specs against REQUIREMENTS via this skill), `skills/tech-specs/SKILL.md` (same "if present" guard), `rules/requirements-use-best-practices.mdc` (a parallel MUST/SHOULD rule list), `skills/hitl/README.md` (lists `ru-change-log.md` as a HITL-behavior consumer, though the asset's own text only carries HITL through the `risks_hitl` field name).
