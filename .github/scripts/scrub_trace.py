#!/usr/bin/env python3
"""Redact credentials from a Claude execution trace before it is uploaded.

The trace is a full tool-call transcript and is published as a workflow artifact,
which is downloadable and is NOT covered by Actions log masking. The implement
pipeline hands the agent unrestricted `Bash(*)` and puts a PAT in the git remote
URL, so a single `git remote -v` or `cat .git/config` would otherwise put a live
token into that artifact for its whole retention window.

Redacts, in order: every secret value passed in via SCRUB_VALUES (newline
separated), then any credential still embedded in a URL.
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


def main(path: str) -> int:
    if not os.path.exists(path):
        print(f"no trace at {path} — nothing to scrub")
        return 0

    secrets = [s.strip() for s in os.environ.get("SCRUB_VALUES", "").split("\n")]
    secrets = [s for s in secrets if s]

    with open(path) as fh:
        original = fh.read()

    cleaned, hits = scrub(original, secrets)
    if hits:
        with open(path, "w") as fh:
            fh.write(cleaned)
    print(f"scrubbed {hits} credential occurrence(s) from {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
