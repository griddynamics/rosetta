#!/usr/bin/env python3
"""Ambiguity Score (AS) for every prompt version of the ladder (METRICS.md, section 1).

Deterministic parts come from the prompt files, prompts/checklist.json and prompts/vague-terms.txt.
Interpretation spread comes from the ambiguity judge's JSON files (judge/results/<version>-r<k>.json),
if they exist. Without them, the table shows a partial AS (marked) and no validation.

Usage (from the rosetta repo root):
  python3 rosetta-benchmarks/ambiguity/scripts/as_score.py \
    --out rosetta-benchmarks/ambiguity/reports/as-scores.md --csv rosetta-benchmarks/ambiguity/reports/as-scores.csv

Standard library only. Same inputs give the same output.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # rosetta-benchmarks/ambiguity
DEFAULT_WEIGHTS = {"coverage_gap": 0.35, "vague_density": 0.15, "contradiction_load": 0.25, "interpretation_spread": 0.25}
DIMENSIONS = ["goals", "constraints", "inputs", "context", "contradiction"]


def load_terms(path: Path) -> list[str]:
    terms = [ln.strip().lower() for ln in path.read_text(encoding="utf-8").splitlines()]
    terms = [t for t in terms if t and not t.startswith("#")]
    return sorted(set(terms), key=len, reverse=True)  # longest first


def vague_matches(text: str, terms: list[str]) -> list[str]:
    """Matches of the fixed term list, longest first; a matched span is not counted again."""
    low = text.lower()
    taken = [False] * len(low)
    found = []
    for term in terms:
        for m in re.finditer(r"(?<![\w])" + re.escape(term) + r"(?![\w])", low):
            if any(taken[m.start():m.end()]):
                continue
            for i in range(m.start(), m.end()):
                taken[i] = True
            found.append(term)
    return found


def word_count(text: str) -> int:
    return len(text.split())


def priority(d: dict) -> float:
    return d["criticality"] * (1 - d["guessability"])


def coverage_gap(version: str, details: list[dict]) -> float:
    total = sum(priority(d) for d in details)
    present = sum(priority(d) for d in details if version in d["present_in"])
    return 1 - present / total if total else 0.0


def judge_runs(judge_dir: Path, version: str) -> list[dict]:
    runs = []
    for p in sorted(judge_dir.glob(f"{version}-r*.json")):
        runs.append(json.loads(p.read_text(encoding="utf-8")))
    return runs


def interpretation_spread(runs: list[dict]) -> float | None:
    if not runs:
        return None
    vals = [min(1.0, max(0.0, (len(r.get("interpretations", [])) - 1) / 4)) for r in runs]
    return statistics.mean(vals)


def judge_total(runs: list[dict]) -> float | None:
    """Mean over judge runs of the sum of the five 0-2 dimension ratings (0-10)."""
    if not runs:
        return None
    return statistics.mean(sum(r["ratings"][d] for d in DIMENSIONS) for r in runs)


def ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=lambda i: values[i])
    r = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            r[order[k]] = avg
        i = j + 1
    return r


def spearman(x: list[float], y: list[float]) -> float | None:
    if len(x) < 3:
        return None
    rx, ry = ranks(x), ranks(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompts", type=Path, default=ROOT / "prompts")
    ap.add_argument("--judge-dir", type=Path, default=ROOT / "judge" / "results")
    ap.add_argument("--weights", default=",".join(str(v) for v in DEFAULT_WEIGHTS.values()),
                    help="coverage_gap,vague_density,contradiction_load,interpretation_spread")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--csv", type=Path)
    args = ap.parse_args()

    w = dict(zip(DEFAULT_WEIGHTS, (float(v) for v in args.weights.split(","))))
    checklist = json.loads((args.prompts / "checklist.json").read_text(encoding="utf-8"))
    terms = load_terms(args.prompts / "vague-terms.txt")
    details, contradictions = checklist["details"], checklist["contradictions"]

    rows = []
    for v in checklist["versions"]:
        text = (args.prompts / f"{v}.txt").read_text(encoding="utf-8")
        words = word_count(text)
        matches = vague_matches(text, terms)
        cg = coverage_gap(v, details)
        vd = min(1.0, (len(matches) / words * 100) / 5) if words else 0.0
        planted = sum(1 for k in contradictions if v in k["versions"])
        cl = min(1.0, planted / 2)
        runs = judge_runs(args.judge_dir, v)
        isp = interpretation_spread(runs)
        partial = w["coverage_gap"] * cg + w["vague_density"] * vd + w["contradiction_load"] * cl
        as_full = partial + w["interpretation_spread"] * isp if isp is not None else None
        rows.append({
            "version": v, "words": words, "vague_terms": "; ".join(matches), "coverage_gap": round(cg, 3),
            "vague_density": round(vd, 3), "contradiction_load": round(cl, 3),
            "interpretation_spread": "" if isp is None else round(isp, 3), "judge_runs": len(runs),
            "judge_total_0_10": "" if (jt := judge_total(runs)) is None else round(jt, 2),
            "as_partial": round(partial, 3), "as": "" if as_full is None else round(as_full, 3),
        })

    key = "as" if all(r["as"] != "" for r in rows) else "as_partial"
    seq = [r[key] for r in rows]
    monotonic = all(a < b for a, b in zip(seq, seq[1:]))
    rho = None
    if all(r["judge_total_0_10"] != "" for r in rows):
        rho = spearman([r["as"] if r["as"] != "" else r["as_partial"] for r in rows], [r["judge_total_0_10"] for r in rows])

    lines = [
        "# Ambiguity scores (generated)",
        "",
        "Generated by `scripts/as_score.py`. Do not edit by hand. Formulas: [METRICS.md](../METRICS.md), section 1.",
        f"Weights: coverage gap {w['coverage_gap']}, vague density {w['vague_density']}, contradiction load {w['contradiction_load']}, interpretation spread {w['interpretation_spread']}.",
        f"Checklist status: {checklist.get('status', '')}.",
        "",
        "| Version | Words | Vague terms found | Coverage gap | Vague density | Contradiction load | Interpretation spread | Judge runs | Judge total (0–10) | AS (partial, no spread) | AS |",
        "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for r in rows:
        lines.append(f"| {r['version']} | {r['words']} | {r['vague_terms'] or '–'} | {r['coverage_gap']} | {r['vague_density']} | {r['contradiction_load']} | {r['interpretation_spread'] or '–'} | {r['judge_runs']} | {r['judge_total_0_10'] or '–'} | {r['as_partial']} | {r['as'] or '–'} |")
    lines += [
        "",
        "## Validation (METRICS.md, section 1.3)",
        "",
        f"- Order v0 < … < v5 by {'AS' if key == 'as' else 'partial AS (no judge results yet)'}: **{'yes' if monotonic else 'NO'}**.",
        f"- Spearman ρ (AS vs judge total), n = {len(rows)}: **{'not available (no judge results)' if rho is None else round(rho, 3)}**. Gate: ρ ≥ 0.83.",
    ]
    text = "\n".join(lines) + "\n"
    if args.out:
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text)
    if args.csv:
        with args.csv.open("w", newline="", encoding="utf-8") as f:
            wr = csv.DictWriter(f, fieldnames=list(rows[0]))
            wr.writeheader()
            wr.writerows(rows)


if __name__ == "__main__":
    main()
