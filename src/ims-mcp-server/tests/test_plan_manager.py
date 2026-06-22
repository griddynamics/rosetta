"""Comprehensive unit tests for plan_manager tool and plan_store service.

Tests cover both MemoryPlanStore (in-memory) and RedisPlanStore (with mock backend).
No actual Redis server required for tests - RedisPlanStore tests use FakeRedisBackend.
"""

from __future__ import annotations

import json
import time
import pytest

from ims_mcp.services.plan_store import MemoryPlanStore, RedisPlanStore, build_plan_store
from ims_mcp.tools.plan_manager import (
    _merge_patch,
    _merge_by_id,
    _propagate_statuses,
    _find_phase,
    _find_step,
    _deps_satisfied,
    cmd_query,
    cmd_show_status,
    cmd_update_status,
    cmd_next,
    plan_manager_tool,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

NOW = "2026-01-01T00:00:00+00:00"


def make_store(ttl: int = 3600) -> MemoryPlanStore:
    return MemoryPlanStore(ttl_seconds=ttl)


def assert_error(resp: str, message: str) -> None:
    assert resp == f"Error: {message}"


def minimal_plan() -> dict:
    return {
        "name": "Test Plan",
        "description": "desc",
        "status": "open",
        "created_at": NOW,
        "updated_at": NOW,
        "phases": [],
    }


def full_plan() -> dict:
    return {
        "name": "Full Plan",
        "description": "A full plan",
        "status": "open",
        "created_at": NOW,
        "updated_at": NOW,
        "phases": [
            {
                "id": "phase-1",
                "name": "Phase One",
                "description": "First phase",
                "status": "open",
                "depends_on": [],
                "steps": [
                    {
                        "id": "step-1a",
                        "name": "Step 1A",
                        "prompt": "Do 1A",
                        "status": "open",
                        "depends_on": [],
                        "model": "sonnet",
                    },
                    {
                        "id": "step-1b",
                        "name": "Step 1B",
                        "prompt": "Do 1B",
                        "status": "open",
                        "depends_on": ["step-1a"],
                    },
                ],
            },
            {
                "id": "phase-2",
                "name": "Phase Two",
                "description": "Second phase",
                "status": "open",
                "depends_on": ["phase-1"],
                "steps": [
                    {
                        "id": "step-2a",
                        "name": "Step 2A",
                        "prompt": "Do 2A",
                        "status": "open",
                        "depends_on": [],
                    }
                ],
            },
        ],
    }


# ---------------------------------------------------------------------------
# MemoryPlanStore tests
# ---------------------------------------------------------------------------

class TestMemoryPlanStore:
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        store = make_store()
        await store.set("plan:x", {"name": "X"})
        result = await store.get("plan:x")
        assert result == {"name": "X"}

    @pytest.mark.asyncio
    async def test_get_missing_returns_none(self):
        store = make_store()
        assert await store.get("plan:missing") is None

    @pytest.mark.asyncio
    async def test_expiry_returns_none(self):
        store = make_store(ttl=1)
        await store.set("plan:x", {"name": "X"})
        # Manually expire
        store._store["plan:x"]["expires_at"] = time.monotonic() - 1
        assert await store.get("plan:x") is None

    @pytest.mark.asyncio
    async def test_set_refreshes_ttl(self):
        store = make_store(ttl=3600)
        await store.set("plan:x", {"v": 1})
        old_expiry = store._store["plan:x"]["expires_at"]
        time.sleep(0.01)
        await store.set("plan:x", {"v": 2})
        new_expiry = store._store["plan:x"]["expires_at"]
        assert new_expiry > old_expiry
        assert (await store.get("plan:x"))["v"] == 2

    @pytest.mark.asyncio
    async def test_sweep_on_write_removes_expired(self):
        store = make_store(ttl=1)
        await store.set("plan:a", {"v": "a"})
        await store.set("plan:b", {"v": "b"})
        # Expire plan:a
        store._store["plan:a"]["expires_at"] = time.monotonic() - 1
        assert len(store) == 2
        # Writing plan:c triggers sweep
        await store.set("plan:c", {"v": "c"})
        assert len(store) == 2  # plan:a removed, plan:b + plan:c remain
        assert "plan:a" not in store._store

    @pytest.mark.asyncio
    async def test_sweep_does_not_remove_valid(self):
        store = make_store(ttl=3600)
        await store.set("plan:a", {"v": "a"})
        await store.set("plan:b", {"v": "b"})
        await store.set("plan:c", {"v": "c"})
        assert len(store) == 3


# ---------------------------------------------------------------------------
# build_plan_store factory
# ---------------------------------------------------------------------------

def test_build_plan_store_no_redis():
    store = build_plan_store(None, 3600)
    assert isinstance(store, MemoryPlanStore)


def test_build_plan_store_with_redis():
    class FakeRedis:
        pass
    store = build_plan_store(FakeRedis(), 3600)
    assert isinstance(store, RedisPlanStore)


# ---------------------------------------------------------------------------
# _merge_patch
# ---------------------------------------------------------------------------

class TestMergePatch:
    def test_basic_patch(self):
        result = _merge_patch({"a": 1, "b": 2}, {"b": 99})
        assert result == {"a": 1, "b": 99}

    def test_null_removes_key(self):
        result = _merge_patch({"a": 1, "b": 2}, {"b": None})
        assert result == {"a": 1}
        assert "b" not in result

    def test_nested_patch(self):
        result = _merge_patch({"a": {"x": 1, "y": 2}}, {"a": {"y": 99}})
        assert result == {"a": {"x": 1, "y": 99}}

    def test_new_key_added(self):
        result = _merge_patch({"a": 1}, {"b": 2})
        assert result == {"a": 1, "b": 2}

    def test_non_dict_patch_replaces(self):
        assert _merge_patch({"a": 1}, "scalar") == "scalar"

    def test_empty_patch(self):
        orig = {"a": 1}
        result = _merge_patch(orig, {})
        assert result == {"a": 1}

    def test_patch_over_none_target(self):
        result = _merge_patch(None, {"a": 1})
        assert result == {"a": 1}


# ---------------------------------------------------------------------------
# _merge_by_id
# ---------------------------------------------------------------------------

class TestMergeById:
    def test_patch_existing(self):
        existing = [{"id": "s1", "status": "open", "name": "S1"}]
        incoming = [{"id": "s1", "name": "S1-updated"}]
        result = _merge_by_id(existing, incoming)
        assert isinstance(result, list)
        assert result[0]["name"] == "S1-updated"
        assert result[0]["status"] == "open"  # preserved

    def test_append_new(self):
        existing = [{"id": "s1", "name": "S1"}]
        incoming = [{"id": "s2", "name": "S2"}]
        result = _merge_by_id(existing, incoming)
        assert len(result) == 2
        assert result[1]["id"] == "s2"

    def test_preserve_absent(self):
        existing = [{"id": "s1"}, {"id": "s2"}]
        incoming = [{"id": "s1", "name": "updated"}]
        result = _merge_by_id(existing, incoming)
        assert len(result) == 2  # s2 preserved

    def test_missing_id_returns_error(self):
        result = _merge_by_id([], [{"name": "no-id"}])
        assert result == "missing_id"

    def test_null_removes_field_on_merge(self):
        existing = [{"id": "s1", "model": "sonnet"}]
        incoming = [{"id": "s1", "model": None}]
        result = _merge_by_id(existing, incoming)
        assert "model" not in result[0]

    def test_empty_existing(self):
        result = _merge_by_id([], [{"id": "s1", "name": "S1"}])
        assert result == [{"id": "s1", "name": "S1"}]


# ---------------------------------------------------------------------------
# _propagate_statuses
# ---------------------------------------------------------------------------

class TestPropagateStatuses:
    def test_all_complete(self):
        plan = {"phases": [{"id": "p1", "status": "open", "steps": [
            {"id": "s1", "status": "complete"},
            {"id": "s2", "status": "complete"},
        ]}]}
        _propagate_statuses(plan)
        assert plan["phases"][0]["status"] == "complete"
        assert plan["status"] == "complete"

    def test_any_failed(self):
        plan = {"phases": [{"id": "p1", "status": "open", "steps": [
            {"id": "s1", "status": "complete"},
            {"id": "s2", "status": "failed"},
        ]}]}
        _propagate_statuses(plan)
        assert plan["phases"][0]["status"] == "failed"

    def test_mixed_in_progress(self):
        plan = {"phases": [{"id": "p1", "status": "open", "steps": [
            {"id": "s1", "status": "complete"},
            {"id": "s2", "status": "open"},
        ]}]}
        _propagate_statuses(plan)
        assert plan["phases"][0]["status"] == "in_progress"

    def test_blocked_propagates(self):
        plan = {"phases": [{"id": "p1", "status": "open", "steps": [
            {"id": "s1", "status": "blocked"},
            {"id": "s2", "status": "open"},
        ]}]}
        _propagate_statuses(plan)
        assert plan["phases"][0]["status"] == "blocked"

    def test_plan_status_from_phases(self):
        plan = {"phases": [
            {"id": "p1", "status": "open", "steps": [{"id": "s1", "status": "complete"}]},
            {"id": "p2", "status": "open", "steps": [{"id": "s2", "status": "open"}]},
        ]}
        _propagate_statuses(plan)
        assert plan["status"] == "in_progress"

    def test_empty_steps_phase_unchanged(self):
        plan = {"phases": [{"id": "p1", "status": "blocked", "steps": []}]}
        _propagate_statuses(plan)
        # No steps → phase status unchanged
        assert plan["phases"][0]["status"] == "blocked"


# ---------------------------------------------------------------------------
# plan_manager_tool — upsert
# ---------------------------------------------------------------------------

class TestUpsertEntirePlan:
    @pytest.mark.asyncio
    async def test_create_new_plan(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"name": "My Plan", "phases": []}, None, 0, store
        )
        data = json.loads(resp)
        assert data["ok"] is True
        assert data["key"] == "plan:repo-plan"
        plan = await store.get("plan:repo-plan")
        assert plan["name"] == "My Plan"
        assert "created_at" in plan
        assert "updated_at" in plan

    @pytest.mark.asyncio
    async def test_create_with_phases_and_steps(self):
        store = make_store()
        await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            full_plan(), None, 0, store
        )
        plan = await store.get("plan:repo-plan")
        assert len(plan["phases"]) == 2
        assert plan["phases"][0]["steps"][0]["id"] == "step-1a"

    @pytest.mark.asyncio
    async def test_patch_existing_top_level_field(self):
        store = make_store()
        await store.set("plan:repo-plan", minimal_plan())
        await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"name": "Updated Name"}, None, 0, store
        )
        plan = await store.get("plan:repo-plan")
        assert plan["name"] == "Updated Name"
        assert plan["description"] == "desc"  # preserved

    @pytest.mark.asyncio
    async def test_null_removes_field(self):
        store = make_store()
        p = dict(minimal_plan())
        p["extra_field"] = "value"
        await store.set("plan:repo-plan", p)
        await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"extra_field": None}, None, 0, store
        )
        plan = await store.get("plan:repo-plan")
        assert "extra_field" not in plan

    @pytest.mark.asyncio
    async def test_phases_merged_by_id_preserves_step_status(self):
        store = make_store()
        plan = full_plan()
        plan["phases"][0]["steps"][0]["status"] = "complete"
        await store.set("plan:repo-plan", plan)
        # Patch phase-1 name only — don't mention steps
        await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [{"id": "phase-1", "name": "Phase One Updated"}]},
            None, 0, store
        )
        updated = await store.get("plan:repo-plan")
        phase1 = _find_phase(updated, "phase-1")
        assert phase1["name"] == "Phase One Updated"
        assert phase1["steps"][0]["status"] == "complete"  # preserved
        assert len(phase1["steps"]) == 2  # both steps preserved

    @pytest.mark.asyncio
    async def test_missing_id_in_phases_returns_error(self):
        store = make_store()
        await store.set("plan:repo-plan", minimal_plan())
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [{"name": "No ID"}]}, None, 0, store
        )
        assert_error(resp, "Array item is missing required 'id' field")

    @pytest.mark.asyncio
    async def test_statuses_propagated_after_upsert(self):
        store = make_store()
        p = full_plan()
        p["phases"][0]["steps"][0]["status"] = "complete"
        p["phases"][0]["steps"][1]["status"] = "complete"
        await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan", p, None, 0, store
        )
        plan = await store.get("plan:repo-plan")
        assert plan["phases"][0]["status"] == "complete"


