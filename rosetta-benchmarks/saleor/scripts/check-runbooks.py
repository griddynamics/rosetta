#!/usr/bin/env python3
"""Check the 8 method files in saleor/methods/: run their shell blocks in a sandbox and check the texts.

    python3 saleor/scripts/check-runbooks.py                 # all 8 methods
    python3 saleor/scripts/check-runbooks.py spec-kit rosetta  # only these

For each method file:
- part 1 (setup for Claude Code) and parts 2–3 (small / large run, Claude Code) are executed in zsh, in order,
  against a sandbox workspace (3 small git repos tagged baseline-v1) and a stub bench.sh (reset = checkout tag +
  clean workspace root; start / health = no-op). Downloads and installs are real, into the sandbox.
  Skipped, because they need a person or Docker: /login, the agent session and its replies, nvm, sleep.
- every text box for the agent is checked: the T0 text is "<command> + the Starter Prompt (+ the method's own
  closing lines)" from BENCHMARKS.md section 4, word for word; the post-implementation prompt uses the right `git diff`.
- parts 4–6 (Copilot) are only checked for being there (Copilot is not runnable yet).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SALEOR = Path(__file__).resolve().parents[1]
BENCH_MD = SALEOR.parent / "BENCHMARKS.md"
REPO = SALEOR.parents[1]
SANDBOX = Path(os.environ.get("RB_SANDBOX", Path(tempfile.gettempdir()) / "rb-check"))
REPOS = ["saleor", "saleor-dashboard", "react-storefront"]
# key: (method number, start tag, T0 command, text after the Starter Prompt)
SKILLS_LINE = "\n\nMUST USE SKILLS hitl, tech-specs."
METHODS = {"baseline": ("01", "baseline-v1", "", ""), "grill-with-docs": ("02", "grill-v1", "/grill-with-docs", ""),
           "superpowers": ("03", "superpowers-v1", "/superpowers:brainstorming", ""), "spec-kit": ("04", "speckit-v1", "/speckit-specify", ""),
           "aws-ai-dlc": ("05", "aidlc-v1", "/aidlc feature", ""), "rosetta": ("06", "rosetta-v1", "/coding-flow", ""),
           "rosetta-light": ("07", "rosetta-light-v1", "", SKILLS_LINE + "\n\nUSE ROSETTA SUBAGENTS."),
           "rosetta-skills": ("08", "rosetta-skills-v1", "", SKILLS_LINE)}
FILES = {"rosetta": "rosetta-flow.md"}   # method key -> file name, where they differ
COMMITS = {"superpowers", "spec-kit", "aws-ai-dlc"}

STUB_BENCH = r"""#!/bin/bash
# stub of bench.sh: same reset rules, no Docker
set -euo pipefail
case "${1:-}" in
  reset)
    for r in saleor saleor-dashboard react-storefront; do
      git -C "$BENCH_DIR/$r" checkout -q -f "$2"; git -C "$BENCH_DIR/$r" clean -q -fdx
    done
    for item in "$BENCH_DIR"/* "$BENCH_DIR"/.[!.]*; do
      [ -e "$item" ] || continue
      case "$(basename "$item")" in saleor | saleor-dashboard | react-storefront | seed.dump | logs | envs) ;; *) rm -rf "$item" ;; esac
    done ;;
  from-zips)   # stands in for the Rosetta zips: baseline-v1 plus the three Rosetta method tags
    for r in saleor saleor-dashboard react-storefront; do
      git -C "$BENCH_DIR/$r" checkout -q -f baseline-v1
      for t in rosetta-v1 rosetta-light-v1 rosetta-skills-v1; do git -C "$BENCH_DIR/$r" tag -f "$t" >/dev/null; done
    done ;;
  setup | start | health | stop) echo "stub $1: ok" ;;
  *) echo "stub: unknown $1"; exit 1 ;;
esac
"""


def starter_prompts():
    md = BENCH_MD.read_text()
    out = {}
    for key, head in (("small", "### Task 1 (small)"), ("large", "### Task 2 (large)")):
        part = md[md.index(head):]
        out[key] = re.search(r"```text\n(.*?)\n```", part, re.S).group(1)
    return out


def part(md, n):
    m = re.search(rf"(?ms)^## {n}\. .*?(?=^## \d\. |\Z)", md)
    return m.group(0) if m else ""


def blocks(text, kind):
    return [b if not b.startswith("   ") else "\n".join(l[3:] for l in b.splitlines())
            for b in re.findall(rf"```{kind}\n(.*?)\n```", text, re.S)]


def adapt(text, bench, stub, run):
    out = []
    for line in text.splitlines():
        if re.match(r"\s*(nvm |sleep )", line):
            continue
        line = re.sub(r"&& sleep \d+ ", "", line)
        line = line.replace("~/saleor-benchmark", str(bench)).replace('"$HOME/saleor-benchmark', f'"{bench}').replace("$HOME/saleor-benchmark", str(bench))
        line = re.sub(r'(^|\s)B="[^"]*bench\.sh"', rf'\1B="{stub}"', line)
        line = re.sub(r'^export RUN="[^"]*"', f'export RUN="{run}"', line)
        line = re.sub(r"\bclaude (--permission-mode|--dangerously-skip-permissions)[^;)]*", ": agent-session-skipped", line)
        line = re.sub(r"&& claude\s*(\))?\s*$", r"&& : login-session-skipped\1", line)
        out.append(line)
    return "\n".join(out)


def make_sandbox():
    if SANDBOX.exists():
        shutil.rmtree(SANDBOX)
    bench = SANDBOX / "bench"
    for r in REPOS:
        d = bench / r
        d.mkdir(parents=True)
        (d / "README.md").write_text(r)
        for cmd in (["git", "init", "-q"], ["git", "add", "-A"],
                    ["git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "init"], ["git", "tag", "baseline-v1"]):
            subprocess.run(cmd, cwd=d, check=True)
    (bench / "seed.dump").write_text("")
    (bench / "logs").mkdir()
    (bench / "envs").mkdir()
    stub = SANDBOX / "bench.sh"
    stub.write_text(STUB_BENCH)
    stub.chmod(0o755)
    return bench, stub


def check_method(key, bench, stub, prompts):
    num, tag, t0cmd, t0end = METHODS[key]
    md = (SALEOR / "methods" / FILES.get(key, f"{key}.md")).read_text()
    fails = []
    pre = (f'cd "{REPO}"\nexport AIDLC_BIN_DIR="{SANDBOX}/local/bin" AIDLC_INSTALL_ROOT="{SANDBOX}/local/share/aidlc"\n'
           f'export PATH="{SANDBOX}/local/bin:$PATH"\nsetopt errexit pipefail\n')
    script = [pre]
    setup = part(md, 1)
    if "**1.7 One-time project preparation" in setup:   # Rosetta init: skipped, as when the zips exist; it rewrites test-library/
        setup = setup[:setup.index("**1.7 One-time project preparation")]
    for b in blocks(setup, "bash"):
        script.append(adapt(b, bench, stub, ""))
    runs = {}
    for n, task in ((2, "small"), (3, "large")):
        p = part(md, n)
        if not p:
            fails.append(f"part {n} ({task} run, Claude Code) missing")
            continue
        run = SANDBOX / "runs" / task / key
        runs[task] = run
        for b in blocks(p, "bash"):
            if "session-usage.py" in b:             # fake what the agent and the session would have written
                row = json.dumps({"type": "assistant", "timestamp": "2026-10-20T12:05:00Z", "sessionId": "check",
                                  "message": {"model": "claude-sonnet-5-5", "role": "assistant", "content": [],
                                              "usage": {"input_tokens": 1, "output_tokens": 2}}})
                script.append(f'mkdir -p "{bench}/run-output" && echo diff > "{bench}/run-output/saleor.diff" && echo r > "{bench}/run-output/agent-report.md"\n'
                              'P="$CLAUDE_CONFIG_DIR/projects/$(echo "$BENCH_DIR" | tr / -)"; mkdir -p "$P"; '
                              f"echo '{row}' > \"$P/check.jsonl\"")
            script.append(adapt(b, bench, stub, run))
        texts = blocks(p, "text")
        want_t0 = (t0cmd + " " if t0cmd else "") + prompts[task] + t0end
        if want_t0 not in texts:
            fails.append(f"{task}: T0 text is not '<command> + Starter Prompt' from BENCHMARKS.md (+ the method's closing lines)")
        post = [t for t in texts if t.startswith("Do not commit anything.")]
        want_diff = f"`git diff {tag}`" if key in COMMITS else "`git diff`"
        if not post or want_diff not in post[0] or "~/saleor-benchmark/run-output/" not in post[0]:
            fails.append(f"{task}: post-implementation prompt wrong (expected {want_diff} and run-output/)")
        if "<" in "".join(re.findall(r"\| `(/[a-z-]+ [^`]*)` \|", p)):
            fails.append(f"{task}: a reply in the stops table still has a <placeholder>")
        if not any(t.startswith("Don't change any code, just answer") for t in texts):
            fails.append(f"{task}: hidden-question check text missing")
    for n in (4, 5, 6):
        if not part(md, n):
            fails.append(f"part {n} (Copilot) missing")
    r = subprocess.run(["zsh", "-c", "\n".join(script)], capture_output=True, text=True, timeout=1800)
    if r.returncode:
        return fails + ["shell failed: " + " | ".join((r.stdout + r.stderr).strip().splitlines()[-6:])[:700]]
    cfg = bench / "envs" / key / "claude"
    for rr in REPOS:
        tags = subprocess.run(["git", "-C", str(bench / rr), "tag", "--points-at", "HEAD"], capture_output=True, text=True).stdout.split()
        if tag not in tags:
            fails.append(f"{rr}: tag {tag} not on HEAD")

    def glob1(base, pat):
        return (list(Path(base).glob(pat)) or [Path(base) / pat])[0]

    for p in {"grill-with-docs": [cfg / f"skills/{s}/SKILL.md" for s in ("grill-with-docs", "grilling", "domain-modeling")],
              "superpowers": [glob1(cfg / "plugins/cache", "*/superpowers/6.4.2/skills/brainstorming/SKILL.md")],
              "spec-kit": [bench / f".claude/skills/speckit-{s}/SKILL.md" for s in ("specify", "plan", "tasks", "implement", "converge")],
              "aws-ai-dlc": [bench / ".claude/settings.json", glob1(bench / ".claude/skills", "aidlc*/SKILL.md")],
              "rosetta": [glob1(cfg / "plugins/cache", "rosetta/rosetta/3.1.17/workflows/coding-flow.md")],
              "rosetta-light": [glob1(cfg / "plugins/cache", f"rosetta/rosetta-light/3.1.17/skills/{s}/SKILL.md") for s in ("hitl", "tech-specs")],
              "rosetta-skills": [glob1(cfg / "plugins/cache", f"rosetta/rosetta/3.1.17/skills/{s}/SKILL.md") for s in ("hitl", "tech-specs")]}.get(key, []):
        if not Path(p).exists():
            fails.append(f"missing T0 command or skill file: {p}")
    for task, run in runs.items():
        for f in ("report.md", "isolation.txt", "tokens.md", "agent-report.md", "saleor.diff"):
            if not (run / f).exists():
                fails.append(f"{task}: {f} not in the run folder")
        rep = run / "report.md"
        if rep.exists():
            head = rep.read_text().split("---")[1]
            rid = f"{'S' if task == 'small' else 'L'}-CC-{num}"
            for k, v in (("run_id", rid), ("method", key), ("runner", "claude-code"), ("start_tag", tag)):
                if not re.search(rf"^{k}: {re.escape(v)}\s*$", head, re.M):
                    fails.append(f"{task}: report.md {k} is not {v}")
        iso = (run / "isolation.txt").read_text() if (run / "isolation.txt").exists() else ""
        plug = {"superpowers": "superpowers@superpowers-dev", "rosetta": "rosetta@rosetta", "rosetta-light": "rosetta-light@rosetta",
                "rosetta-skills": "rosetta@rosetta"}.get(key)
        if plug and plug not in iso:
            fails.append(f"{task}: isolation.txt doesn't list {plug}")
        if not plug and "No plugins installed" not in iso:
            fails.append(f"{task}: isolation.txt should show no plugins")
    return fails


def main():
    keys = [k for k in METHODS if not sys.argv[1:] or k in sys.argv[1:]]
    prompts = starter_prompts()
    bench, stub = make_sandbox()
    bad = 0
    for key in keys:
        fails = check_method(key, bench, stub, prompts)
        bad += bool(fails)
        print(("PASS " if not fails else "FAIL ") + f"methods/{FILES.get(key, key + '.md')}  (setup + S-CC + L-CC executed; Copilot parts present)", flush=True)
        for f in fails:
            print("     - " + f, flush=True)
    print(f"\n{len(keys) - bad}/{len(keys)} method files passed. Sandbox: {SANDBOX}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
