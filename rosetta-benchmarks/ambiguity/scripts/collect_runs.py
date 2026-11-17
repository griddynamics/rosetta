#!/usr/bin/env python3
"""Collect the POC results into reports/summary.md, reports/runs.csv and reports/cells.csv.

Usage (from the rosetta repo root):
  python3 rosetta-benchmarks/ambiguity/scripts/collect_runs.py            # print the summary
  python3 rosetta-benchmarks/ambiguity/scripts/collect_runs.py --write    # write summary.md, runs.csv, cells.csv, scores.json

Task 1 comes from reports/as-scores.csv (scripts/as_score.py) and judge/results/human-ranking.md
(lines "1. v2", "2. v0", … from clearest to most ambiguous). Task 2 comes from scripts/score_runs.py,
which reads every run folder (formulas: METRICS.md). Same layout as the skeleton it replaces; missing
values are "–" and are listed at the end, never guessed (as in the Saleor collect-results.py).
Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import score_runs as sr  # noqa: E402
from as_score import spearman  # noqa: E402

ROOT = sr.ROOT
REPORTS = ROOT / "reports"
DIMENSION_ADDED = {"v0": "– (reference)", "v1": "Goals", "v2": "Constraints", "v3": "Inputs", "v4": "Context", "v5": "Contradiction"}
RHO_MIN = 0.83   # METRICS.md 1.3


def f(v, digits=2, pct=False, usd=False):
    if v is None or v == "":
        return "–"
    if isinstance(v, bool):
        return "pass" if v else "**FAIL**"
    if usd:
        return f"${v:.2f}"
    if pct:
        return f"{v * 100:.0f}%"
    if isinstance(v, float):
        return f"{v:.{digits}f}"
    return str(v)


def human_ranks(path: Path) -> dict[str, float]:
    if not path.is_file():
        return {}
    order = re.findall(r"^\s*(\d+)\.\s*(v\d)\b", path.read_text(encoding="utf-8"), re.M)
    return {v: float(n) for n, v in order}


def task1() -> tuple[list[str], dict]:
    path = REPORTS / "as-scores.csv"
    if not path.is_file():
        return ["", "_No `as-scores.csv`: run `scripts/as_score.py` first._"], {"A1": None, "A2": None, "A3": None, "A4": None}
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    full = all(r["as"] for r in rows)
    key = "as" if full else "as_partial"
    hr = human_ranks(ROOT / "judge" / "results" / "human-ranking.md")
    out = ["", "Generated table: [as-scores.md](./as-scores.md)." + ("" if full else
           " **AS is partial** (no ambiguity-judge results yet: interpretation spread missing)."), "",
           "| Version | Dimension added | AS | Judge total (0–10) | Human rank | Run in POC |",
           "| --- | --- | ---: | ---: | ---: | --- |"]
    for r in rows:
        out.append(f"| {r['version']} | {DIMENSION_ADDED.get(r['version'], '–')} | {r[key]}{'' if full else ' (partial)'} | "
                   f"{r['judge_total_0_10'] or '–'} | {f(hr.get(r['version']), 0)} | {'yes' if r['version'] in sr.VERSIONS else 'no'} |")
    seq = [float(r[key]) for r in rows]
    g = {"A1": all(a < b for a, b in zip(seq, seq[1:])) if full else None}
    jt = [r["judge_total_0_10"] for r in rows]
    rho2 = spearman(seq, [float(x) for x in jt]) if full and all(jt) else None
    g["A2"] = None if rho2 is None else rho2 >= RHO_MIN
    g["A3"] = None   # checked by hand against the judge's quoted contradictions (judge/ambiguity-judge.md)
    rho4 = spearman(seq, [hr[r["version"]] for r in rows]) if full and len(hr) == len(rows) else None
    g["A4"] = None if rho4 is None else rho4 >= RHO_MIN
    partial_order = all(a < b for a, b in zip(seq, seq[1:]))
    out += ["", f"Gates: A1 order {f(g['A1'])} · A2 ρ(AS, judge) = {f(rho2)} → {f(g['A2'])} · "
            f"A3 contradictions: checked by hand · A4 ρ(AS, human) = {f(rho4)} → {f(g['A4'])}."]
    if not full:
        out.append(f"Partial AS order v0 < … < v5: {'yes' if partial_order else 'NO'} (A1 is decided on the full AS).")
    return out, g


def task2(res: dict) -> list[str]:
    cells = res["cells"]
    out = ["", "One row per cell (method × version). v0 = the one Saleor run per method, as recorded (no r2, no Consistency, "
           "no full Uncertainty); v3 and v5 = 2 repeats. ¹ = older setup (`S-CC-02`, `S-CC-03`, see EXPERIMENTS.md). "
           "² = v5: hidden questions 2 and 4 (and T1 check 4) are stated or contradicted in the prompt itself, so in Trust and "
           "first-pass coverage they show what the run did with the prompt, not requirements it found by itself; the "
           "contradiction score is the measure for K1 and K2 (METRICS.md 2.2).", "",
           "| Method | Version | AS | Trust r1 / r2 | Consistency | UT | **Uncertainty** | Outcome class | Ask rate (mean) | "
           "Hedge density | Confident-wrong | Contradiction score | First-pass coverage | Follow-ups (mean) | Time total (mean, min) | Cost (mean) |",
           "| --- | --- | ---: | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for m, name in sr.METHODS.items():
        for v in sr.VERSIONS:
            mark = "¹" if (v == "v0" and m in sr.OLDER_SETUP) else ("²" if v == "v5" else "")
            c = cells.get((m, v))
            v0 = v == "v0"
            na = lambda x: "n/a" if v0 else f(x)
            if not c:
                out.append(f"| {name} | {v}{mark} | – | – / {'n/a' if v0 else '–'} | {'n/a' if v0 else '–'} | – | "
                           f"{'n/a' if v0 else '–'} | {'n/a' if v0 else '–'} | – | – | – | {'–' if v == 'v5' else 'n/a'} | – | – | – | – |")
                continue
            t = c["trust"] + [None] * (2 - len(c["trust"]))
            trust = f"{f(t[0])} / {'n/a' if v0 else f(t[1])}"
            out.append("| " + " | ".join([
                name, v + mark, f(c["AS"], 3), trust, na(c["consistency"]), f(c["UT"]), na(c["U"]),
                "n/a" if v0 else (c["outcome"] or "–"), f(c["ask_rate"], 1), f(c["hedge_density"]), f(c["confident_wrong"]),
                f(c["contradiction_score"]) if v == "v5" else "n/a", f(c["first_pass_coverage"], pct=True), f(c["followups"], 1),
                f(c["time_total_min"], 0), f(c["cost_usd"], usd=True)]) + " |")
    out += ["", "Consistency parts (v3, v5): CA checkpoint agreement · DO diff overlap · SC summary similarity · JS judge stability.", "",
            "| Method | Version | CA | DO | SC | JS |", "| --- | --- | ---: | ---: | ---: | ---: |"]
    for (m, v), c in cells.items():
        if v != "v0":
            out.append(f"| {sr.METHODS[m]} | {v} | {f(c['CA'])} | {f(c['DO'])} | {f(c['SC'])} | {f(c['JS'])} |")
    noise = [(k, c) for k, c in cells.items() if "noise_trust_all_repeats" in c]
    for (m, v), c in noise:
        out.append(f"\nNoise ({sr.METHODS[m]} {v}, optional 3rd repeat): Trust of all repeats "
                   f"{' / '.join(f(x) for x in c['noise_trust_all_repeats'])}, largest difference {f(c['noise_max_trust_diff'])}.")
    return out


def per_method(res: dict) -> list[str]:
    cells, meths = res["cells"], res["methods"]
    out = ["", "| Method | UT(v0) → UT(v3) → UT(v5); U(v3) → U(v5) | Ask calibration ρ | Detection / clarification / silent-failure (v5) | Flag (high-AS half) |",
           "| --- | --- | ---: | --- | --- |"]
    for m, name in sr.METHODS.items():
        ut = " → ".join(f(cells.get((m, v), {}).get("UT")) for v in sr.VERSIONS)
        u = " → ".join(f(cells.get((m, v), {}).get("U")) for v in ("v3", "v5"))
        o = meths.get(m, {})
        dcs = " / ".join(f(o.get(k), pct=True) for k in ("detection", "clarification", "silent_failure"))
        out.append(f"| {name} | {ut}; {u} | {f(o.get('ask_calibration'))} | {dcs} | {o.get('flag') or '–'} |")
    return out


def gates_section(res: dict, g1: dict) -> list[str]:
    g = res["gates"]
    t7 = g["trust7_reported"]
    t7s = "; ".join(f"{sr.METHODS[m]} " + " → ".join(f(t7[m][v]) for v in sr.VERSIONS) for m in t7)
    u1d = g["U1_detail"]
    u2 = f(g["U2"]) + (f" (mean gap {f(g.get('U2_gap'))})" if g.get("U2_gap") is not None else "")
    all_g = {**g1, "U1": g["U1"], "U2": g["U2"]}
    if any(v is False for v in all_g.values()):
        decision = "**no-go**: " + ", ".join(k for k, v in all_g.items() if v is False) + " failed"
    else:
        pending = [k for k, v in all_g.items() if v is None]
        pending_auto = [k for k in pending if k != "A3"]
        decision = ("**go** if A3 passes (checked by hand)" if not pending_auto
                    else "open: " + ", ".join(pending) + " not available yet")
    return ["", "| Gate | Result |", "| --- | --- |",
            f"| U1 Uncertainty rises (Baseline) | {f(g['U1'])} (UT {' → '.join(f(u1d['UT'][v]) for v in sr.VERSIONS)}; "
            f"U {' → '.join(f(u1d['U'][v]) for v in ('v3', 'v5'))}) |",
            f"| Reported, not gated: Trust7 at v0 → v3 → v5, Rosetta Skills next to Baseline | {t7s} |",
            f"| U2 Rosetta Skills beats Baseline | {u2} |",
            f"| Validation: ρ(Consistency, uncertainty-judge consistency) | {f(g['validation_consistency_rho'])} (n = {g['validation_consistency_n']}) |",
            f"| Validation: Cohen's κ, contradiction labels (judge vs operator) | {f(g['kappa'])} (n = {g['kappa_n']}) |",
            f"| **Go / no-go** | {decision} |",
            "", "Grill-with-docs and Superpowers are in the tables above as data, with no gate and no verdict (METRICS.md 4.1)."]


def csv_rows(res: dict) -> tuple[list[dict], list[dict]]:
    runs = []
    for d in res["runs"]:
        row = {k: sr.r3(d.get(k)) for k in sr.RUN_KEYS}
        for k in ("k_labels", "k_judge", "k_scores"):
            row[k] = json.dumps(row[k], sort_keys=True) if row[k] else ""
        row.update(folder=d["_folder"], followups=d.get("followups"), total_min=d.get("total_min"),
                   t2_cost_usd=d.get("t2_cost_usd"), hidden_values=",".join(f"{x:g}" for x in d["hidden"] or []),
                   t1_checks=",".join(str(x) for x in d["t1_checks"] or []))
        runs.append(row)
    cells = []
    for c in res["cells"].values():
        row = {k: sr.r3(v) for k, v in c.items()}
        for k in ("runs", "trust", "trust7", "noise_trust_all_repeats"):
            if k in row:
                row[k] = ";".join("" if x is None else str(x) for x in row[k])
        cells.append(row)
    return runs, cells


def write_csv(path: Path, rows: list[dict]) -> None:
    keys = list(dict.fromkeys(k for r in rows for k in r))
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", type=Path, default=ROOT / "runs")
    ap.add_argument("--embed", action="store_true", help="compute SC values missing from reports/sc-cache.json")
    ap.add_argument("--write", action="store_true", help="write reports/summary.md, runs.csv, cells.csv, scores.json")
    args = ap.parse_args()
    res = sr.compute(args.runs, args.embed)
    t1, g1 = task1()
    n_done = sum(d.get("status") == "done" for d in res["runs"])
    md = ["# Ambiguity POC: results", "",
          f"> Generated by `scripts/collect_runs.py` from {len(res['runs'])} run folders ({n_done} done). Do not edit by hand. "
          "Formulas: [METRICS.md](../METRICS.md). Every value per run and per cell: [scores.json](./scores.json), "
          "[runs.csv](./runs.csv), [cells.csv](./cells.csv).", "",
          "## Task 1: ambiguity of the prompts"] + t1
    md += ["", "## Task 2: uncertainty per method and version"] + task2(res)
    md += ["", "## Per method"] + per_method(res)
    md += ["", "## Gates and decision"] + gates_section(res, g1)
    md += ["", "## Charts", "", "1. AS (x) vs Uncertainty (y), one line per method: UT at v0, v3, v5; U at v3, v5.",
           "2. AS (x) vs Trust7 (v0, v3, v5) and Consistency (v3, v5), per method.", "", "Generated by `scripts/charts.py` (phase 3)."]
    if res["warnings"]:
        md += ["", "## Missing or inconsistent values (fill them in the run folder, never guess)", ""] + [f"- {w}" for w in res["warnings"]]
    text = "\n".join(md) + "\n"
    print(text)
    if args.write:
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / "summary.md").write_text(text, encoding="utf-8")
        (REPORTS / "scores.json").write_text(json.dumps(sr.to_json(res), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        runs, cells = csv_rows(res)
        if runs:
            write_csv(REPORTS / "runs.csv", runs)
        if cells:
            write_csv(REPORTS / "cells.csv", cells)


if __name__ == "__main__":
    main()