class TestUpsertPhase:
    @pytest.mark.asyncio
    async def test_patch_existing_phase(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "phase-1",
            {"name": "Phase One Renamed"}, None, 0, store
        )
        plan = await store.get("plan:p")
        assert _find_phase(plan, "phase-1")["name"] == "Phase One Renamed"

    @pytest.mark.asyncio
    async def test_add_new_phase(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "phase-3",
            {"kind": "phase", "name": "Phase Three", "description": "New"}, None, 0, store
        )
        plan = await store.get("plan:p")
        assert _find_phase(plan, "phase-3") is not None
        assert len(plan["phases"]) == 3

    @pytest.mark.asyncio
    async def test_phase_upsert_plan_not_found(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "missing", "phase-1",
            {"name": "X"}, None, 0, store
        )
        assert_error(resp, "Plan 'missing' not found; use target_id='entire_plan' to create it")

    @pytest.mark.asyncio
    async def test_phase_steps_merged_by_id(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "phase-1",
            {"steps": [{"id": "step-1a", "name": "Renamed 1A"}]}, None, 0, store
        )
        plan = await store.get("plan:p")
        phase1 = _find_phase(plan, "phase-1")
        assert phase1["steps"][0]["name"] == "Renamed 1A"
        assert len(phase1["steps"]) == 2  # step-1b preserved

    @pytest.mark.asyncio
    async def test_missing_id_in_phase_steps_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "phase-1",
            {"steps": [{"name": "No ID"}]}, None, 0, store
        )
        assert_error(resp, "Array item is missing required 'id' field")


