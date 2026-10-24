#!/usr/bin/env python3
"""Break down where the tokens of one Claude Code session went.

Claude Code writes every session to $CLAUDE_CONFIG_DIR/projects/<workspace>/<session-id>.jsonl, and every
subagent to <session-id>/subagents/agent-<id>.jsonl (+ .meta.json). This script reads them and reports
tokens per model, per agent (main + each subagent), per operator message (prompt, answers, follow-ups),
and tool / skill / subagent calls.

Usage:
  session-usage.py <session.jsonl | projects dir>             # a dir → its newest session
      [--t1 2026-10-20T14:05]                                  # split usage at T1 (local time)
      [--copy-to <RUN_DIR>]                                    # also save the raw logs into the run's artifacts
      [--out <RUN_DIR>/tokens.md]                              # write the report to a file (default: stdout)

Only the Python standard library is used. Token counts come straight from the logs; nothing is estimated.
"""

import argparse
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

LOCAL_COMMANDS = {"/cost", "/usage", "/mcp", "/plugin", "/plugins", "/model", "/status", "/config", "/context",
                  "/help", "/login", "/logout", "/clear", "/compact", "/doctor", "/memory", "/permissions"}
FIELDS = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")
LABELS = ("Input", "Output", "Cache read", "Cache write")


def parse_ts(value):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def local_ts(value):
    """Operator time like 2026-10-20T14:05 (local) → aware datetime."""
    return datetime.fromisoformat(value).astimezone()


def read_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return rows


def operator_text(entry):
    """Text typed by the operator, or None for tool results, meta and system entries."""
    if entry.get("type") != "user" or entry.get("isMeta") or entry.get("isSidechain"):
        return None
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
        if not parts or any(isinstance(c, dict) and c.get("type") == "tool_result" for c in content):
            return None
        text = " ".join(parts)
    else:
        return None
    text = text.strip()
    # Not typed by the operator: background-task notifications, local command output.
    if not text or text.startswith(("<task-notification>", "<local-command", "<system-reminder>")):
        return None
    # Runner-local slash commands (no model call): /cost, /usage, /mcp, /plugin, /model, ...
    command = re.search(r"<command-name>(/[\w:-]+)</command-name>", text)
    name = command.group(1) if command else (text.split()[0] if text.startswith("/") else None)
    if name in LOCAL_COMMANDS:
        return None
    # Readable form: "/skill args" for slash commands, pasted text without its wrapper tags.
    if command:
        args = re.search(r"<command-args>(.*?)</command-args>", text, re.S)
        text = f"{name} {args.group(1).strip() if args else ''}".strip()
    text = re.sub(r"</?pasted_content[^>]*>", "", text).strip()
    return text


def model_calls(rows):
    """One record per API response. A response is logged as several entries (one per content block)
    that repeat the same usage, so they are merged by message id."""
    calls = {}
    for d in rows:
        m = d.get("message")
        if d.get("type") != "assistant" or not isinstance(m, dict) or not m.get("id"):
            continue
        c = calls.setdefault(m["id"], {"model": m.get("model"), "usage": m.get("usage") or {},
                                       "ts": parse_ts(d.get("timestamp")), "tools": []})
        for block in m.get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                c["tools"].append(block)
    return [c for c in calls.values() if c["model"] != "<synthetic>"]


def add(total, usage):
    for k in FIELDS:
        total[k] += usage.get(k) or 0


def fmt(n):
    return f"{n:,}".replace(",", " ")


def row(name, t, extra=()):
    return "| " + " | ".join([name, *extra, *(fmt(t[k]) for k in FIELDS), fmt(sum(t[k] for k in FIELDS))]) + " |"


def header(first, extra=()):
    cols = [first, *extra, *LABELS, "All"]
    return ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]


