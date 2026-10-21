#!/usr/bin/env python3
"""Collect every run report into one summary table.

    python3 saleor/scripts/collect-results.py                     # print the summary (Markdown)
    python3 saleor/scripts/collect-results.py --out saleor/reports/summary.md --csv saleor/reports/runs.csv

Reads the data block (front matter) of every saleor/runs/<task>/<runner>/<method>/report.md,
computes the derived metrics defined in templates/README.md, and prints:
1. one row per run,
2. per task and runner: one row per method with `status: done` (the comparison),
3. warnings for reports with missing values, so each engineer can check their own report.
No third-party packages needed.
"""
import argparse
import csv
import re
import statistics
import sys
from datetime import datetime
from pathlib import Path

SALEOR = Path(__file__).resolve().parents[1]
RUNS = SALEOR / "runs"
METHOD_ORDER = ["baseline", "grill-with-docs", "superpowers", "spec-kit", "aws-ai-dlc", "rosetta", "rosetta-light"]
REQUIRED = ["run_id", "task", "method", "runner", "model", "status", "t0", "t1", "t2",
            "hidden_total", "hidden_asked", "hidden_covered", "hidden_missed", "followups", "method_steps",
            "done_checks_total", "done_checks_passed", "tests_pass", "operator_score", "operator_merge_ready"]


def front_matter(text):
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    data = {}
    for line in (m.group(1) if m else "").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        val = re.sub(r"\s+#.*$", "", val).strip()
        data[key.strip()] = val
    return data


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def minutes(a, b):
    try:
        return (datetime.fromisoformat(b) - datetime.fromisoformat(a)).total_seconds() / 60
    except (TypeError, ValueError):
        return None


def kind(folder):
    if folder.endswith(".pilot"):
        return "pilot"
    if folder.endswith(".ref"):
        return "reference"
    return "run"


def load():
    rows, warnings = [], []
    for rep in sorted(RUNS.glob("*/*/*/report.md")):
        d = front_matter(rep.read_text())
        rel = rep.parent.relative_to(RUNS)
        d["_folder"] = str(rel)
        d["_kind"] = kind(rep.parent.name)
        missing = [k for k in REQUIRED if not d.get(k)]
        if missing:
            warnings.append(f"{rel}/report.md: empty {', '.join(missing)}")
        d["time_first_min"] = minutes(d.get("t0"), d.get("t1"))
        d["time_total_min"] = minutes(d.get("t0"), d.get("t2"))
        u1 = num(d.get("t1_cost_usd")) if d.get("runner") == "claude-code" else num(d.get("t1_premium_requests"))
        u2 = num(d.get("t2_cost_usd")) if d.get("runner") == "claude-code" else num(d.get("t2_premium_requests"))
        d["usage_first"], d["usage_total"] = u1, u2
        d["rework_share"] = (u2 - u1) / u2 * 100 if u1 is not None and u2 else None
        ht, ha, hc = num(d.get("hidden_total")), num(d.get("hidden_asked")), num(d.get("hidden_covered"))
        d["first_pass_coverage"] = (ha + hc) / ht * 100 if ht and ha is not None and hc is not None else None
        rows.append(d)
    return rows, warnings


def fmt(v, unit=""):
    if v is None or v == "":
        return "–"
    if isinstance(v, float):
        if v.is_integer() or abs(v) >= 10 or unit == "%":
            return f"{v:.0f}{unit}"
        return f"{v:.1f}{unit}"
    return f"{v}{unit}"


def usage(d, key):
    v = d.get(key)
    return "–" if v is None else (f"${v:.2f}" if d.get("runner") == "claude-code" else f"{v:.0f} req")


def per_run_table(rows):
    out = ["| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | "
           "Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Judge abs | Judge s-b-s |",
           "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | ---: |"]
    key = lambda d: (d.get("task", ""), d.get("runner", ""), METHOD_ORDER.index(d["method"]) if d.get("method") in METHOD_ORDER else 99, d["_folder"])
    for d in sorted(rows, key=key):
        out.append("| " + " | ".join([
            f"`{d.get('run_id', '?')}`", f"`{d['_folder']}`", d["_kind"], d.get("status") or "–",
            fmt(d["time_first_min"]), fmt(d["time_total_min"]), usage(d, "usage_first"), usage(d, "usage_total"), fmt(d["rework_share"], "%"),
            f"{d.get('hidden_asked') or '–'} / {d.get('hidden_covered') or '–'} / {d.get('hidden_missed') or '–'}",
            fmt(d["first_pass_coverage"], "%"), d.get("followups") or "–", d.get("method_steps") or "–",
            f"{d.get('done_checks_passed') or '–'}/{d.get('done_checks_total') or '–'}", d.get("tests_pass") or "–",
            d.get("operator_score") or "–", d.get("operator_merge_ready") or "–",
            d.get("judge_absolute") or "–", d.get("judge_side_by_side") or "–"]) + " |")
    return out


def summary_tables(rows):
    out = []
    done = [d for d in rows if d["_kind"] == "run" and d.get("status") == "done"]
    for task in ("small-storage-conditions", "large-age-restriction"):
        for runner in ("claude-code", "copilot"):
            cell = [d for d in done if d.get("task") == task and d.get("runner") in (runner, runner + "-cli")]
            if not cell:
                continue
            out += ["", f"### {task} · {runner} (status done only)", "",
                    "| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |",
                    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
            for m in METHOD_ORDER:
                rs = [d for d in cell if d.get("method") == m]
                if not rs:
                    continue
                med = lambda k: (statistics.median([x for x in (num(r[k]) if not isinstance(r[k], float) else r[k] for r in rs) if x is not None])
                                 if any((r.get(k) not in (None, "")) for r in rs) else None)
                cost = med("usage_total")
                out.append("| " + " | ".join([m, str(len(rs)), fmt(med("time_first_min")), fmt(med("time_total_min")),
                                               ("–" if cost is None else (f"${cost:.2f}" if runner == "claude-code" else f"{cost:.0f} req")),
                                               fmt(med("first_pass_coverage"), "%"), fmt(med("followups")), fmt(med("method_steps")),
                                               fmt(med("done_checks_passed")), fmt(med("operator_score")), fmt(med("judge_absolute"))]) + " |")
    return out or ["", "_No runs with `status: done` yet._"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, help="also write the Markdown summary to this file")
    ap.add_argument("--csv", type=Path, help="also write one CSV row per run")
    args = ap.parse_args()
    rows, warnings = load()
    if not rows:
        sys.exit(f"no report.md found under {RUNS}")
    md = ["# Benchmark results", "", f"{len(rows)} reports in `saleor/runs/`. "
          "Compare methods only within one task and one runner (templates/README.md).", "", "## Every run", ""]
    md += per_run_table(rows) + ["", "## Comparison"] + summary_tables(rows)
    if warnings:
        md += ["", "## Missing values (fill them in the report)", ""] + [f"- {w}" for w in warnings]
    text = "\n".join(md) + "\n"
    print(text)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    if args.csv:
        args.csv.parent.mkdir(parents=True, exist_ok=True)
        keys = sorted({k for d in rows for k in d})
        with args.csv.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=keys)
            w.writeheader()
            w.writerows(rows)


if __name__ == "__main__":
    main()
