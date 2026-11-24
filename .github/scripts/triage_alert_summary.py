#!/usr/bin/env python3
"""Surface triage security alerts in the job summary instead of the issue tracker.

`repo-triage` never creates issues (.github/prompts/repo-triage.md, "Intended use"). When
its guardrail fires, the agent ends its FINAL message with one or more blocks:

    ROSETTA-SECURITY-ALERT-BEGIN
    ...what was detected, source URL, actor, excerpt, UTC timestamp...
    ROSETTA-SECURITY-ALERT-END

This script reads only the agent's final message -- the `result` of the last
`{"type": "result"}` entry in the Claude execution JSON, or the Codex `output-file` --
because the prompt itself, which the agent reads into its transcript, names the markers.
Each block is appended to $GITHUB_STEP_SUMMARY and raised as a `::warning::`. Missing or
unreadable files are skipped: the agent branch that did not run leaves none.

Job summaries and logs of a public repository are public. The prompt therefore keeps
non-public findings (code-scanning, Dependabot) out of these blocks.

Usage: triage_alert_summary.py [--claude-trace FILE] [--codex-final FILE]
"""
import argparse
import json
import os
import re
import sys

BLOCK = re.compile(r"ROSETTA-SECURITY-ALERT-BEGIN\s*\n(.*?)\n\s*ROSETTA-SECURITY-ALERT-END",
                   re.DOTALL)
MAX_BLOCK_CHARS = 4000
MAX_BLOCKS = 5


def claude_final_message(path):
    """The `result` text of the last result entry, or "" when there is none."""
    try:
        with open(path) as fh:
            msgs = json.load(fh)
    except (OSError, ValueError):
        return ""
    if not isinstance(msgs, list):
        return ""
    for msg in reversed(msgs):
        if isinstance(msg, dict) and msg.get("type") == "result":
            result = msg.get("result")
            return result if isinstance(result, str) else ""
    return ""


def codex_final_message(path):
    try:
        with open(path) as fh:
            return fh.read()
    except OSError:
        return ""


def extract_alerts(text):
    return [b.strip()[:MAX_BLOCK_CHARS] for b in BLOCK.findall(text) if b.strip()]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--claude-trace", default=None)
    ap.add_argument("--codex-final", default=None)
    args = ap.parse_args(argv)

    text = ""
    if args.claude_trace:
        text += claude_final_message(args.claude_trace) + "\n"
    if args.codex_final:
        text += codex_final_message(args.codex_final) + "\n"

    found = extract_alerts(text)
    if not found:
        print("No triage security alerts.")
        return 0
    alerts = found[:MAX_BLOCKS]

    lines = ["## Rosetta triage: %d security alert(s)" % len(found), ""]
    if len(found) > MAX_BLOCKS:
        lines += ["Showing the first %d; the rest are in the execution trace." % MAX_BLOCKS, ""]
    for index, alert in enumerate(alerts, 1):
        # A fence longer than any backtick run inside keeps attacker text inert.
        fence = "`" * max(3, max((len(m) for m in re.findall(r"`+", alert)), default=0) + 1)
        lines += ["### Alert %d" % index, "", fence + "text", alert, fence, ""]

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as fh:
            fh.write("\n".join(lines) + "\n")
    # Alert text is attacker-influenced: printed to stdout, a line such as `::add-mask::`
    # or `::stop-commands::` would be executed by the runner as a workflow command. Only
    # fixed text goes to stdout; the content lives in the summary file alone.
    print("::warning title=Rosetta triage security alert::%d alert(s); see the job summary"
          % len(found))
    return 0


if __name__ == "__main__":
    sys.exit(main())
