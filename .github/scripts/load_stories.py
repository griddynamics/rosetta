#!/usr/bin/env python3
"""
Load GitHub Projects v2 board items that require AI work.

Board: "Rosetta Automation Board" — org griddynamics, project number 57
https://github.com/orgs/griddynamics/projects/57

Filtering logic:
  - Status "Backlog"   + Priority set and not low → plan_matrix
  - Status "Scheduled"                            → impl_matrix  (no priority gate:
    the user moving a card to "Scheduled" is the decision to build it)

Each pipeline loads one lane, claims into a working lane, and ends in a third:
Backlog -> Planning -> Ready for the planner, Scheduled -> In progress -> In review
for the implementer. A terminal lane is never an input lane, so nothing can be
re-processed, and a crashed run parks its card in a working lane that no pipeline
loads rather than looping.

Status is a Projects v2 single-select field. Priority is NOT — it is a native
GitHub *Issue* field surfaced on the board as a derived column, so it is invisible
to `gh project item-list` and must be read from Issue.issueFieldValues. Reading it
from the project item is why an earlier version of this gate skipped everything.

Board membership itself is the scoping mechanism (replaces the old Jira epic
parent): only issues added to project 57 are eligible for AI work.

Writes to GITHUB_OUTPUT:
  plan_matrix, impl_matrix, has_plan, has_impl, plan_count, impl_count,
  project_id, status_field_id, status_option_ids (JSON: {status_name: option_id})

Requires GH_TOKEN env set to a PAT with org Projects read/write scope
(secrets.SELF_AUTOMATION_PROJECTS_TOKEN) — the default GITHUB_TOKEN cannot
read or write GitHub Projects v2 items.
"""

import json
import os
import subprocess
import sys

PROJECT_OWNER = "griddynamics"
PROJECT_NUMBER = "57"

# Priority gate — planner only. An issue is planned only when its Priority is set
# AND is not one of these values (compared case-insensitively). Adjust this set if
# the board's Priority options are renamed.
LOW_PRIORITY_VALUES = {"low", "p3", "p4"}
TARGET_REPO = os.environ.get("GITHUB_REPOSITORY", "griddynamics/rosetta")


