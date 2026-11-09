#!/usr/bin/env python3
"""Assemble /etc/codex/requirements.toml for a Rosetta Codex CI run.

Takes the static template in `files/requirements.toml` and substitutes the
`@@MANAGED_HOOKS@@` placeholder with the Rosetta plugin's hooks, transpiled from
its `hooks.json` into the `[hooks]` block that Codex reads as *managed*.

Why the hooks must be managed, not just present: a hook discovered from a project
`.codex/hooks.json` is `HookTrustStatus::Untrusted` until a human trusts its
content hash via `/hooks`. `codex-rs/hooks/src/engine/discovery.rs:701` runs a
handler only when `bypass_hook_trust || Managed | Trusted`; a headless run has
nobody to trust anything, and `openai/codex-action` rejects
`--dangerously-bypass-hook-trust` on a protected run. Hooks declared inline under
`[hooks]` in the system requirements.toml are registered by
`append_managed_requirement_handlers` with `is_managed: true`, which resolves to
`HookTrustStatus::Managed` and runs with no trust step. (`hooks.managed_dir` is
only a display path — it loads nothing, so inline is the only route.)

`ManagedHooksRequirementsToml` flattens `HookEventsToml`, so each PascalCase event
name is an array of matcher groups:

    [[hooks.SessionStart]]
    matcher = "startup|resume"
      [[hooks.SessionStart.hooks]]
      type = "command"
      command = "..."

Usage:
    build_policy.py --template files/requirements.toml --out policy.toml
                    [--hooks-json <workspace>/.codex/hooks.json]
                    [--extra-rules files/requirements.triage.toml ...]

Omitting --hooks-json (or pointing it at a missing file) emits no hooks, which
combined with `allow_managed_hooks_only` means the run has no hooks at all — the
caller is responsible for deciding whether that is acceptable.

`--extra-rules` (repeatable) appends a pipeline-specific deny-list after the shared
one, so a pipeline can only TIGHTEN the shared policy. Each extra file may hold
`[[rules.prefix_rules]]` entries and nothing else: a top-level key there (for example
`allow_managed_hooks_only = false`) would otherwise be appended after the tables, land
inside the last one, and change meaning silently. Extra files are validated, and the
assembled policy is parsed once more before it is written.
"""
import argparse
import json
import sys
import tomllib

PLACEHOLDER = "@@MANAGED_HOOKS@@"

# requirements.toml rejects `allow`; only these two are valid in the managed layer, and
# headless `codex exec` resolves both to a hard deny (docs/AUTOMATION-ARCHITECTURE.md,
# "Command policy").
EXTRA_RULE_DECISIONS = {"forbidden", "prompt"}
EXTRA_RULE_KEYS = {"pattern", "decision", "justification"}


def validate_extra_rules(text, path):
    """Raise ValueError unless `text` is a deny-only list of prefix rules."""
    try:
        doc = tomllib.loads(text)
    except tomllib.TOMLDecodeError as err:
        raise ValueError("%s is not valid TOML: %s" % (path, err))
    if set(doc) != {"rules"} or set(doc["rules"]) != {"prefix_rules"}:
        raise ValueError("%s may contain only [[rules.prefix_rules]] entries" % path)
    rules = doc["rules"]["prefix_rules"]
    if not isinstance(rules, list) or not rules:
        raise ValueError("%s has no [[rules.prefix_rules]] entries" % path)
    for index, rule in enumerate(rules):
        where = "%s rule #%d" % (path, index + 1)
        if set(rule) != EXTRA_RULE_KEYS:
            raise ValueError("%s must have exactly the keys %s"
                             % (where, sorted(EXTRA_RULE_KEYS)))
        if rule["decision"] not in EXTRA_RULE_DECISIONS:
            raise ValueError("%s has decision %r; only %s are allowed"
                             % (where, rule["decision"], sorted(EXTRA_RULE_DECISIONS)))
        if not isinstance(rule["justification"], str) or not rule["justification"].strip():
            raise ValueError("%s needs a non-empty justification" % where)
        if not isinstance(rule["pattern"], list) or not rule["pattern"]:
            raise ValueError("%s needs a non-empty pattern" % where)
    return len(rules)

# HookEventsToml, codex-rs/config/src/hook_config.rs:35-61. An event outside this set is
# skipped rather than written: an unrecognized key in the managed block is silently
# ignored at best, so surfacing it as a warning is more useful than emitting it.
KNOWN_EVENTS = {
    "PreToolUse", "PermissionRequest", "PostToolUse", "PreCompact", "PostCompact",
    "SessionStart", "SessionEnd", "UserPromptSubmit", "SubagentStart",
    "SubagentStop", "Stop", "Interrupt",
}


def toml_string(value):
    """A TOML basic string.

    json.dumps' escape alphabet is a subset of TOML's, so it is a correct encoder here.
    ensure_ascii=False keeps non-ASCII literal (TOML permits it) and, more importantly,
    avoids emitting surrogate pairs for astral characters, which TOML rejects.
    """
    return json.dumps(value, ensure_ascii=False)


