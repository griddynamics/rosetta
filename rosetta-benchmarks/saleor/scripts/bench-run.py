#!/usr/bin/env python3
"""Automated benchmark run: the user starts it, no human after that.

  python3 rosetta-benchmarks/saleor/scripts/bench-run.py claude-code rosetta-flow small

Covers the Rosetta methods (rosetta-flow, rosetta-light, rosetta-skills), Claude Code, small task.
The method file stays the single source: this script runs its steps 1-3 and 10 as written, and
sends its step 5, 7 and 9 texts. Rules: BENCHMARKS.md section 5, "Automated runs (bench-run.py)".

- Agent: one headless session, `claude -p --input-format stream-json --output-format stream-json`.
- Usage: the runner's own `result` events. `total_cost_usd` and `modelUsage` are cumulative per
  session (subagents included); `duration_ms` is per turn. T1/T2 = the last `result` at that time.
- Questions: a simulated product owner answers from the BENCHMARKS.md tables only
  (checks/auto/answer-questions.md). A question in no table gets NO_INFO.
- Hidden-question check, operator check (checks/execute/small-task-execute.md) and the after-run
  checks run in separate helper sessions with a clean config. They are not part of the run's usage.
- Stops before the diff judge: the judge rates all runs of one task x runner together.
"""
import argparse
import datetime as dt
import json
import os
import queue
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

SB = Path(__file__).resolve().parents[1]  # rosetta-benchmarks/saleor
REPO = SB.parents[1]  # the rosetta checkout
BENCHMARKS = SB.parent / "BENCHMARKS.md"
AUTO = SB / "checks" / "auto"
EXECUTE = SB / "checks" / "execute" / "small-task-execute.md"
TEMPLATES = SB / "templates"

METHODS = {"rosetta-flow": "coding-flow", "rosetta-light": "skills hitl + tech-specs with Rosetta Light subagents",
           "rosetta-skills": "skills hitl + tech-specs"}  # method file name -> data block `flow`
RUNNER_LABEL = {"claude-code": "Claude Code", "copilot": "Copilot"}
TASK_TITLE = {"small": "Task 1 (small)", "large": "Task 2 (large)"}

HELPER_MODEL = "claude-opus-5-5"  # classifier, simulated product owner, all checks; fixed and written to the report
NO_INFO = "I don't have that information. Decide yourself."
CONTINUE = "No HITL, fully autonomous. Continue."
PLAYWRIGHT_MCP = {"mcpServers": {"playwright": {"command": "npx", "args": ["-y", "@playwright/mcp@0.0.76", "--headless"]}}}
MAX_CASE_FOLLOWUPS = 3
MAX_REPLIES = 30  # driver replies before the first "done": more means the run is stuck
QUIET_S = 15  # after a `result`, how long to wait for the agent to go on by itself
TURN_TIMEOUT_S = 4 * 3600
WAITING_S = 30 * 60  # the agent said it waits for its own work: how long to wait before one "Continue."
REPOS = ("saleor", "saleor-dashboard", "react-storefront")
NVM = 'source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1; nvm use 24 >/dev/null 2>&1; '


def now():
    return dt.datetime.now()


def hhmm(t):
    return t.strftime("%H:%M")


def iso_min(t):
    return t.strftime("%Y-%m-%dT%H:%M")


def log(msg):
    print(f"[{now():%H:%M:%S}] {msg}", flush=True)


class Stop(Exception):
    """The run cannot go on: status infra-fail, reason in the report."""


# ---------- method file and BENCHMARKS.md ----------

def run_section(method, runner, task):
    text = (SB / "methods" / f"{method}.md").read_text()
    m = re.search(rf"^## \d+\. Run (\S+): {task} task: [^\n]*, {RUNNER_LABEL[runner]}\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    if not m:
        raise SystemExit(f"no '{task} task, {RUNNER_LABEL[runner]}' run in methods/{method}.md")
    return m.group(1), m.group(2)


def step_block(section, n, lang):
    m = re.search(rf"^\*\*Step {n}\.(.*?)^```{lang}\n(.*?)^```", section, re.M | re.S)
    if not m:
        raise SystemExit(f"step {n}: no ```{lang} block in the method file")
    return m.group(2)


def md_table_after(text, marker):
    """The first Markdown table after the line that contains `marker`."""
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if marker in l)
    rows, inside = [], False
    for l in lines[start + 1:]:
        if l.startswith("|"):
            inside = True
            rows.append(l)
        elif inside:
            break
    return "\n".join(rows)


