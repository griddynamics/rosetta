"""Tests for the GitHub Projects v2 board loader.

Run: python3 -m pytest .github/scripts/test_load_stories.py
"""
import importlib.util
import json
import pathlib

import pytest

spec = importlib.util.spec_from_file_location(
    "load_stories", pathlib.Path(__file__).with_name("load_stories.py")
)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)


def issue(number, status=None, priority=None, repo="griddynamics/rosetta", state="OPEN"):
    """A board item in the shape load_board_items() normalises to."""
    return {
        "item_id": f"item-{number}",
        "number": number,
        "title": f"issue {number}",
        "state": state,
        "repository": repo,
        "status": status,
        "priority": priority,
    }


# ── Priority gate (planner only) ────────────────────────────────────────────────

@pytest.mark.parametrize("priority", ["High", "P0", "P1", "P2", "Medium", "Urgent"])
def test_set_non_low_priority_is_plannable(priority):
    assert module.is_plannable(priority) is True


@pytest.mark.parametrize("priority", [None, "", "   ", "Low", "low", "LOW", "P3", "p4"])
def test_unset_or_low_priority_is_not_plannable(priority):
    assert module.is_plannable(priority) is False


def test_priority_gate_applies_to_backlog_only():
    plan, impl = module.collect_matrices([
        issue(1, status="Backlog", priority="P1"),
        issue(2, status="Backlog", priority="Low"),
        issue(3, status="Backlog"),                    # unset
        issue(4, status="Ready"),                      # unset, must still implement
        issue(5, status="Ready", priority="Low"),      # low, must still implement
    ])
    assert [e["issue_number"] for e in plan] == [1]
    assert [e["issue_number"] for e in impl] == [4, 5]


# ── Status selection ────────────────────────────────────────────────────────────

def test_only_backlog_and_ready_are_selected():
    plan, impl = module.collect_matrices([
        issue(1, status="Backlog", priority="P1"),
        issue(2, status="Ready"),
        issue(3, status="In progress", priority="P1"),
        issue(4, status="In review", priority="P1"),
        issue(5, status="Done", priority="P1"),
        issue(6, priority="P1"),                       # status unset
    ])
    assert [e["issue_number"] for e in plan] == [1]
    assert [e["issue_number"] for e in impl] == [2]


def test_status_match_is_case_and_whitespace_sensitive():
    plan, impl = module.collect_matrices([
        issue(1, status="backlog", priority="P1"),
        issue(2, status="Backlog ", priority="P1"),
    ])
    assert plan == [] and impl == []


# ── Content filtering ───────────────────────────────────────────────────────────

def test_closed_issues_are_never_selected():
    plan, impl = module.collect_matrices([
        issue(1, status="Backlog", priority="P1", state="CLOSED"),
        issue(2, status="Ready", state="CLOSED"),
    ])
    assert plan == [] and impl == []


def test_items_from_other_repositories_are_excluded():
    plan, _ = module.collect_matrices([
        issue(1, status="Backlog", priority="P1", repo="griddynamics/other"),
    ])
    assert plan == []


def test_priority_is_read_from_the_issue_not_the_project_item():
    """Priority is a native Issue field that the board surfaces as a derived column.
    It is invisible to `gh project item-list`, so it must come from
    Issue.issueFieldValues -- reading it off the project item skips every issue."""
    content = {
        "number": 1, "title": "t", "state": "OPEN",
        "repository": {"nameWithOwner": "griddynamics/rosetta"},
        "issueFieldValues": {"nodes": [{"name": "Urgent", "field": {"name": "Priority"}}]},
    }
    project_field_values = {"nodes": [{"name": "Backlog", "field": {"name": "Status"}}]}
    assert module._single_select(content["issueFieldValues"], "Priority") == "Urgent"
    assert module._single_select(project_field_values, "Status") == "Backlog"
    assert module._single_select(project_field_values, "Priority") is None


def test_single_select_tolerates_missing_and_null_nodes():
    assert module._single_select(None, "Priority") is None
    assert module._single_select({"nodes": []}, "Priority") is None
    assert module._single_select({"nodes": [None]}, "Priority") is None
    assert module._single_select({"nodes": [{"name": "x"}]}, "Priority") is None


# ── Matrix shape ────────────────────────────────────────────────────────────────

def test_empty_matrix_emits_skip_sentinel():
    parsed = json.loads(module.build_matrix([]))
    assert parsed["include"][0]["issue_title"] == "__skip__"


def test_title_is_truncated_and_sanitized():
    item = issue(1, status="Backlog", priority="P1")
    item["title"] = 'a"b' + "\n" + "x" * 200
    plan, _ = module.collect_matrices([item])
    title = plan[0]["issue_title"]
    assert len(title) == 80
    assert '"' not in title and "\n" not in title


def test_status_field_extraction():
    field_id, options = module.extract_status_field({"fields": [
        {"id": "F1", "name": "Status", "options": [
            {"id": "o1", "name": "Backlog"}, {"id": "o2", "name": "Ready"},
        ]},
    ]})
    assert field_id == "F1"
    assert options == {"Backlog": "o1", "Ready": "o2"}