def render_hooks(path, warn):
    """Transpile a Codex hooks.json into TOML lines, and count the handlers."""
    with open(path) as fh:
        doc = json.load(fh)
    events = doc.get("hooks")
    if not isinstance(events, dict):
        raise ValueError("%s has no top-level 'hooks' object" % path)

    lines, count = [], 0
    for event, groups in events.items():
        if event not in KNOWN_EVENTS:
            warn("skipping unknown hook event %r in %s" % (event, path))
            continue
        if not isinstance(groups, list):
            continue
        for group in groups:
            if not isinstance(group, dict):
                continue
            lines.append("[[hooks.%s]]" % event)
            matcher = group.get("matcher")
            if isinstance(matcher, str) and matcher:
                lines.append("matcher = %s" % toml_string(matcher))
            for handler in group.get("hooks", []):
                if not isinstance(handler, dict):
                    continue
                # Only command handlers exist in the Rosetta plugin, and they are the
                # only kind a shell-driven bootstrap needs. mcp_tool/prompt/agent are
                # deliberately not translated.
                if handler.get("type") != "command":
                    warn("skipping non-command handler type %r" % handler.get("type"))
                    continue
                lines.append("  [[hooks.%s.hooks]]" % event)
                lines.append('  type = "command"')
                lines.append("  command = %s" % toml_string(handler["command"]))
                if handler.get("commandWindows"):
                    lines.append("  commandWindows = %s"
                                 % toml_string(handler["commandWindows"]))
                if isinstance(handler.get("timeout"), int):
                    lines.append("  timeout = %d" % handler["timeout"])
                if handler.get("statusMessage"):
                    lines.append("  statusMessage = %s"
                                 % toml_string(handler["statusMessage"]))
                count += 1
            lines.append("")
    return lines, count


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--template", required=True,
                    help="static requirements.toml carrying the %s placeholder"
                         % PLACEHOLDER)
    ap.add_argument("--out", required=True, help="file to write")
    ap.add_argument("--hooks-json", default=None,
                    help="plugin hooks.json to promote to managed hooks")
    ap.add_argument("--extra-rules", action="append", default=[],
                    help="deny-only [[rules.prefix_rules]] file to append; repeatable")
    args = ap.parse_args(argv)

    def warn(msg):
        print("::warning::%s" % msg, file=sys.stderr)

    with open(args.template) as fh:
        template = fh.read()

    # Match a line that IS the placeholder, not any line containing it: the template's
    # own header comment refers to the token by name, and a plain str.replace would
    # substitute the hooks block into the middle of that comment and corrupt the file.
    tpl_lines = template.split("\n")
    slots = [i for i, line in enumerate(tpl_lines) if line.strip() == PLACEHOLDER]
    if len(slots) != 1:
        print("::error::%s must contain exactly one line that is %s (found %d)"
              % (args.template, PLACEHOLDER, len(slots)), file=sys.stderr)
        return 1

    count = 0
    if args.hooks_json:
        try:
            hook_lines, count = render_hooks(args.hooks_json, warn)
        except (OSError, ValueError, KeyError) as err:
            print("::error::could not transpile %s: %s" % (args.hooks_json, err),
                  file=sys.stderr)
            return 1
        if not count:
            print("::error::%s produced no command hooks" % args.hooks_json,
                  file=sys.stderr)
            return 1
        block = ("# --- Rosetta bootstrap, transpiled from the plugin's "
                 ".codex/hooks.json ---\n") + "\n".join(hook_lines)
    else:
        warn("no plugin hooks.json — with allow_managed_hooks_only the Codex run "
             "will have no Rosetta hooks.")
        block = "# No managed hooks: the Rosetta plugin was not installed.\n"

    tpl_lines[slots[0]:slots[0] + 1] = block.split("\n")
    policy = "\n".join(tpl_lines)

    for path in args.extra_rules:
        try:
            with open(path) as fh:
                extra = fh.read()
            validate_extra_rules(extra, path)
        except (OSError, ValueError) as err:
            print("::error::could not append %s: %s" % (path, err), file=sys.stderr)
            return 1
        policy = "%s\n\n# --- Appended from %s ---\n%s" % (
            policy.rstrip("\n"), path.rsplit("/", 1)[-1], extra)

    try:
        assembled = tomllib.loads(policy)
    except tomllib.TOMLDecodeError as err:
        print("::error::assembled policy is not valid TOML: %s" % err, file=sys.stderr)
        return 1
    if assembled.get("allow_managed_hooks_only") is not True:
        print("::error::assembled policy lost allow_managed_hooks_only = true",
              file=sys.stderr)
        return 1

    with open(args.out, "w") as fh:
        fh.write(policy)

    rules = len(assembled.get("rules", {}).get("prefix_rules", []))
    print("policy written to %s: %d deny rules (%d extra file(s)), "
          "%d managed hook handler(s)"
          % (args.out, rules, len(args.extra_rules), count))
    return 0


if __name__ == "__main__":
    sys.exit(main())
