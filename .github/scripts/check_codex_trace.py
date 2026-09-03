#!/usr/bin/env python3
"""Post-run guard for the Codex branch of the Rosetta pipelines.

The Codex counterpart of `check_trace.py`. It answers only ONE of that script's
two questions:

  1. did the run mutate anything?  -- checked here
  2. did the main agent background a subagent and abandon it?  -- NOT checked

Check 2 is not implemented for Codex. It was long assumed to have no analogue --
"the plugin has no subagents" -- but run 33664134418 fanned out to four of them, each
with its own rollout file. Whether a Codex subagent can be BACKGROUNDED and stranded
the way a Claude one can is untested, so this remains a real gap rather than an
inapplicable check.

Check 1 is skipped with --allow-no-op, for the same reason as in `check_trace.py`:
board-driven pipelines are pulled by board state that guarantees work exists, so
doing nothing is a failure; triage is event-driven and may legitimately have
nothing to say.

Input is the Codex rollout tree (`$CODEX_HOME/sessions`), one JSON object per line.
Only `response_item.function_call` records for a shell tool are inspected; the
mutating-command vocabulary is shared with `check_trace.py` so both branches are
held to the same definition of "did real work".
"""
import re
import json
import os
import sys

from check_trace import MUTATING

# Codex reaches the shell through more than one record shape, and which one you get
# depends on the CLI version. BOTH are handled, because a parser that knows only one
# silently reports zero tool calls for a run that made several -- observed live on
# 2026-09-01, where this script saw 0 commands in a run that executed 4.
#
#   1. `response_item.function_call` with `name` in SHELL_TOOLS and JSON `arguments`
#      carrying `cmd` (string) or `command` (array). This is the shape in the recorded
#      sample at docs/hooks/codex-019f0634-transcript.jsonl.
#   2. `response_item.custom_tool_call` with `name: "exec"` and `input` holding a
#      JavaScript snippet rather than JSON, e.g.
#          const r = await tools.exec_command({"cmd":"gh issue view 1","workdir":"..."})
#      The object literal inside is JSON, so it is extracted by balanced-brace scan.
SHELL_TOOLS = ("shell", "exec_command", "local_shell_call", "container.exec")
CUSTOM_SHELL_TOOLS = ("exec", "shell", "container.exec")


def json_objects(text):
    """Every balanced {...} span in `text` that parses as a JSON object.

    A regex cannot do this safely: the commands contain braces and escaped quotes.
    Scanning for balance while tracking string state is short and exact.
    """
    found = []
    depth = start = 0
    in_str = esc = False
    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth:
                depth -= 1
                if depth == 0:
                    obj = _loads_lenient(text[start:i + 1])
                    if isinstance(obj, dict):
                        found.append(obj)
    return found


# The wrapper is JavaScript, not JSON, and object literals there carry BARE keys:
# `tools.exec_command({cmd:"...", workdir:"..."})`. `json.loads` rejects those, and
# because the failure was silent the gate reported "0 tool calls" for rollouts holding
# 26 of them -- under-counting mutations, which is the one direction this check must
# never fail in. Quote bare keys and retry.
_BARE_KEY = re.compile(r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)')


def _loads_lenient(span):
    try:
        return json.loads(span)
    except ValueError:
        pass
    try:
        return json.loads(_BARE_KEY.sub(r'\1"\2"\3', span))
    except ValueError:
        return None


