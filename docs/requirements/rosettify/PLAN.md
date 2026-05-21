# FR-PLAN — Plan Command

Requirements for the plan command, reverse-engineered from plan_manager.js, plan_manager.py, plan_manager.test.js, SKILL.md, and pm-schema.md. plan_manager.js is absorbed into rosettify as the plan command module. Python implementation (plan_manager.py) provides additional validations adopted here.

Note: All "Output:" references in this file describe the `result` field contents of the common output envelope (FR-ARCH-0011). Envelope wrapping ({ok, result, error, include_help}) is handled by common functionality (FR-ARCH-0011, FR-ARCH-0012). Run delegates never touch stdin/stdout/stderr (FR-ARCH-0008).

## Data Model

### FR-PLAN-0001 Two-Level Hierarchy

<req id="FR-PLAN-0001" type="FR" level="System">
  <title>Plan data model: phases contain steps</title>
  <statement>A plan SHALL have two levels: a plan contains phases, each phase contains steps. Plan fields: name (string, required, non-empty), description (string, default ""), status (derived), created_at (ISO8601), updated_at (ISO8601), phases (array). Phase fields: id (string, required, unique across entire plan), name (string, required), description (string, default ""), status (derived), depends_on (phase-id array, default []), subagent (string, optional), role (string, optional), model (string, optional), steps (array). Step fields: id (string, required, unique across entire plan), name (string, required), prompt (string, required), status (string, default "open"), depends_on (step-id array, default [], cross-phase allowed), subagent (string, optional), role (string, optional), model (string, optional). If any operation results in duplicate IDs, the operation SHALL be rejected with `duplicate_id`.</statement>
  <rationale>Core data model from pm-schema.md. Duplicate ID validation from plan_manager.py.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a plan created with phases and steps. When: queried. Then: all fields match the schema. IDs are unique across the entire plan. Given: upsert that introduces a duplicate ID. Then: {error: "duplicate_id"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0002 Status Enum

<req id="FR-PLAN-0002" type="FR" level="System">
  <title>Five-value status enum</title>
  <statement>Valid statuses SHALL be: open, in_progress, complete, blocked, failed. Any other value SHALL be rejected with an invalid_status error.</statement>
  <rationale>From plan_manager.js:cmdUpdateStatus line 158.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: an update_status call with status "done". When: executed. Then: returns {error: "invalid_status: done"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0003 Bottom-Up Status Propagation

<req id="FR-PLAN-0003" type="FR" level="System">
  <title>Status propagates bottom-up: steps to phases to plan</title>
  <statement>Phase status SHALL be derived from its steps. Plan status SHALL be derived from its phases. Derivation rules: all complete = complete; any failed = failed; any blocked = blocked; any in_progress or complete (mixed) = in_progress; otherwise = open. Empty steps array = open. Plan root status SHALL never be set directly.</statement>
  <rationale>From computeStatus and propagateStatuses in both JS and Python implementations.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a phase with steps [complete, complete]. When: status propagates. Then: phase=complete. Given: steps [complete, failed]. Then: phase=failed. Given: steps [open, blocked]. Then: phase=blocked. Given: steps [complete, open]. Then: phase=in_progress. Given: steps [open, open]. Then: phase=open. Given: empty steps []. Then: phase=open.</criteria>
  </acceptance>
</req>

### FR-PLAN-0004 Dependency Resolution

<req id="FR-PLAN-0004" type="FR" level="System">
  <title>Dependency-based eligibility with validation</title>
  <statement>Phases SHALL depend on other phases (depends_on: phase-id[]). Steps SHALL depend on other steps (depends_on: step-id[], cross-phase allowed). A step/phase is eligible for execution only when all items in its depends_on have status "complete". A depends_on entry referencing a non-existent ID SHALL be rejected with `unknown_dependency`. A dependency graph containing a cycle SHALL be rejected with `dependency_cycle`.</statement>
  <rationale>Eligibility logic from JS. Validation from plan_manager.py (_validate_dependencies, _detect_cycle).</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: step-1b depends_on [step-1a], step-1a status=open. When: next is called. Then: step-1b is not in ready list. When: step-1a status=complete. Then: step-1b appears in ready list. Given: phase-2 depends_on [phase-1], phase-1 not complete. Then: no steps from phase-2 appear in next. Given: depends_on referencing non-existent ID. Then: {error: "unknown_dependency"}. Given: A depends_on B, B depends_on A. Then: {error: "dependency_cycle"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0005 Constants

<req id="FR-PLAN-0005" type="FR" level="System">
  <title>Plan size constants with runtime enforcement</title>
  <statement>The system SHALL enforce: max 100 phases per plan, max 100 steps per phase, max 50 dependencies per item, max 20000 characters per string field, max 256 characters per name field. Violations SHALL be rejected with `size_limit_exceeded`.</statement>
  <rationale>From pm-schema.md Constants table. Runtime enforcement from plan_manager.py (_validate_size_limits).</rationale>
  <source>Documentation</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a plan with 101 phases. When: created. Then: {error: "size_limit_exceeded"}. Given: a step name of 257 characters. Then: {error: "size_limit_exceeded"}.</criteria>
  </acceptance>
</req>

## Subcommands

### FR-PLAN-0010 create

<req id="FR-PLAN-0010" type="FR" level="System">
  <title>plan create subcommand</title>
  <statement>plan create SHALL accept a plan JSON object and a file path. It SHALL create the plan file with: status defaults (open for all phases/steps), depends_on defaults ([]), timestamps (created_at, updated_at set to current ISO8601), default name "Unnamed Plan" when not provided, and previous_version set to null. It SHALL create parent directories if they don't exist. All validations (unique IDs, dependencies, size limits, cycles) SHALL run before writing. The result SHALL conform to the compressed-tree shape defined in FR-PLAN-0040.</statement>
  <rationale>Compressed-tree output gives AI agents an immediate post-write snapshot without a follow-up query.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: create with {name: "My Plan", phases: []}. When: executed. Then: file exists with status=open, created_at and updated_at set, previous_version=null, result matches the compressed-tree shape from FR-PLAN-0040 with previous_version=null. Given: no name provided. Then: name="Unnamed Plan". Given: nested path that doesn't exist. Then: parent dirs are created.</criteria>
  </acceptance>
</req>

### FR-PLAN-0011 next

<req id="FR-PLAN-0011" type="FR" level="System">
  <title>plan next subcommand</title>
  <statement>plan next SHALL return steps organized by execution relevance, respecting sequential phase ordering. Phases are sequential: steps from a later phase SHALL NOT appear in next results until ALL steps in all earlier phases are complete (status=complete). The active phase is the earliest phase that is not yet fully complete. next returns work from the active phase only (unless target_id overrides this). The result SHALL contain four groups in order: (1) in_progress steps (resume=true) — interrupted work to continue; (2) open steps with all dependencies satisfied and parent phase dependencies satisfied — new work; (3) blocked steps (previously_blocked=true); (4) failed steps (previously_failed=true) — surfaced so the AI agent can reason about them. Each returned step SHALL include phase_id, phase_name, and applicable flags (resume, previously_blocked, previously_failed). The optional target_id parameter acts as a filter: when provided, results are scoped to that specific phase only (overriding the active-phase selection), explicitly identifying which phase to work on. When target_id is omitted, next automatically determines the active phase per sequential ordering. Accepts optional limit parameter (default 10). Negative limit SHALL be rejected with `invalid_limit`. Result: {ready: [...], count, plan_status}.</statement>
  <rationale>Phases are sequential by design: an AI agent must not start later-phase work until earlier phases are fully done. target_id is a filter that explicitly overrides phase selection when provided, enabling the caller to target a specific phase. Resume behavior from JS. Blocked/failed surfacing for AI session recovery reasoning. Diverges from both JS and Python sources, which do not enforce sequential phase ordering or surface blocked/failed steps.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: phase-1 has steps [complete, complete], phase-2 has steps [open, open]. When: next called (no target_id). Then: steps from phase-2 returned (phase-1 fully done). Given: phase-1 has steps [complete, open], phase-2 has steps [open]. When: next called. Then: only steps from phase-1 returned (phase-1 not fully complete). Given: step s1 in_progress, s2 open, s3 blocked, s4 failed, all in active phase. When: next called. Then: s1 appears first (resume=true), s2 second, s3 third (previously_blocked=true), s4 fourth (previously_failed=true). Given: limit=2, 5 eligible steps. Then: only 2 returned. Given: target_id=phase-2. Then: only steps from phase-2 returned regardless of phase-1 completion state. Given: limit=-1. Then: {error: "invalid_limit"}. Given: file missing. Then: {error: "plan_not_found"}. Given: target_id referencing nonexistent phase. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0012 update_status

<req id="FR-PLAN-0012" type="FR" level="System">
  <title>plan update_status subcommand</title>
  <statement>plan update_status SHALL set the status of a step by ID, then propagate statuses bottom-up. Phase status updates SHALL be rejected — phase status is always derived from steps. If target_id is "entire_plan", the operation SHALL be rejected. Result: {id, status, plan_status}. Errors: {error: "invalid_status: <value>"} for invalid status, {error: "target_not_found"} for unknown ID, {error: "plan_not_found"} for missing file, {error: "phase_status_is_derived"} when targeting a phase ID, {error: "invalid_target"} when targeting entire_plan, {error: "missing_new_status"} when status parameter is absent.</statement>
  <rationale>Step-only status updates enforce that phase status is always derived. Diverges from both JS and Python which allow phase status updates.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: update_status step-1a complete. When: executed. Then: step-1a=complete, phase propagates, result has plan_status. Given: update_status phase-1 complete. Then: {error: "phase_status_is_derived"}. Given: update_status entire_plan complete. Then: {error: "invalid_target"}. Given: unknown ID. Then: {error: "target_not_found"}. Given: status "done". Then: {error: "invalid_status: done"}. Given: no status provided. Then: {error: "missing_new_status"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0013 show_status

<req id="FR-PLAN-0013" type="FR" level="System">
  <title>plan show_status subcommand</title>
  <statement>plan show_status SHALL return status summary. For entire_plan (default): {name, status, phases: {totals with progress_pct}, steps: {totals with progress_pct}, phase_summary: [{id, name, status, steps: [{id, name, status}]}]}. Totals include: open, in_progress, complete, blocked, failed, total, progress_pct. progress_pct = round(complete/total * 1000) / 10. For phase ID: {id, name, status, steps: [...]}. For step ID: {id, name, status, depends_on, subagent?, role?, model?}. Errors: target_not_found, plan_not_found.</statement>
  <rationale>Base structure from JS cmdShowStatus. Step-level detail enriched from Python (depends_on, optional subagent fields).</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: 3 steps, 1 complete. When: show_status entire_plan. Then: steps.total=3, steps.complete=1, progress_pct between 33 and 34. Given: all complete. Then: progress_pct=100. Given: show_status step-1a. Then: result includes id, name, status, depends_on.</criteria>
  </acceptance>
</req>

### FR-PLAN-0014 query

<req id="FR-PLAN-0014" type="FR" level="System">
  <title>plan query subcommand</title>
  <statement>plan query SHALL return full JSON of the target. For entire_plan or no target: returns full plan object. For phase ID: returns full phase with steps. For step ID: returns full step. Errors: target_not_found, plan_not_found.</statement>
  <rationale>From cmdQuery in JS.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: query entire_plan. Then: full plan with all phases and steps. Given: query step-1b. Then: {id: "step-1b", prompt: "Do 1B", ...}. Given: query no-such-id. Then: {error: "target_not_found"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0015 upsert

<req id="FR-PLAN-0015" type="FR" level="System">
  <title>plan upsert subcommand</title>
  <statement>plan upsert SHALL create or merge-patch plan, phase, or step by ID. Behaviors: (1) entire_plan with missing file: creates new plan with defaults. (2) entire_plan with existing file: merges top-level fields; merges phases array by ID (existing patched, new appended). (3) Existing phase/step ID: merge-patches that item; if patch contains steps array, merges steps by ID. (4) New ID with kind=phase: appends new phase. (5) New ID with kind=step + phase_id: appends step to that phase. (6) New ID without kind: rejected with `missing_kind`. (6a) New ID with kind other than "phase" or "step": rejected with `invalid_kind`. (7) Patch data with id field differing from target_id: rejected with `immutable_id`. (8) Missing or invalid data payload: rejected with `invalid_data` or `missing_data`. (9) Missing phase_id for new step: rejected with `missing_phase_id`. (10) Missing ID in phases array: rejected with `missing_id`. (11) Nonexistent phase_id for new step: rejected with `phase_not_found`. Merge follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced. Status fields in patch data SHALL be silently dropped — status is only modifiable via update_status (one step at a time after each task completion). The silent-drop behavior SHALL be documented in plan help (FR-PLAN-0016). All validations (unique IDs, dependencies, cycles, size limits) SHALL run after merge and before writing. Statuses are propagated after every upsert. updated_at is set on every save. The result SHALL conform to the compressed-tree shape defined in FR-PLAN-0040.</statement>
  <rationale>Compressed-tree output gives AI agents an immediate post-write snapshot. Silent-drop is surfaced via help instead of per-call output so commands have a uniform result shape.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: upsert entire_plan on missing file. Then: file created with defaults; result matches FR-PLAN-0040. Given: upsert step-1a {name: "Renamed"}. Then: name updated, prompt preserved, status preserved, result matches FR-PLAN-0040. Given: upsert step-1a {status: "complete", name: "X"}. Then: status field silently dropped, name updated, result matches FR-PLAN-0040 without any per-call note about the drop. Given: upsert with null value. Then: key removed. Given: upsert phase array item without id. Then: {error: "missing_id"}. Given: upsert new step with phase_id pointing to nonexistent phase. Then: {error: "phase_not_found"}. Given: new ID without kind. Then: {error: "missing_kind"}. Given: patch with different id than target. Then: {error: "immutable_id"}. Given: malformed data. Then: {error: "invalid_data"}. Given: data parameter absent. Then: {error: "missing_data"}. Given: kind="unknown". Then: {error: "invalid_kind"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0030 create-with-template

<req id="FR-PLAN-0030" type="FR" level="System">
  <title>plan create-with-template subcommand</title>
  <statement>plan create-with-template SHALL accept four required inputs, named uniformly across frontends:

| Position (CLI) | Parameter name (CLI flag / MCP field / placeholder) |
|---|---|
| 1 | `plan_file` |
| 2 | `template` |
| 3 | `plan-name` |
| 4 | `plan-description` |

Parameters 3 and 4 are template placeholder values and SHALL be passed under the kebab-case names shown (FR-PLAN-0034). CLI accepts them positionally in the order above. MCP receives them as named fields on the plan tool's input object under the same names.

The subcommand SHALL look up `template` in the create-kind template collection (FR-PLAN-0033); a name not found in that collection SHALL be rejected with `invalid_template`. It SHALL render the template via FR-PLAN-0034 with `[plan-name]` and `[plan-description]` as the only allowed placeholders, then invoke the same logic as plan create (FR-PLAN-0010) on the rendered plan JSON. All validations, write semantics (FR-PLAN-0024), and result shape (FR-PLAN-0040) SHALL be identical to plan create.</statement>
  <rationale>A wrapper over create keeps semantics consistent and avoids duplicate write paths. Uniform parameter naming across CLI and MCP makes the binding to placeholder names self-evident.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: CLI `rosettify plan create-with-template plans/x.json for-orchestrator "My Plan" "Do Y"`. Then: the plan file is created with name="My Plan" and `[plan-description]` substituted; the result matches FR-PLAN-0040. Given: MCP `CallTool "plan" {subcommand:"create-with-template", plan_file:"plans/x.json", template:"for-orchestrator", "plan-name":"My Plan", "plan-description":"Do Y"}`. Then: identical effect to the CLI invocation. Given: an unknown template name. Then: {error: "invalid_template"}. Given: a template that is registered only as an upsert template. Then: {error: "invalid_template"}. Given: any required parameter is missing. Then: rejected with `missing_template_param`.</criteria>
  </acceptance>
</req>

### FR-PLAN-0031 upsert-with-template

<req id="FR-PLAN-0031" type="FR" level="System">
  <title>plan upsert-with-template subcommand</title>
  <statement>plan upsert-with-template SHALL accept five required inputs, named uniformly across frontends:

| Position (CLI) | Parameter name (CLI flag / MCP field / placeholder) |
|---|---|
| 1 | `plan_file` |
| 2 | `phase-id` |
| 3 | `template` |
| 4 | `phase-name` |
| 5 | `phase-description` |

Parameters 2, 4, and 5 are template placeholder values and SHALL be passed under the kebab-case names shown (FR-PLAN-0034). CLI accepts them positionally in the order above. MCP receives them as named fields on the plan tool's input object under the same names.

The subcommand SHALL look up `template` in the upsert-kind template collection (FR-PLAN-0033); a name not found in that collection SHALL be rejected with `invalid_template`. It SHALL render the template via FR-PLAN-0034 with `[phase-id]`, `[phase-name]`, and `[phase-description]` as the only allowed placeholders, then invoke the same logic as plan upsert (FR-PLAN-0015) targeting `phase-id` with the rendered phase JSON as the patch data. All upsert merge semantics, validations, write semantics (FR-PLAN-0024), and result shape (FR-PLAN-0040) SHALL be identical to plan upsert.</statement>
  <rationale>A wrapper over upsert keeps merge and write semantics consistent. Exposing `phase-id` as a placeholder-bound input lets the same template apply to any phase in any plan and keeps step IDs unique under repeated use.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: CLI `rosettify plan upsert-with-template plans/x.json ph-impl for-subagent "Implementation" "Implement the API endpoint"`. Then: a phase with id="ph-impl" is upserted from the rendered template content; the result matches FR-PLAN-0040. Given: MCP `CallTool "plan" {subcommand:"upsert-with-template", plan_file:"plans/x.json", "phase-id":"ph-impl", template:"for-subagent", "phase-name":"Implementation", "phase-description":"Implement the API endpoint"}`. Then: identical effect to the CLI invocation. Given: an unknown template name. Then: {error: "invalid_template"}. Given: a template that is registered only as a create template. Then: {error: "invalid_template"}. Given: any required parameter is missing. Then: rejected with `missing_template_param`. Given: the target phase already exists. Then: standard upsert merge semantics apply (FR-PLAN-0015).</criteria>
  </acceptance>
</req>

### FR-PLAN-0032 list-templates

<req id="FR-PLAN-0032" type="FR" level="System">
  <title>plan list-templates subcommand</title>
  <statement>plan list-templates SHALL return the catalog of registered templates grouped by kind. The result SHALL be:

```
{
  "create": [ { "name": <string>, "brief": <string>, "placeholders": [ <string> ] } ],
  "upsert": [ { "name": <string>, "brief": <string>, "placeholders": [ <string> ] } ]
}
```

Each template entry SHALL contain the template's registered name, a one-line brief authored alongside the template, and the exact set of declared placeholder names the template consumes. The same catalog content SHALL also appear in the plan help content (FR-PLAN-0016) under the `templates` section.</statement>
  <rationale>Programmatic discovery lets callers (especially AI agents) inspect available templates and their parameter requirements before invoking create-with-template or upsert-with-template, avoiding trial-and-error and `missing_template_param` errors.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: list-templates invoked. Then: returns {create: [...], upsert: [...]} where each entry has name, brief, and placeholders. Given: a template registered with declared placeholders [plan-name, plan-description]. Then: its entry's placeholders array equals exactly those names. Given: rosettify help plan. Then: the templates section in help contains the same catalog.</criteria>
  </acceptance>
</req>

### FR-PLAN-0016 Plan Help Content

<req id="FR-PLAN-0016" type="FR" level="System">
  <title>Help content registered for the plan command</title>
  <statement>The plan command SHALL register help content in the tool registry that the help system (FR-HELP-0002) returns when queried. The content SHALL include:

- plan_file convention
- core concepts (hierarchy, statuses, depends_on, status_propagation, resume)
- subagent_fields (subagent, role, model on phases and steps)
- subcommands: one entry per registered subcommand (create, next, update_status, show_status, query, upsert, create-with-template, upsert-with-template, list-templates), each with name, brief, usage, args, description, and an examples block. Every examples block SHALL contain at least two example invocations for the subcommand:
  - a **tip example** using bracketed self-explanatory hints in place of each argument. The bracketed hints describe what each argument represents in plain words and SHALL NOT be confused with template placeholder names (which match JSON field names per FR-PLAN-0034). Where a placeholder name is already self-explanatory it may be reused as-is (e.g. `[plan-name]`); where it is too generic it SHALL be expanded into a longer human hint (e.g. `[user-request-description-one-sentence]` rather than `[plan-description]`).
  - a **real example** using concrete quoted values that would produce a working invocation.

Concrete illustration for `create-with-template`:

```
Tip form:
  rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator [plan-name] [user-request-description-one-sentence]

Real form:
  rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator "Feature X" "User wants to add Y to Z"
```

The two forms together teach the caller what each argument is for AND show a runnable instance
- schemas: a flat dictionary mapping a key name to a JSON Schema; the dictionary SHALL include one entry per subcommand keyed by subcommand name and entries for any other reusable shapes (e.g. compressed-tree, plan); each value SHALL be sourced from the per-subcommand schema declaration described in FR-HELP-0002 — not hand-authored duplicates
- limits per FR-PLAN-0005
- templates: the catalog returned by list-templates (FR-PLAN-0032), grouped by kind
- notes: a string array documenting behaviors that affect the caller upfront. The notes SHALL include at minimum:
  - status fields in upsert patches are silently dropped — use update_status to change status one-by-one after each task completion
  - write-cycle process (high level): read with retries → modify in memory → rename old file as backup → write new file
  - every successful write atomically renames the plan file to `<plan_file>.bakNNN` before writing the new plan; the plan's `previous_version` field points to the immediately prior version (the backup captured at write time)
  - backup retention is bounded; the oldest backups beyond the configured limit (default 5) are pruned
  - if the plan file is missing but at least one backup exists, reads retry briefly before returning `plan_not_found`
  - templates have two kinds (create, upsert); a template of one kind cannot be used with the other kind
  - placeholder syntax in templates is `[placeholder-name]`; provided params and declared placeholders must match exactly
- plan_authoring_guidance: "the last step in each phase should verify all work in that phase was actually completed; the last phase should verify all work across the entire plan was completed"
- next_steps_for_ai
</statement>
  <rationale>AI agents need a single self-describing help payload that conveys behavior, structure, examples, and surprising rules upfront, so they can construct correct invocations without trial and error.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help plan. When: the help run delegate executes. Then: the returned content contains plan_file, concepts, subagent_fields, subcommands (one per registered subcommand with at least one example each), schemas (flat dictionary sourced from per-subcommand declarations), limits, templates catalog, notes array containing every behavior listed above, plan_authoring_guidance, and next_steps_for_ai.</criteria>
  </acceptance>
</req>

### FR-PLAN-0017 Plan JSON Schema

<req id="FR-PLAN-0017" type="FR" level="System">
  <title>Plan JSON file schema</title>
  <statement>The plan JSON file SHALL conform to the following schema:

```
plan:
  name: str                    # required, non-empty
  description: str             # default: ""
  status: StatusEnum           # derived bottom-up, never set directly
  created_at: ISO8601          # set on create
  updated_at: ISO8601          # updated on every write
  previous_version: str|null   # default: null; path of the backup captured at write time (FR-PLAN-0024)
  phases[]:
    id: str                    # required, unique across entire plan
    name: str                  # required
    description: str           # default: ""
    status: StatusEnum         # derived from steps
    depends_on: [phase-id]     # default: []
    subagent: str              # optional
    role: str                  # optional
    model: str                 # optional
    steps[]:
      id: str                  # required, unique across entire plan
      name: str                # required
      prompt: str              # required
      status: StatusEnum       # default: open
      depends_on: [step-id]    # default: [], cross-phase allowed
      subagent: str            # optional
      role: str                # optional
      model: str               # optional

StatusEnum: open | in_progress | complete | blocked | failed
```

This schema is the source of truth for plan file format, help content (FR-PLAN-0016), and validation.</statement>
  <rationale>Single authoritative schema definition referenced by data model, help, and validation requirements.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a plan file. When: parsed. Then: all fields conform to the schema above. Given: rosettify help plan. Then: schema displayed matches this definition.</criteria>
  </acceptance>
</req>

### FR-PLAN-0018 Plan Limits and Examples Content

<req id="FR-PLAN-0018" type="FR" level="System">
  <title>Limits and dual-form examples registered for the plan command</title>
  <statement>The plan command's help content SHALL include constants/limits (max phases, max steps, max deps, max string length, max name length per FR-PLAN-0005) and usage examples for each subcommand. Per FR-PLAN-0016, every subcommand's examples block SHALL contain both a tip-form example (bracketed self-explanatory hints) and a real-form example (concrete quoted values producing a working invocation).

Concrete illustration for `create-with-template`:

```
Tip form:
  rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator [plan-name] [user-request-description-one-sentence]

Real form:
  rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator "Feature X" "User wants to add Y to Z"
```

The two forms together teach the caller what each argument is for AND show a runnable instance.</statement>
  <rationale>AI agents need limits to avoid validation errors. The dual-form examples teach intent and provide a runnable instance, eliminating guesswork.</rationale>
  <source>Documentation</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help plan. When: help run delegate executes. Then: returned content includes limits matching FR-PLAN-0005 constants and, for every subcommand, an examples block containing one tip-form example and one real-form example as specified in FR-PLAN-0016.</criteria>
  </acceptance>
</req>

## Output Shapes

### FR-PLAN-0040 Compressed-Tree Output for Write Subcommands

<req id="FR-PLAN-0040" type="FR" level="System">
  <title>Compressed-tree output shape for write subcommands</title>
  <statement>Write subcommands (create, upsert, create-with-template, upsert-with-template) SHALL return a compressed-tree shape that summarizes the plan after the write. The shape SHALL be:

```
{
  "plan": { "name": <string>, "status": <StatusEnum> },
  "previous_version": <string | null>,
  "phases": [
    {
      "id": <string>,
      "name": <string>,
      "status": <StatusEnum>,
      "steps": [
        { "id": <string>, "name": <string>, "status": <StatusEnum> }
      ]
    }
  ]
}
```

Field `previous_version` SHALL contain the absolute or relative path of the backup file captured at write time per FR-PLAN-0024, or `null` when the write produced the first version. The shape SHALL contain only the fields above and no other plan, phase, or step properties.</statement>
  <rationale>AI agents need a compact post-write snapshot to reason about plan state without re-reading the full plan; including `previous_version` exposes the backup link without a follow-up call.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any successful write subcommand. When: the result is inspected. Then: it matches the compressed-tree shape exactly and contains no fields beyond plan, previous_version, and phases (with steps). Given: the first ever create of a plan. Then: previous_version is null. Given: any subsequent write. Then: previous_version is the path of the just-created backup file.</criteria>
  </acceptance>
</req>

## Templates

### FR-PLAN-0033 Template Registry

<req id="FR-PLAN-0033" type="FR" level="System">
  <title>Compiled-in template registry, two kinds, per-file modules</title>
  <statement>The plan command SHALL expose a template registry with exactly two kinds: `create` and `upsert`. Templates of one kind SHALL NOT be usable as templates of the other kind. The registry SHALL be assembled at build time from individual TypeScript modules located under `src/commands/plan/templates/create/` and `src/commands/plan/templates/upsert/`. Each template SHALL be a separate source file exporting a single template module. The two kind-scoped collections SHALL be assembled into a dictionary keyed by template name. Templates SHALL be compiled into the published npm package; the running command SHALL NOT read template files from the filesystem at runtime.</statement>
  <rationale>Co-located, per-file modules give clear authoring boundaries and reviewable diffs. Two strictly separated kinds prevent semantically invalid cross-use (a plan-shaped template cannot be applied as a phase, and vice versa). Build-time bundling eliminates runtime filesystem dependencies and keeps the npm package self-contained.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Inspection</verification>
  <acceptance>
    <criteria>Given: the source tree. When: inspected. Then: every template is a separate file under `src/commands/plan/templates/create/` or `src/commands/plan/templates/upsert/`. Given: the running command. When: a template is rendered. Then: no filesystem read of the template source occurs. Given: an attempt to look up a create template name in the upsert collection (or vice versa). Then: the template is not found in that collection.</criteria>
  </acceptance>
</req>

### FR-PLAN-0034 Template Placeholder Substitution

<req id="FR-PLAN-0034" type="FR" level="System">
  <title>Placeholder syntax, parameter naming, and strict bidirectional matching</title>
  <statement>Templates SHALL use the placeholder syntax `[placeholder-name]` where `placeholder-name` is a kebab-case identifier. Each template SHALL declare the exact set of placeholder names it consumes.

Parameter naming SHALL be uniform across CLI, MCP, and the template engine: the name of each input parameter SHALL be identical to its corresponding placeholder name (without the brackets). The canonical form is kebab-case.

The render operation SHALL build a parameter dictionary keyed by placeholder name and value-substitute every occurrence of each declared placeholder in the template's JSON content. Matching SHALL be strict and bidirectional:

- If the template declares a placeholder for which no value is provided by the caller, the render SHALL fail with `missing_template_param`.
- If the caller provides a value for which no matching declared placeholder exists in the template, the render SHALL fail with `unexpected_template_param`.
- If the template's JSON content contains a placeholder token that is not in its declared set, the render SHALL fail with `unexpected_template_param`.

All input parameters for the template-using subcommands (FR-PLAN-0030, FR-PLAN-0031) SHALL be required. Substitution SHALL be literal string replacement; values SHALL NOT be re-interpreted or escaped beyond what JSON syntax requires to keep the rendered template a valid JSON document.</statement>
  <rationale>A single canonical name spanning CLI positionals, MCP input fields, and template placeholders eliminates translation layers, prevents drift, and makes mistakes self-evident. Strict bidirectional matching catches both caller errors (forgot a param) and template authoring errors (template uses a placeholder caller cannot supply), eliminating silent template misuse.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a template declaring placeholders `[plan-name]` and `[plan-description]`. When: rendered with both values provided under those exact names. Then: every occurrence of each token is replaced literally; the result is valid JSON. Given: only one of the two declared placeholders is provided. Then: render fails with `missing_template_param`. Given: a value provided under a name that is not declared by the template. Then: render fails with `unexpected_template_param`. Given: the template contains a placeholder token in its JSON text that is not in its declared set. Then: render fails with `unexpected_template_param`. Given: a parameter delivered as a CLI positional and the same parameter delivered as an MCP named field. Then: both arrive at the template engine under the same kebab-case key and produce identical rendered output.</criteria>
  </acceptance>
</req>

### FR-PLAN-0035 Seed Create Template: for-orchestrator

<req id="FR-PLAN-0035" type="FR" level="System">
  <title>Seed create template `for-orchestrator`</title>
  <statement>The create-kind template collection (FR-PLAN-0033) SHALL include a template registered under the name `for-orchestrator`. The template SHALL declare the placeholders `[plan-name]` and `[plan-description]`. The template's JSON content SHALL be byte-equivalent to the canonical asset stored at `assets/templates/create-for-orchestrator.json` (relative to this requirements directory). The rendered output SHALL be a complete plan whose single phase `ph-prep` encodes the Rosetta orchestrator preparation steps drawn from `rules/bootstrap.md` and `rules/bootstrap-core-policy.md` (subagent-only prep step content is excluded).</statement>
  <rationale>An orchestrator that needs a fresh plan can bootstrap a Rosetta-compliant preparation phase deterministically without hand-authoring repetitive boilerplate. The canonical asset file makes the byte-exact template content reviewable and version-controlled.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: list-templates. Then: the `create` array contains an entry with name="for-orchestrator" and placeholders=["plan-name", "plan-description"]. Given: create-with-template invoked with this template and both required values. Then: the resulting plan contains exactly one phase with id="ph-prep" whose steps match the canonical asset content with placeholders replaced. Given: the template JSON content as registered in code. When: byte-compared with `assets/templates/create-for-orchestrator.json`. Then: the two are byte-equivalent.</criteria>
  </acceptance>
</req>

### FR-PLAN-0036 Seed Upsert Template: for-subagent

<req id="FR-PLAN-0036" type="FR" level="System">
  <title>Seed upsert template `for-subagent`</title>
  <statement>The upsert-kind template collection (FR-PLAN-0033) SHALL include a template registered under the name `for-subagent`. The template SHALL declare the placeholders `[phase-id]`, `[phase-name]`, and `[phase-description]`. The template's JSON content SHALL be byte-equivalent to the canonical asset stored at `assets/templates/upsert-for-subagent.json` (relative to this requirements directory). The rendered output SHALL be a single phase whose step IDs are prefixed by `[phase-id]-s-` (e.g. `[phase-id]-s-load-context-instructions`) so that the template can be upserted to multiple phases in the same plan without producing duplicate step IDs.</statement>
  <rationale>A subagent's prep phase content is consistent across most tasks; a registered template lets an orchestrator inject a Rosetta-compliant prep phase under any phase id deterministically. Step-id prefixing with `[phase-id]` preserves the plan-wide unique-id invariant (FR-PLAN-0001) under repeated use of the template.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: list-templates. Then: the `upsert` array contains an entry with name="for-subagent" and placeholders=["phase-id", "phase-name", "phase-description"]. Given: upsert-with-template invoked with this template and all required values targeting a new phase id. Then: the plan gains a phase with the provided id, name, and description, and steps whose IDs begin with the provided phase id followed by `-s-`. Given: upsert-with-template invoked twice with different phase ids in the same plan. Then: no duplicate-id error occurs. Given: the template JSON content as registered in code. When: byte-compared with `assets/templates/upsert-for-subagent.json`. Then: the two are byte-equivalent.</criteria>
  </acceptance>
</req>

## File I/O

### FR-PLAN-0020 Plan File Storage

<req id="FR-PLAN-0020" type="FR" level="System">
  <title>Plan stored as local JSON file</title>
  <statement>Plans SHALL be stored as local JSON files. The plan file path is provided by the caller. Parent directories SHALL be created automatically if they don't exist. updated_at SHALL be set to current ISO8601 on every write operation.</statement>
  <rationale>From savePlan/loadPlan in JS.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a deeply nested path. When: create is called. Then: all parent directories are created and file is written. Given: any write. Then: updated_at is refreshed.</criteria>
  </acceptance>
</req>

### FR-PLAN-0026 Plan File On-Disk Formatting

<req id="FR-PLAN-0026" type="FR" level="System">
  <title>Plan file written pretty-formatted for human readability</title>
  <statement>The plan file written to the filesystem SHALL be pretty-formatted with indentation suitable for human readability. This applies to the plan file and its backup files (FR-PLAN-0024) and is independent of the command output payload formatting governed by FR-SHRD-0008.</statement>
  <rationale>Humans review and edit plan files manually; pretty formatting supports inspection, code review, and diff readability without affecting machine consumption (parsers are insensitive to whitespace).</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: any successful write of a plan file. When: the file is read back as text. Then: the JSON is multi-line with indentation. Given: a backup file produced by the write cycle. Then: the same formatting applies.</criteria>
  </acceptance>
</req>

### FR-PLAN-0024 Atomic Write with Mutex, Backup Chain, and Bounded Retry

<req id="FR-PLAN-0024" type="FR" level="System">
  <title>Atomic plan write with cross-process mutex, backup chain, and bounded retry</title>
  <statement>Every successful plan-file mutation SHALL execute the following cycle under cross-process mutual exclusion:

0. Acquire a cross-process exclusive mutex over the plan file. The mutex SHALL be implemented as an atomic-create primitive (e.g. `mkdir(2)` on a `<plan_file>.lock` directory, or an equivalent `O_CREAT|O_EXCL` file marker) — NOT as a rename or hardlink, both of which do not provide cross-process mutual exclusion (see "Concurrency primitive constraints" below). On EEXIST the writer SHALL back off briefly (jittered ~20 ms) and retry. A mutex held longer than 30 seconds SHALL be considered stale and MAY be reclaimed by another writer.
1. Read the current plan from the plan file (subject to FR-SHRD-0009 read resilience).
2. Apply the requested mutation in memory.
3. Compute the next backup name as `<plan_file>.bakNNN` where NNN is the lowest non-negative 3-digit-zero-padded integer greater than the highest existing matching backup index in the same directory.
4. Set the in-memory plan's `previous_version` field to the computed backup path.
5. Rename the plan file to the computed backup name. Inside the mutex this rename is contention-free and unambiguous (no other writer is in the cycle).
6. Write the new plan content to the plan file path. The on-disk format SHALL follow FR-PLAN-0026.
7. Prune backup files in the same directory so that no more than the configured retention count (default 5) remain. The most recent backups SHALL be kept; the oldest SHALL be deleted.
8. Release the mutex.

The cycle SHALL be wrapped in a bounded retry loop. Any failure within the cycle — including but not limited to mutex acquisition contention, a write error, or a post-mutation validation failure caused by a re-read race — SHALL restart the cycle from step 0 with a fresh mutex attempt and a fresh read. The retry loop SHALL NOT skip steps or attempt partial recovery. The retry loop SHALL be bounded to 50 attempts; on exhaustion the cycle SHALL return `backup_create_failed`.

**Concurrency primitive constraints (lessons learned, MUST NOT regress):**

- `fs.renameSync` (POSIX `rename(2)`) **overwrites** an existing destination silently. Two concurrent writers that pick the same `bakNNN` slot would both succeed and clobber each other's backup AND each other's just-written plan — a real, reproducible lost-write under multi-process load.
- `fs.linkSync` (POSIX `link(2)`) is atomic and fails with EEXIST on a taken destination, so it serializes claims of a specific destination name. It does NOT serialize the read-mutate-write cycle as a whole: two writers can both successfully hardlink the same source inode to two different bak names before either unlinks the source, after which the second writer's `unlinkSync` destroys the first writer's freshly-written inode — also a real, reproducible lost-write under multi-process load.
- Only an atomic-create primitive (mkdir of a lock directory, or O_CREAT|O_EXCL of a lock file) provides cross-process mutex semantics on POSIX without requiring an external service.

Implementations SHALL NOT use plain rename or plain hardlink as the cycle's exclusion primitive. A regression to either pattern SHALL be treated as a contract violation.</statement>
  <rationale>Multi-process AI agents legitimately write the same plan file concurrently (parallel subagents, retried tool calls). The cycle's prior incarnations using rename or hardlink were both proven to lose writes under real multi-process tests at modest concurrency (1/10 with rename, 3/30 with hardlink). A mkdir-based mutex serializes the cycle correctly, has no extra dependencies, and recovers from crashed holders via a stale-lock timeout. The `previous_version` field continues to form a backwards-traversable history that AI agents can use for recovery.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: a successful write. When: the filesystem is inspected. Then: a new `<plan_file>.bakNNN` file exists containing the pre-write plan, and the plan file contains the post-write plan with previous_version pointing to that backup. Given: 6 successive successful writes with retention=5. Then: exactly 5 backups remain; the oldest has been deleted. Given: N concurrent processes (N ≥ 10) each performing one upsert against the same plan file. When: all complete. Then: every process that reports success has its mutation present in the final plan (no lost writes); the final plan is valid JSON; the bak chain is well-formed; retention is enforced. Given: a writer crashes while holding the lock and a new writer attempts the cycle after the stale-lock timeout. Then: the new writer reclaims the lock and proceeds. Given: mutex contention exhausts 50 attempts. Then: returns `backup_create_failed`. Given: any write succeeds. Then: the plan's `previous_version` equals the path of the just-created backup.</criteria>
  </acceptance>
</req>

### FR-PLAN-0025 Concurrent Write Safety

<req id="FR-PLAN-0025" type="FR" level="System">
  <title>Safe concurrent writes without locking</title>
  <statement>Plan file writes SHALL be safe under concurrent invocation. The concurrency mechanism for plan writes is the rename-as-guard cycle defined in FR-PLAN-0024, which serializes writers via atomic rename and recovers via bounded restart. The shared optimistic-concurrency function (FR-SHRD-0006) SHALL NOT be used for plan writes; FR-PLAN-0024 supersedes it for this surface. On retry exhaustion the error code is `backup_create_failed` (FR-PLAN-0024), not `concurrent_write_conflict`.</statement>
  <rationale>Parallel subagents write to the same plan file simultaneously. FR-PLAN-0024 provides stronger guarantees (atomic guard + backup chain + crash-recovery resilience) than optimistic re-read; using one mechanism prevents drift and ambiguity about which error code surfaces when writes contend.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two concurrent upserts to the same plan file. When: both complete. Then: file is valid JSON, no data corruption, both mutations applied (one via restart). Given: the rename-as-guard cycle exhausts 50 attempts under sustained contention. Then: {error: "backup_create_failed"}. Given: any plan-file write path. When: inspected in source. Then: it routes through the FR-PLAN-0024 write cycle and does not call the FR-SHRD-0006 optimistic-concurrency function.</criteria>
  </acceptance>
</req>

## Error Handling

### FR-PLAN-0021 Structured Error Responses

<req id="FR-PLAN-0021" type="FR" level="System">
  <title>Known error codes</title>
  <statement>All plan errors SHALL be returned via the common output envelope (FR-ARCH-0011). Known error codes: plan_not_found (file missing), plan_file_corrupted (plan file exists but cannot be parsed as valid JSON), target_not_found (unknown ID), invalid_target (entire_plan in update_status), invalid_status (bad status value), missing_new_status (status parameter absent in update_status), missing_id (phase in array without id), phase_not_found (step targeting nonexistent phase), phase_status_is_derived (update_status targeting a phase), missing_phase_id (new step without phase_id), missing_kind (new item without kind), invalid_kind (wrong kind value), immutable_id (patch attempts to change id), duplicate_id (non-unique IDs after mutation), unknown_dependency (depends_on references non-existent ID), dependency_cycle (circular dependency detected), size_limit_exceeded (constants violated), invalid_data (malformed data payload), missing_data (absent data payload), invalid_limit (negative limit in next), concurrent_write_conflict (optimistic retry exhausted on concurrent access), backup_create_failed (rename-as-guard write cycle exhausted retries per FR-PLAN-0024), invalid_template (template name not found in the requested kind's collection — FR-PLAN-0030, FR-PLAN-0031), missing_template_param (template declares a placeholder for which no value was provided — FR-PLAN-0034), unexpected_template_param (caller provided a value with no matching declared placeholder, or template contains a placeholder token not in its declared set — FR-PLAN-0034), unknown_command (unrecognized subcommand — include_help=true, includes list of valid commands: create, next, update_status, show_status, query, upsert, create-with-template, upsert-with-template, list-templates).</statement>
  <rationale>Error codes from JS, Python, rosettify behaviors, atomic write cycle, and template subcommands.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: each error scenario. When: triggered. Then: common envelope returned with ok=false and error field containing the code. Given: unknown_command error. Then: include_help=true and the commands list includes create-with-template, upsert-with-template, and list-templates.</criteria>
  </acceptance>
</req>

## Defaults and No-Args Behavior

### FR-PLAN-0022 No-Args Shows Help

<req id="FR-PLAN-0022" type="FR" level="System">
  <title>No subcommand returns help</title>
  <statement>When the plan run delegate is called with no subcommand, it SHALL return the plan help content (FR-PLAN-0016, FR-PLAN-0017, FR-PLAN-0018).</statement>
  <rationale>From plan_manager.js no-args behavior.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: plan invoked with no subcommand. When: run delegate executes. Then: returns help content including subcommands list, schema, and plan authoring guidance per FR-PLAN-0016/0017/0018.</criteria>
  </acceptance>
</req>

### FR-PLAN-0023 Unknown Subcommand

<req id="FR-PLAN-0023" type="FR" level="System">
  <title>Unknown subcommand returns error with help enrichment</title>
  <statement>When an unknown subcommand is provided to plan, the run delegate SHALL return {ok: false, error: "unknown_command: <cmd> | valid: create, next, update_status, show_status, query, upsert, create-with-template, upsert-with-template, list-templates", include_help: true}.</statement>
  <rationale>From plan_manager.js unknown command behavior. include_help triggers help enrichment per FR-ARCH-0012.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: plan invoked with subcommand "explode". When: run delegate executes. Then: returns {ok: false, error: "unknown_command: explode | valid: create, next, update_status, show_status, query, upsert, create-with-template, upsert-with-template, list-templates", include_help: true}.</criteria>
  </acceptance>
</req>