def gh_json(*args: str) -> dict:
    result = subprocess.run(
        ["gh", *args, "--format", "json"],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def load_project_view() -> dict:
    return gh_json("project", "view", PROJECT_NUMBER, "--owner", PROJECT_OWNER)


def load_project_fields() -> dict:
    return gh_json(
        "project", "field-list", PROJECT_NUMBER, "--owner", PROJECT_OWNER, "--limit", "100"
    )


BOARD_QUERY = """
query($owner: String!, $number: Int!, $cursor: String) {
  organization(login: $owner) {
    projectV2(number: $number) {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue {
              number
              title
              state
              repository { nameWithOwner }
              issueFieldValues(first: 20) {
                nodes {
                  ... on IssueFieldSingleSelectValue {
                    name
                    field { ... on IssueFieldSingleSelect { name } }
                  }
                }
              }
            }
          }
          fieldValues(first: 30) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}
"""


def gh_graphql(query: str, **variables: object) -> dict:
    args = ["gh", "api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        flag = "-F" if isinstance(value, int) else "-f"
        args += [flag, f"{key}={value}"]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        # capture_output hides gh's diagnosis unless we forward it.
        print(f"::error::GraphQL call failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    payload = json.loads(result.stdout)
    if payload.get("errors"):
        print(f"::error::GraphQL errors: {payload['errors']}", file=sys.stderr)
        sys.exit(1)
    return payload["data"]


def load_board_items() -> list[dict]:
    """Every board item, normalised, with Status and the issue-native Priority."""
    items: list[dict] = []
    cursor = None
    while True:
        kwargs = {"owner": PROJECT_OWNER, "number": int(PROJECT_NUMBER)}
        if cursor:
            kwargs["cursor"] = cursor
        data = gh_graphql(BOARD_QUERY, **kwargs)
        page = data["organization"]["projectV2"]["items"]
        for node in page["nodes"]:
            content = node.get("content") or {}
            if not content.get("number"):
                continue  # PR, draft issue, or content the token cannot resolve
            items.append(
                {
                    "item_id": node.get("id"),
                    "number": content["number"],
                    "title": content.get("title") or "",
                    "state": content.get("state"),
                    "repository": (content.get("repository") or {}).get("nameWithOwner", ""),
                    "status": _single_select(node.get("fieldValues"), "Status"),
                    "priority": _single_select(content.get("issueFieldValues"), "Priority"),
                }
            )
        if not page["pageInfo"]["hasNextPage"]:
            return items
        cursor = page["pageInfo"]["endCursor"]


def _single_select(container: dict | None, field_name: str) -> str | None:
    for node in (container or {}).get("nodes", []):
        if not node:
            continue
        if (node.get("field") or {}).get("name") == field_name:
            return node.get("name")
    return None


def extract_status_field(fields_data: dict) -> tuple[str, dict]:
    for field in fields_data.get("fields", []):
        if field.get("name") == "Status":
            options = {opt["name"]: opt["id"] for opt in field.get("options", [])}
            return field["id"], options
    print(
        "::error::'Status' field not found on project 57 — check `gh project field-list 57 "
        "--owner griddynamics --format json` output",
        file=sys.stderr,
    )
    sys.exit(1)


def is_plannable(priority: str | None) -> bool:
    """Unset or low priority is never planned."""
    if priority is None or not priority.strip():
        return False
    return priority.strip().lower() not in LOW_PRIORITY_VALUES


def collect_matrices(items: list[dict]) -> tuple[list[dict], list[dict]]:
    plan_items: list[dict] = []
    impl_items: list[dict] = []
    skipped: list[tuple[int, str]] = []

    for item in items:
        if item.get("state") == "CLOSED":
            continue
        repo = item.get("repository") or ""
        if repo and repo != TARGET_REPO:
            continue

        title = (item.get("title") or "")[:80].replace('"', "'").replace("\n", " ")
        entry = {
            "issue_number": item["number"],
            "issue_title": title,
            "item_id": item.get("item_id"),
        }

        if item.get("status") == "Backlog":
            priority = item.get("priority")
            if is_plannable(priority):
                plan_items.append(entry)
            else:
                skipped.append((item["number"], priority or "unset"))
        elif item.get("status") == "Scheduled":
            # No priority gate here: the user moving a card to "Scheduled" is the
            # decision to build it.
            impl_items.append(entry)

    if skipped:
        detail = ", ".join(f"#{n} ({p})" for n, p in skipped)
        print(f"::notice::Skipped {len(skipped)} Backlog issue(s) on priority: {detail}")

    return plan_items, impl_items


def build_matrix(items: list[dict]) -> str:
    if items:
        return json.dumps({"include": items})
    return json.dumps(
        {"include": [{"issue_number": 0, "issue_title": "__skip__", "item_id": ""}]}
    )


def write_output(name: str, value: str) -> None:
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"{name}={value}\n")


def main() -> None:
    project = load_project_view()
    fields_data = load_project_fields()
    board_items = load_board_items()

    status_field_id, status_options = extract_status_field(fields_data)
    plan_items, impl_items = collect_matrices(board_items)

    write_output("project_id", project["id"])
    write_output("status_field_id", status_field_id)
    write_output("status_option_ids", json.dumps(status_options))

    write_output("plan_matrix", build_matrix(plan_items))
    write_output("has_plan", "true" if plan_items else "false")
    write_output("plan_count", str(len(plan_items)))

    write_output("impl_matrix", build_matrix(impl_items))
    write_output("has_impl", "true" if impl_items else "false")
    write_output("impl_count", str(len(impl_items)))

    print(f"Board items to plan:      {len(plan_items)}")
    print(f"Board items to implement: {len(impl_items)}")
    for entry in plan_items:
        print(f"  [PLAN] #{entry['issue_number']}: {entry['issue_title']}")
    for entry in impl_items:
        print(f"  [IMPL] #{entry['issue_number']}: {entry['issue_title']}")


if __name__ == "__main__":
    main()