def task_tables(task):
    text = BENCHMARKS.read_text()
    title = TASK_TITLE[task]
    # the shared rules for both tasks end where the first extra-answers table (Task 1) starts
    rules = text[text.index("### Questions that are not in the tables"):text.index("**Task 1 (small): extra answers**")]
    hidden = md_table_after(text, f"### {title}")
    extra = md_table_after(text, f"**{title}: extra answers**")
    return rules.strip(), hidden, extra


def hidden_rows(hidden_table):
    rows = {}
    for l in hidden_table.splitlines()[2:]:
        cells = [c.strip() for c in l.strip("|").split("|")]
        rows[int(cells[0])] = {"question": cells[1], "answer": cells[2]}
    return rows


# ---------- shell ----------

def base_env():
    path = subprocess.run(["bash", "-c", NVM + 'printf %s "$PATH"'], capture_output=True, text=True).stdout
    env = dict(os.environ, PATH=path or os.environ["PATH"])
    env.pop("CLAUDE_CONFIG_DIR", None)  # helpers use the user's own login; the agent gets the method's dir
    return env


def bash(script, env, check=True, capture=False):
    r = subprocess.run(["bash", "-c", NVM + script], cwd=REPO, env=env, text=True, capture_output=capture)
    if check and r.returncode:
        raise Stop(f"shell step failed (exit {r.returncode}): {script.splitlines()[0][:80]}")
    return r


def method_vars(step1, env):
    out = bash(step1 + '\nprintf "%s\\n" "$SB" "$BENCH_DIR" "$ENV_DIR" "$CLAUDE_CONFIG_DIR" "$B" "$RUN"', env, capture=True).stdout
    keys = ("SB", "BENCH_DIR", "ENV_DIR", "CLAUDE_CONFIG_DIR", "B", "RUN")
    vals = dict(zip(keys, out.strip().splitlines()[-6:]))
    if not all(vals.values()):
        raise SystemExit(f"step 1 did not set every variable: {vals}")
    return vals


# ---------- the agent under test ----------

class Agent:
    """One `claude -p` process in stream-json mode: one session for the whole run."""

    def __init__(self, cmd, cwd, env, stream_log, check_init):
        stream_log.parent.mkdir(parents=True, exist_ok=True)
        self.log = stream_log.open("a")
        self.err = stream_log.with_suffix(".err").open("a")
        self.p = subprocess.Popen(cmd, cwd=cwd, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=self.err, text=True, bufsize=1)
        self.q = queue.Queue()
        self.init = None
        self.task_calls = 0
        self.check_init = check_init
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        for line in self.p.stdout:
            self.log.write(line)
            self.log.flush()
            try:
                self.q.put(json.loads(line))
            except json.JSONDecodeError:
                continue
        self.q.put(None)

    def send(self, text):
        self.p.stdin.write(json.dumps({"type": "user", "message": {"role": "user", "content": text}}) + "\n")
        self.p.stdin.flush()

    def _get(self, timeout):
        try:
            ev = self.q.get(timeout=timeout)
        except queue.Empty:
            return "timeout"
        if ev is None:
            raise Stop(f"the agent process ended (exit {self.p.poll()})")
        if ev.get("type") == "system" and ev.get("subtype") == "init" and self.init is None:
            self.init = ev
            problems = self.check_init(ev)
            if problems:
                self.p.kill()
                raise Stop("agent environment: " + "; ".join(problems))
        if ev.get("type") == "assistant" and not ev.get("parent_tool_use_id"):
            for block in ev.get("message", {}).get("content", []):
                if block.get("type") == "tool_use" and block.get("name") in ("Task", "Agent"):
                    self.task_calls += 1
        return ev

    def turn(self, timeout=TURN_TIMEOUT_S):
        """Wait for a `result`. If the agent goes on by itself (a background task ends), wait for its next one.
        Returns the last result and the sum of `duration_ms` of every result in between (agent time)."""
        results, deadline = [], time.time() + timeout
        while True:
            ev = self._get(max(1, deadline - time.time()))
            if ev == "timeout":
                raise Stop("no result from the agent within the turn timeout")
            if ev.get("type") != "result":
                continue
            results.append(ev)
            while True:  # quiet window
                nxt = self._get(QUIET_S)
                if nxt == "timeout":
                    return results[-1], sum(r.get("duration_ms", 0) for r in results)
                if nxt.get("type") == "result":
                    results.append(nxt)
                elif nxt.get("type") in ("assistant", "user") or nxt.get("subtype") == "init":
                    break  # the agent goes on: wait for its next result

    def close(self):
        try:
            self.p.stdin.close()
            self.p.wait(timeout=300)
        except Exception:
            self.p.kill()


# ---------- helper sessions (not part of the run) ----------