class TestUpsertStep:
    @pytest.mark.asyncio
    async def test_patch_existing_step(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "step-1a",
            {"name": "Step 1A Renamed"}, None, 0, store
        )
        plan = await store.get("plan:p")
        _, step = _find_step(plan, "step-1a")
        assert step["name"] == "Step 1A Renamed"

    @pytest.mark.asyncio
    async def test_step_status_preserved_on_patch(self):
        store = make_store()
        p = full_plan()
        p["phases"][0]["steps"][0]["status"] = "complete"
        await store.set("plan:p", p)
        await plan_manager_tool(
            "upsert", "p", "step-1a",
            {"name": "Renamed"}, None, 0, store
        )
        plan = await store.get("plan:p")
        _, step = _find_step(plan, "step-1a")
        assert step["status"] == "complete"

    @pytest.mark.asyncio
    async def test_add_new_step_with_phase_id(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "step-1c",
            {"kind": "step", "phase_id": "phase-1", "name": "Step 1C", "prompt": "Do 1C"},
            None, 0, store
        )
        plan = await store.get("plan:p")
        found = _find_step(plan, "step-1c")
        assert found is not None
        _, step = found
        assert step["name"] == "Step 1C"
        assert "phase_id" not in step  # phase_id not stored on step

    @pytest.mark.asyncio
    async def test_new_target_without_kind_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "step-new",
            {"name": "Actually a Phase"}, None, 0, store
        )
        assert_error(resp, "Creating a new phase or step requires explicit data.kind")

    @pytest.mark.asyncio
    async def test_add_new_phase_requires_kind_phase(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "phase-3",
            {"kind": "phase", "name": "Phase Three"}, None, 0, store
        )
        assert json.loads(resp)["ok"] is True
        plan = await store.get("plan:p")
        assert _find_phase(plan, "phase-3") is not None

    @pytest.mark.asyncio
    async def test_new_step_invalid_phase_id_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "step-new",
            {"kind": "step", "phase_id": "no-such-phase", "name": "X"}, None, 0, store
        )
        assert_error(resp, "Parent phase 'no-such-phase' not found in plan")

    @pytest.mark.asyncio
    async def test_null_removes_step_field(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool(
            "upsert", "p", "step-1a",
            {"model": None}, None, 0, store
        )
        plan = await store.get("plan:p")
        _, step = _find_step(plan, "step-1a")
        assert "model" not in step

    @pytest.mark.asyncio
    async def test_status_propagated_after_step_patch(self):
        store = make_store()
        p = full_plan()
        await store.set("plan:p", p)
        # Mark step-1a complete via upsert
        await plan_manager_tool(
            "upsert", "p", "step-1a", {"status": "complete"}, None, 0, store
        )
        plan = await store.get("plan:p")
        # phase-1 should be in_progress (step-1b still open)
        assert _find_phase(plan, "phase-1")["status"] == "in_progress"


class TestUpsertMissingData:
    @pytest.mark.asyncio
    async def test_upsert_without_data_returns_error(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan", None, None, 0, store
        )
        assert_error(resp, "upsert requires 'data'")

    @pytest.mark.asyncio
    async def test_upsert_accepts_json_string_data(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan", '{"name":"From JSON","phases":[]}', None, 0, store
        )
        assert json.loads(resp)["ok"] is True

    @pytest.mark.asyncio
    async def test_upsert_invalid_json_string_returns_error(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan", '{"name":', None, 0, store
        )
        assert_error(resp, "data must be a JSON object or JSON object string")


# ---------------------------------------------------------------------------
# plan_manager_tool — query
# ---------------------------------------------------------------------------

class TestQuery:
    @pytest.mark.asyncio
    async def test_query_entire_plan(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("query", "p", "entire_plan", None, None, 0, store)
        data = json.loads(resp)
        assert data["name"] == "Full Plan"
        assert len(data["phases"]) == 2

    @pytest.mark.asyncio
    async def test_query_phase(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("query", "p", "phase-1", None, None, 0, store)
        data = json.loads(resp)
        assert data["id"] == "phase-1"
        assert len(data["steps"]) == 2

    @pytest.mark.asyncio
    async def test_query_step(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("query", "p", "step-1b", None, None, 0, store)
        data = json.loads(resp)
        assert data["id"] == "step-1b"

    @pytest.mark.asyncio
    async def test_query_unknown_target(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("query", "p", "no-such-id", None, None, 0, store)
        assert_error(resp, "No phase or step with id 'no-such-id'")

    @pytest.mark.asyncio
    async def test_query_plan_not_found(self):
        store = make_store()
        resp = await plan_manager_tool("query", "missing", "entire_plan", None, None, 0, store)
        assert_error(resp, "Plan 'missing' not found")


# ---------------------------------------------------------------------------
# plan_manager_tool — show_status
# ---------------------------------------------------------------------------

class TestShowStatus:
    @pytest.mark.asyncio
    async def test_show_status_entire_plan(self):
        store = make_store()
        p = full_plan()
        p["phases"][0]["steps"][0]["status"] = "complete"
        _propagate_statuses(p)
        await store.set("plan:p", p)
        resp = await plan_manager_tool("show_status", "p", "entire_plan", None, None, 0, store)
        data = json.loads(resp)
        assert "step_progress_pct" in data
        assert "phase_progress_pct" in data
        assert data["step_totals"]["total"] == 3
        assert data["step_totals"]["complete"] == 1
        assert data["phase_totals"]["total"] == 2
        assert data["step_progress_pct"] == pytest.approx(33.3)

    @pytest.mark.asyncio
    async def test_show_status_phase(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("show_status", "p", "phase-1", None, None, 0, store)
        data = json.loads(resp)
        assert data["id"] == "phase-1"
        assert data["step_totals"]["total"] == 2
        assert len(data["steps"]) == 2

    @pytest.mark.asyncio
    async def test_show_status_step(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("show_status", "p", "step-1a", None, None, 0, store)
        data = json.loads(resp)
        assert data["id"] == "step-1a"
        assert data["status"] == "open"
        assert "prompt" not in data

    @pytest.mark.asyncio
    async def test_show_status_unknown_target(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("show_status", "p", "no-id", None, None, 0, store)
        assert_error(resp, "No phase or step with id 'no-id'")

    @pytest.mark.asyncio
    async def test_show_status_plan_not_found(self):
        store = make_store()
        resp = await plan_manager_tool("show_status", "missing", "entire_plan", None, None, 0, store)
        assert_error(resp, "Plan 'missing' not found")

    @pytest.mark.asyncio
    async def test_progress_100_when_all_complete(self):
        store = make_store()
        p = full_plan()
        for phase in p["phases"]:
            for step in phase["steps"]:
                step["status"] = "complete"
        _propagate_statuses(p)
        await store.set("plan:p", p)
        resp = await plan_manager_tool("show_status", "p", "entire_plan", None, None, 0, store)
        data = json.loads(resp)
        assert data["step_progress_pct"] == 100.0
        assert data["phase_progress_pct"] == 100.0


# ---------------------------------------------------------------------------
# plan_manager_tool — update_status
# ---------------------------------------------------------------------------

class TestUpdateStatus:
    @pytest.mark.asyncio
    async def test_update_step_status(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "step-1a", None, "complete", 0, store)
        data = json.loads(resp)
        assert data["ok"] is True
        plan = await store.get("plan:p")
        _, step = _find_step(plan, "step-1a")
        assert step["status"] == "complete"

    @pytest.mark.asyncio
    async def test_update_step_propagates_to_phase(self):
        store = make_store()
        p = full_plan()
        p["phases"][0]["steps"][1]["status"] = "complete"
        _propagate_statuses(p)
        await store.set("plan:p", p)
        await plan_manager_tool("update_status", "p", "step-1a", None, "complete", 0, store)
        plan = await store.get("plan:p")
        assert _find_phase(plan, "phase-1")["status"] == "complete"

    @pytest.mark.asyncio
    async def test_update_phase_status(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool("update_status", "p", "phase-1", None, "blocked", 0, store)
        plan = await store.get("plan:p")
        assert _find_phase(plan, "phase-1")["status"] == "blocked"

    @pytest.mark.asyncio
    async def test_update_entire_plan_status(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "entire_plan", None, "in_progress", 0, store)
        assert_error(resp, "update_status supports phase IDs and step IDs; plan root status is derived")

    @pytest.mark.asyncio
    async def test_invalid_status_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "step-1a", None, "done", 0, store)
        assert_error(resp, "'done' is not a valid status. Valid: ['blocked', 'complete', 'failed', 'in_progress', 'open']")

    @pytest.mark.asyncio
    async def test_unknown_target_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "no-such-id", None, "complete", 0, store)
        assert_error(resp, "No phase or step with id 'no-such-id'")

    @pytest.mark.asyncio
    async def test_missing_new_status_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "step-1a", None, None, 0, store)
        assert_error(resp, "update_status requires 'new_status'")

    @pytest.mark.asyncio
    async def test_plan_not_found(self):
        store = make_store()
        resp = await plan_manager_tool("update_status", "missing", "step-1a", None, "complete", 0, store)
        assert_error(resp, "Plan 'missing' not found")


# ---------------------------------------------------------------------------
# plan_manager_tool — next
# ---------------------------------------------------------------------------

class TestNext:
    @pytest.mark.asyncio
    async def test_next_returns_only_open_with_deps_satisfied(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        # Only step-1a is ready (step-1b depends on step-1a; phase-2 depends on phase-1)
        assert len(tasks) == 1
        assert tasks[0]["step_id"] == "step-1a"

    @pytest.mark.asyncio
    async def test_next_after_completing_step(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        await plan_manager_tool("update_status", "p", "step-1a", None, "complete", 0, store)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        ids = [t["step_id"] for t in tasks]
        assert "step-1b" in ids
        assert "step-1a" not in ids

    @pytest.mark.asyncio
    async def test_next_cross_phase_dep(self):
        """step-2a depends on phase-1 completing (via phase depends_on)."""
        store = make_store()
        # Complete all of phase-1
        await store.set("plan:p", full_plan())
        await plan_manager_tool("update_status", "p", "step-1a", None, "complete", 0, store)
        await plan_manager_tool("update_status", "p", "step-1b", None, "complete", 0, store)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        ids = [t["step_id"] for t in tasks]
        assert "step-2a" in ids

    @pytest.mark.asyncio
    async def test_next_phase_scoped(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "phase-1", None, None, 0, store)
        tasks = json.loads(resp)
        assert all(t["phase_id"] == "phase-1" for t in tasks)

    @pytest.mark.asyncio
    async def test_next_step_scoped_ready(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "step-1a", None, None, 0, store)
        tasks = json.loads(resp)
        assert len(tasks) == 1
        assert tasks[0]["step_id"] == "step-1a"

    @pytest.mark.asyncio
    async def test_next_step_scoped_not_ready(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        # step-1b depends on step-1a which is still open
        resp = await plan_manager_tool("next", "p", "step-1b", None, None, 0, store)
        tasks = json.loads(resp)
        assert tasks == []

    @pytest.mark.asyncio
    async def test_next_limit(self):
        store = make_store()
        # Plan with 3 independent steps all ready
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [{
                "id": "ph", "name": "Phase", "status": "open", "depends_on": [],
                "steps": [
                    {"id": f"s{i}", "name": f"Step {i}", "prompt": "x",
                     "status": "open", "depends_on": []}
                    for i in range(5)
                ],
            }],
        }
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 2, store)
        tasks = json.loads(resp)
        assert len(tasks) == 2

    @pytest.mark.asyncio
    async def test_next_negative_limit_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, -1, store)
        assert_error(resp, "limit must be >= 0")

    @pytest.mark.asyncio
    async def test_next_skips_blocked_phases(self):
        store = make_store()
        p = full_plan()
        _propagate_statuses(p)
        await store.set("plan:p", p)
        await plan_manager_tool("update_status", "p", "step-1a", None, "complete", 0, store)
        await plan_manager_tool("update_status", "p", "step-1b", None, "complete", 0, store)
        await plan_manager_tool("update_status", "p", "phase-2", None, "blocked", 0, store)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        assert json.loads(resp) == []

    @pytest.mark.asyncio
    async def test_next_all_complete_returns_empty(self):
        store = make_store()
        p = full_plan()
        for phase in p["phases"]:
            for step in phase["steps"]:
                step["status"] = "complete"
        _propagate_statuses(p)
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        assert json.loads(resp) == []

    @pytest.mark.asyncio
    async def test_next_plan_not_found(self):
        store = make_store()
        resp = await plan_manager_tool("next", "missing", "entire_plan", None, None, 0, store)
        assert_error(resp, "Plan 'missing' not found")

    @pytest.mark.asyncio
    async def test_next_unknown_step_target(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "no-such-step", None, None, 0, store)
        assert_error(resp, "No phase or step with id 'no-such-step'")

    @pytest.mark.asyncio
    async def test_next_step_dep_on_different_phase(self):
        """Cross-phase step dependency: step in phase-2 depends on specific step in phase-1."""
        store = make_store()
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [
                {
                    "id": "ph1", "name": "Ph1", "status": "open", "depends_on": [],
                    "steps": [{"id": "s1", "name": "S1", "prompt": "x",
                               "status": "open", "depends_on": []}],
                },
                {
                    "id": "ph2", "name": "Ph2", "status": "open", "depends_on": [],
                    "steps": [{"id": "s2", "name": "S2", "prompt": "x",
                               "status": "open", "depends_on": ["s1"]}],
                },
            ],
        }
        await store.set("plan:p", p)
        # s2 not ready yet
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        ids = [t["step_id"] for t in json.loads(resp)]
        assert "s2" not in ids
        assert "s1" in ids
        # Mark s1 complete
        await plan_manager_tool("update_status", "p", "s1", None, "complete", 0, store)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        ids = [t["step_id"] for t in json.loads(resp)]
        assert "s2" in ids


# ---------------------------------------------------------------------------
# Invalid command
# ---------------------------------------------------------------------------

class TestHelpCommand:
    @pytest.mark.asyncio
    async def test_help_returns_documentation(self):
        from ims_mcp.tool_prompts import PROMPT_PLAN_MANAGER_HELP
        store = make_store()
        resp = await plan_manager_tool("help", "any-plan", "entire_plan", None, None, 0, store)
        assert resp == PROMPT_PLAN_MANAGER_HELP

    @pytest.mark.asyncio
    async def test_help_does_not_require_existing_plan(self):
        store = make_store()
        resp = await plan_manager_tool("help", "nonexistent", "entire_plan", None, None, 0, store)
        assert "Error" not in resp
        assert "Commands:" in resp

    @pytest.mark.asyncio
    async def test_help_skips_plan_name_validation(self):
        store = make_store()
        resp = await plan_manager_tool("help", "", "entire_plan", None, None, 0, store)
        assert "Error" not in resp
        assert "Commands:" in resp


class TestInvalidCommand:
    @pytest.mark.asyncio
    async def test_unknown_command(self):
        store = make_store()
        resp = await plan_manager_tool("explode", "p", "entire_plan", None, None, 0, store)
        assert_error(resp, "Unknown command 'explode'. Valid: help, upsert, query, show_status, update_status, next")


# ---------------------------------------------------------------------------
# RedisPlanStore behavioral tests (F5)
# ---------------------------------------------------------------------------

class FakeRedisBackend:
    """Minimal async Redis-like backend for unit testing RedisPlanStore.
    
    Mimics py-key-value-aio RedisStore API which uses put() not set().
    Simulates the internal JSON serialization that RedisStore does.
    """

    def __init__(self) -> None:
        self._data: dict = {}

    async def get(self, key: str):
        """Returns dict directly, just like RedisStore.get()."""
        return self._data.get(key)

    async def put(self, key: str, value, ttl: int | None = None) -> None:
        """Accepts dict and stores directly, matching RedisStore.put() behavior."""
        if not isinstance(value, dict):
            raise TypeError(
                f"Coroutine factory method key_value.aio.stores.base.BaseStore.put() "
                f"parameter value='{value}' violates type hint collections.abc.Mapping[str, typing.Any], "
                f"as {type(value).__name__} '{value}' not instance of <protocol ABC \"collections.abc.Mapping\">."
            )
        self._data[key] = value


class TestRedisPlanStore:
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        store = RedisPlanStore(FakeRedisBackend(), 3600)
        await store.set("k", {"x": 1})
        result = await store.get("k")
        assert result == {"x": 1}

    @pytest.mark.asyncio
    async def test_get_missing_returns_none(self):
        store = RedisPlanStore(FakeRedisBackend(), 3600)
        assert await store.get("missing") is None

    @pytest.mark.asyncio
    async def test_overwrite(self):
        store = RedisPlanStore(FakeRedisBackend(), 3600)
        await store.set("k", {"v": 1})
        await store.set("k", {"v": 2})
        assert (await store.get("k"))["v"] == 2
    
    @pytest.mark.asyncio
    async def test_put_rejects_non_dict(self):
        """Verify FakeRedisBackend mimics RedisStore's type checking."""
        backend = FakeRedisBackend()
        store = RedisPlanStore(backend, 3600)
        # Attempting to store a string (instead of dict) should fail
        with pytest.raises(TypeError, match="violates type hint"):
            await store.set("k", "not-a-dict")  # type: ignore


# ---------------------------------------------------------------------------
# Additional edge-case tests
# ---------------------------------------------------------------------------

class TestUpdateStatusEntirePlan:
    @pytest.mark.asyncio
    async def test_update_entire_plan_returns_error(self):
        """Root plan status is derived from children and must not be explicitly set."""
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("update_status", "p", "entire_plan", None, "complete", 0, store)
        assert_error(resp, "update_status supports phase IDs and step IDs; plan root status is derived")
        plan = await store.get("plan:p")
        assert plan["status"] == "open"
        assert _find_phase(plan, "phase-1")["status"] == "open"
        assert _find_step(plan, "step-1a")[1]["status"] == "open"
        assert _find_step(plan, "step-1b")[1]["status"] == "open"


class TestNewPlanStepIdValidation:
    @pytest.mark.asyncio
    async def test_create_plan_with_step_missing_id_returns_error(self):
        """Steps inside phases during new-plan creation must also have 'id'."""
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [{"id": "p1", "steps": [{"name": "no-id-step"}]}]},
            None, 0, store,
        )
        assert_error(resp, "Array item is missing required 'id' field")

    @pytest.mark.asyncio
    async def test_create_plan_with_valid_step_ids_succeeds(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [{"id": "p1", "steps": [{"id": "s1", "name": "OK"}]}]},
            None, 0, store,
        )
        assert json.loads(resp)["ok"] is True

    @pytest.mark.asyncio
    async def test_create_plan_with_duplicate_phase_ids_returns_error(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [{"id": "p1"}, {"id": "p1"}]},
            None, 0, store,
        )
        assert_error(resp, "IDs must be unique across phases and steps within a plan")

    @pytest.mark.asyncio
    async def test_create_plan_with_duplicate_step_ids_returns_error(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [
                {"id": "p1", "steps": [{"id": "s1"}]},
                {"id": "p2", "steps": [{"id": "s1"}]},
            ]},
            None, 0, store,
        )
        assert_error(resp, "IDs must be unique across phases and steps within a plan")

    @pytest.mark.asyncio
    async def test_create_plan_with_phase_step_id_collision_returns_error(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "repo-plan", "entire_plan",
            {"phases": [
                {"id": "dup", "steps": [{"id": "s1"}]},
                {"id": "p2", "steps": [{"id": "dup"}]},
            ]},
            None, 0, store,
        )
        assert_error(resp, "IDs must be unique across phases and steps within a plan")


