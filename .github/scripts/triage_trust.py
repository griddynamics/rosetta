#!/usr/bin/env python3
"""Resolve the event sender's trust level for `repo-triage` and the write tools it gets.

Triage reviews and comments, nothing else (.github/prompts/repo-triage.md, "Intended
use"). Trust decides the write surface on top of the shared read-only toolset:

    trusted    sender has `admin` or `write` repository permission (`maintain` reports
               as `write` in the legacy `permission` field). Comments, and label-only
               edits on the current item.
    untrusted  everything else, including any lookup failure, a bot, or a malformed
               input. One reply comment on the current item; no edits.

The workflow looks up `permission` with
`gh api repos/{repo}/collaborators/{sender}/permission --jq .permission`
and passes it here; an empty value means the lookup failed and fails closed.

Writes three step outputs to $GITHUB_OUTPUT (or prints them without it):

    level               trusted | untrusted
    claude_write_tools  comma-separated --allowedTools entries for the Claude branch
    codex_extra_rules   codex-setup `extra-rules` file names for the Codex branch

Usage: triage_trust.py --permission <value> --item <issue/PR number>
"""
import argparse
import os
import re
import sys

TRUSTED_PERMISSIONS = {"admin", "write"}

CODEX_TRIAGE_RULES = "requirements.triage.toml"
CODEX_UNTRUSTED_RULES = "requirements.triage-untrusted.toml"


def resolve(permission, item):
    """Return (level, claude_write_tools, codex_extra_rules). Fails closed."""
    trusted = permission.strip().lower() in TRUSTED_PERMISSIONS
    if not re.fullmatch(r"[1-9][0-9]{0,9}", item.strip()):
        # Every triage event carries an item number. Without one there is no "current
        # item" to reply to, so no write tool is granted at all.
        return "untrusted", "", "%s %s" % (CODEX_TRIAGE_RULES, CODEX_UNTRUSTED_RULES)
    n = item.strip()

    # The " --body " keeps the number exact (`gh issue comment 5 --body *` does not match
    # `gh issue comment 55 ...`) and pins the body to inline text: gh refuses `--body`
    # together with `--body-file`/`--editor`/`--web`, so `-F /proc/self/environ` cannot
    # ride along. `--attach` (uploads a file) is denied in the workflow.
    comment_here = ["Bash(gh issue comment %s --body *)" % n, "Bash(gh pr comment %s --body *)" % n]
    if not trusted:
        return ("untrusted", ",".join(comment_here),
                "%s %s" % (CODEX_TRIAGE_RULES, CODEX_UNTRUSTED_RULES))

    # Label edits are pinned to the current item. The trailing wildcard would also admit
    # `--title`/`--body` after the label flag; the workflow's --disallowedTools denies
    # those flags, and deny wins over allow.
    labels_here = ["Bash(gh %s edit %s %s *)" % (kind, n, flag)
                   for kind in ("issue", "pr")
                   for flag in ("--add-label", "--remove-label")]
    tools = ["Bash(gh issue comment * --body *)", "Bash(gh pr comment * --body *)"] + labels_here
    return "trusted", ",".join(tools), CODEX_TRIAGE_RULES


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--permission", default="")
    ap.add_argument("--item", default="")
    args = ap.parse_args(argv)

    level, claude_tools, codex_rules = resolve(args.permission, args.item)
    lines = ["level=%s" % level,
             "claude_write_tools=%s" % claude_tools,
             "codex_extra_rules=%s" % codex_rules]

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as fh:
            fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