class Helpers:
    def __init__(self, env):
        self.env = env
        self.cwd = tempfile.mkdtemp(prefix="bench-run-helper-")  # no CLAUDE.md, no repo context
        self.cost = 0.0

    def ask(self, prompt_file, payload, schema, effort="medium", tools="", allowed=None, add_dirs=()):
        cmd = ["claude", "-p", "--setting-sources", "", "--strict-mcp-config", "--disable-slash-commands",
               "--no-session-persistence", "--model", HELPER_MODEL, "--effort", effort, "--output-format", "json",
               "--json-schema", json.dumps(schema), "--tools", tools]
        if allowed:
            cmd += ["--allowedTools", allowed]
        for d in add_dirs:
            cmd += ["--add-dir", str(d)]
        r = subprocess.run(cmd, cwd=self.cwd, env=self.env, input=prompt_file.read_text() + "\n\n" + payload,
                           capture_output=True, text=True, timeout=3600)
        try:
            out = json.loads(r.stdout)
        except json.JSONDecodeError:
            raise Stop(f"helper {prompt_file.name} failed: {r.stderr[:300]}")
        self.cost += out.get("total_cost_usd") or 0
        if out.get("is_error") or not isinstance(out.get("structured_output"), dict):
            raise Stop(f"helper {prompt_file.name} gave no structured output: {str(out.get('result'))[:300]}")
        return out["structured_output"]

    def session(self, prompt, extra_args, add_dirs, effort="high"):
        """A full assistant session (tools on, no permission prompts) for the operator and after-run checks."""
        cmd = ["claude", "-p", "--setting-sources", "", "--disable-slash-commands", "--no-session-persistence",
               "--dangerously-skip-permissions", "--model", HELPER_MODEL, "--effort", effort,
               "--output-format", "json", *extra_args]
        for d in add_dirs:
            cmd += ["--add-dir", str(d)]
        r = subprocess.run(cmd, cwd=self.cwd, env=self.env, input=prompt, capture_output=True, text=True, timeout=4 * 3600)
        try:
            out = json.loads(r.stdout)
        except json.JSONDecodeError:
            raise Stop(f"helper session failed: {r.stderr[:300]}")
        self.cost += out.get("total_cost_usd") or 0
        return str(out.get("result", ""))


CLASSIFY_SCHEMA = {"type": "object", "required": ["kind", "questions"], "properties": {
    "kind": {"type": "string", "enum": ["done", "question", "stop", "waiting"]},
    "questions": {"type": "array", "items": {"type": "string"}}}}
ANSWER_SCHEMA = {"type": "object", "required": ["answers"], "properties": {"answers": {"type": "array", "items": {
    "type": "object", "required": ["question", "source", "rows", "answer"], "properties": {
        "question": {"type": "string"}, "source": {"type": "string", "enum": ["hidden", "extra", "none"]},
        "rows": {"type": "array", "items": {"type": "integer"}}, "answer": {"type": "string"}}}}}}
GRADE_SCHEMA = {"type": "object", "required": ["rows"], "properties": {"rows": {"type": "array", "items": {
    "type": "object", "required": ["row", "mark", "matches", "evidence"], "properties": {
        "row": {"type": "integer"}, "mark": {"type": "string", "enum": ["asked", "covered", "missed"]},
        "matches": {"type": "string", "enum": ["yes", "partly", "no"]}, "evidence": {"type": "string"}}}}}}


# ---------- run state and report ----------

def usage_totals(result):
    mu = result.get("modelUsage") or {}
    s = lambda k: sum(int(m.get(k) or 0) for m in mu.values())
    return {"input": s("inputTokens"), "output": s("outputTokens"), "cache_read": s("cacheReadInputTokens"),
            "cache_write": s("cacheCreationInputTokens"), "cost": round(float(result.get("total_cost_usd") or 0), 2)}


