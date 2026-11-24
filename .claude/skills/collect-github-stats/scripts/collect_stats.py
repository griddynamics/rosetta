#!/usr/bin/env python3
"""Collect GitHub product-health stats for an OSS repo and merge into a JSON history.

Why: GitHub traffic API is a 14-day rolling window; data older than 14 days is lost
unless captured. This script MERGES each run into a permanent per-date history so a
weekly (Monday) run accumulates a full timeseries.

Usage:
    collect_stats.py [--repo OWNER/NAME] [--out PATH] [--no-enrich]

Requires: `gh` CLI, authenticated, with PUSH access to --repo (traffic endpoints
return 403 otherwise). Fails loudly with remediation if access is missing.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

DEFAULT_REPO = "griddynamics/rosetta"
DEFAULT_OUT = "docs/github-stats.json"


# ---- gh plumbing ------------------------------------------------------------

def _run(args: list[str]) -> tuple[int, str, str]:
    p = subprocess.run(args, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def gh_json(path: str, paginate: bool = False, accept: str | None = None):
    """Call `gh api PATH`; return parsed JSON. Raises RuntimeError with the raw
    stderr so the caller can classify (403 = no push access, etc.)."""
    args = ["gh", "api", path]
    if paginate:
        args += ["--paginate", "--slurp"]  # --slurp merges paginated arrays into one
    if accept:
        args += ["-H", f"Accept: {accept}"]
    code, out, err = _run(args)
    if code != 0:
        raise RuntimeError(f"gh api {path} failed (exit {code}): {err.strip()}")
    if not out.strip():
        return None
    data = json.loads(out)
    # --paginate --slurp yields a list of pages (each a list); flatten one level.
    if paginate and isinstance(data, list) and data and all(isinstance(p, list) for p in data):
        return [item for page in data for item in page]
    return data


def preflight(repo: str) -> None:
    """Fail loudly with fix steps if gh missing / unauth / no traffic access."""
    if _run(["gh", "--version"])[0] != 0:
        _die("`gh` CLI not found.", "Install: https://cli.github.com  then `gh auth login`")
    code, _, err = _run(["gh", "auth", "status"])
    if code != 0:
        _die("`gh` not authenticated.", "Run: gh auth login  (scope: repo)")
    # Traffic requires push access — probe clones endpoint.
    try:
        gh_json(f"repos/{repo}/traffic/clones")
    except RuntimeError as e:
        msg = str(e)
        if "403" in msg or "must have push access" in msg.lower():
            _die(
                f"No PUSH access to {repo} — traffic API returns 403.",
                "Traffic (clones/views/paths/referrers) needs write/admin on the repo.",
                "Ask an admin to grant push access to the authenticated account,",
                "or run this from an account/token that has it.",
            )
        _die(f"Traffic probe failed for {repo}.", msg)


def _die(*lines: str) -> None:
    print("\n[FAIL] collect_stats aborted.", file=sys.stderr)
    for ln in lines:
        print("  " + ln, file=sys.stderr)
    sys.exit(2)


# ---- merge helpers ----------------------------------------------------------

def merge_value_counts(prev: list[dict], cur: list[dict], today: str) -> list[dict]:
    """Aggregate a UNIQUE set of {value,count,last_seen} across runs. Union of all
    values ever seen — a value never drops out once observed (handles profile edits
    / unstars). count/last_seen reflect the newest run where the value appeared."""
    by_val = {r["value"]: dict(r) for r in prev}
    for r in cur:
        by_val[r["value"]] = {"value": r["value"], "count": r["count"], "last_seen": today}
    return sorted(by_val.values(), key=lambda r: (-r["count"], r["value"].lower()))


def merge_daily(existing: list[dict], incoming: list[dict]) -> list[dict]:
    """Merge per-date traffic points. Newest fetch wins for a given date (handles
    partial current-day counts that finalize on a later run). Sorted by date."""
    by_date = {row["timestamp"]: row for row in existing}
    for row in incoming:
        by_date[row["timestamp"]] = {
            "timestamp": row["timestamp"],
            "count": row["count"],
            "uniques": row["uniques"],
        }
    return sorted(by_date.values(), key=lambda r: r["timestamp"])


def collect_company_location(logins: list[str]) -> tuple[list[dict], list[dict]]:
    """Fetch each user's public company/location; return two deduped flat lists
    `[{value,count}]` sorted by count desc. NO logins/names retained (no PII).
    `count` = distinct users reporting that value. Raw free-text values kept as-is
    (GitHub company/location are unvalidated; variants not merged)."""
    companies: dict[str, int] = {}
    locations: dict[str, int] = {}
    for login in logins:
        try:
            u = gh_json(f"users/{login}") or {}
        except RuntimeError:
            continue
        c = (u.get("company") or "").strip()
        loc = (u.get("location") or "").strip()
        if c:
            companies[c] = companies.get(c, 0) + 1
        if loc:
            locations[loc] = locations.get(loc, 0) + 1

    def _flat(d: dict[str, int]) -> list[dict]:
        return [{"value": k, "count": v}
                for k, v in sorted(d.items(), key=lambda kv: (-kv[1], kv[0].lower()))]

    return _flat(companies), _flat(locations)


# ---- main -------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=DEFAULT_REPO)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--no-enrich", action="store_true",
                    help="skip company/location profile lookups")
    a = ap.parse_args()

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    today = now.strftime("%Y-%m-%d")

    preflight(a.repo)

    out_path = Path(a.out)
    prev = json.loads(out_path.read_text()) if out_path.exists() else {}

    # --- fetch --------------------------------------------------------------
    core = gh_json(f"repos/{a.repo}")
    clones = gh_json(f"repos/{a.repo}/traffic/clones")
    views = gh_json(f"repos/{a.repo}/traffic/views")
    paths = gh_json(f"repos/{a.repo}/traffic/popular/paths") or []
    referrers = gh_json(f"repos/{a.repo}/traffic/popular/referrers") or []
    releases = gh_json(f"repos/{a.repo}/releases?per_page=100") or []
    contributors = gh_json(f"repos/{a.repo}/contributors?per_page=100&anon=false") or []
    stars_raw = gh_json(f"repos/{a.repo}/stargazers", paginate=True,
                        accept="application/vnd.github.star+json") or []
    forks_raw = gh_json(f"repos/{a.repo}/forks?per_page=100", paginate=True) or []

    # --- companies/locations from stargazers+forkers (deduped, NO logins) ---
    star_logins = [s["user"]["login"] for s in stars_raw]
    fork_logins = [f["owner"]["login"] for f in forks_raw]
    uniq_logins = list(dict.fromkeys(star_logins + fork_logins))
    n_profiles = len(uniq_logins)
    if a.no_enrich:
        companies, locations = [], []
    else:
        companies, locations = collect_company_location(uniq_logins)

    # --- releases PUBLISHED in the trailing 7 days (run-day exclusive) ------
    # "this week" = [run_day - 7d, run_day) by UTC day boundary. A release
    # published on the run day is excluded now, counted next run — no gap, no
    # double count. Only newest releases matter, so no pagination needed.
    win_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    win_start = win_end - timedelta(days=7)

    def _published(rel):
        ts = rel.get("published_at")
        if not ts:
            return None
        return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)

    week_rels = [r for r in releases
                 if (p := _published(r)) and win_start <= p < win_end]
    week_downloads = sum(a.get("download_count", 0)
                         for r in week_rels for a in r.get("assets", []))
    dl_hist = [d for d in prev.get("release_downloads_weekly", [])
               if d.get("snapshot_date") != today]
    dl_hist.append({
        "snapshot_date": today,
        "window": {"from": win_start.strftime("%Y-%m-%d"),
                   "to": win_end.strftime("%Y-%m-%d")},
        "releases": [r.get("tag_name") for r in week_rels],
        "downloads_this_week": week_downloads,
    })

    # --- popular paths / referrers: weekly snapshots (14d aggregates) --------
    paths_hist = [s for s in prev.get("popular_paths_snapshots", [])
                  if s.get("snapshot_date") != today]
    paths_hist.append({"snapshot_date": today, "paths": paths})
    ref_hist = [s for s in prev.get("referrers_snapshots", [])
                if s.get("snapshot_date") != today]
    ref_hist.append({"snapshot_date": today, "referrers": referrers})

    # --- weekly summary row -------------------------------------------------
    summary_row = {
        "snapshot_date": today,
        "stars": core.get("stargazers_count"),
        "forks": core.get("forks_count"),
        "clones_14d": clones.get("count"),
        "unique_cloners_14d": clones.get("uniques"),
        "views_14d": views.get("count"),
        "unique_visitors_14d": views.get("uniques"),
        "release_downloads_this_week": dl_hist[-1]["downloads_this_week"],
    }
    weekly = [s for s in prev.get("weekly_snapshots", []) if s.get("snapshot_date") != today]
    weekly.append(summary_row)

    # --- assemble -----------------------------------------------------------
    doc = {
        "repo": a.repo,
        "url": core.get("html_url"),
        "generated_at": now_iso,
        "totals": {
            "stars": core.get("stargazers_count"),
            "forks": core.get("forks_count"),
            "watchers": core.get("subscribers_count"),
            "open_issues": core.get("open_issues_count"),
            "contributors": len(contributors),
            "size_kb": core.get("size"),
        },
        "traffic": {
            "clones_daily": merge_daily(prev.get("traffic", {}).get("clones_daily", []),
                                        clones.get("clones", [])),
            "views_daily": merge_daily(prev.get("traffic", {}).get("views_daily", []),
                                       views.get("views", [])),
        },
        "popular_paths_snapshots": paths_hist,
        "referrers_snapshots": ref_hist,
        "release_downloads_weekly": dl_hist,
        # UNIQUE set aggregated across runs (union w/ prior); never drops a value.
        "companies": merge_value_counts(prev.get("companies", []), companies, today),
        "locations": merge_value_counts(prev.get("locations", []), locations, today),
        "weekly_snapshots": weekly,
    }
    # Keep hand-added top-level keys (e.g. critical_notes) and prior key order.
    doc = {**{k: doc.get(k, v) for k, v in prev.items()}, **doc}

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(out_path)

    print(f"[ok] {a.repo} -> {out_path}")
    print(f"     stars={doc['totals']['stars']} forks={doc['totals']['forks']} "
          f"clones14d={summary_row['clones_14d']} uniqCloners14d={summary_row['unique_cloners_14d']} "
          f"uniqVisitors14d={summary_row['unique_visitors_14d']}")
    print(f"     week_releases={dl_hist[-1]['releases']} week_downloads={week_downloads}")
    print(f"     clones_daily rows={len(doc['traffic']['clones_daily'])} "
          f"weekly_snapshots={len(weekly)} profiles_scanned={n_profiles} "
          f"companies={len(doc['companies'])} locations={len(doc['locations'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
