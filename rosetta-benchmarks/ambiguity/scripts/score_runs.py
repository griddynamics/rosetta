#!/usr/bin/env python3
"""Scores of Task 2 (METRICS.md, sections 2-4): Trust per run, Consistency and Uncertainty per cell,
behavior measures, contradiction scores, gates U1-U2 and the two validations.

Usage (from the rosetta repo root):
  python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py            # per-run and per-cell tables + warnings
  python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py --json rosetta-benchmarks/ambiguity/reports/scores.json
  python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py --embed    # also compute missing SC values (needs sentence-transformers)

Inputs, all files (nothing is typed in):
- runs/<task>/<runner>/<method>/<version>-r<n>/
    report.md            new POC run: Saleor data block + POC fields (templates/report-additions.md)
    README.md            reused v0 run: POC fields + `saleor_folder`, pointing to the Saleor run (report read there)
    t1/<repo>.diff       T1 snapshot (RUNBOOK.md step 7); used for diff overlap
    trust-judge-r1..3.json
- runs/<task>/<runner>/<method>/<version>-uncertainty-judge.json   (validation only)
- reports/as-scores.csv  (scripts/as_score.py)
- reports/sc-cache.json  summary-similarity values, so SC is reproducible without the embedding model

Rules: an unknown value stays empty and is listed as a warning; it is never guessed (as in the Saleor benchmark).
Standard library only, except `--embed` (sentence-transformers, model all-MiniLM-L6-v2).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from as_score import load_terms, spearman, vague_matches, word_count  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent          # rosetta-benchmarks/ambiguity
BENCH = ROOT.parent                                    # rosetta-benchmarks
REPOS = ["saleor", "saleor-dashboard", "react-storefront"]
METHODS = {"baseline": "Baseline", "rosetta-skills": "Rosetta Skills", "grill-with-docs": "Grill-with-docs", "superpowers": "Superpowers"}
VERSIONS = ["v0", "v3", "v5"]
OLDER_SETUP = {"grill-with-docs", "superpowers"}       # v0 runs S-CC-02, S-CC-03 (EXPERIMENTS.md)

# METRICS.md 2.2: Trust weights (correctness + three judge criteria = 1.0)
W_CORRECTNESS, W_JUDGE_EACH = 0.40, 0.20
JUDGE_CRITERIA = ["constraint_fidelity", "assumption_transparency", "calibration"]
MAX_STD_3 = 0.943                                      # METRICS.md 2.1: largest population std of three 0-2 scores
N_HIDDEN, N_T1 = 7, 8
# METRICS.md 3
LABELS = ["asked", "resolved-explicit", "silent-latest", "silent-earliest", "silent-hybrid"]
# METRICS.md 4.1
TOL, MIN_RISE, MIN_GAP = 0.05, 0.10, 0.10
SC_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


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


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def section(text: str, heading_re: str) -> str:
    m = re.search(rf"^## {heading_re}.*?$(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def hidden_values(report: str) -> list[float] | None:
    """Per hidden question, first pass (METRICS.md 2.2): missed 0; else Matches yes 1, partly 0.5, no 0."""
    vals = {}
    for line in section(report, r"3\. Hidden questions").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 4 or not cells[0].isdigit():
            continue
        mark, match = cells[2].lower(), cells[3].lower()
        if mark == "missed":
            v = 0.0
        elif match.startswith("yes"):
            v = 1.0
        elif match.startswith("partly"):
            v = 0.5
        elif match.startswith("no"):
            v = 0.0
        else:
            return None
        vals[int(cells[0])] = v
    return [vals[i] for i in range(1, N_HIDDEN + 1)] if sorted(vals) == list(range(1, N_HIDDEN + 1)) else None


def appendix_message(report: str, summary_re: str) -> str | None:
    """First fenced block of the Appendix B <details> whose summary matches; None if not on record."""
    appendix = section(report, r"Appendix B")
    for m in re.finditer(r"<details><summary>(.*?)</summary>(.*?)</details>", appendix, re.S):
        if re.search(summary_re, m.group(1), re.I):
            fence = re.search(r"```[a-z]*\n(.*?)\n```", m.group(2), re.S)
            if fence and fence.group(1).strip():
                return fence.group(1).strip()
    return None


def is_generated(repo: str, path: str) -> bool:
    """Files left out of "code and tests only" (BENCHMARKS.md step 10)."""
    parts = path.split("/")
    name = parts[-1]
    return (".generated." in name
            or name == "schema-main.graphql"
            or (repo == "saleor" and path == "saleor/graphql/schema.graphql")
            or (name.endswith(".json") and any(p in ("locale", "messages") for p in parts[:-1]))
            or path.startswith("docs/superpowers/")
            or name == "CLAUDE.md")


def changed_paths(t1_dir: Path) -> set[str] | None:
    if not all((t1_dir / f"{r}.diff").is_file() for r in REPOS):
        return None
    paths = set()
    for r in REPOS:
        for line in (t1_dir / f"{r}.diff").read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"^diff --git a/(.*) b/(.*)$", line)
            if m and not is_generated(r, m.group(2)):
                paths.add(f"{r}/{m.group(2)}")
    return paths


def load_judges(folder: Path) -> list[dict]:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(folder.glob("trust-judge-r*.json"))]


# ── loading ──────────────────────────────────────────────────────────────────

def load_runs(runs_dir: Path, warnings: list[str]) -> list[dict]:
    runs = []
    for folder in sorted(p for p in runs_dir.glob("*/*/*/*") if p.is_dir()):
        rel = folder.relative_to(runs_dir)
        own = folder / "report.md" if (folder / "report.md").is_file() else folder / "README.md"
        if not own.is_file():
            continue
        poc = front_matter(own.read_text(encoding="utf-8"))
        if not poc.get("poc_schema"):
            continue
        if poc.get("reused_from"):
            saleor_report = BENCH / poc.get("saleor_folder", "") / "report.md"
            if not saleor_report.is_file():
                warnings.append(f"{rel}: saleor_folder has no report.md ({poc.get('saleor_folder')})")
                continue
            report = saleor_report.read_text(encoding="utf-8")
            data = {**front_matter(report), **{k: v for k, v in poc.items() if v != ""}}
            data["run_id"] = poc.get("run_id") or f"{poc['reused_from']}-v0-r1"
        else:
            report = own.read_text(encoding="utf-8")
            data = poc
        d = {"_folder": str(rel), "_path": folder, "_report": report, **data}
        d["reused"] = bool(poc.get("reused_from"))
        d["hidden"] = hidden_values(report)
        d["t1_message"] = appendix_message(report, r"^\s*T1\b.*done")
        d["paths_t1"] = None if d["reused"] else changed_paths(folder / "t1")
        d["judges"] = load_judges(folder)
        runs.append(d)
    return runs


# ── per run ──────────────────────────────────────────────────────────────────

def median_judge(judges: list[dict], crit: str):
    vals = [num(j.get(crit, {}).get("score")) for j in judges]
    vals = [v for v in vals if v is not None]
    return statistics.median(vals) if len(vals) == len(judges) and vals else None


def majority_label(judges: list[dict], kid: str) -> str | None:
    labels = []
    for j in judges:
        for c in j.get("contradictions", []) or []:
            if c.get("id") == kid:
                labels.append(c.get("label"))
    if not labels:
        return None
    top, n = max(((l, labels.count(l)) for l in set(labels)), key=lambda x: (x[1], x[0]))
    return top if n * 2 > len(labels) else "no-majority"


def declared_side(prompts: Path) -> dict[str, str]:
    """Per planted contradiction, which side ('earliest' or 'latest') is the declared resolution (METRICS.md 3).
    Side A wins (checklist.json); its position in the prompt text decides earliest/latest."""
    checklist = json.loads((prompts / "checklist.json").read_text(encoding="utf-8"))
    out = {}
    for k in checklist["contradictions"]:
        text = (prompts / f"{k['versions'][-1]}.txt").read_text(encoding="utf-8")
        a, b = text.find(k["side_a"]), text.find(k["side_b"])
        if a < 0 or b < 0:
            raise SystemExit(f"{k['id']}: side text not found in {k['versions'][-1]}.txt")
        out[k["id"]] = "earliest" if a < b else "latest"
    return out


def label_score(label: str | None, declared: str) -> float | None:
    if label in ("asked", "resolved-explicit"):
        return 1.0
    if label == "silent-hybrid":
        return 0.0
    if label in ("silent-earliest", "silent-latest"):
        return 0.5 if label == f"silent-{declared}" else 0.25
    return None


def score_run(d: dict, hedge_terms: list[str], declared: dict, warnings: list[str]) -> None:
    rid = d.get("run_id", d["_folder"])
    miss = lambda what: warnings.append(f"{rid}: {what}")
    hm = num(d.get("hidden_matches_answer"))
    if d["hidden"] is None:
        miss("section 3 (hidden questions) not parseable")
    elif hm is not None and abs(sum(d["hidden"]) - hm) > 1e-9:
        miss(f"hidden_matches_answer {hm:g} ≠ section 3 sum {sum(d['hidden']):g}; the data block value is used")
    if hm is None:
        miss("hidden_matches_answer empty")
    checks = None
    if not d["reused"]:
        raw = [c.strip() for c in (d.get("t1_done_checks") or "").split(",") if c.strip()]
        if len(raw) == N_T1 and all(c in ("0", "1") for c in raw):
            checks = [int(c) for c in raw]
            passed = num(d.get("t1_done_checks_passed"))
            if passed is not None and passed != sum(checks):
                miss(f"t1_done_checks_passed {passed:g} ≠ sum of t1_done_checks {sum(checks)}")
        else:
            miss("t1_done_checks missing or not 8 values of 0/1")
        if d["paths_t1"] is None:
            miss("t1/<repo>.diff missing (T1 snapshot)")
    d["t1_checks"] = checks
    d["checkpoints"] = (d["hidden"] + checks) if (d["hidden"] is not None and checks is not None) else None

    # Correctness (0-1, i.e. the 0-2 score ÷ 2)
    d["correctness7"] = hm / N_HIDDEN if hm is not None else None
    if d["reused"]:
        d["correctness"] = d["correctness7"]
    else:
        d["correctness"] = (hm + sum(checks)) / (N_HIDDEN + N_T1) if hm is not None and checks is not None else None

    # Judge criteria: median of 3 runs
    if len(d["judges"]) != 3:
        miss(f"{len(d['judges'])} trust-judge files, 3 expected")
    jm = {c: (median_judge(d["judges"], c) if len(d["judges"]) == 3 else None) for c in JUDGE_CRITERIA}
    d.update({f"judge_{c}": v for c, v in jm.items()})
    def trust(corr):
        if corr is None or any(v is None for v in jm.values()):
            return None
        return W_CORRECTNESS * corr + sum(W_JUDGE_EACH * v / 2 for v in jm.values())

    d["trust"], d["trust7"] = trust(d["correctness"]), trust(d["correctness7"])

    # Judge stability of this run (METRICS.md 2.1, JS)
    if len(d["judges"]) == 3:
        stds = []
        for c in JUDGE_CRITERIA:
            vals = [num(j.get(c, {}).get("score")) for j in d["judges"]]
            stds.append(statistics.pstdev(vals) / MAX_STD_3 if None not in vals else None)
        d["js_run"] = 1 - statistics.mean(stds) if None not in stds else None
    else:
        d["js_run"] = None

    # Behavior (METRICS.md 2.4)
    d["ask_rate"] = num(d.get("questions_total"))
    ha = num(d.get("hidden_asked"))
    d["hidden_ask_share"] = ha / N_HIDDEN if ha is not None else None
    if d["t1_message"]:
        words = word_count(d["t1_message"])
        d["hedges"] = len(vague_matches(d["t1_message"], hedge_terms))
        d["hedge_density"] = d["hedges"] / words * 100 if words else None
    else:
        d["hedges"] = d["hedge_density"] = None
        miss("no T1 \"done\" message in Appendix B: no hedge density, no SC")
    failed = None
    if d["reused"] and d["hidden"] is not None:
        failed = any(v < 1 for v in d["hidden"])
    elif d["checkpoints"] is not None:
        failed = any(v < 1 for v in d["checkpoints"])
    # 1 = a failed checkpoint at T1, zero hedges, zero questions; unknown if any input is unknown and decides it
    if failed is False or (d["ask_rate"] or 0) > 0 or (d["hedges"] or 0) > 0:
        d["confident_wrong"] = 0
    elif failed and d["ask_rate"] == 0 and d["hedges"] == 0:
        d["confident_wrong"] = 1
    else:
        d["confident_wrong"] = None
    ht, hc = num(d.get("hidden_total")), num(d.get("hidden_covered"))
    d["first_pass_coverage"] = (ha + hc) / ht if ht and ha is not None and hc is not None else None
    qu = num(d.get("questions_unanticipated"))
    d["unanticipated_share"] = qu / d["ask_rate"] if qu is not None and d["ask_rate"] else None

    # Contradictions (v5, METRICS.md 3)
    d["k_labels"], d["k_judge"], d["k_scores"] = {}, {}, {}
    if d.get("prompt_version") == "v5":
        for kid in sorted(declared):
            lab = d.get(f"{kid.lower()}_label") or None
            if lab not in LABELS:
                miss(f"{kid.lower()}_label empty or not one of {', '.join(LABELS)}")
                lab = None
            d["k_labels"][kid] = lab
            d["k_judge"][kid] = majority_label(d["judges"], kid)
            d["k_scores"][kid] = label_score(lab, declared[kid])
        sc = list(d["k_scores"].values())
        d["contradiction_score"] = statistics.mean(sc) if sc and None not in sc else None
    else:
        d["contradiction_score"] = None


# ── per cell ─────────────────────────────────────────────────────────────────

def mean_or_none(vals):
    vals = [v for v in vals if v is not None]
    return statistics.mean(vals) if vals else None


def all_or_none(vals):
    return None if (not vals or any(v is None for v in vals)) else vals


def sc_key(a: str, b: str) -> str:
    pair = sorted(hashlib.sha256(t.encode()).hexdigest() for t in (a, b))
    return f"{SC_MODEL}:{pair[0]}:{pair[1]}"


def summary_similarity(a: str, b: str, cache: dict, embed: bool) -> float | None:
    key = sc_key(a, b)
    if key in cache:
        return cache[key]["cosine"]
    if not embed:
        return None
    try:
        import sentence_transformers as st
    except ImportError:
        raise SystemExit("--embed needs sentence-transformers (pip install sentence-transformers)")
    model = st.SentenceTransformer(SC_MODEL, device="cpu")
    e = model.encode([a, b], normalize_embeddings=True)
    cos = float(sum(x * y for x, y in zip(e[0], e[1])))
    cache[key] = {"cosine": round(cos, 6), "model": SC_MODEL, "library": f"sentence-transformers {st.__version__}"}
    return cache[key]["cosine"]


def score_cells(runs: list[dict], sc_cache: dict, embed: bool, warnings: list[str]) -> dict:
    cells = {}
    done = [d for d in runs if d.get("status") == "done"]
    for method, version in itertools.product(METHODS, VERSIONS):
        rs = sorted((d for d in done if d.get("method") == method and d.get("prompt_version") == version),
                    key=lambda d: num(d.get("repeat")) or 0)
        if not rs:
            continue
        core = [d for d in rs if num(d.get("repeat")) in (1, 2)]   # Consistency and means use r1, r2
        c = {"method": method, "version": version, "runs": [d["run_id"] for d in rs], "n": len(core),
             "older_setup": version == "v0" and method in OLDER_SETUP}
        c["trust"] = [d["trust"] for d in core]
        c["trust7"] = [d["trust7"] for d in core]
        t7 = all_or_none(c["trust7"])
        c["UT"] = 1 - statistics.mean(t7) if t7 else None
        c.update(CA=None, DO=None, SC=None, JS=None, consistency=None, U=None, outcome=None)
        if version != "v0":
            if len(core) != 2:
                warnings.append(f"{method} {version}: {len(core)} of the 2 repeats done; no Consistency")
            else:
                a, b = core
                if a["checkpoints"] is not None and b["checkpoints"] is not None:
                    c["CA"] = sum(x == y for x, y in zip(a["checkpoints"], b["checkpoints"])) / (N_HIDDEN + N_T1)
                if a["paths_t1"] is not None and b["paths_t1"] is not None:
                    union = a["paths_t1"] | b["paths_t1"]
                    c["DO"] = len(a["paths_t1"] & b["paths_t1"]) / len(union) if union else 1.0
                if a["t1_message"] and b["t1_message"]:
                    c["SC"] = summary_similarity(a["t1_message"], b["t1_message"], sc_cache, embed)
                    if c["SC"] is None:
                        warnings.append(f"{method} {version}: SC not in reports/sc-cache.json; rerun with --embed")
                js = all_or_none([a["js_run"], b["js_run"]])
                c["JS"] = statistics.mean(js) if js else None
                parts = [c["CA"], c["DO"], c["SC"], c["JS"]]
                c["consistency"] = statistics.mean(parts) if None not in parts else None
                tr = all_or_none(c["trust"])
                if c["consistency"] is not None and tr:
                    c["U"] = 1 - (0.5 * c["consistency"] + 0.5 * statistics.mean(tr))
                if c["CA"] is not None:
                    c["outcome"] = "benign" if c["CA"] == 1 else "divergent"
        for k in ("ask_rate", "hedge_density", "confident_wrong", "contradiction_score", "first_pass_coverage",
                  "unanticipated_share"):
            c[k] = mean_or_none([d[k] for d in core])
        c["followups"] = mean_or_none([num(d.get("followups")) for d in core])
        c["time_total_min"] = mean_or_none([num(d.get("total_min")) for d in core])
        c["cost_usd"] = mean_or_none([num(d.get("t2_cost_usd")) for d in core])
        extra = [d for d in rs if d not in core]
        if extra:  # optional 3rd repeat: noise estimate only (METRICS.md 5)
            allt = [d["trust"] for d in rs]
            c["noise_trust_all_repeats"] = allt
            c["noise_max_trust_diff"] = (max(allt) - min(allt)) if None not in allt else None
        cells[(method, version)] = c
    return cells


# ── per method, gates, validation ────────────────────────────────────────────

def load_as(path: Path) -> tuple[dict, bool]:
    if not path.is_file():
        return {}, False
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    full = bool(rows) and all(r.get("as") for r in rows)
    return {r["version"]: float(r["as"] if full else r["as_partial"]) for r in rows}, full


def cohen_kappa(pairs: list[tuple[str, str]]) -> float | None:
    if not pairs:
        return None
    cats = sorted({x for p in pairs for x in p})
    n = len(pairs)
    po = sum(a == b for a, b in pairs) / n
    pe = sum((sum(a == k for a, _ in pairs) / n) * (sum(b == k for _, b in pairs) / n) for k in cats)
    return (po - pe) / (1 - pe) if pe < 1 else None


def score_methods(runs, cells, as_scores) -> dict:
    out = {}
    done = [d for d in runs if d.get("status") == "done"]
    hi = [c for (m, v), c in cells.items() if v in ("v3", "v5")]
    allc = list(cells.values())
    med = {k: (statistics.median(xs) if (xs := [c[k] for c in allc if c[k] is not None]) else None)
           for k in ("ask_rate", "hedge_density", "confident_wrong")}
    for m in METHODS:
        rs = [d for d in done if d.get("method") == m and num(d.get("repeat")) in (1, 2)]
        if not rs:
            continue
        pts = [(as_scores[d["prompt_version"]], d["ask_rate"]) for d in rs
               if d.get("prompt_version") in as_scores and d["ask_rate"] is not None]
        o = {"ask_calibration": spearman([p[0] for p in pts], [p[1] for p in pts]) if len(pts) >= 3 else None,
             "n_ask_points": len(pts)}
        v5 = [d for d in rs if d.get("prompt_version") == "v5"]
        labels = [l for d in v5 for l in d["k_labels"].values()]
        if labels and None not in labels:
            o["detection"] = sum(l in ("asked", "resolved-explicit") for l in labels) / len(labels)
            o["clarification"] = sum(l == "asked" for l in labels) / len(labels)
            # silent and the declared resolution not built: a silent label scored below 0.5
            scores = [s for d in v5 for s in d["k_scores"].values()]
            o["silent_failure"] = sum(l.startswith("silent") and s < 0.5 for l, s in zip(labels, scores)) / len(labels)
        mh = [c for c in hi if c["method"] == m]
        means = {k: mean_or_none([c[k] for c in mh]) for k in med}
        flag = None
        if None not in means.values() and None not in med.values():
            if means["ask_rate"] < med["ask_rate"] and means["hedge_density"] < med["hedge_density"] \
                    and means["confident_wrong"] > med["confident_wrong"]:
                flag = "overconfident"
            elif means["ask_rate"] > med["ask_rate"] or means["hedge_density"] > med["hedge_density"]:
                flag = "cautious"
            else:
                flag = "none"
        o["flag"] = flag
        out[m] = o
    return out


def gates(cells, runs, runs_dir: Path) -> dict:
    g = {}
    ut = {v: cells.get(("baseline", v), {}).get("UT") for v in VERSIONS}
    u = {v: cells.get(("baseline", v), {}).get("U") for v in ("v3", "v5")}
    if None in ut.values() or None in u.values():
        g["U1"] = None
    else:
        g["U1"] = (ut["v3"] >= ut["v0"] - TOL and ut["v5"] >= ut["v3"] - TOL
                   and ut["v5"] - ut["v0"] >= MIN_RISE and u["v3"] <= u["v5"] + TOL)
    g["U1_detail"] = {"UT": ut, "U": u}
    ub = {v: cells.get(("baseline", v), {}).get("U") for v in ("v3", "v5")}
    ur = {v: cells.get(("rosetta-skills", v), {}).get("U") for v in ("v3", "v5")}
    if None in ub.values() or None in ur.values():
        g["U2"] = None
    else:
        gap = statistics.mean(ub[v] - ur[v] for v in ub)
        g["U2"] = all(ur[v] < ub[v] for v in ub) and gap >= MIN_GAP
        g["U2_gap"] = gap
    g["U2_detail"] = {"baseline": ub, "rosetta-skills": ur}
    g["trust7_reported"] = {m: {v: mean_or_none(cells.get((m, v), {}).get("trust7", [])) for v in VERSIONS}
                            for m in ("baseline", "rosetta-skills")}
    # Validation 1: Consistency vs uncertainty-judge consistency (METRICS.md 2.5)
    xs, ys = [], []
    for (m, v), c in cells.items():
        if c["consistency"] is None:
            continue
        hits = list(runs_dir.glob(f"*/*/{m}/{v}-uncertainty-judge.json"))
        if hits:
            xs.append(c["consistency"])
            ys.append(num(json.loads(hits[0].read_text(encoding="utf-8")).get("consistency")))
    pts = [(x, y) for x, y in zip(xs, ys) if y is not None]
    g["validation_consistency_rho"] = spearman([p[0] for p in pts], [p[1] for p in pts]) if len(pts) >= 3 else None
    g["validation_consistency_n"] = len(pts)
    # Validation 2: Cohen's kappa, operator vs judge majority labels (METRICS.md 3)
    pairs = [(d["k_labels"][k], d["k_judge"][k]) for d in runs if d.get("status") == "done"
             for k in d["k_labels"] if d["k_labels"][k] and d["k_judge"].get(k)]
    g["kappa"] = cohen_kappa(pairs)
    g["kappa_n"] = len(pairs)
    return g


# ── entry point ──────────────────────────────────────────────────────────────

def compute(runs_dir: Path = ROOT / "runs", embed: bool = False, sc_cache_path: Path = ROOT / "reports" / "sc-cache.json",
            as_csv: Path = ROOT / "reports" / "as-scores.csv", prompts: Path = ROOT / "prompts") -> dict:
    warnings: list[str] = []
    hedge_terms = load_terms(prompts / "hedge-terms.txt")
    declared = declared_side(prompts)
    runs = load_runs(runs_dir, warnings)
    for d in runs:
        if d.get("method") not in METHODS:
            warnings.append(f"{d.get('run_id')}: unknown method {d.get('method')!r}")
        if d.get("prompt_version") not in VERSIONS:
            warnings.append(f"{d.get('run_id')}: prompt_version {d.get('prompt_version')!r} is not v0, v3 or v5")
        score_run(d, hedge_terms, declared, warnings)
    sc_cache = json.loads(sc_cache_path.read_text(encoding="utf-8")) if sc_cache_path.is_file() else {}
    n_cache = len(sc_cache)
    cells = score_cells(runs, sc_cache, embed, warnings)
    if len(sc_cache) != n_cache:
        sc_cache_path.parent.mkdir(parents=True, exist_ok=True)
        sc_cache_path.write_text(json.dumps(sc_cache, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    as_scores, as_full = load_as(as_csv)
    for c in cells.values():
        c["AS"] = as_scores.get(c["version"])
    return {"runs": runs, "cells": cells, "methods": score_methods(runs, cells, as_scores), "gates": gates(cells, runs, runs_dir),
            "as_full": as_full, "declared": declared, "warnings": warnings}


def r3(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, float):
        return round(v, 3)
    if isinstance(v, list):
        return [r3(x) for x in v]
    if isinstance(v, dict):
        return {k: r3(x) for k, x in v.items()}
    return v


RUN_KEYS = ["run_id", "method", "prompt_version", "repeat", "reused", "status", "correctness7", "correctness",
            "judge_constraint_fidelity", "judge_assumption_transparency", "judge_calibration",
            "trust7", "trust", "js_run", "ask_rate", "hidden_ask_share", "hedges", "hedge_density", "confident_wrong",
            "first_pass_coverage", "unanticipated_share", "contradiction_score", "k_labels", "k_judge", "k_scores"]


def to_json(res: dict) -> dict:
    return {"as_full": res["as_full"], "declared_resolution": res["declared"],
            "runs": [{k: r3(d.get(k)) for k in RUN_KEYS} for d in res["runs"]],
            "cells": [r3(c) for c in res["cells"].values()],
            "methods": r3(res["methods"]), "gates": r3(res["gates"]), "warnings": res["warnings"]}


def fmt(v):
    if v is None or v == "":
        return "–"
    if isinstance(v, bool):
        return "pass" if v else "FAIL"
    if isinstance(v, float):
        return f"{v:.3f}"
    return str(v)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", type=Path, default=ROOT / "runs")
    ap.add_argument("--embed", action="store_true", help="compute SC values missing from reports/sc-cache.json")
    ap.add_argument("--json", type=Path, help="write every value to this JSON file")
    args = ap.parse_args()
    res = compute(args.runs, args.embed)
    lines = ["## Runs", "", "| Run | Version | Trust7 | Trust | JS | Ask | Hedge density | Confident-wrong | Contradiction |",
             "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for d in res["runs"]:
        lines.append("| " + " | ".join(fmt(x) for x in [d.get("run_id"), d.get("prompt_version"), d["trust7"], d["trust"], d["js_run"],
                                                         d["ask_rate"], d["hedge_density"], d["confident_wrong"],
                                                         d["contradiction_score"]]) + " |")
    lines += ["", "## Cells", "", "| Method | Version | n | CA | DO | SC | JS | Consistency | UT | U |", "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for c in res["cells"].values():
        lines.append("| " + " | ".join(fmt(x) for x in [c["method"], c["version"], c["n"], c["CA"], c["DO"], c["SC"], c["JS"],
                                                         c["consistency"], c["UT"], c["U"]]) + " |")
    g = res["gates"]
    lines += ["", f"U1: {fmt(g['U1'])} · U2: {fmt(g['U2'])} · ρ validation: {fmt(g['validation_consistency_rho'])} "
                  f"(n={g['validation_consistency_n']}) · κ: {fmt(g['kappa'])} (n={g['kappa_n']})"]
    if res["warnings"]:
        lines += ["", "## Missing or inconsistent values", ""] + [f"- {w}" for w in res["warnings"]]
    print("\n".join(lines))
    if args.json:
        args.json.write_text(json.dumps(to_json(res), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
