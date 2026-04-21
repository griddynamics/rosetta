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
  <statement>plan create SHALL accept a plan JSON object and a file path. It SHALL create the plan file with: status defaults (open for all phases/steps), depends_on defaults ([]), timestamps (created_at, updated_at set to current ISO8601), and default name "Unnamed Plan" when not provided. It SHALL create parent directories if they don't exist. All validations (unique IDs, dependencies, size limits, cycles) SHALL run before writing. Result: {plan_file, name, status}.</statement>
  <rationale>From cmdCreate. Validation gate from plan_manager.py.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: create with {name: "My Plan", phases: []}. When: executed. Then: file exists with status=open, created_at and updated_at set, result contains plan_file and name. Given: no name provided. Then: name="Unnamed Plan". Given: nested path that doesn't exist. Then: parent dirs are created.</criteria>
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
  <statement>plan upsert SHALL create or merge-patch plan, phase, or step by ID. Behaviors: (1) entire_plan with missing file: creates new plan with defaults. (2) entire_plan with existing file: merges top-level fields; merges phases array by ID (existing patched, new appended). (3) Existing phase/step ID: merge-patches that item; if patch contains steps array, merges steps by ID. (4) New ID with kind=phase: appends new phase. (5) New ID with kind=step + phase_id: appends step to that phase. (6) New ID without kind: rejected with `missing_kind`. (6a) New ID with kind other than "phase" or "step": rejected with `invalid_kind`. (7) Patch data with id field differing from target_id: rejected with `immutable_id`. (8) Missing or invalid data payload: rejected with `invalid_data` or `missing_data`. (9) Missing phase_id for new step: rejected with `missing_phase_id`. (10) Missing ID in phases array: rejected with `missing_id`. (11) Nonexistent phase_id for new step: rejected with `phase_not_found`. Merge follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced. Status fields in patch data SHALL be silently ignored — status is only modifiable via update_status (one step at a time after each task completion). If any status fields were stripped from the patch, the result SHALL include a single message field: "status fields ignored — use update_status to update status one-by-one after each task completion". All validations (unique IDs, dependencies, cycles, size limits) SHALL run after merge and before writing. Statuses are propagated after every upsert. updated_at is set on every save. Result: {id, plan_status, message?}.</statement>
  <rationale>Core merge logic from JS. Validation suite from plan_manager.py.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: upsert entire_plan on missing file. Then: file created with defaults. Given: upsert step-1a {name: "Renamed"}. Then: name updated, prompt preserved, status preserved. Given: upsert step-1a {status: "complete", name: "X"}. Then: status field ignored, name updated, result includes message field. Given: upsert with 3 steps containing status fields. Then: all status fields ignored, one message (not three). Given: upsert with null value. Then: key removed. Given: upsert phase array item without id. Then: {error: "missing_id"}. Given: upsert new step with phase_id pointing to nonexistent phase. Then: {error: "phase_not_found"}. Given: new ID without kind. Then: {error: "missing_kind"}. Given: patch with different id than target. Then: {error: "immutable_id"}. Given: malformed data. Then: {error: "invalid_data"}. Given: data parameter absent. Then: {error: "missing_data"}. Given: kind="unknown". Then: {error: "invalid_kind"}.</criteria>
  </acceptance>
</req>

### FR-PLAN-0016 Plan Help Content

<req id="FR-PLAN-0016" type="FR" level="System">
  <title>Help content registered for the plan command</title>
  <statement>The plan command SHALL register help content in the tool registry that the help system (FR-HELP-0002) returns when queried. The content SHALL include: plan_file convention, core concepts (hierarchy, statuses, depends_on, status_propagation, resume), subagent_fields (subagent, role, model on phases and steps), list of subcommands (create, next, update_status, show_status, query, upsert) each with usage and args, next_steps_for_ai, and plan authoring guidance: "the last step in each phase should verify all work in that phase was actually completed; the last phase should verify all work across the entire plan was completed".</statement>
  <rationale>AI agents need structured self-describing help to use the plan command correctly.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help plan. When: help run delegate executes. Then: returned content includes plan_file convention, core concepts, subagent_fields, subcommands list, plan authoring guidance, and next_steps_for_ai.</criteria>
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
  <title>Limits and examples registered for the plan command</title>
  <statement>The plan command's help content SHALL include: constants/limits (max phases, max steps, max deps, max string length, max name length per FR-PLAN-0005), and usage examples for each subcommand.</statement>
  <rationale>AI agents need limits to avoid validation errors and examples to construct correct invocations.</rationale>
  <source>Documentation</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: rosettify help plan. When: help run delegate executes. Then: returned content includes limits matching FR-PLAN-0005 constants and at least one example per subcommand.</criteria>
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

### FR-PLAN-0025 Concurrent Write Safety

<req id="FR-PLAN-0025" type="FR" level="System">
  <title>Safe concurrent writes without locking</title>
  <statement>Plan file writes SHALL use the shared optimistic concurrency function (FR-SHRD-0006).</statement>
  <rationale>Parallel subagents write to the same plan file simultaneously.</rationale>
  <source>User</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: two concurrent upserts to the same plan file. When: both complete. Then: file is valid JSON, no data corruption, both mutations applied or one retried. Given: file changed between read and write 4 times. Then: {error: "concurrent_write_conflict"}.</criteria>
  </acceptance>
</req>

## Error Handling

### FR-PLAN-0021 Structured Error Responses

<req id="FR-PLAN-0021" type="FR" level="System">
  <title>Known error codes</title>
  <statement>All plan errors SHALL be returned via the common output envelope (FR-ARCH-0011). Known error codes: plan_not_found (file missing), target_not_found (unknown ID), invalid_target (entire_plan in update_status), invalid_status (bad status value), missing_new_status (status parameter absent in update_status), missing_id (phase in array without id), phase_not_found (step targeting nonexistent phase), phase_status_is_derived (update_status targeting a phase), missing_phase_id (new step without phase_id), missing_kind (new item without kind), invalid_kind (wrong kind value), immutable_id (patch attempts to change id), duplicate_id (non-unique IDs after mutation), unknown_dependency (depends_on references non-existent ID), dependency_cycle (circular dependency detected), size_limit_exceeded (constants violated), invalid_data (malformed data payload), missing_data (absent data payload), invalid_limit (negative limit in next), concurrent_write_conflict (optimistic retry exhausted on concurrent access), unknown_command (unrecognized subcommand — include_help=true, includes list of valid commands: create, next, update_status, show_status, query, upsert).</statement>
  <rationale>Error codes from JS, Python, and new rosettify behaviors.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: each error scenario. When: triggered. Then: common envelope returned with ok=false and error field containing the code. Given: unknown_command error. Then: include_help=true and commands list present.</criteria>
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
  <statement>When an unknown subcommand is provided to plan, the run delegate SHALL return {ok: false, error: "unknown_command: <cmd> | valid: create, next, update_status, show_status, query, upsert", include_help: true}.</statement>
  <rationale>From plan_manager.js unknown command behavior. include_help triggers help enrichment per FR-ARCH-0012.</rationale>
  <source>Sources</source>
  <ticketId>CTORNDGAIN-1333</ticketId>
  <priority>Must</priority>
  <status>Approved</status>
  <verification>Test</verification>
  <acceptance>
    <criteria>Given: plan invoked with subcommand "explode". When: run delegate executes. Then: returns {ok: false, error: "unknown_command: explode | valid: create, next, update_status, show_status, query, upsert", include_help: true}.</criteria>
  </acceptance>
</req>
