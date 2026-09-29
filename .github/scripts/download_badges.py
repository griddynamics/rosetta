#!/usr/bin/env python3
"""Build shields.io endpoint JSON for PyPI monthly downloads.

pypistats.org exposes two relevant endpoints. `/recent` is the one shields.io
reads for its own `pypi/dm` badge, and it is aggressively rate limited: when it
refuses, shields renders "rate limited by upstream service" and GitHub's camo
proxy caches that error image for hours. `/overall` returns the daily series and
answers reliably, so this script sums the last 30 days from it instead.

Counts exclude mirrors, which is what shields.io reports and what represents
real installs. Including mirrors roughly quadruples the number.

Usage: download_badges.py <output-dir>
"""

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

API = "https://pypistats.org/api/packages/{pkg}/overall?mirrors=false"
WINDOW_DAYS = 30
PACKAGES = {
    "rosetta-mcp": "MCP downloads",
    "rosetta-cli": "CLI downloads",
}


def fetch(pkg: str, attempts: int = 5) -> dict:
    """GET the overall series, retrying with linear backoff on transient errors."""
    url = API.format(pkg=pkg)
    req = urllib.request.Request(url, headers={"User-Agent": "rosetta-badges/1.0"})
    last = None
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last = exc
            if attempt < attempts:
                time.sleep(5 * attempt)
    raise RuntimeError(f"{pkg}: pypistats unreachable after {attempts} attempts: {last}")


def monthly(pkg: str) -> int:
    cutoff = (date.today() - timedelta(days=WINDOW_DAYS)).isoformat()
    rows = fetch(pkg)["data"]
    return sum(r["downloads"] for r in rows if r["date"] >= cutoff)


def human(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M".replace(".0M", "M")
    if n >= 10_000:
        return f"{n // 1000}k"
    if n >= 1_000:
        return f"{n / 1000:.1f}k".replace(".0k", "k")
    return str(n)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    out = sys.argv[1]

    for pkg, label in PACKAGES.items():
        count = monthly(pkg)
        payload = {
            "schemaVersion": 1,
            "label": label,
            "message": f"{human(count)}/month",
            "color": "blue",
        }
        path = f"{out}/{pkg}.json"
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
            fh.write("\n")
        print(f"{pkg}: {count} downloads in {WINDOW_DAYS}d -> {path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