def split_chained(command):
    """Split a shell string into its separate commands, respecting quotes.

    MUTATING is anchored at the start of a command, but this Codex build chains
    freely -- the first real rollout contains `pwd && sed -n ... && sed -n ...`. Without
    splitting, `cd x && gh issue create ...` is extracted but never matched, and the
    strict gate would fail a run that did exactly what it was asked to. Codex itself
    splits before evaluating exec policy (`parse_shell_lc_plain_commands`); this is the
    same idea, kept deliberately simple because a missed split only costs a false
    "changed nothing", never a false pass.
    """
    parts, buf = [], []
    quote = None
    i = 0
    while i < len(command):
        ch = command[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and quote == '"' and i + 1 < len(command):
                buf.append(command[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "'\"":
            quote = ch
            buf.append(ch)
        elif ch in ";\n":
            parts.append("".join(buf))
            buf = []
        elif ch in "&|" and i + 1 < len(command) and command[i + 1] == ch:
            parts.append("".join(buf))
            buf = []
            i += 2
            continue
        elif ch == "|":
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


# The multi-line commands -- which is to say the interesting ones -- are written as
# JavaScript TEMPLATE LITERALS, not JSON strings:
#
#     tools.exec_command({
#         cmd: `gh issue create --title "..." \
#                 --body "..."`,
#         workdir: "..."})
#
# No amount of key-quoting makes that parse as JSON, so the balanced-brace scan skips
# the whole object. That is how run 33666950023 was reported as having executed no
# mutations while it was creating issues #350-#357. Pull the backtick spans out
# directly; for a "did this run mutate anything" gate the raw text is all that is
# needed, and over-reading a `${...}` placeholder can only cost a false finding, never
# a false pass.
_TEMPLATE_CMD = re.compile(r'\b(?:cmd|command)\s*:\s*`([^`]*)`', re.S)


def template_literal_commands(text):
    """Shell commands carried by a JS template literal `cmd:` value."""
    return [m.group(1) for m in _TEMPLATE_CMD.finditer(text)]


def commands_from_args(args):
    """Shell command strings carried by a tool-call argument object."""
    raw = args.get("cmd", args.get("command"))
    if isinstance(raw, str):
        return [raw]
    if isinstance(raw, list):
        parts = [p for p in raw if isinstance(p, str)]
        # Match the wrapper's own argv AND each element: `gh issue create ...` arrives
        # as the last element of ["bash", "-lc", "<script>"], and a direct argv form
        # has it spread across the whole list.
        return parts + [" ".join(parts)]
    return []


def rollouts(path):
    """Every rollout file under `path`, or `path` itself when it is a file."""
    if os.path.isfile(path):
        return [path]
    found = []
    for root, _dirs, names in os.walk(path):
        found += [
            os.path.join(root, n) for n in sorted(names) if n.endswith(".jsonl")
        ]
    return found


def commands(path):
    """Shell command strings the agent executed, in order."""
    out = []
    with open(path, errors="surrogateescape") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                # A rollout is appended to live; a torn last line is not a finding.
                continue
            if not isinstance(rec, dict) or rec.get("type") != "response_item":
                continue
            payload = rec.get("payload")
            if not isinstance(payload, dict):
                continue
            kind = payload.get("type")

            if kind == "function_call" and payload.get("name") in SHELL_TOOLS:
                args = payload.get("arguments")
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except ValueError:
                        args = {}
                if isinstance(args, dict):
                    out += commands_from_args(args)

            elif kind == "custom_tool_call" and payload.get("name") in CUSTOM_SHELL_TOOLS:
                src = payload.get("input")
                if isinstance(src, str):
                    for obj in json_objects(src):
                        out += commands_from_args(obj)
                    out += template_literal_commands(src)
    return out


def main(path, require_mutation=True):
    files = rollouts(path)
    if not files:
        print(
            "::error::no Codex rollout found under %s -- the Codex step did not run"
            % path
        )
        return 1

    mutating = []
    for f in files:
        for cmd in commands(f):
            for segment in split_chained(cmd):
                if MUTATING.match(segment):
                    mutating.append(segment[:120])

    print("Codex rollout files inspected: %d" % len(files))
    print("issue-mutating commands executed: %d" % len(mutating))
    for c in mutating:
        print("  %s" % c)

    if require_mutation and not mutating:
        print(
            "::error::The run changed nothing: no issue, pull-request or board "
            "mutation was executed."
        )
        return 1
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("usage: check_codex_trace.py <sessions-dir> [--allow-no-op]",
              file=sys.stderr)
        sys.exit(2)
    sys.exit(main(args[0], require_mutation="--allow-no-op" not in sys.argv[1:]))