class Run:
    def __init__(self, report):
        self.report = report
        self.pending = []  # timeline rows not yet written
        self.agent_ms = 0
        self.agent_ms_t1 = self.agent_ms_t2 = None
        self.last_at = None  # when the agent finished its last turn
        self.t0 = self.t1 = self.t2 = None
        self.res_t1 = self.res_t2 = self.last = None
        self.questions = []  # (question, source, rows)
        self.method_steps = 0
        self.followups = 0
        self.task_calls = 0
        self.helper_cost = 0.0
        self.notes = []
        self.marks = {}

    def row(self, kind, what, text="", tag=""):
        esc = lambda x: x.replace("|", "\\|").replace("\n", " ")
        code = (f"`` {esc(text)} ``" if "`" in text else f"`{esc(text)}`") if text else ""
        self.pending.append(f"| 0 | {hhmm(now())} | {kind} | {esc(what)} | {code} | {esc(tag)} |")
        self.flush_rows()

    def flush_rows(self):
        """Append the new rows at the end of the timeline table (the operator check adds its own rows), then number all rows."""
        lines = self.report.read_text().splitlines()
        h = next(i for i, l in enumerate(lines) if l.startswith("| # | Time | Type |"))
        end = h + 2
        while end < len(lines) and lines[end].startswith("|"):
            end += 1
        body = [l for l in lines[h + 2:end] if not re.match(r"\| (1 \| `<HH:MM>`|2 \| \| \|)", l)] + self.pending
        body = [re.sub(r"^\| [^|]* \|", f"| {i} |", l, count=1) for i, l in enumerate(body, 1)]
        lines[h + 2:end] = body
        self.report.write_text("\n".join(lines) + "\n")
        self.pending = []

    def account(self, result, ms):
        self.agent_ms += ms
        self.last, self.last_at = result, now()


def set_fields(report, fields):
    text = report.read_text()
    head, sep, rest = text.partition("\n---\n")
    for k, v in fields.items():
        head = re.sub(rf"^{re.escape(k)}:.*$", f"{k}: {v}", head, count=1, flags=re.M)
    report.write_text(head + sep + rest)


def get_field(report, key):
    m = re.search(rf"^{re.escape(key)}:\s*([^#\n]*)", report.read_text(), re.M)
    return m.group(1).strip() if m else ""


def write_hidden_table(report, marks):
    lines = report.read_text().splitlines()
    for i, l in enumerate(lines):
        m = re.match(r"^\| (\d+) \| ([^|]+) \| *\| *\| *\|$", l)
        if m and int(m.group(1)) in marks and "## 3." in "\n".join(lines[max(0, i - 15):i]):
            g = marks[int(m.group(1))]
            ev = g["evidence"].replace("|", "\\|").replace("\n", " ")
            lines[i] = f"| {m.group(1)} | {m.group(2).strip()} | {g['mark']} | {g['matches']} | {ev} |"
    report.write_text("\n".join(lines) + "\n")


def write_usage(report, res_t1, res_t2, main_model):
    text = report.read_text()
    rows = []
    for model, u in (res_t2.get("modelUsage") or {}).items():
        role = "main" if model == main_model else "subagent / runner-internal"
        rows.append(f"| {model} | {role} | {u.get('inputTokens', 0)} | {u.get('outputTokens', 0)} | "
                    f"{u.get('cacheReadInputTokens', 0)} | {u.get('cacheCreationInputTokens', 0)} | {round(u.get('costUSD', 0), 2)} |")
    text = text.replace("| --- | --- | ---: | ---: | ---: | ---: | ---: |\n| | | | | | | |",
                        "| --- | --- | ---: | ---: | ---: | ---: | ---: |\n" + "\n".join(rows), 1)
    pick = lambda r: json.dumps({k: r.get(k) for k in ("total_cost_usd", "modelUsage", "num_turns", "session_id")}, indent=1)
    text = text.replace("## T1\n<paste>", "## T1 (bench-run.py: the last `result` event at T1, cumulative for the session)\n" + pick(res_t1), 1)
    text = text.replace("## T2\n<paste>", "## T2 (bench-run.py: the last `result` event at T2, cumulative for the session)\n" + pick(res_t2), 1)
    report.write_text(text)


def add_note(report, line):
    text = report.read_text()
    text = text.replace("## 8. Notes\n", f"## 8. Notes\n\n- {line}", 1) if "## 8. Notes\n\n- " not in text else \
        text.replace("## 8. Notes\n\n", f"## 8. Notes\n\n- {line}\n", 1)
    report.write_text(text)


# ---------- the phases ----------

def isolation_problems(text, section, start_tag, plugin, allow_version):
    problems = []
    ver = re.search(r"Claude Code (\d+\.\d+\.\d+) and Node", section)
    if ver and f"{ver.group(1)} (Claude Code)" not in text and not allow_version:
        problems.append(f"Claude Code is not {ver.group(1)} (the method's pin); use --allow-version to run anyway")
    for bad in ("user-level:", "DIFFERS", "managed settings present"):
        if bad in text:
            problems.append(f"isolation output has '{bad}'")
    if '"sandbox": { "enabled": false }' not in text:
        problems.append("sandbox is not off")
    for r in REPOS:
        m = re.search(rf"^{r}: ((?:[\w.-]+ ?)+)$", text, re.M)
        if not m or start_tag not in m.group(1).split():
            problems.append(f"{r}: not on {start_tag}")
    if re.search(r"^(?:\?\?|[MADRCU][ MADRCU]|[ MADRCU][MADRCU]) \S", text, re.M):
        problems.append("a repo has uncommitted changes")
    if f"{plugin}@" not in text:
        problems.append(f"plugin {plugin} is not installed")
    return problems


