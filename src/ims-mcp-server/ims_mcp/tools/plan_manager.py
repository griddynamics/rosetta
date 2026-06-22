"""plan_manager tool — create, track and query execution plans.

Plans are stored as JSON with two levels: phases contain steps.
All mutations propagate effective statuses bottom-up so the stored document
is always consistent.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, TypeAlias, cast

from ims_mcp.constants import (
    PLAN_MAX_DEPENDENCIES_PER_ITEM,
    PLAN_MAX_NAME_LENGTH,
    PLAN_MAX_PHASES,
    PLAN_MAX_STEPS_PER_PHASE,
    PLAN_MAX_STRING_LENGTH,
    VALID_PLAN_STATUSES,
)
from ims_mcp.services.plan_store import PlanStore

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_SENTINEL = object()
PlanObject: TypeAlias = dict[str, Any]
PlanItem: TypeAlias = PlanObject
PlanItemList: TypeAlias = list[PlanItem]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _err(code: str, message: str) -> str:
    return f"Error: {message}"


def _ok(data: PlanObject) -> str:
    return json.dumps(data)


# ---------------------------------------------------------------------------
# RFC 7396 JSON Merge Patch
# ---------------------------------------------------------------------------

def _merge_patch(target: object, patch: object) -> object:
    """Apply RFC 7396 merge patch.  null values remove keys from dicts."""
    if not isinstance(patch, dict):
        return patch
    if not isinstance(target, dict):
        target = {}
    result = dict(cast(dict[str, object], target))
    for key, value in cast(dict[str, object], patch).items():
        if value is None:
            result.pop(key, None)
        else:
            result[key] = _merge_patch(result.get(key, _SENTINEL), value)
    return result


def _merge_by_id(existing: PlanItemList, incoming: PlanItemList) -> PlanItemList | str:
    """Merge two lists of dicts by their 'id' field (RFC 7396 per item).

    Returns the merged list or an error string if any item lacks an 'id'.
    Existing items absent from *incoming* are preserved.
    New items from *incoming* are appended.
    """
    for item in incoming:
        if "id" not in item or item["id"] is None:
            return "missing_id"
    existing_map: dict[str, PlanItem] = {
        str(item["id"]): item for item in existing if "id" in item and isinstance(item["id"], str)
    }
    result: PlanItemList = list(existing)
    for patch_item in incoming:
        item_id = patch_item["id"]
        if item_id in existing_map:
            # Find and update in-place in result list
            for i, r in enumerate(result):
                if r.get("id") == item_id:
                    result[i] = cast(PlanItem, _merge_patch(r, patch_item))
                    break
        else:
            result.append(dict(patch_item))
    return result


# ---------------------------------------------------------------------------
# Status helpers
# ---------------------------------------------------------------------------

def _compute_status_from_children(statuses: list[str]) -> str:
    # Priority: complete > failed > blocked > in_progress > open
    if not statuses:
        return "open"
    if all(s == "complete" for s in statuses):
        return "complete"
    if any(s == "failed" for s in statuses):
        return "failed"
    if any(s == "blocked" for s in statuses):
        return "blocked"
    if any(s in ("in_progress", "complete") for s in statuses):
        return "in_progress"
    return "open"


def _propagate_statuses(plan: PlanObject) -> None:
    """Recompute and store effective statuses bottom-up across the plan."""
    phase_statuses = []
    for phase in plan.get("phases", []):
        step_statuses = [step.get("status", "open") for step in phase.get("steps", [])]
        if step_statuses:
            phase["status"] = _compute_status_from_children(step_statuses)
        phase_statuses.append(phase.get("status", "open"))
    if phase_statuses:
        plan["status"] = _compute_status_from_children(phase_statuses)


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

def _find_phase(plan: PlanObject, phase_id: str) -> PlanItem | None:
    for phase in plan.get("phases", []):
        if phase.get("id") == phase_id:
            return cast(PlanItem, phase)
    return None


def _find_step(plan: PlanObject, step_id: str) -> tuple[PlanItem, PlanItem] | None:
    """Return (phase, step) for the given step_id, or None."""
    for phase in plan.get("phases", []):
        for step in phase.get("steps", []):
            if step.get("id") == step_id:
                return phase, step
    return None


def _build_step_status_map(plan: PlanObject) -> dict[str, str]:
    return {
        step["id"]: step.get("status", "open")
        for phase in plan.get("phases", [])
        for step in phase.get("steps", [])
        if "id" in step
    }


def _build_phase_status_map(plan: PlanObject) -> dict[str, str]:
    return {
        phase["id"]: phase.get("status", "open")
        for phase in plan.get("phases", [])
        if "id" in phase
    }


def _deps_satisfied(item: PlanItem, status_map: dict[str, str]) -> bool:
    return all(status_map.get(dep) == "complete" for dep in item.get("depends_on", []))


def _validate_plan_name(plan_name: str) -> str | None:
    if not isinstance(plan_name, str) or not plan_name.strip():
        return "invalid_plan_name"
    if len(plan_name) > PLAN_MAX_NAME_LENGTH:
        return "size_limit_exceeded"
    return None


def _validate_non_negative_limit(limit: int) -> str | None:
    if limit < 0:
        return "invalid_limit"
    return None


def _validate_immutable_id(target_id: str, data: PlanItem) -> str | None:
    incoming_id = data.get("id")
    if incoming_id is not None and incoming_id != target_id:
        return "immutable_id"
    return None


def _validate_unique_ids(plan: PlanObject) -> str | None:
    seen: set[str] = set()
    for phase in plan.get("phases", []):
        phase_id = phase.get("id")
        if phase_id is not None:
            if phase_id in seen:
                return "duplicate_id"
            seen.add(phase_id)
        for step in phase.get("steps", []):
            step_id = step.get("id")
            if step_id is not None:
                if step_id in seen:
                    return "duplicate_id"
                seen.add(step_id)
    return None


def _detect_cycle(graph: dict[str, list[str]]) -> bool:
    visiting: set[str] = set()
    visited: set[str] = set()

    def walk(node: str) -> bool:
        if node in visited:
            return False
        if node in visiting:
            return True
        visiting.add(node)
        for dep in graph.get(node, []):
            if walk(dep):
                return True
        visiting.remove(node)
        visited.add(node)
        return False

    return any(walk(node) for node in graph)


def _validate_dependencies(plan: PlanObject) -> str | None:
    phase_ids = {phase["id"] for phase in plan.get("phases", []) if "id" in phase}
    step_ids = {
        step["id"]
        for phase in plan.get("phases", [])
        for step in phase.get("steps", [])
        if "id" in step
    }

    phase_graph: dict[str, list[str]] = {}
    step_graph: dict[str, list[str]] = {}

    for phase in plan.get("phases", []):
        phase_id = phase.get("id")
        phase_deps = phase.get("depends_on", [])
        if len(phase_deps) > PLAN_MAX_DEPENDENCIES_PER_ITEM:
            return "size_limit_exceeded"
        if phase_id is not None:
            phase_graph[phase_id] = list(phase_deps)
        for dep in phase_deps:
            if dep not in phase_ids:
                return "unknown_dependency"
        for step in phase.get("steps", []):
            step_id = step.get("id")
            step_deps = step.get("depends_on", [])
            if len(step_deps) > PLAN_MAX_DEPENDENCIES_PER_ITEM:
                return "size_limit_exceeded"
            if step_id is not None:
                step_graph[step_id] = list(step_deps)
            for dep in step_deps:
                if dep not in step_ids:
                    return "unknown_dependency"

    if _detect_cycle(phase_graph) or _detect_cycle(step_graph):
        return "dependency_cycle"
    return None


def _sanitize_patch_data(data: PlanItem, expected_kind: str | None = None) -> PlanItem | str:
    kind = data.get("kind")
    if expected_kind is not None and kind not in (None, expected_kind):
        return "invalid_kind"
    return {k: v for k, v in data.items() if k != "kind"}


def _finalize_updated_plan(plan: PlanObject) -> PlanObject | str:
    size_error = _validate_size_limits(plan)
    if size_error is not None:
        return size_error
    duplicate_error = _validate_unique_ids(plan)
    if duplicate_error is not None:
        return duplicate_error
    dependency_error = _validate_dependencies(plan)
    if dependency_error is not None:
        return dependency_error
    _propagate_statuses(plan)
    return plan


def _parse_data_payload(data: PlanItem | str | None) -> PlanItem | str | None:
    if data is None or isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            return "invalid_data"
        if not isinstance(parsed, dict):
            return "invalid_data"
        return cast(PlanItem, parsed)
    return "invalid_data"


def _validate_size_limits(plan: PlanObject) -> str | None:
    phases = plan.get("phases", [])
    if len(phases) > PLAN_MAX_PHASES:
        return "size_limit_exceeded"

    def walk(value: object) -> str | None:
        if isinstance(value, str) and len(value) > PLAN_MAX_STRING_LENGTH:
            return "size_limit_exceeded"
        if isinstance(value, dict):
            for nested in cast(dict[str, object], value).values():
                err = walk(nested)
                if err is not None:
                    return err
        elif isinstance(value, list):
            for nested in cast(list[object], value):
                err = walk(nested)
                if err is not None:
                    return err
        return None

    for phase in phases:
        if len(phase.get("steps", [])) > PLAN_MAX_STEPS_PER_PHASE:
            return "size_limit_exceeded"
    return walk(plan)


# ---------------------------------------------------------------------------
# Command: upsert
# ---------------------------------------------------------------------------

def cmd_upsert(
    plan: PlanObject | None,
    target_id: str,
    data: PlanItem,
    now: str,
) -> tuple[PlanObject, str] | str:
    """Return (updated_plan, key_suffix) or error string."""

    if target_id == "entire_plan":
        if data.get("kind") is not None:
            return "invalid_kind"
        if plan is None:
            # Create new plan
            base: PlanObject = {
                "name": "Unnamed Plan",
                "description": "",
                "status": "open",
                "created_at": now,
                "updated_at": now,
                "phases": [],
            }
            merged = cast(PlanObject, _merge_patch(base, data))
            # Merge phases by id if provided
            if "phases" in data and isinstance(data["phases"], list):
                result = _merge_by_id([], cast(PlanItemList, data["phases"]))
                if result == "missing_id":
                    return "missing_id"
                assert not isinstance(result, str)
                # Also validate step ids within each phase
                for phase in result:
                    if isinstance(phase.get("steps"), list):
                        step_check = _merge_by_id([], cast(PlanItemList, phase["steps"]))
                        if step_check == "missing_id":
                            return "missing_id"
                merged["phases"] = result
            # Ensure defaults on all phases/steps
            for phase in merged.get("phases", []):
                phase.setdefault("status", "open")
                phase.setdefault("depends_on", [])
                phase.setdefault("steps", [])
                for step in phase.get("steps", []):
                    step.setdefault("status", "open")
                    step.setdefault("depends_on", [])
            merged["created_at"] = now
            merged["updated_at"] = now
        else:
            # Patch existing plan
            merged = dict(plan)
            merged["updated_at"] = now
            if "phases" in data and isinstance(data["phases"], list):
                existing_phases = cast(PlanItemList, plan.get("phases", []))
                result = _merge_by_id(existing_phases, cast(PlanItemList, data["phases"]))
                if result == "missing_id":
                    return "missing_id"
                assert not isinstance(result, str)
                # For each patched/new phase, also merge its steps
                merged_phases: PlanItemList = []
                for phase in result:
                    orig_phase = _find_phase(plan, phase.get("id", "")) or {}
                    if "steps" in phase and isinstance(phase.get("steps"), list):
                        step_result = _merge_by_id(
                            cast(PlanItemList, orig_phase.get("steps", [])),
                            cast(PlanItemList, phase["steps"]),
                        )
                        if step_result == "missing_id":
                            return "missing_id"
                        assert not isinstance(step_result, str)
                        phase = dict(phase)
                        phase["steps"] = step_result
                    merged_phases.append(phase)
                # Patch remaining top-level fields
                patch_without_phases = {k: v for k, v in data.items() if k != "phases"}
                merged = cast(PlanObject, _merge_patch(merged, patch_without_phases))
                merged["phases"] = merged_phases
                merged["updated_at"] = now
            else:
                merged = cast(PlanObject, _merge_patch(merged, data))
                merged["updated_at"] = now
        finalized = _finalize_updated_plan(merged)
        if isinstance(finalized, str):
            return finalized
        return merged, "entire_plan"

    if plan is None:
        return "plan_not_found"

    # Phase-level upsert
    found_phase = _find_phase(plan, target_id)
    if found_phase is not None:
        patch_data = _sanitize_patch_data(data, expected_kind="phase")
        if isinstance(patch_data, str):
            return patch_data
        immutable_id_error = _validate_immutable_id(target_id, patch_data)
        if immutable_id_error is not None:
            return immutable_id_error
        updated_plan = dict(plan)
        updated_phases: PlanItemList = []
        for p in updated_plan.get("phases", []):
            if p.get("id") == target_id:
                if "steps" in patch_data and isinstance(patch_data["steps"], list):
                    step_result = _merge_by_id(
                        cast(PlanItemList, p.get("steps", [])),
                        cast(PlanItemList, patch_data["steps"]),
                    )
                    if step_result == "missing_id":
                        return "missing_id"
                    assert not isinstance(step_result, str)
                    patch_without_steps = {k: v for k, v in patch_data.items() if k != "steps"}
                    patched = cast(PlanItem, _merge_patch(p, patch_without_steps))
                    patched["steps"] = step_result
                else:
                    patched = cast(PlanItem, _merge_patch(p, patch_data))
                updated_phases.append(patched)
            else:
                updated_phases.append(p)
        updated_plan["phases"] = updated_phases
        updated_plan["updated_at"] = now
        finalized = _finalize_updated_plan(updated_plan)
        if isinstance(finalized, str):
            return finalized
        return updated_plan, target_id

    # Step-level upsert
    found = _find_step(plan, target_id)
    if found is not None:
        patch_data = _sanitize_patch_data(data, expected_kind="step")
        if isinstance(patch_data, str):
            return patch_data
        immutable_id_error = _validate_immutable_id(target_id, patch_data)
        if immutable_id_error is not None:
            return immutable_id_error
        parent_phase, _ = found
        updated_plan = dict(plan)
        step_updated_phases: PlanItemList = []
        for p in updated_plan.get("phases", []):
            if p.get("id") == parent_phase.get("id"):
                new_steps: PlanItemList = []
                for s in p.get("steps", []):
                    if s.get("id") == target_id:
                        new_steps.append(cast(PlanItem, _merge_patch(s, patch_data)))
                    else:
                        new_steps.append(s)
                p = dict(p)
                p["steps"] = new_steps
            step_updated_phases.append(p)
        updated_plan["phases"] = step_updated_phases
        updated_plan["updated_at"] = now
        finalized = _finalize_updated_plan(updated_plan)
        if isinstance(finalized, str):
            return finalized
        return updated_plan, target_id

    # target_id not found as phase or step — require explicit creation kind.
    kind = data.get("kind")
    if kind not in ("phase", "step"):
        if kind is None:
            return "missing_kind"
        return "invalid_kind"

    if kind == "step":
        # New step
        phase_id = data.get("phase_id")
        if phase_id is None:
            return "missing_phase_id"
        if not isinstance(phase_id, str):
            return "missing_phase_id"
        parent = _find_phase(plan, phase_id)
        if parent is None:
            return "phase_not_found"
        new_step = {k: v for k, v in data.items() if k not in {"phase_id", "kind"}}
        new_step["id"] = target_id
        new_step.setdefault("status", "open")
        new_step.setdefault("depends_on", [])
        updated_plan = dict(plan)
        created_step_phases: PlanItemList = []
        for p in updated_plan.get("phases", []):
            if p.get("id") == phase_id:
                p = dict(p)
                p["steps"] = list(cast(PlanItemList, p.get("steps", []))) + [new_step]
            created_step_phases.append(p)
        updated_plan["phases"] = created_step_phases
        updated_plan["updated_at"] = now
        finalized = _finalize_updated_plan(updated_plan)
        if isinstance(finalized, str):
            return finalized
        return updated_plan, target_id

    if "phase_id" in data:
        return "invalid_kind"
    return _upsert_new_phase(plan, target_id, data, now)



def _upsert_new_phase(plan: PlanObject, target_id: str, data: PlanItem, now: str) -> tuple[PlanObject, str] | str:
    """Append a new phase to the plan."""
    new_phase = {k: v for k, v in data.items() if k != "kind"}
    new_phase["id"] = target_id
    new_phase.setdefault("name", target_id)
    new_phase.setdefault("description", "")
    new_phase.setdefault("status", "open")
    new_phase.setdefault("steps", [])
    new_phase.setdefault("depends_on", [])
    # Validate steps if provided
    if isinstance(new_phase.get("steps"), list):
        for step in new_phase["steps"]:
            step.setdefault("status", "open")
            step.setdefault("depends_on", [])
    updated_plan = dict(plan)
    updated_plan["phases"] = list(cast(PlanItemList, plan.get("phases", []))) + [new_phase]
    updated_plan["updated_at"] = now
    finalized = _finalize_updated_plan(updated_plan)
    if isinstance(finalized, str):
        return finalized
    return updated_plan, target_id


# ---------------------------------------------------------------------------
# Command: query
# ---------------------------------------------------------------------------

def cmd_query(plan: PlanObject, target_id: str) -> str:
    if target_id == "entire_plan":
        return json.dumps(plan)
    phase = _find_phase(plan, target_id)
    if phase is not None:
        return json.dumps(phase)
    found = _find_step(plan, target_id)
    if found is not None:
        _, step = found
        return json.dumps(step)
    return _err("target_not_found", f"No phase or step with id '{target_id}'")


# ---------------------------------------------------------------------------
# Command: show_status
# ---------------------------------------------------------------------------

def _step_summary(step: PlanItem) -> PlanObject:
    return {"id": step.get("id"), "name": step.get("name", step.get("id")), "status": step.get("status", "open")}


def _phase_summary(phase: PlanItem) -> PlanObject:
    steps = phase.get("steps", [])
    return {
        "id": phase.get("id"),
        "name": phase.get("name", phase.get("id")),
        "status": phase.get("status", "open"),
        "steps": [_step_summary(s) for s in steps],
    }


def _totals(statuses: list[str]) -> dict[str, float]:
    t: dict[str, float] = {s: 0 for s in VALID_PLAN_STATUSES}
    for s in statuses:
        t[s] = t.get(s, 0) + 1
    total = len(statuses)
    complete = t.get("complete", 0)
    t["total"] = total
    t["progress_pct"] = round(complete / total * 100, 1) if total else 0.0
    return t


def cmd_show_status(plan: PlanObject, target_id: str) -> str:
    if target_id == "entire_plan":
        all_step_statuses = [
            step.get("status", "open")
            for phase in plan.get("phases", [])
            for step in phase.get("steps", [])
        ]
        phase_statuses = [phase.get("status", "open") for phase in plan.get("phases", [])]
        step_totals = _totals(all_step_statuses)
        phase_totals = _totals(phase_statuses)
        return json.dumps({
            "name": plan.get("name"),
            "status": plan.get("status", "open"),
            "step_progress_pct": step_totals["progress_pct"],
            "phase_progress_pct": phase_totals["progress_pct"],
            "step_totals": step_totals,
            "phase_totals": phase_totals,
            "phases": [_phase_summary(p) for p in plan.get("phases", [])],
        })

    phase = _find_phase(plan, target_id)
    if phase is not None:
        step_statuses = [s.get("status", "open") for s in phase.get("steps", [])]
        step_totals = _totals(step_statuses)
        return json.dumps({
            "id": phase.get("id"),
            "name": phase.get("name", phase.get("id")),
            "status": phase.get("status", "open"),
            "step_progress_pct": step_totals["progress_pct"],
            "step_totals": step_totals,
            "steps": [_step_summary(s) for s in phase.get("steps", [])],
        })

    found = _find_step(plan, target_id)
    if found is not None:
        _, step = found
        result: PlanObject = {
            "id": step.get("id"),
            "name": step.get("name", step.get("id")),
            "status": step.get("status", "open"),
            "depends_on": step.get("depends_on", []),
        }
        for f in _OPTIONAL_FIELDS:
            if step.get(f):
                result[f] = step[f]
        return json.dumps(result)

    return _err("target_not_found", f"No phase or step with id '{target_id}'")


# ---------------------------------------------------------------------------
# Command: update_status
# ---------------------------------------------------------------------------

def cmd_update_status(plan: PlanObject, target_id: str, new_status: str, now: str) -> tuple[PlanObject, str] | str:
    """Update status and propagate UPWARD only.

    - step update  → recompute parent phase from its steps → recompute plan from phases
    - phase update → keep explicit phase status, recompute plan from phases only
    - entire_plan  → rejected; plan root status is derived
    """
    if new_status not in VALID_PLAN_STATUSES:
        return "invalid_status"

    if target_id == "entire_plan":
        return "invalid_target"

    phase = _find_phase(plan, target_id)
    if phase is not None:
        # Set phase status explicitly; propagate plan status from phases (upward only).
        updated = dict(plan)
        updated["phases"] = [
            dict(p, status=new_status) if p.get("id") == target_id else p
            for p in plan.get("phases", [])
        ]
        updated["updated_at"] = now
        # Propagate upward: recompute plan status from (now-updated) phase statuses
        phase_statuses = [p.get("status", "open") for p in updated["phases"]]
        updated["status"] = _compute_status_from_children(phase_statuses)
        return updated, new_status

    found = _find_step(plan, target_id)
    if found is not None:
        parent_phase, _ = found
        updated = dict(plan)
        updated_phases = []
        for p in plan.get("phases", []):
            if p.get("id") == parent_phase.get("id"):
                p = dict(p)
                p["steps"] = [
                    dict(s, status=new_status) if s.get("id") == target_id else s
                    for s in p.get("steps", [])
                ]
                # Recompute phase status from its (now-updated) steps
                step_statuses = [s.get("status", "open") for s in p["steps"]]
                p["status"] = _compute_status_from_children(step_statuses)
            updated_phases.append(p)
        updated["phases"] = updated_phases
        updated["updated_at"] = now
        # Propagate upward: recompute plan status from phases
        phase_statuses = [p.get("status", "open") for p in updated["phases"]]
        updated["status"] = _compute_status_from_children(phase_statuses)
        return updated, new_status

    return "target_not_found"


# ---------------------------------------------------------------------------
# Command: next
# ---------------------------------------------------------------------------

def cmd_next(plan: PlanObject, target_id: str, limit: int) -> str:
    step_status_map = _build_step_status_map(plan)
    phase_status_map = _build_phase_status_map(plan)
    ready: list[PlanObject] = []

    phases = plan.get("phases", [])

    # When target_id is a specific step: check just that step
    if target_id not in ("entire_plan",) and _find_phase(plan, target_id) is None:
        found = _find_step(plan, target_id)
        if found is None:
            return _err("target_not_found", f"No phase or step with id '{target_id}'")
        parent_phase, step = found
        # Check phase deps
        if not _deps_satisfied(parent_phase, phase_status_map):
            return json.dumps([])
        if parent_phase.get("status") in ("complete", "failed", "blocked"):
            return json.dumps([])
        if step.get("status", "open") == "open" and _deps_satisfied(step, step_status_map):
            ready.append(_step_entry(parent_phase, step))
        return json.dumps(ready)

    for phase in phases:
        # Filter to target phase if requested
        if target_id != "entire_plan" and phase.get("id") != target_id:
            continue
        # Skip if phase deps not satisfied
        if not _deps_satisfied(phase, phase_status_map):
            continue
        # Skip phases that cannot yield ready work.
        if phase.get("status") in ("complete", "failed", "blocked"):
            continue
        for step in phase.get("steps", []):
            if step.get("status", "open") != "open":
                continue
            if _deps_satisfied(step, step_status_map):
                ready.append(_step_entry(phase, step))
                if limit and len(ready) >= limit:
                    return json.dumps(ready)

    return json.dumps(ready)


_OPTIONAL_FIELDS = ("subagent", "role", "model")


def _step_entry(phase: PlanItem, step: PlanItem) -> PlanObject:
    entry: PlanObject = {
        "phase_id": phase.get("id"),
        "phase_name": phase.get("name", phase.get("id")),
        "step_id": step.get("id"),
        "step_name": step.get("name", step.get("id")),
        "prompt": step.get("prompt", ""),
    }
    for f in _OPTIONAL_FIELDS:
        if step.get(f):
            entry[f] = step[f]
        if phase.get(f):
            entry[f"phase_{f}"] = phase[f]
    return entry


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def plan_manager_tool(
    command: str,
    plan_name: str,
    target_id: str,
    data: PlanItem | str | None,
    new_status: str | None,
    limit: int,
    store: PlanStore,
) -> str:
    # ---- help: stateless, no validation needed ----
    if command == "help":
        from ims_mcp.tool_prompts import PROMPT_PLAN_MANAGER_HELP
        return PROMPT_PLAN_MANAGER_HELP

    plan_name_error = _validate_plan_name(plan_name)
    if plan_name_error is not None:
        if plan_name_error == "size_limit_exceeded":
            return _err(plan_name_error, f"plan_name must be at most {PLAN_MAX_NAME_LENGTH} characters")
        return _err(plan_name_error, "plan_name must be a non-empty string")
    key = f"plan:{plan_name}"

    # ---- query / show_status / next: read-only ----
    if command == "query":
        plan = await store.get(key)
        if plan is None:
            return _err("plan_not_found", f"Plan '{plan_name}' not found")
        return cmd_query(plan, target_id)

    if command == "show_status":
        plan = await store.get(key)
        if plan is None:
            return _err("plan_not_found", f"Plan '{plan_name}' not found")
        return cmd_show_status(plan, target_id)

    if command == "next":
        plan = await store.get(key)
        if plan is None:
            return _err("plan_not_found", f"Plan '{plan_name}' not found")
        limit_error = _validate_non_negative_limit(limit)
        if limit_error is not None:
            return _err(limit_error, "limit must be >= 0")
        return cmd_next(plan, target_id, limit)

    # ---- upsert ----
    if command == "upsert":
        parsed_data = _parse_data_payload(data)
        if parsed_data == "invalid_data":
            return _err("invalid_data", "data must be a JSON object or JSON object string")
        if parsed_data is None:
            return _err("missing_data", "upsert requires 'data'")
        assert isinstance(parsed_data, dict)
        plan = await store.get(key)
        now = _now_iso()
        result = cmd_upsert(plan, target_id, parsed_data, now)
        if isinstance(result, str):
            # error code
            messages = {
                "dependency_cycle": "Dependency graph contains a cycle",
                "duplicate_id": "IDs must be unique across phases and steps within a plan",
                "invalid_data": "data must be a JSON object or JSON object string",
                "invalid_kind": "Use data.kind='phase' or data.kind='step' when creating a new item",
                "immutable_id": "Cannot change the 'id' of an existing phase or step",
                "missing_kind": "Creating a new phase or step requires explicit data.kind",
                "missing_id": "Array item is missing required 'id' field",
                "missing_phase_id": "New step upsert requires 'phase_id' in data",
                "phase_not_found": f"Parent phase '{parsed_data.get('phase_id')}' not found in plan",
                "plan_not_found": f"Plan '{plan_name}' not found; use target_id='entire_plan' to create it",
                "size_limit_exceeded": "Input exceeds plan size limits",
                "target_not_found": f"Phase or step '{target_id}' not found in plan",
                "unknown_dependency": "All depends_on references must point to existing IDs of the correct type",
            }
            return _err(result, messages.get(result, result))
        updated_plan, resolved_target = result
        await store.set(key, updated_plan)
        return _ok({"ok": True, "key": key, "target_id": resolved_target})

    # ---- update_status ----

    if command == "update_status":
        if not new_status:
            return _err("missing_new_status", "update_status requires 'new_status'")
        plan = await store.get(key)
        if plan is None:
            return _err("plan_not_found", f"Plan '{plan_name}' not found")
        now = _now_iso()
        result = cmd_update_status(plan, target_id, new_status, now)
        if isinstance(result, str):
            messages = {
                "invalid_status": f"'{new_status}' is not a valid status. Valid: {sorted(VALID_PLAN_STATUSES)}",
                "invalid_target": "update_status supports phase IDs and step IDs; plan root status is derived",
                "target_not_found": f"No phase or step with id '{target_id}'",
            }
            return _err(result, messages.get(result, result))
        updated_plan, resolved_status = result
        await store.set(key, updated_plan)
        return _ok({"ok": True, "target_id": target_id, "new_status": resolved_status})

    return _err("invalid_command", f"Unknown command '{command}'. Valid: help, upsert, query, show_status, update_status, next")
