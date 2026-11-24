#!/usr/bin/env python3
"""Redact credentials from an agent execution trace before it is uploaded.

The trace is a full tool-call transcript and is published as a workflow artifact,
which is downloadable and is NOT covered by Actions log masking. The implement
pipeline hands the agent unrestricted shell access and puts a PAT in the git remote
URL, so a single `git remote -v` or `cat .git/config` would otherwise put a live
token into that artifact for its whole retention window.

Redacts, in order: every secret value passed in via SCRUB_VALUES (newline
separated), then any credential still embedded in a URL.

Takes one or more paths. A path may be a FILE (Claude writes a single
`claude-execution-output.json`) or a DIRECTORY (Codex writes a rollout tree of
`*.jsonl` under `$CODEX_HOME/sessions/`); a directory is walked for `*.json` and
`*.jsonl`. A missing path is not an error -- the agent step for the other branch
of the claude/codex switch simply did not run.
"""
import os
import re
import sys

# https://user:pass@host and https://x-access-token:ghp_xxx@host
URL_CREDENTIAL = re.compile(r"(https?://)[^/\s:@\"']+:[^/\s@\"']+@")
# Bare GitHub tokens, in case one is echoed outside a URL.
GITHUB_TOKEN = re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b")

PLACEHOLDER = "***REDACTED***"


def scrub(text: str, secrets: list[str]) -> tuple[str, int]:
    hits = 0
    for secret in secrets:
        # Short values would match everywhere and corrupt the trace.
        if len(secret) < 8:
            continue
        count = text.count(secret)
        if count:
            text = text.replace(secret, PLACEHOLDER)
            hits += count
    text, n = URL_CREDENTIAL.subn(rf"\1{PLACEHOLDER}@", text)
    hits += n
    text, n = GITHUB_TOKEN.subn(PLACEHOLDER, text)
    hits += n
    return text, hits


TRACE_SUFFIXES = (".json", ".jsonl")


def expand(paths: list[str]) -> list[str]:
    """Resolve the given paths to the trace files to scrub."""
    files = []
    for path in paths:
        if os.path.isdir(path):
            for root, _dirs, names in os.walk(path):
                files += [
                    os.path.join(root, n)
                    for n in sorted(names)
                    if n.endswith(TRACE_SUFFIXES)
                ]
        elif os.path.exists(path):
            files.append(path)
        else:
            print(f"no trace at {path} — nothing to scrub")
    return files


def scrub_file(path: str, secrets: list[str]) -> int:
    with open(path, errors="surrogateescape") as fh:
        original = fh.read()

    cleaned, hits = scrub(original, secrets)
    if hits:
        with open(path, "w", errors="surrogateescape") as fh:
            fh.write(cleaned)
    print(f"scrubbed {hits} credential occurrence(s) from {path}")
    return hits


def main(paths: list[str]) -> int:
    secrets = [s.strip() for s in os.environ.get("SCRUB_VALUES", "").split("\n")]
    secrets = [s for s in secrets if s]

    files = expand(paths)
    total = sum(scrub_file(f, secrets) for f in files)
    print(f"scrubbed {total} credential occurrence(s) across {len(files)} file(s)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: scrub_trace.py <trace-file-or-dir> [...]", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