def init_problems(init, model, plugin):
    problems = []
    if not init:
        return ["no init event from the agent"]
    if init.get("model") != model:
        problems.append(f"model is {init.get('model')}, not {model}")
    own = sorted(p["name"] for p in init.get("plugins", []) if p.get("path") != "builtin")
    if own != [plugin]:
        problems.append(f"plugins are {own}, not [{plugin}]")
    if init.get("mcp_servers"):
        problems.append(f"MCP servers present: {[m['name'] for m in init['mcp_servers']]}")
    return problems


def drive_until_done(agent, run, helpers, tables):
    """Answer questions and stops until the agent says it is done. Returns the agent's last message."""
    rules, hidden, extra = tables
    replies, pending = 0, None
    while True:
        result, ms = pending or agent.turn()
        pending = None
        run.account(result, ms)
        if result.get("subtype") != "success":
            raise Stop(f"agent turn ended with {result.get('subtype')}: {result.get('errors')}")
        msg = str(result.get("result") or "")
        c = helpers.ask(AUTO / "classify-turn.md", "Agent message:\n\n" + msg, CLASSIFY_SCHEMA)
        kind = c["kind"]
        if kind == "done":
            return msg
        replies += 1
        if replies > MAX_REPLIES:
            raise Stop(f"more than {MAX_REPLIES} driver replies without a 'done'")
        if kind == "waiting":
            log("agent waits for its own work; no reply")
            try:
                result, ms = agent.turn(timeout=WAITING_S)
            except Stop:
                result = None
            if result is None:
                agent.send(CONTINUE)
                run.method_steps += 1
                run.row("method-step", f"Agent idle {WAITING_S // 60} min after saying it waits for its own work; driver reply", CONTINUE)
                continue
            pending = (result, ms)
            replies -= 1
            continue
        if kind == "stop":
            agent.send(CONTINUE)
            run.method_steps += 1
            run.row("method-step", "Agent stopped for approval despite No HITL; driver reply", CONTINUE)
            continue
        qs = c["questions"] or [msg[-1500:]]
        payload = (f"Rules (BENCHMARKS.md section 4):\n\n{rules}\n\nHidden-question table:\n\n{hidden}\n\n"
                   f"Extra-answers table:\n\n{extra}\n\nAgent questions:\n\n" + "\n".join(f"{i}. {q}" for i, q in enumerate(qs, 1))
                   + f"\n\nThe agent's whole message, for context:\n\n{msg}")
        answers = helpers.ask(AUTO / "answer-questions.md", payload, ANSWER_SCHEMA)["answers"]
        parts = []
        for i, a in enumerate(answers, 1):
            text = a["answer"].strip() if a["source"] != "none" and a["answer"].strip() else NO_INFO
            parts.append(f"{i}. {text}" if len(answers) > 1 else text)
            tag = {"hidden": "hidden " + ",".join(map(str, a["rows"])), "extra": "extra " + ",".join(map(str, a["rows"]))}.get(a["source"], "extra (no table: NO_INFO)")
            run.questions.append((a["question"], a["source"], a["rows"]))
            run.row("question", "Q: " + a["question"][:200], text, tag)
        agent.send("\n\n".join(parts))