def find_session(arg):
    p = Path(arg).expanduser()
    if p.is_dir():
        files = sorted(p.glob("*.jsonl"), key=lambda f: f.stat().st_mtime)
        if not files:
            sys.exit(f"no *.jsonl in {p}")
        return files[-1]
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("session")
    ap.add_argument("--t1", help="T1 in local time, e.g. 2026-10-20T14:05: usage is split before / after it")
    ap.add_argument("--copy-to", type=Path, help="copy the raw session + subagent logs into <dir>/session/")
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    main_file = find_session(args.session)
    sub_dir = main_file.with_suffix("") / "subagents"
    main_rows = read_jsonl(main_file)

    agents = [("main", "main agent", None, model_calls(main_rows))]
    for f in sorted(sub_dir.glob("agent-*.jsonl")) if sub_dir.is_dir() else []:
        meta_file = f.with_suffix(".meta.json")
        meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
        name = meta.get("agentType") or "subagent"
        agents.append((f.stem.replace("agent-", ""), name, meta.get("description"), model_calls(read_jsonl(f))))

    all_calls = [c for _, _, _, calls in agents for c in calls]
    times = [c["ts"] for c in all_calls if c["ts"]]
    t1 = local_ts(args.t1) if args.t1 else None

    # The report is committed: name the log where it will be after --copy-to, never by an absolute local path.
    log_ref = f"session/{main_file.name}" if args.copy_to else main_file.name

    out = [f"# Session usage: `{main_file.stem}`", ""]
    total = Counter()
    for c in all_calls:
        add(total, c["usage"])
    peak = max((sum(c["usage"].get(k) or 0 for k in ("input_tokens", "cache_read_input_tokens",
                                                     "cache_creation_input_tokens")) for c in all_calls), default=0)
    out += [
        f"- Log: `{log_ref}`",
        f"- First / last model call: {min(times).astimezone():%Y-%m-%d %H:%M:%S} / {max(times).astimezone():%H:%M:%S}" if times else "- No model calls",
        f"- Model calls: {len(all_calls)} (main {len(agents[0][3])}, subagents {len(all_calls) - len(agents[0][3])}); subagents launched: {len(agents) - 1}",
        f"- Tokens: input {fmt(total['input_tokens'])} · output {fmt(total['output_tokens'])} · cache read {fmt(total['cache_read_input_tokens'])} · cache write {fmt(total['cache_creation_input_tokens'])}",
        f"- Largest single request (context size): {fmt(peak)} tokens",
        "",
        "Token counts are taken from the logs as they are. Cost: use `/cost` from the runner.",
        "",
    ]

    if t1:
        before, after = Counter(), Counter()
        for c in all_calls:
            add(before if c["ts"] and c["ts"] <= t1 else after, c["usage"])
        out += ["## Before / after T1", ""] + header("Part")
        out += [row(f"Until T1 ({args.t1})", before), row("After T1 (rework)", after), row("Total", total), ""]

    by_model = defaultdict(Counter)
    calls_by_model = Counter()
    for who, _, _, calls in agents:
        for c in calls:
            key = (c["model"], "main" if who == "main" else "subagent")
            add(by_model[key], c["usage"])
            calls_by_model[key] += 1
    out += ["## By model", ""] + header("Model", ("Used by", "Calls"))
    for (model, role), t in sorted(by_model.items(), key=lambda kv: -sum(kv[1].values())):
        out.append(row(f"`{model}`", t, (role, str(calls_by_model[(model, role)]))))
    out.append("")

    out += ["## By agent", ""] + header("Agent", ("Type", "Model(s)", "Calls", "Tool calls"))
    for who, kind, desc, calls in agents:
        t = Counter()
        for c in calls:
            add(t, c["usage"])
        models = ", ".join(sorted({c["model"] for c in calls})) or "–"
        label = "main" if who == "main" else f"{who[:8]}: {desc or ''}"[:70]
        out.append(row(label, t, (kind, models, str(len(calls)), str(sum(len(c["tools"]) for c in calls)))))
    out.append("")

    # Main-agent tokens per operator message: the prompt, each answer, each method step, each follow-up.
    turns, current = [], None
    calls_iter = sorted(agents[0][3], key=lambda c: c["ts"] or datetime.min.astimezone())
    sub_calls = sorted((c for _, _, _, cs in agents[1:] for c in cs), key=lambda c: c["ts"] or datetime.min.astimezone())
    prompts = [(parse_ts(d.get("timestamp")), operator_text(d)) for d in main_rows]
    prompts = [(ts, txt) for ts, txt in prompts if ts and txt]
    for i, (ts, txt) in enumerate(prompts):
        end = prompts[i + 1][0] if i + 1 < len(prompts) else None
        t = Counter()
        n = 0
        for c in calls_iter + sub_calls:
            if c["ts"] and c["ts"] >= ts and (end is None or c["ts"] < end):
                add(t, c["usage"])
                n += 1
        turns.append((ts, txt, t, n))
    if turns:
        out += ["## By operator message", "", "Tokens spent (main agent + subagents) after each message the operator sent, until the next one.", ""]
        out += header("#", ("Time", "Operator message (start)", "Calls"))
        for i, (ts, txt, t, n) in enumerate(turns, 1):
            short = txt.replace("|", "/").replace("\n", " ")[:60]
            out.append(row(str(i), t, (f"{ts.astimezone():%H:%M:%S}", short, str(n))))
        out.append("")

    tools, skills, subagent_types = Counter(), Counter(), Counter()
    for _, _, _, calls in agents:
        for c in calls:
            for t in c["tools"]:
                tools[t.get("name")] += 1
                inp = t.get("input") or {}
                if t.get("name") == "Skill":
                    skills[inp.get("skill") or inp.get("name") or "?"] += 1
                if t.get("name") in ("Agent", "Task"):
                    subagent_types[f"{inp.get('subagent_type') or '?'} ({inp.get('model') or 'default model'})"] += 1
    out += ["## Tool calls", "", "| Tool | Calls |", "|---|---|"] + [f"| `{k}` | {v} |" for k, v in tools.most_common()] + [""]
    if skills:
        out += ["### Skills loaded", "", "| Skill | Calls |", "|---|---|"] + [f"| `{k}` | {v} |" for k, v in skills.most_common()] + [""]
    if subagent_types:
        out += ["### Subagents launched", "", "| Type (model) | Count |", "|---|---|"] + [f"| {k} | {v} |" for k, v in subagent_types.most_common()] + [""]

    text = "\n".join(out)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(f"report → {args.out}")
    else:
        print(text)

    if args.copy_to:
        dest = args.copy_to / "session"
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(main_file, dest / main_file.name)
        if sub_dir.is_dir():
            shutil.copytree(sub_dir, dest / "subagents", dirs_exist_ok=True)
        print(f"raw logs → {dest}")


if __name__ == "__main__":
    main()