class TestIdentityValidation:
    @pytest.mark.asyncio
    async def test_patch_step_cannot_change_id(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "step-1a",
            {"id": "step-2a", "name": "Renamed"}, None, 0, store
        )
        assert_error(resp, "Cannot change the 'id' of an existing phase or step")

    @pytest.mark.asyncio
    async def test_add_phase_with_duplicate_step_id_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "phase-3",
            {"kind": "phase", "steps": [{"id": "step-1a", "name": "Duplicate"}]}, None, 0, store
        )
        assert_error(resp, "IDs must be unique across phases and steps within a plan")

    @pytest.mark.asyncio
    async def test_add_phase_with_duplicate_phase_id_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "phase-1",
            {"id": "phase-2"}, None, 0, store
        )
        assert_error(resp, "Cannot change the 'id' of an existing phase or step")


class TestParentPhaseValidation:
    @pytest.mark.asyncio
    async def test_new_step_invalid_phase_id_returns_specific_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "step-new",
            {"kind": "step", "phase_id": "no-such-phase", "name": "X"}, None, 0, store
        )
        assert_error(resp, "Parent phase 'no-such-phase' not found in plan")


class TestStrictCreationAndDependencies:
    @pytest.mark.asyncio
    async def test_entire_plan_rejects_kind_field(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"kind": "phase", "name": "Bad Root"},
            None, 0, store,
        )
        assert_error(resp, "Use data.kind='phase' or data.kind='step' when creating a new item")
        assert await store.get("plan:p") is None

    @pytest.mark.asyncio
    async def test_unknown_target_invalid_kind_returns_error(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "x-new",
            {"kind": "weird", "name": "X"}, None, 0, store
        )
        assert_error(resp, "Use data.kind='phase' or data.kind='step' when creating a new item")

    @pytest.mark.asyncio
    async def test_create_phase_with_phase_id_rejected(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool(
            "upsert", "p", "phase-new",
            {"kind": "phase", "phase_id": "phase-1", "name": "bad"}, None, 0, store
        )
        assert_error(resp, "Use data.kind='phase' or data.kind='step' when creating a new item")

    @pytest.mark.asyncio
    async def test_unknown_phase_dependency_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "Deps", "phases": [{"id": "p1", "depends_on": ["missing"], "steps": []}]},
            None, 0, store,
        )
        assert_error(resp, "All depends_on references must point to existing IDs of the correct type")

    @pytest.mark.asyncio
    async def test_unknown_step_dependency_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "Deps", "phases": [{"id": "p1", "steps": [{"id": "s1", "depends_on": ["missing"]}]}]},
            None, 0, store,
        )
        assert_error(resp, "All depends_on references must point to existing IDs of the correct type")

    @pytest.mark.asyncio
    async def test_step_cycle_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "Cycle", "phases": [{"id": "p1", "steps": [
                {"id": "a", "depends_on": ["b"]},
                {"id": "b", "depends_on": ["a"]},
            ]}]},
            None, 0, store,
        )
        assert_error(resp, "Dependency graph contains a cycle")

    @pytest.mark.asyncio
    async def test_phase_cycle_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "Cycle", "phases": [
                {"id": "p1", "depends_on": ["p2"], "steps": []},
                {"id": "p2", "depends_on": ["p1"], "steps": []},
            ]},
            None, 0, store,
        )
        assert_error(resp, "Dependency graph contains a cycle")