def hidden_check(agent, run, helpers, tables, step7_text, bench_dir):
    _, hidden, _ = tables
    rows = hidden_rows(hidden)
    asked = sorted({r for q, src, rs in run.questions if src == "hidden" for r in rs if r in rows})
    lines = step7_text.strip().splitlines()
    numbered = [int(m.group(1)) for l in lines[1:] if (m := re.match(r"(\d+)\.", l))]
    if numbered != sorted(rows):
        raise Stop(f"step 7 lists questions {numbered}, the hidden-question table has {sorted(rows)}")
    keep = [l for l in lines[1:] if not (m := re.match(r"(\d+)\.", l)) or int(m.group(1)) not in asked]
    msg = lines[0] + "\n" + "\n".join(keep)
    if len(keep):
        agent.send(msg)
        run.row("hidden-check", "Read-only hidden-question check (sent by the driver)", msg)
        result, ms = agent.turn()
        run.account(result, ms)
        answer = str(result.get("result") or "")
    else:
        answer = "(all hidden questions were asked; no check message sent)"
    payload = (f"Workspace folder (three repos inside): {bench_dir}\n\nHidden-question table:\n\n{hidden}\n\n"
               f"Rows the agent asked about: {asked or 'none'}\n\nThe agent's answer to the check:\n\n{answer}")
    grade = helpers.ask(AUTO / "hidden-check.md", payload, GRADE_SCHEMA, effort="high", tools="Read,Grep,Glob,Bash",
                        allowed="Read Grep Glob Bash(git -C:*)", add_dirs=[bench_dir])["rows"]
    marks = {g["row"]: g for g in grade if g["row"] in rows}
    for r in asked:
        marks.setdefault(r, {"row": r, "mark": "asked", "matches": "yes", "evidence": "asked during the run"})["mark"] = "asked"
    missing = set(rows) - set(marks)
    if missing:
        raise Stop(f"hidden-question grader skipped rows {sorted(missing)}")
    run.marks = marks
    write_hidden_table(run.report, marks)
    missed = [r for r in sorted(marks) if marks[r]["mark"] == "missed"]
    if not missed:
        return
    fix = ("These points are not handled yet. Fix all of them in this turn:\n" +
           "\n".join(f"{i}. {rows[r]['question']} Required decision: {rows[r]['answer']}" for i, r in enumerate(missed, 1)))
    agent.send(fix)
    run.followups += 1
    run.row("follow-up", f"Missed hidden questions {missed}: one follow-up", fix)


def operator_check(agent, run, helpers, tables, v, runner, method):
    mcp = Path(helpers.cwd) / "playwright-mcp.json"
    mcp.write_text(json.dumps(PLAYWRIGHT_MCP))
    sent = 0
    while True:
        started = time.time()
        prompt = (f"Follow this file exactly: {EXECUTE}\n\nDriver mode (bench-run.py, no human):\n"
                  f"- RUN={v['RUN']}\n- BENCH_DIR={v['BENCH_DIR']}\n- bench.sh={v['B']}\n- runner={runner}, method={method}\n"
                  f"- BENCHMARKS.md: {BENCHMARKS} (the dashboard login is under Login in 3.2)\n"
                  f"- Case follow-ups already sent: {sent} of {MAX_CASE_FOLLOWUPS}.\n"
                  "- When the file says to send a follow-up, do what its driver-mode line says.\n")
        reply = helpers.session(prompt, ["--strict-mcp-config", "--mcp-config", str(mcp), "--plugin-dir", str(REPO / "plugins" / "core-claude")],
                                [SB, v["BENCH_DIR"]])
        dirs = [d for d in (Path(v["RUN"]) / "operator-check").glob("*") if d.is_dir() and d.stat().st_mtime >= started - 5]
        if not dirs:
            raise Stop(f"operator check wrote no result folder: {reply[:300]}")
        d = max(dirs, key=lambda p: p.stat().st_mtime)
        res = (d / "result.md").read_text() if (d / "result.md").exists() else ""
        if "BLOCKED" in res or not res:
            run.notes.append(f"Operator check BLOCKED: {res.strip()[:200] or reply[:200]}")
            return "blocked"
        failed = re.search(r"^TC-00[12] \| FAIL", res, re.M)
        if not failed:
            return "pass"
        fu = d / "followup.md"
        if sent >= MAX_CASE_FOLLOWUPS or not fu.exists():
            return "fail"
        text = fu.read_text().strip()
        agent.send(text)
        sent += 1
        run.followups += 1
        run.row("follow-up", f"Operator check {d.name}: case follow-up {sent}", text)
        drive_until_done(agent, run, helpers, tables)


