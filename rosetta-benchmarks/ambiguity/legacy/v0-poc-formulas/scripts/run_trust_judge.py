#!/usr/bin/env python3
"""Run the trust judge (judge/trust-judge.md) non-interactively and save its answers.

For each run folder staged in the judge root (`<judge root>/<run id>/judge-input.md` and `t1/`),
starts one new `claude -p` session per judge run, in that folder, with the prompt of
judge/trust-judge.md as is, and saves the JSON answer to
`runs/<task>/<agent>/<method>/<version>-r<n>/trust-judge-r<k>.json` with run_id, judge_run, model,
effort, claude_code, date, session_id and started_by added at the top (decision log #31).
The raw CLI output is kept next to the judge input as `raw-r<k>.json` (outside the repo).

Usage (from the rosetta repo root):
  python3 rosetta-benchmarks/ambiguity/scripts/run_trust_judge.py \
      --judge-root ~/Desktop/ambiguity-judge/ambiguity --config-dir <clean CLAUDE_CONFIG_DIR> \
      baseline:S-CC-01-v0-r1 rosetta-skills:S-CC-08-v0-r1 grill-with-docs:S-CC-02-v0-r1 superpowers:S-CC-03-v0-r1
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

POC = Path(__file__).resolve().parent.parent.parent.parent
MODEL = "claude-opus-5-5"
EFFORT = "xhigh"


def judge_prompt() -> str:
    text = (Path(__file__).resolve().parent.parent / "judge" / "trust-judge.md").read_text()
    m = re.search(r"## Prompt\s*```text\n(.*?)\n```", text, re.S)
    if not m:
        sys.exit("prompt block not found in judge/trust-judge.md")
    return m.group(1)


def extract_json(s: str) -> dict:
    a, b = s.find("{"), s.rfind("}")
    return json.loads(s[a : b + 1])


def one(judge_dir: Path, out_dir: Path, run_id: str, k: int, prompt: str, env: dict, version: str) -> str:
    out = out_dir / f"trust-judge-r{k}.json"
    if out.exists():
        return f"{run_id} r{k}: exists, skipped"
    p = subprocess.run(
        ["claude", "-p", prompt, "--model", MODEL, "--output-format", "json"],
        cwd=judge_dir, env=env, capture_output=True, text=True,
    )
    (judge_dir / f"raw-r{k}.json").write_text(p.stdout + ("\n--- stderr ---\n" + p.stderr if p.stderr else ""))
    if p.returncode != 0:
        return f"{run_id} r{k}: FAILED (exit {p.returncode}), see raw-r{k}.json"
    cli = json.loads(p.stdout)
    if cli.get("is_error"):
        return f"{run_id} r{k}: FAILED ({cli.get('subtype')}), see raw-r{k}.json"
    answer = extract_json(cli["result"])
    rec = {
        "run_id": run_id, "judge_run": k, "model": MODEL, "effort": EFFORT, "claude_code": version,
        "date": datetime.date.today().isoformat(), "session_id": cli.get("session_id"),
        "started_by": "assistant, non-interactive (claude -p); decision log #31",
        **answer,
    }
    out.write_text(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")
    scores = [answer[c]["score"] for c in ("constraint_fidelity", "assumption_transparency", "calibration")]
    return f"{run_id} r{k}: saved {scores} (session {cli.get('session_id')}, ${cli.get('total_cost_usd', 0):.2f})"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--judge-root", required=True, type=Path)
    ap.add_argument("--config-dir", required=True)
    ap.add_argument("--reps", type=int, nargs="+", default=[1, 2, 3])
    ap.add_argument("--task", default="small-storage-conditions")
    ap.add_argument("--agent", default="claude-code")
    ap.add_argument("runs", nargs="+", help="method:run-id, e.g. baseline:S-CC-01-v0-r1")
    a = ap.parse_args()

    prompt = judge_prompt()
    env = {**os.environ, "CLAUDE_CONFIG_DIR": os.path.expanduser(a.config_dir)}
    version = subprocess.run(["claude", "--version"], capture_output=True, text=True).stdout.split()[0]

    def per_run(spec: str) -> list:
        method, run_id = spec.split(":")
        judge_dir = a.judge_root.expanduser() / run_id
        cell = "-".join(run_id.split("-")[-2:])  # e.g. v0-r1
        out_dir = Path(__file__).resolve().parent.parent / "runs" / a.task / a.agent / method / cell
        return [one(judge_dir, out_dir, run_id, k, prompt, env, version) for k in a.reps]

    with ThreadPoolExecutor(max_workers=len(a.runs)) as ex:
        for lines in ex.map(per_run, a.runs):
            for line in lines:
                print(line, flush=True)


if __name__ == "__main__":
    main()