class TestPlanNameValidation:
    @pytest.mark.asyncio
    async def test_empty_plan_name_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "", "entire_plan", {"name": "bad", "phases": []}, None, 0, store
        )
        assert_error(resp, "plan_name must be a non-empty string")


class TestPlanSizeLimits:
    @pytest.mark.asyncio
    async def test_too_many_phases_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "Big", "phases": [{"id": f"p{i}", "steps": []} for i in range(101)]},
            None, 0, store,
        )
        assert_error(resp, "Input exceeds plan size limits")

    @pytest.mark.asyncio
    async def test_too_many_steps_in_phase_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {
                "name": "Big",
                "phases": [{
                    "id": "p1",
                    "steps": [{"id": f"s{i}"} for i in range(101)],
                }],
            },
            None, 0, store,
        )
        assert_error(resp, "Input exceeds plan size limits")

    @pytest.mark.asyncio
    async def test_too_many_dependencies_rejected(self):
        store = make_store()
        deps = [f"s{i}" for i in range(51)]
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {
                "name": "Big",
                "phases": [{
                    "id": "p1",
                    "steps": [{"id": f"s{i}"} for i in range(51)] + [{"id": "s-final", "depends_on": deps}],
                }],
            },
            None, 0, store,
        )
        assert_error(resp, "Input exceeds plan size limits")

    @pytest.mark.asyncio
    async def test_oversized_string_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {
                "name": "Big",
                "phases": [{
                    "id": "p1",
                    "steps": [{"id": "s1", "prompt": "x" * 20001}],
                }],
            },
            None, 0, store,
        )
        assert_error(resp, "Input exceeds plan size limits")

    @pytest.mark.asyncio
    async def test_plan_name_too_long_rejected(self):
        store = make_store()
        resp = await plan_manager_tool(
            "upsert", "p" * 257, "entire_plan", {"name": "bad", "phases": []}, None, 0, store
        )
        assert_error(resp, "plan_name must be at most 256 characters")


