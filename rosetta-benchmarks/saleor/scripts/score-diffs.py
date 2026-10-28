#!/usr/bin/env python3
"""Totals from the diff judge's JSON (SCORE-DIFFS.md).

    python3 saleor/scripts/score-diffs.py <judge.json>

Checks the JSON, writes a "totals" object into each run of the same JSON, and prints, per
run report, the data-block fields the assistant copies into it (templates/run-report-*.md).
Total = Σ(value × weight) / Σ(10 × weight) × 100 over all metrics ("-" = 7), plus the bonus
for fixed bugs and related improvements. Exits with an error on any invalid value.
No third-party packages needed.
"""
import json
import sys
from pathlib import Path

RUNS = Path(__file__).resolve().parents[1] / "runs"

WEIGHTS = {
    "0.1": 1, "0.2": 1,
    "1.1": 1, "1.2": 0.9, "1.3": 1, "1.4": 1, "1.5": 0.75,
    "2.1": 1, "2.2": 0.9, "2.3": 1, "2.4": 1,
    "3.1": 0.9, "3.2": 0.9, "3.3": 0.9, "3.4": 0.9,
    "4.1": 0.9, "4.2": 0.9, "4.3": 0.9, "4.4": 0.75, "4.5": 1,
    "5.1": 0.75, "5.2": 0.75, "5.3": 0.5,
    "6.1": 0.9, "6.2": 0.75, "6.3": 0.75, "6.4": 0.75,
    "7.1": 0.9, "7.2": 0.75, "7.3": 0.75, "7.4": 0.5, "7.5": 0.75,
    "8.1": 0.75, "8.2": 0.5, "8.3": 0.5, "8.4": 0.5,
    "9.1": 0.5, "9.2": 0.5,
}
BONUS_WEIGHT = {"critical": 1, "high": 0.9, "medium": 0.75, "low": 0.5}
NEUTRAL = 7
ALLOWED_VALUES = {0, 1, 2, 3, 4, 5, 6, 8, 9, 10}
LEVEL_COUNT = {"critical": "blockers", "major": "majors", "minor": "minors"}


def check_run(name, run):
    errors = []
    findings = {f.get("id"): f for f in run.get("findings", [])}
    values = run.get("values", {})
    for metric in sorted(set(WEIGHTS) - set(values)):
        errors.append(f"{name}: metric {metric} has no value")
    for metric in sorted(set(values) - set(WEIGHTS)):
        errors.append(f"{name}: unknown metric {metric}")
    for metric, entry in values.items():
        v = entry.get("v")
        if v == "-":
            if not str(entry.get("checked", "")).strip():
                errors.append(f"{name}: metric {metric} is '-' without evidence ('checked')")
        elif v not in ALLOWED_VALUES:
            errors.append(f"{name}: metric {metric} has invalid value {v!r}")
        else:
            for fid in entry.get("findings", []):
                if fid not in findings:
                    errors.append(f"{name}: metric {metric} cites unknown finding {fid}")
    for fid, f in findings.items():
        if f.get("type") not in ("negative", "strength"):
            errors.append(f"{name}: finding {fid} has invalid type {f.get('type')!r}")
        if f.get("level") not in LEVEL_COUNT:
            errors.append(f"{name}: finding {fid} has invalid level {f.get('level')!r}")
    for bonus in run.get("bonus", []):
        if bonus.get("finding") not in findings:
            errors.append(f"{name}: bonus cites unknown finding {bonus.get('finding')}")
        if bonus.get("level") not in BONUS_WEIGHT:
            errors.append(f"{name}: bonus has invalid level {bonus.get('level')!r}")
    advice = run.get("merge_advice", {}).get("advice")
    if advice not in ("none", "no", "yes"):
        errors.append(f"{name}: merge_advice.advice is {advice!r}, expected none | no | yes")
    return errors


def score(values, metrics):
    num = sum((NEUTRAL if values[m]["v"] == "-" else values[m]["v"]) * WEIGHTS[m] for m in metrics)
    den = sum(10 * WEIGHTS[m] for m in metrics)
    return 100 * num / den


def totals(run):
    counts = {"blockers": 0, "majors": 0, "minors": 0, "strengths": 0}
    for f in run["findings"]:
        counts["strengths" if f["type"] == "strength" else LEVEL_COUNT[f["level"]]] += 1
    bonus = sum(BONUS_WEIGHT[b["level"]] for b in run.get("bonus", []))
    categories = {}
    for metric in WEIGHTS:
        categories.setdefault("H" + metric.split(".")[0], []).append(metric)
    return {"total": round(score(run["values"], WEIGHTS) + bonus, 1), "bonus": round(bonus, 2), **counts,
            "categories": {cat: round(score(run["values"], ms), 1) for cat, ms in categories.items()}}


def main(path):
    data = json.load(open(path))
    task, runner, runs = data.get("task"), data.get("runner"), data.get("runs")
    if not task or not runner or not isinstance(runs, dict) or not runs:
        sys.exit(f"{path}: expected {{\"task\": <task folder>, \"runner\": <runner folder>, \"runs\": {{<method folder>: ...}}}}")
    errors = []
    for name, run in runs.items():
        if not (RUNS / task / runner / name / "report.md").is_file():
            errors.append(f"{name}: no run report at saleor/runs/{task}/{runner}/{name}/report.md")
        errors += check_run(name, run)
    if errors:
        sys.exit("Invalid judge JSON:\n" + "\n".join(errors))
    print("GIVE THIS OUTPUT TO THE USER, field names unchanged, to build the run reports: "
          "each block goes into the data block of the report.md named above it.\n")
    for name, run in runs.items():
        run["totals"] = t = totals(run)
        print(f"saleor/runs/{task}/{runner}/{name}/report.md\n"
              f"judge_total: {t['total']}\njudge_bonus: {t['bonus']}\n"
              f"judge_blockers: {t['blockers']}\njudge_majors: {t['majors']}\njudge_minors: {t['minors']}\n"
              f"judge_strengths: {t['strengths']}\njudge_merge_ready_advice: {run['merge_advice']['advice']}\n")
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: score-diffs.py <judge.json>")
    main(sys.argv[1])
