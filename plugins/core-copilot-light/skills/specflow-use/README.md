# specflow-use

Connector skill that lets the agent drive the remote Grid Dynamics **SpecFlow** product through **SpecFlow MCP**, routing the user through pregeneration/generation/post-run phases without ever touching the remote workspace directly.

## Why it exists

Without it, a model encountering "SpecFlow" would be tempted to reach into the remote workspace itself, re-derive MCP tool schemas that the MCP server already injects at connection time, invent its own status/checkpoint meanings, or try to fix specs itself instead of handing that loop to the `requirements-authoring` skill. The skill exists to keep the agent a thin, correctly-sequenced client of an external product it does not own.

## When to engage

Frontmatter description: "To connect Rosetta with Grid Dynamics SpecFlow MCP; only when SpecFlow is mentioned and the MCP is installed." `disable-model-invocation: true` + `user-invocable: true` — the model must not self-trigger this even when SpecFlow comes up; it only runs on explicit user invocation. Prerequisite: SpecFlow MCP connected; `gain.json` is not a hard prerequisite (self-created on first MCP call).

## How it works

SKILL.md Quick Start: (1) detect `gain.json` at workspace root or up to 2 parents; (2) load and display it via the fenced `## SpecFlow Project Context` template; (3) APPLY `references/specflow-mcp-tools.md` to route the user into the right phase. Step 4 is conditional: only when SpecFlow returns a review report *and* the user wants to fix specs before re-iterating, delegate to `skills/requirements-authoring` / `commands/requirements-authoring-flow.md`.

References split by verb, deliberately:
- `specflow-mcp-tools.md` (APPLY) — the playbook: Pregeneration / Generation / Post-Run phase routing, which real MCP tools and fields gate each transition (`check_specification_completeness`, `run_planning`, `check_status`'s `can_run_generation`, `download_outputs`, `get_specflow_skills`), and the post-run skill-install mechanic.
- `specflow-vocabulary.md` (READ) — lookup table: `status` enum user-facing meanings and the two user-meaningful checkpoints (`planning_done`, `estimation_done`); overridable via `gain.json.vocabulary`.
- `specflow-schema.md` (READ) — lookup table: session files (`gain.json` vs `specflow_session.json`), version channels, and the bare status enum list (cross-refers to vocabulary for meanings).

The `## SpecFlow Project Context` fenced block in SKILL.md Step 2 is a leave-alone presentation template: labels and layout are rendered verbatim to the user with `gain.json` fields substituted in.

Actors: the user (drives SpecFlow), this skill (router/connector), SpecFlow MCP (executes remotely), and two downstream user-invocable skills SpecFlow can push onto disk post-run: `/specflow-review`, `/specflow-diagnose`.

## Mental hooks & unexpected rules

- "SpecFlow MCP is the only user interface to SpecFlow: you order work and download outputs. You do not connect to or operate on the remote workspaces directly." — hard boundary against trying to inspect or operate on the remote generation.
- "If missing, SpecFlow MCP will create it on the first tool call (together with `specflow_session.json`)." — a missing `gain.json` is not an error state to fix; it self-heals.
- "Tool-level rules, ordering, and timing are already in the MCP server instructions received automatically at connection" — this is why the reference files don't restate full tool schemas; that's kept upstream on purpose to avoid drift.
- Post-run install step: "Install each returned skill by writing its `content` field to `~/.claude/skills/{name}/SKILL.md`" — this skill actively writes new skill files to disk; it is an installer, not just a router.
- Version compatibility check has only two buckets — "Minor difference: warn and continue" / "Major difference: alert the user" — no numeric thresholds are defined; what counts as minor vs. major is left to the model's judgment (intent not documented).

## Invariants — do not change

- Frontmatter `name: specflow-use` must equal the folder name; registered at `docs/definitions/skills.md:43`.
- `description` stays a single dense trigger sentence — it is what routing reads.
- `disable-model-invocation: true` and `user-invocable: true` must both hold; flipping either changes who is allowed to trigger this skill.
- The three nameless `APPLY SKILL FILE` / `READ SKILL FILE` pointers in SKILL.md, plus the cross-reference inside `specflow-schema.md` to `specflow-vocabulary.md`, must track the actual `references/` filenames.
- External SpecFlow MCP tool names (`check_specification_completeness`, `run_planning`, `check_status`, `download_outputs`, `get_specflow_skills`), fields (`can_run_generation`, `generation_id`), status enum (`pending | analysis | initializing | running | completed | failed`), and checkpoints (`planning_done`, `estimation_done`) are an external product's contract — mirror the real MCP server (see https://griddynamics.github.io/cto-rnd-gain-mcp/), don't rename for style.
- Session filenames `gain.json` and `specflow_session.json` are read/written by both the agent and the SpecFlow MCP server; Step 1 detection depends on the exact names.
- The `## SpecFlow Project Context` fenced template is rendered verbatim to users — wording/label edits are user-visible.
- No XML tags are used anywhere in this skill's files; don't import the `<bootstrap_..._policy>` style seen in `rules/speckit-integration-policy.md` — that file governs an unrelated product (SpecKit, detected via `memory/constitution.md` + a `specs` folder, driven by `/speckit.*`) and must not be conflated with SpecFlow.
- `/specflow-review` and `/specflow-diagnose` are external artifact names fetched via `get_specflow_skills`, not defined locally — keep the names as given.

## Editing guide

Safe to edit: prose explanations, phase-description wording, the warn/alert language for version mismatches. Handle with care: the fenced project-context template (user-visible), the MCP tool/field/enum names (verify against the public docs or live MCP instructions before touching), and the `requirements-authoring` delegation target in Step 4. New phase-routing detail belongs in `specflow-mcp-tools.md`; new status/checkpoint values belong in `specflow-vocabulary.md`; new session-file or version-channel facts belong in `specflow-schema.md`. `requirements-authoring/README.md` lists `skills/specflow-use/SKILL.md` among its delegators — the Step 4 delegation is a two-sided coupling; keep both sides in sync if either skill's file/workflow paths change.
