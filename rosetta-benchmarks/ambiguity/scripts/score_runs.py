#!/usr/bin/env python3
"""All POC scores (METRICS.md): AS(requirements) and clarification gain per run; Trust, pass rate and
Uncertainty per cell (method x prompt version).

Usage (from the rosetta repo root):
  python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py            # print the tables and warnings
  python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py --write    # also write reports/summary.md, runs.csv, cells.csv, scores.json

Inputs, all files (nothing is typed in), per run folder runs/<task>/<runner>/<method>/<version>-r<n>/:
  report.md               Saleor report + POC fields (templates/report-additions.md): poc_schema ambiguity-poc/v2,
                          prompt_version, repeat, t1_items; Appendix B: the agent's answers at stop 1 and stop 2
  judge-requirements-r*.json   ambiguity judge (judge/ambiguity-judge.md)
  judge-claims-r*.json         claims judge (judge/claims-judge.md)
plus prompts/checklist.json, prompts/vague-terms.txt and the prompt versions (AS(prompt), scripts/as_score.py).

Runs scored with the earlier formulas (poc_schema ambiguity-poc/v1, the reused v0 runs) are listed but not scored
here: see legacy/v0-poc-formulas/.

Rules: an unknown value stays empty and is listed as a warning; it is never guessed. Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from as_score import (ambiguity, contradiction_load, coverage_gap, load_checklist, load_terms,  # noqa: E402
                      prompt_scores, scored_items, vague_density)

ROOT = Path(__file__).resolve().parent.parent  # rosetta-benchmarks/ambiguity
REPORTS = ROOT / "reports"
SCHEMA = "ambiguity-poc/v2"
STATED = {"yes": 1.0, "partly": 0.5, "no": 0.0}


# ── parsing ──────────────────────────────────────────────────────────────────

def front_matter(text: str) -> dict:
    """Data block between the first two `---` lines; same rules as saleor/scripts/collect-results.py."""
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    data = {}
    for line in (m.group(1) if m else "").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        data[key.strip()] = re.sub(r"\s+#.*$", "", val).strip()
    return data


def section(text: str, heading_re: str) -> str:
    m = re.search(rf"^## {heading_re}.*?$(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def appendix_message(report: str, summary_re: str) -> str | None:
    """Text of the Appendix B <details> whose summary matches: its first fenced block, or else its quote block."""
    appendix = section(report, r"Appendix B")
    for m in re.finditer(r"<details><summary>(.*?)</summary>(.*?)</details>", appendix, re.S):
        if re.search(summary_re, m.group(1), re.I):
            fence = re.search(r"```[a-z]*\n(.*?)\n```", m.group(2), re.S)
            if fence and fence.group(1).strip():
                return fence.group(1).strip()
            quoted = [re.sub(r"^>\s?", "", ln) for ln in m.group(2).splitlines() if ln.startswith(">")]
            if any(q.strip() for q in quoted):
                return "\n".join(quoted).strip()
    return None


def load_json(paths: list[Path]) -> list[dict]:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(paths)]


# ── per run ──────────────────────────────────────────────────────────────────

def score_run(folder: Path, rel: str, checklist: dict, terms: list[str], as_prompt: dict, warnings: list[str]) -> dict | None:
    report_path = folder / "report.md"
    own = report_path if report_path.is_file() else folder / "README.md"
    if not own.is_file():
        return None
    report = own.read_text(encoding="utf-8")
    data = front_matter(report)
    if data.get("poc_schema") != SCHEMA:
        return {"run_id": data.get("run_id") or rel, "folder": rel, "scored": False,
                "note": f"poc_schema {data.get('poc_schema') or '–'}: earlier formulas (legacy/v0-poc-formulas)"}
    parts = Path(rel).parts                       # task / runner / method / version-rN
    d = {"run_id": data.get("run_id") or rel, "folder": rel, "scored": True, "method": parts[2],
         "prompt_version": data.get("prompt_version"), "repeat": data.get("repeat")}
    miss = lambda what: warnings.append(f"{d['run_id']}: {what}")
    items, scored = checklist["items"], scored_items(checklist)
    scored_nos = [n for n, i in enumerate(items, 1) if not i.get("general")]

    # AS(prompt) and AS(requirements)
    d["as_prompt"] = as_prompt.get(d["prompt_version"])
    if d["as_prompt"] is None:
        miss(f"prompt_version {d['prompt_version']!r} has no AS")
    req_text = appendix_message(report, r"stop 1")
    reqs = load_json(list(folder.glob("judge-requirements-r*.json")))
    d["judge_requirements_runs"] = len(reqs)
    d["as_requirements"] = d["clarification_gain"] = d["coverage_gap"] = d["vague_density"] = d["unresolved"] = None
    if req_text is None:
        miss("no stop-1 answer in Appendix B")
    if not reqs:
        miss("no judge-requirements-r*.json")
    elif len(reqs) != 3:
        miss(f"{len(reqs)} ambiguity-judge runs, 3 expected")
    if req_text is not None and reqs:
        stated = []
        for n in scored_nos:
            vals = []
            for j in reqs:
                row = next((x for x in j.get("items", []) if int(x.get("item", 0)) == n), None)
                if row is None or row.get("stated") not in STATED:
                    miss(f"ambiguity judge run {j.get('judge_run', '?')}: item {n} missing or not yes/partly/no; counted as no")
                    vals.append(0.0)
                else:
                    vals.append(STATED[row["stated"]])
            stated.append(statistics.median(vals))
        d["unresolved"] = statistics.median(len(j.get("unresolved_contradictions", []) or []) for j in reqs)
        d["coverage_gap"] = coverage_gap(stated, scored)
        d["vague_density"] = vague_density(req_text, terms)
        d["as_requirements"] = ambiguity(d["coverage_gap"], d["vague_density"], contradiction_load(d["unresolved"]))
        if d["as_prompt"] is not None:
            d["clarification_gain"] = d["as_prompt"] - d["as_requirements"]

    # Checklist items at "done" (t1_items) and the agent's flags (claims judge)
    raw = [c.strip() for c in str(data.get("t1_items") or "").split(",") if c.strip()]
    d["t1_items"] = [int(c) for c in raw] if len(raw) == len(items) and all(c in ("0", "1") for c in raw) else None
    if d["t1_items"] is None:
        miss(f"t1_items missing or not {len(items)} values of 0/1")
    if appendix_message(report, r"stop 2") is None:
        miss("no stop-2 answer in Appendix B")
    claims = load_json(list(folder.glob("judge-claims-r*.json")))
    d["judge_claims_runs"] = len(claims)
    if not claims:
        miss("no judge-claims-r*.json")
        d["flagged"] = None
    else:
        if len(claims) != 3:
            miss(f"{len(claims)} claims-judge runs, 3 expected")
        counts = {}
        for j in claims:
            for n in {int(x.get("item", 0)) for x in j.get("flagged", []) or []}:
                counts[n] = counts.get(n, 0) + 1
        d["flagged"] = sorted(n for n, c in counts.items() if c * 2 > len(claims))
    d["passed"] = d["confident_wrong"] = None
    if d["t1_items"] is not None and d["flagged"] is not None:
        d["passed"] = sum(d["t1_items"])
        d["confident_wrong"] = sum(1 for n, ok in enumerate(d["t1_items"], 1) if not ok and n not in d["flagged"])
    return d


# ── per cell ─────────────────────────────────────────────────────────────────

def mean_or_none(vals):
    vals = [v for v in vals if v is not None]
    return statistics.mean(vals) if vals else None


def score_cells(runs: list[dict], n_items: int, warnings: list[str]) -> list[dict]:
    cells = {}
    for d in runs:
        if d["scored"]:
            cells.setdefault((d["method"], d["prompt_version"]), []).append(d)
    out = []
    for (method, version), rs in sorted(cells.items()):
        c = {"method": method, "version": version, "runs": len(rs), "as_prompt": rs[0]["as_prompt"],
             "as_requirements": mean_or_none([d["as_requirements"] for d in rs]),
             "clarification_gain": mean_or_none([d["clarification_gain"] for d in rs])}
        done = [d for d in rs if d["passed"] is not None]
        if len(done) < len(rs):
            warnings.append(f"{method} {version}: {len(rs) - len(done)} run(s) without checks or claims; Trust and pass rate use {len(done)}")
        total = n_items * len(done)
        c["trust"] = 1 - sum(d["confident_wrong"] for d in done) / total if done else None
        c["pass_rate"] = sum(d["passed"] for d in done) / total if done else None
        if len(done) >= 2:
            differ = sum(1 for k in range(n_items) if len({d["t1_items"][k] for d in done}) > 1)
            c["uncertainty"] = differ / n_items
        else:
            c["uncertainty"] = None
        out.append(c)
    return out


# ── output ───────────────────────────────────────────────────────────────────

def fmt(v):
    if v is None:
        return "–"
    return f"{v:.3f}" if isinstance(v, float) else str(v)


def r3(v):
    if isinstance(v, float):
        return round(v, 3)
    if isinstance(v, list):
        return [r3(x) for x in v]
    if isinstance(v, dict):
        return {k: r3(x) for k, x in v.items()}
    return v


def compute(runs_dir: Path = ROOT / "runs") -> dict:
    checklist, terms = load_checklist(), load_terms()
    as_prompt = {r["version"]: r["as"] for r in prompt_scores(checklist, terms)}
    warnings, runs = [], []
    for folder in sorted(p for p in runs_dir.glob("*/*/*/*") if p.is_dir()):
        d = score_run(folder, str(folder.relative_to(runs_dir)), checklist, terms, as_prompt, warnings)
        if d:
            runs.append(d)
    return {"as_prompt": as_prompt, "runs": runs, "cells": score_cells(runs, len(checklist["items"]), warnings),
            "warnings": warnings}


RUN_COLS = ["run_id", "method", "prompt_version", "repeat", "as_prompt", "as_requirements", "clarification_gain",
            "coverage_gap", "vague_density", "unresolved", "passed", "confident_wrong", "flagged", "t1_items",
            "judge_requirements_runs", "judge_claims_runs", "folder"]
CELL_COLS = ["method", "version", "runs", "as_prompt", "as_requirements", "clarification_gain", "trust", "pass_rate", "uncertainty"]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", type=Path, default=ROOT / "runs")
    ap.add_argument("--write", action="store_true", help="write reports/summary.md, runs.csv, cells.csv, scores.json")
    args = ap.parse_args()
    res = compute(args.runs)
    scored = [d for d in res["runs"] if d["scored"]]
    md = ["# Ambiguity POC: results (generated)", "",
          "> Generated by `scripts/score_runs.py`. Do not edit by hand. Formulas: [METRICS.md](../METRICS.md). "
          "Every value: [scores.json](./scores.json), [runs.csv](./runs.csv), [cells.csv](./cells.csv).", "",
          "## Per tool and prompt version", "",
          "| Method | Version | Runs | AS(prompt) | AS(requirements) | Clarification gain | Trust | Pass rate | Uncertainty |",
          "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for c in res["cells"]:
        md.append("| " + " | ".join(fmt(c[k]) for k in CELL_COLS) + " |")
    md += ["", "## Runs", "", "| Run | Version | AS(requirements) | Gain | Items passed | Confident-wrong | Flagged items |",
           "| --- | --- | ---: | ---: | ---: | ---: | --- |"]
    for d in scored:
        flagged = ", ".join(map(str, d["flagged"])) if d["flagged"] else d["flagged"]
        md.append("| " + " | ".join(fmt(x) for x in [d["run_id"], d["prompt_version"], d["as_requirements"],
                                                       d["clarification_gain"], d["passed"], d["confident_wrong"], flagged]) + " |")
    legacy = [d for d in res["runs"] if not d["scored"]]
    if legacy:
        md += ["", "## Not scored here", ""] + [f"- {d['run_id']}: {d['note']}" for d in legacy]
    if res["warnings"]:
        md += ["", "## Missing or inconsistent values (fill them in the run folder, never guess)", ""] + [f"- {w}" for w in res["warnings"]]
    text = "\n".join(md) + "\n"
    print(text)
    if args.write:
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / "summary.md").write_text(text, encoding="utf-8")
        (REPORTS / "scores.json").write_text(json.dumps(r3(res), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        for name, cols, rows in (("runs.csv", RUN_COLS, scored), ("cells.csv", CELL_COLS, res["cells"])):
            with (REPORTS / name).open("w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
                w.writeheader()
                for row in rows:
                    w.writerow({k: (json.dumps(v) if isinstance(v, list) else r3(v)) for k, v in row.items() if k in cols})


if __name__ == "__main__":
    main()
