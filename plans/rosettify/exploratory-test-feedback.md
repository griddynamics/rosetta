# Rosettify MCP — Exploratory Test Feedback

**Date:** 2026-04-06  
**Tested:** `user-rosettify` MCP (rosettify v0.1.0)  
**Method:** Exploratory via MCP tool calls only, no external context loaded  
**Tools tested:** `help`, `plan` (all subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`)

---

## What Works Well

- **`help` (no args)** returns a clean top-level command listing with version.
- **`help plan`** returns detailed schema, subcommands, and output schema.
- **`plan` (no subcommand)** returns the comprehensive inline help doc — great UX, like running `git help`.
- **`plan create`** creates files correctly, auto-creates parent directories if missing.
- **`plan show_status`** shows progress percentages at plan, phase, and step level.
- **`plan next`** correctly gates steps behind phase dependencies and step-level `depends_on`.
- **`plan next` with `limit`** works as expected; `limit: 0` returns empty correctly.
- **`plan update_status`** on steps propagates status upward to phases and plan correctly.
- **`plan query`** works for `entire_plan`, phase ID, and step ID.
- **`plan upsert`** handles all levels (plan, phase, step), correctly strips status fields and notifies via `message`.
- **Dependency resolution** (`depends_on`) on both phases and steps works — `next` respects them.
- **Plan completion** — when all steps are done, `next` returns `plan_status: complete` and `count: 0`.
- **Error responses** are consistently `{ ok: false, error: "...", include_help: true/false }`.
- **`include_help: true`** on validation errors includes the command schema inline — helpful for AI agents.
- **Duplicate ID validation** — `create` correctly rejects plans with duplicate step/phase IDs.
- **Invalid JSON in `data`** — returns `invalid_data` error with a clear message.
- **Phase status is derived** — attempting `update_status` on a phase ID is correctly rejected.

---

## Issues Found

### Critical

**1. Silent overwrite on `create` for existing files**  
Calling `plan create` on a path that already holds a plan silently destroys it with no error or warning.

```
# First call creates a plan with 5 steps across 2 phases
plan create /tmp/test.json { phases: [...] }
# Second call silently nukes it
plan create /tmp/test.json { name: "New" }
# => { ok: true, name: "New" }  — original plan is gone
```

Expected: return `{ ok: false, error: "file_exists" }` or add an explicit `overwrite: true` parameter.

---

### Schema / Documentation

**2. `title` vs `name` inconsistency — plan root vs phases/steps**  
The plan root uses `name`; phases and steps use `title`. The inline help (`plan` without subcommand) claims the step schema requires `["id","name","prompt"]`, but in practice steps work fine with only `id` and `title` — no `prompt` required or enforced.

Impact: an agent reading the schema docs and using `name`/`prompt` on steps may be confused when the returned step objects show `title` instead.

Recommendation: unify field names (`name` everywhere, or `title` everywhere), and make the schema docs reflect actual behavior.

**3. Plan-level `id` field silently dropped on `create`**  
Passing `id` in the `data` object for `plan create` is silently ignored. The plan file has no root-level ID; identity is the file path. This is fine as a design choice but should be documented, and ideally a note in the error-or-result should mention it if an `id` field was passed.

**4. Help for unknown subcommand falls back silently**  
`help unknown_command` returns the top-level listing without indicating "unknown command: X".

```
help unknown_command => { ok: true, result: { commands: [...], guidance: "..." } }
```

Expected: `{ ok: false, error: "unknown_command: unknown_command" }` or at least include a note in the result.

---

### Data Quality

**5. Upserted phase shows both `name` and `title`**  
After upserting a new phase with `id: "phase-3"` and `data: { title: "Deployment" }`, querying it returns:

```json
{
  "id": "phase-3",
  "name": "phase-3",
  "title": "Deployment"
}
```

The `name` field appears to be incorrectly set from the `id`. This is redundant and inconsistent with other phases (which only have `title`).

**6. `create` result does not reflect `title` field**  
If the caller passes `title` instead of `name` for the plan root, the create response shows `name: "Unnamed Plan"` — no indication that the field was ignored.

```
plan create ... { title: "My Plan" }
=> { ok: true, name: "Unnamed Plan" }   # title silently ignored
```

Expected: return `{ ok: false, error: "invalid_field: use 'name' not 'title' for plan root" }` or normalize both field names.

---

### Error Handling

**7. `internal_error` exposes raw JS parse errors**  
When a plan file contains invalid JSON, the error leaks the underlying JavaScript parse exception:

```json
{ "error": "internal_error: Unexpected token 'c', \"corrupted json {{{\\n\" is not valid JSON" }
```

Expected: normalize to `{ "error": "invalid_plan_file: file contains invalid JSON" }`.

**8. Error code format inconsistency**  
Some errors are bare codes (`phase_status_is_derived`, `missing_phase_id`, `target_not_found`), while others include detail after a colon (`invalid_data: data is not valid JSON`, `internal_error: ...`). Should be consistent — either all bare codes (with detail in a separate field), or all `code: detail` strings.

**9. `phase_status_is_derived` error lacks actionable guidance**  
When an agent tries to set a phase status directly, the error is `phase_status_is_derived` with no `include_help`. An `include_help: true` with a message like "set step statuses instead; phase status is computed automatically" would be more useful.

---

### UX / Discoverability

**10. Empty plan (`next`) returns `plan_status: open`**  
A plan with no phases returns `{ ready: [], count: 0, plan_status: "open" }` from `next`. This is ambiguous — an agent cannot tell whether there are steps that aren't ready yet, or there's genuinely nothing defined. A dedicated `plan_empty: true` flag, or `plan_status: "complete"` for plans with no phases, would reduce confusion.

**11. `show_status` for a step omits `title`**  
Step-level `show_status` returns only `{ id, status, depends_on }`. Adding `title` (and optionally `description`) would make it easier to know what the step is without a separate `query` call.

**12. `create` success response has no next-steps hint**  
After successful plan creation, the response is `{ plan_file, name, status }` with no guidance on what to do next. Adding `"next": "use plan next <plan_file> to get ready steps"` or similar would help first-time users and AI agents.

**13. `upsert` generic help on `missing_kind`**  
When a new `target_id` is upserted without `kind`, the error is `missing_kind` and `include_help` provides the full `plan` command schema (not `upsert`-specific). A targeted error pointing only at the `upsert` subcommand docs would be less overwhelming.

---

---

### MCP-Specific Design

**14. Common response envelope is unnecessary in MCP mode**  
Every response is wrapped in `{ ok, result, error, include_help }`. This is a CLI convention, not an MCP one. In MCP, the transport protocol already handles success/failure signaling — a tool either returns a value or raises an MCP error. The envelope forces every caller to always unwrap `result` before using data, and `ok`/`include_help` duplicate what the protocol itself provides for free.

Recommendation: drop the envelope in MCP mode; return the result payload directly on success and raise a proper MCP error on failure.

**15. `help` tool — design intent is correct, but output has noise**  
The `help` tool exists intentionally: MCP tool descriptors are always loaded into the AI's context, so keeping them minimal avoids constant noise. The AI calls `help` on demand when it needs guidance. This is the right trade-off — do not remove it.

Two output problems that undermine the intent:

a) **`error: null` and `include_help: false` appear on every successful response.** Both are empty/always-false on success and add nothing. These envelope fields bleed into what should be clean signal output.

b) **`brief` and `description` say nearly the same thing.** In `help plan`: brief is `"Manage execution plans (create, query, update, upsert)"` and description is `"Manages two-level execution plans stored as JSON files. Subcommands: create, next, update_status, show_status, query, upsert."` — heavy overlap, one field suffices.

c) **Silent fallback on unknown command** — `help <unknown_command>` returns the top-level listing with no signal that the command wasn't found (see issue 4).

---

## Summary Table

| # | Area | Severity | Short description |
|---|------|----------|-------------------|
| 1 | Behavior | High | `create` silently overwrites existing plan — data loss |
| 2 | Schema/Docs | Medium | `title` vs `name` inconsistency; inaccurate schema in help |
| 3 | Schema/Docs | Low | Plan-level `id` silently dropped |
| 4 | UX | Low | `help <unknown>` gives no indication the command was unknown |
| 5 | Data | Medium | Upserted phase has spurious `name` field equal to its `id` |
| 6 | UX | Medium | Wrong field name (`title` at plan root) silently defaulted |
| 7 | Error | Medium | Raw JS parse error exposed in `internal_error` |
| 8 | Error | Low | Error code format is inconsistent |
| 9 | Error | Low | `phase_status_is_derived` lacks actionable guidance or help |
| 10 | UX | Low | Empty plan's `plan_status: open` from `next` is ambiguous |
| 11 | UX | Low | Step `show_status` omits `title` |
| 12 | UX | Low | `create` response lacks next-steps hint |
| 13 | UX | Low | `upsert` missing_kind shows full generic help, not targeted |
| 14 | MCP design | High | Common `{ok,result,error,include_help}` envelope is unnecessary in MCP mode |
| 15 | MCP design / UX | Low | `help` output has null noise fields (`error: null`, `include_help: false`) and brief/description overlap |

---

## Positive Notes

The overall design is solid. The two-level hierarchy (phases → steps), derived phase status, and the `next` command's priority order (in_progress → open with deps satisfied → blocked → failed) form a coherent execution model well-suited for AI agents. The inline help from calling `plan` without a subcommand is excellent — it contains everything needed to use the tool correctly without external docs.