def finish_report(run, v, init, model, method, task_text, status):
    r = run.report
    t1, t2 = run.res_t1, run.res_t2 or run.res_t1
    u1, u2 = usage_totals(t1), usage_totals(t2)
    gap_free_t1 = (run.agent_ms_t1 or 0) / 60000
    marks = run.marks
    count = lambda m: sum(1 for g in marks.values() if g["mark"] == m)
    entry = task_text.split()[0] if task_text.startswith("/") else 'none; the prompt names its skills'
    last_iter = ((t2.get("usage") or {}).get("iterations") or [{}])[-1]
    ctx_tokens = sum(int(last_iter.get(k) or 0) for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    window = ((t2.get("modelUsage") or {}).get(model) or {}).get("contextWindow") or 0
    plugin = next((p for p in (init or {}).get("plugins", []) if p.get("path") != "builtin"), {})
    fields = {
        "method_version": plugin.get("version", ""), "flow": METHODS[method], "entry_command": entry,
        "runner_version": (init or {}).get("claude_code_version", ""), "operator": "bench-run.py (automated, no human)",
        "status": status, "t0": iso_min(run.t1 - dt.timedelta(minutes=gap_free_t1)) if run.t1 else "",
        "t1": iso_min(run.t1) if run.t1 else "", "t2": iso_min(run.t2) if run.t2 else "",
        "total_min": round((run.agent_ms_t2 or run.agent_ms) / 60000, 1),
        "t1_input_tokens": u1["input"], "t1_output_tokens": u1["output"], "t1_cache_read_tokens": u1["cache_read"],
        "t1_cache_write_tokens": u1["cache_write"], "t1_cost_usd": u1["cost"],
        "t2_input_tokens": u2["input"], "t2_output_tokens": u2["output"], "t2_cache_read_tokens": u2["cache_read"],
        "t2_cache_write_tokens": u2["cache_write"], "t2_cost_usd": u2["cost"],
        "context_end_pct": round(ctx_tokens / window * 100, 1) if window else "", "subagents": run.task_calls,
        "method_steps": run.method_steps, "questions_total": len(run.questions),
        "questions_hidden": sum(1 for q in run.questions if q[1] == "hidden"),
        "questions_extra": sum(1 for q in run.questions if q[1] != "hidden"),
        "followups": run.followups, "retries": 0,
        "hidden_asked": count("asked"), "hidden_covered": count("covered"), "hidden_missed": count("missed"),
        "hidden_matches_answer": sum({"yes": 1, "partly": 0.5}.get(g["matches"], 0) for g in marks.values() if g["mark"] != "missed"),
    }
    set_fields(r, fields)
    write_usage(r, t1, t2, model)
    add_note(r, f"Automated run (bench-run.py): headless `claude -p` stream-json session, no human. Usage from the runner's `result` "
                f"events (`total_cost_usd`, `modelUsage`; subagents included), not from `/usage`. Gap-free time = sum of `duration_ms` "
                f"of the agent's turns ({round(gap_free_t1, 1)} min to T1). `context_end_pct` is computed from the last turn's tokens.")
    for n in run.notes:
        add_note(r, n)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("runner", choices=RUNNER_LABEL)
    ap.add_argument("method", choices=METHODS)
    ap.add_argument("task", choices=TASK_TITLE)
    ap.add_argument("--replace", action="store_true", help="the run folder has uncommitted changes: replace it anyway")
    ap.add_argument("--allow-version", action="store_true", help="run with a Claude Code version other than the method's pin")
    ap.add_argument("--max-budget-usd", type=float, help="stop the agent above this spend")
    ap.add_argument("--plan", action="store_true", help="only parse the method file and print what would run")
    a = ap.parse_args()
    if a.runner != "claude-code":
        raise SystemExit("copilot: not automated yet (its headless usage output is not verified)")
    if a.task != "small":
        raise SystemExit("large task: its own check is manual (BENCHMARKS.md, Operator check); only the small task is automated")

    run_id, section = run_section(a.method, a.runner, a.task)
    step1, step2, step3, step10 = (step_block(section, n, "bash") for n in (1, 2, 3, 10))
    t0_text, step7, post = (step_block(section, n, "text").strip() for n in (5, 7, 9))
    model = re.search(r"--model (\S+)", step_block(section, 4, "bash")).group(1)
    start_tag = re.search(r"start_tag: (\S+?)\|", step2).group(1)
    plugin = re.search(r"Expected: only `([^`@]+)@", section).group(1)
    tables = task_tables(a.task)
    env = base_env()
    v = method_vars(step1, env)
    if a.plan:
        print(json.dumps({"run_id": run_id, "model": model, "start_tag": start_tag, "plugin": plugin, "vars": v,
                          "t0": t0_text, "hidden_check": step7, "post": post[:80] + "…"}, indent=1))
        return
    dirty = subprocess.run(["git", "status", "--porcelain", "--", v["RUN"]], cwd=REPO, capture_output=True, text=True).stdout
    if dirty and not a.replace:
        raise SystemExit(f"{v['RUN']} has uncommitted changes. Commit it first (it stays in git history), or pass --replace.")

    log(f"{run_id}: steps 2-3 (zips, setup, start, report, isolation check)")
    bash(step1 + "\n" + step2, env, check=False)
    report = Path(v["RUN"]) / "report.md"
    if not report.exists():
        raise SystemExit(f"step 2 did not create {report}")
    for _ in range(12):
        if bash(step1 + '\n"$B" health', env, check=False, capture=True).returncode == 0:
            break
        time.sleep(15)
    else:
        raise SystemExit("health: the stack is not OK after 3 minutes")
    run = Run(report)
    try:
        bash(step1 + "\n" + step3, env)
    except Stop as e:
        raise SystemExit(f"isolation check could not run: {e}")
    problems = isolation_problems((Path(v["RUN"]) / "isolation.txt").read_text(), section, start_tag, plugin, a.allow_version)
    if problems:
        raise SystemExit("isolation check FAIL:\n- " + "\n- ".join(problems))

    for p in (Path(v["CLAUDE_CONFIG_DIR"]) / "projects").glob("*saleor-benchmark*"):
        shutil.rmtree(p, ignore_errors=True)  # step 4 cleanup: session-usage.py reads only this run
    shutil.rmtree(Path(v["BENCH_DIR"]) / "run-output", ignore_errors=True)
    cmd = ["claude", "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
           "--dangerously-skip-permissions", "--model", model]
    if a.max_budget_usd:
        cmd += ["--max-budget-usd", str(a.max_budget_usd)]
    agent = Agent(cmd, v["BENCH_DIR"], dict(env, CLAUDE_CONFIG_DIR=v["CLAUDE_CONFIG_DIR"]), Path(v["RUN"]) / "session" / "stream.jsonl",
                  lambda init: init_problems(init, model, plugin))
    signal.signal(signal.SIGTERM, lambda *_: (agent.p.kill(), sys.exit(1)))
    helpers = Helpers(env)
    status = "done"
    try:
        run.t0 = now()
        agent.send(t0_text)
        run.row("prompt", "Task prompt sent (T0) by bench-run.py", t0_text)
        log("T0: task sent")
        drive_until_done(agent, run, helpers, tables)
        (Path(v["RUN"]) / "agent-session-id").write_text(agent.init["session_id"] + "\n")
        run.t1, run.res_t1, run.agent_ms_t1 = run.last_at, run.last, run.agent_ms
        run.row("T1", "First \"done\" (usage snapshot T1)")
        log(f"T1: done; ${run.last.get('total_cost_usd', 0):.2f} so far")
        hidden_check(agent, run, helpers, tables, step7, v["BENCH_DIR"])
        if run.followups:
            drive_until_done(agent, run, helpers, tables)
        log("operator check (small-task-execute.md)")
        verdict = operator_check(agent, run, helpers, tables, v, a.runner, a.method)
        run.t2, run.res_t2, run.agent_ms_t2 = run.last_at, run.last, run.agent_ms
        run.row("T2", f"Last follow-up done; operator check: {verdict} (usage snapshot T2)")
        agent.send(post)
        run.row("post-prompt", "Post-implementation prompt", post)
        drive_until_done(agent, run, helpers, tables)
    except Stop as e:
        status = "infra-fail"
        run.notes.append(f"Run stopped by bench-run.py: {e}")
        log(f"STOP: {e}")
        if run.t1 is None and run.last:
            run.t1, run.res_t1, run.agent_ms_t1 = run.last_at, run.last, run.agent_ms
    finally:
        agent.close()
    run.task_calls = agent.task_calls
    run.helper_cost = helpers.cost

    if run.res_t1:
        log("step 10: save artifacts, tokens.md")
        bash(step1 + "\n" + re.sub(r"^T1=\S+", f"T1={iso_min(run.t1)}", step10, flags=re.M), env, check=False)
        finish_report(run, v, agent.init, model, a.method, t0_text, status)
    else:  # stopped before the agent's first result: keep the reason in the report
        set_fields(report, {"status": status, "operator": "bench-run.py (automated, no human)"})
        for n in run.notes:
            add_note(report, n)
    if status == "done":
        log("after-run checks (tests, cleanup, red flags, claims, size of change)")
        reply = helpers.session(
            f"Follow this file: {AUTO / 'after-run.md'}\n\nRun report: {report}\nRun folder: {v['RUN']}\n"
            f"Workspace (three repos): {v['BENCH_DIR']}\nMethod file: {SB / 'methods' / (a.method + '.md')}\n"
            f"BENCHMARKS.md: {BENCHMARKS}\nStart tag: {start_tag}\n", [], [SB, v["BENCH_DIR"]])
        log(reply.strip().splitlines()[-1] if reply.strip() else "after-run: no reply")
    add_note(report, f"Helper sessions ({HELPER_MODEL}: classifier, simulated product owner, hidden-question grader, operator check, "
                     f"after-run checks) cost ${round(helpers.cost, 2)} in total. Not part of this run's usage.")
    subprocess.run([sys.executable, str(SB / "scripts" / "collect-results.py")], cwd=REPO)
    log(f"{run_id}: {status}. Report: {report}. Next: the diff judge (BENCHMARKS.md section 6) rates all runs of this task and runner together; "
        f"set {run_id} in EXPERIMENTS.md.")
    return 0 if status == "done" else 1


if __name__ == "__main__":
    sys.exit(main())
