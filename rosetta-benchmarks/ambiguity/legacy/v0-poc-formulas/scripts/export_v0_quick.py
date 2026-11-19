#!/usr/bin/env python3
"""Data files for the quick v0 report: the reused Saleor v0 runs that have trust-judge results.

  python3 rosetta-benchmarks/ambiguity/scripts/export_v0_quick.py      (after collect_runs.py --write)

Reads reports/scores.json, reports/as-scores.csv and the runs' trust-judge files; writes
reports/v0-existing-runs/{methods,sensitivity,judge-runs,ladder}.json. Standard library only.
"""
import csv, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
AMB = ROOT.parent.parent
OUT = ROOT / "reports" / "v0-existing-runs"
NAMES = {"baseline": "Baseline", "rosetta-skills": "Rosetta Skills", "grill-with-docs": "Grill-with-docs", "superpowers": "Superpowers"}
OLDER = {"grill-with-docs", "superpowers"}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sc = json.load(open(ROOT / "reports" / "scores.json"))
    asr = {r["version"]: r for r in csv.DictReader(open(ROOT / "reports" / "as-scores.csv"))}
    runs = {r["method"]: r for r in sc["runs"] if r["prompt_version"] == "v0" and r["trust7"] is not None}
    cells = {c["method"]: c for c in sc["cells"] if c["version"] == "v0"}
    order = [m for m in NAMES if m in runs]
    src = [{"label": "Generated from", "value": "reports/scores.json (scripts/score_runs.py), reports/as-scores.csv (scripts/as_score.py), by scripts/export_v0_quick.py"}]
    rows, sens, jr = [], [], []
    for m in order:
        r, c = runs[m], cells[m]
        rows.append({"method": NAMES[m], "run_id": r["run_id"].replace("-v0-r1", ""), "older_setup": m in OLDER, "as_v0": float(asr["v0"]["as"]),
                     "hidden_matches": round(r["correctness7"] * 7), "correctness": r["correctness7"],
                     "constraint_fidelity": r["judge_constraint_fidelity"], "assumption_transparency": r["judge_assumption_transparency"],
                     "calibration": r["judge_calibration"], "trust": r["trust7"], "ut": c["UT"], "judge_stability": r["js_run"], "judge_runs": r["judge_runs"],
                     "decision_ownership": r["decision_ownership"], "silent_share": r["silent_share"], "decision_counts": r["decision_counts"],
                     "questions_asked": r["ask_rate"], "hidden_asked": round(r["hidden_ask_share"] * 7), "first_pass_coverage": r["first_pass_coverage"],
                     "confident_wrong": r["confident_wrong"], "followups": c["followups"],
                     "time_min": c["time_total_min"], "cost_usd": c["cost_usd"],
                     "saleor_diff_judge": float(r["judge_total"]), "operator_score": int(r["operator_score"]), "merge_ready": r["operator_merge_ready"]})
        sens += [{"method": NAMES[m], "weight_set": k, "ut": v} for k, v in c["UT_alt"].items()]
        folder = ROOT / "runs" / "small-storage-conditions" / "claude-code" / m / "v0-r1"
        for f in sorted(folder.glob("trust-judge-r*.json")):
            j, n = json.load(open(f)), int(f.stem.rsplit("r", 1)[1])
            jr.append({"method": NAMES[m], "judge_run": n, **{k: j[k]["score"] for k in ("constraint_fidelity", "assumption_transparency", "calibration")},
                       "session_id": j.get("session_id")})
    dims = {"v0": "Original prompt", "v1": "+ vague goals", "v2": "+ no definition of done", "v3": "+ no example value", "v4": "+ vague context", "v5": "+ two contradictions"}
    lad = [{"version": v, "change": dims[v], "as": float(asr[v]["as"]), "judge_total": float(asr[v]["judge_total_0_10"])} for v in dims]
    for name, data in (("methods", rows), ("sensitivity", sens), ("judge-runs", jr), ("ladder", lad)):
        (OUT / f"{name}.json").write_text(json.dumps({"rows": data, "meta": src}, indent=1) + "\n", encoding="utf-8")
    print("methods:", ", ".join(NAMES[m] for m in order), "->", OUT)

if __name__ == "__main__":
    main()