class TestNextInProgressExclusion:
    @pytest.mark.asyncio
    async def test_next_excludes_in_progress_steps(self):
        """next must not return in_progress steps — only open steps are eligible."""
        store = make_store()
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [{
                "id": "ph", "name": "Phase", "status": "open", "depends_on": [],
                "steps": [
                    {"id": "s1", "name": "S1", "prompt": "x", "status": "in_progress", "depends_on": []},
                    {"id": "s2", "name": "S2", "prompt": "x", "status": "open", "depends_on": []},
                ],
            }],
        }
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        ids = [t["step_id"] for t in tasks]
        assert "s1" not in ids  # in_progress excluded
        assert "s2" in ids


class TestNextSubagentFields:
    """next command surfaces subagent/role/model from steps and phase_subagent/phase_role/phase_model from phases."""

    @pytest.mark.asyncio
    async def test_next_includes_phase_subagent_fields(self):
        store = make_store()
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [{
                "id": "ph", "name": "Phase", "status": "open", "depends_on": [],
                "subagent": "code-gen", "role": "Senior Python dev", "model": "claude-4-opus",
                "steps": [
                    {"id": "s1", "name": "S1", "prompt": "x", "status": "open", "depends_on": []},
                ],
            }],
        }
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        assert len(tasks) == 1
        assert tasks[0]["phase_subagent"] == "code-gen"
        assert tasks[0]["phase_role"] == "Senior Python dev"
        assert tasks[0]["phase_model"] == "claude-4-opus"
        assert "subagent" not in tasks[0]
        assert "role" not in tasks[0]
        assert "model" not in tasks[0]

    @pytest.mark.asyncio
    async def test_next_includes_step_subagent_fields(self):
        store = make_store()
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [{
                "id": "ph", "name": "Phase", "status": "open", "depends_on": [],
                "steps": [
                    {"id": "s1", "name": "S1", "prompt": "x", "status": "open", "depends_on": [],
                     "subagent": "test-writer", "role": "QA engineer", "model": "gpt-4o"},
                ],
            }],
        }
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        assert tasks[0]["subagent"] == "test-writer"
        assert tasks[0]["role"] == "QA engineer"
        assert tasks[0]["model"] == "gpt-4o"
        assert "phase_subagent" not in tasks[0]
        assert "phase_role" not in tasks[0]
        assert "phase_model" not in tasks[0]

    @pytest.mark.asyncio
    async def test_next_includes_both_phase_and_step_fields(self):
        store = make_store()
        p = {
            "name": "P", "status": "open", "created_at": NOW, "updated_at": NOW,
            "phases": [{
                "id": "ph", "name": "Phase", "status": "open", "depends_on": [],
                "subagent": "code-gen", "role": "Senior dev", "model": "claude-4-opus",
                "steps": [
                    {"id": "s1", "name": "S1", "prompt": "x", "status": "open", "depends_on": [],
                     "subagent": "test-writer", "role": "QA engineer", "model": "gpt-4o"},
                ],
            }],
        }
        await store.set("plan:p", p)
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        assert tasks[0]["subagent"] == "test-writer"
        assert tasks[0]["role"] == "QA engineer"
        assert tasks[0]["model"] == "gpt-4o"
        assert tasks[0]["phase_subagent"] == "code-gen"
        assert tasks[0]["phase_role"] == "Senior dev"
        assert tasks[0]["phase_model"] == "claude-4-opus"

    @pytest.mark.asyncio
    async def test_next_omits_absent_subagent_fields(self):
        store = make_store()
        await store.set("plan:p", full_plan())
        resp = await plan_manager_tool("next", "p", "entire_plan", None, None, 0, store)
        tasks = json.loads(resp)
        assert "phase_subagent" not in tasks[0]
        assert "phase_role" not in tasks[0]
        assert "phase_model" not in tasks[0]
        assert "subagent" not in tasks[0]
        assert "role" not in tasks[0]

    @pytest.mark.asyncio
    async def test_subagent_fields_stored_and_queryable(self):
        store = make_store()
        await plan_manager_tool(
            "upsert", "p", "entire_plan",
            {"name": "P", "phases": [{
                "id": "ph", "subagent": "reviewer", "role": "Security analyst", "model": "claude-4-opus",
                "steps": [{"id": "s1", "prompt": "x", "subagent": "scanner", "role": "SAST tool"}],
            }]},
            None, 0, store,
        )
        resp = await plan_manager_tool("query", "p", "ph", None, None, 0, store)
        phase = json.loads(resp)
        assert phase["subagent"] == "reviewer"
        assert phase["role"] == "Security analyst"
        assert phase["model"] == "claude-4-opus"
        assert phase["steps"][0]["subagent"] == "scanner"
        assert phase["steps"][0]["role"] == "SAST tool"


class TestStatusPriorityEdgeCases:
    def test_failed_and_blocked_returns_failed(self):
        """failed takes priority over blocked."""
        from ims_mcp.tools.plan_manager import _compute_status_from_children
        assert _compute_status_from_children(["failed", "blocked"]) == "failed"

    def test_blocked_and_open_returns_blocked(self):
        from ims_mcp.tools.plan_manager import _compute_status_from_children
        assert _compute_status_from_children(["blocked", "open"]) == "blocked"
