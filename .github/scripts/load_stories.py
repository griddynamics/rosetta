#!/usr/bin/env python3
"""
Load Jira stories from epic CTORNDGAIN-1174 that require AI work.

Filtering logic:
  - Status "Planned"               AND no label AI-PLANNING or AI-PLANNED   → plan_matrix
  - Status "Ready for Development" AND no label AI-IMPLEMENTING or AI-IMPLEMENTED → impl_matrix

Writes to GITHUB_OUTPUT:
  plan_matrix, impl_matrix, has_plan, has_impl, plan_count, impl_count
"""

import base64
import json
import os
import urllib.parse
import urllib.request

FIELDS = ["summary", "status", "labels"]


JQL = (
    'parent = CTORNDGAIN-1174 '
    'AND status in ("Planned", "Ready for Development") '
    'ORDER BY priority DESC'
)


def build_auth_header(username: str, api_token: str) -> str:
    creds = f"{username}:{api_token}"
    return base64.b64encode(creds.encode()).decode()


def jira_request(
    jira_base: str,
    auth_header: str,
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{jira_base}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def fetch_story_issues(
    jira_base: str,
    auth_header: str,
    request_fn=jira_request,
) -> dict:
    params = urllib.parse.urlencode({"maxResults": 50})
    return request_fn(
        jira_base,
        auth_header,
        f"/rest/api/3/search/jql?{params}",
        method="POST",
        payload={"jql": JQL, "fields": FIELDS},
    )


def collect_story_matrices(data: dict) -> tuple[list[dict], list[dict]]:
    plan_stories: list[dict] = []
    impl_stories: list[dict] = []

    for issue in data.get("issues", []):
        key: str = issue["key"]
        status: str = issue["fields"]["status"]["name"]
        labels: list[str] = issue["fields"].get("labels", [])
        summary: str = issue["fields"]["summary"][:80].replace('"', "'").replace("\n", " ")

        if status == "Planned":
            if "AI-PLANNING" not in labels and "AI-PLANNED" not in labels:
                plan_stories.append({"story_key": key, "story_summary": summary})
        elif status == "Ready for Development":
            if "AI-IMPLEMENTING" not in labels and "AI-IMPLEMENTED" not in labels:
                impl_stories.append({"story_key": key, "story_summary": summary})

    return plan_stories, impl_stories


def build_matrix(stories: list[dict]) -> str:
    if stories:
        return json.dumps({"include": stories})
    return json.dumps({"include": [{"story_key": "__skip__", "story_summary": ""}]})


def write_outputs(plan_stories: list[dict], impl_stories: list[dict]) -> None:
    output_file = os.environ.get("GITHUB_OUTPUT", "/dev/stdout")
    with open(output_file, "a") as f:
        f.write(f"plan_matrix={build_matrix(plan_stories)}\n")
        f.write(f"impl_matrix={build_matrix(impl_stories)}\n")
        f.write(f"plan_count={len(plan_stories)}\n")
        f.write(f"impl_count={len(impl_stories)}\n")
        f.write(f"has_plan={'true' if plan_stories else 'false'}\n")
        f.write(f"has_impl={'true' if impl_stories else 'false'}\n")


def main() -> None:
    jira_base = os.environ["JIRA_URL"].rstrip("/")
    auth_header = build_auth_header(
        os.environ["JIRA_USERNAME"],
        os.environ["JIRA_API_TOKEN"],
    )
    data = fetch_story_issues(jira_base, auth_header)
    plan_stories, impl_stories = collect_story_matrices(data)

    write_outputs(plan_stories, impl_stories)

    print(f"Stories to plan:      {len(plan_stories)}")
    print(f"Stories to implement: {len(impl_stories)}")
    for story in plan_stories:
        print(f"  [PLAN] {story['story_key']}: {story['story_summary']}")
    for story in impl_stories:
        print(f"  [IMPL] {story['story_key']}: {story['story_summary']}")


if __name__ == "__main__":
    main()
