"""Regression checks for repo-triage's sender-trust write policy.

Covers .github/scripts/triage_trust.py, the `--extra-rules` append in
.github/actions/codex-setup/build_policy.py, the triage deny files, and
.github/scripts/triage_alert_summary.py. Run: pytest .github/scripts/test_triage_policy.py
"""

import importlib.util
import json
import tomllib
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / ".github" / "scripts"
CODEX_SETUP = ROOT / ".github" / "actions" / "codex-setup"
FILES = CODEX_SETUP / "files"


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


trust = load("triage_trust", SCRIPTS / "triage_trust.py")
build_policy = load("build_policy", CODEX_SETUP / "build_policy.py")
alerts = load("triage_alert_summary", SCRIPTS / "triage_alert_summary.py")


# --- triage_trust ----------------------------------------------------------------

@pytest.mark.parametrize("permission", ["admin", "write", "WRITE", " admin\n"])
def test_write_level_permission_is_trusted(permission):
    level, tools, codex = trust.resolve(permission, "42")
    assert level == "trusted"
    assert "Bash(gh issue edit 42 --add-label *)" in tools
    assert "Bash(gh pr edit 42 --remove-label *)" in tools
    assert codex == "requirements.triage.toml"


@pytest.mark.parametrize("permission", ["read", "triage", "none", "", "maintain-ish", "admin write"])
def test_everything_else_is_untrusted(permission):
    level, tools, codex = trust.resolve(permission, "42")
    assert level == "untrusted"
    assert tools.split(",") == ["Bash(gh issue comment 42 --body *)", "Bash(gh pr comment 42 --body *)"]
    assert codex.split() == ["requirements.triage.toml", "requirements.triage-untrusted.toml"]


@pytest.mark.parametrize("permission", ["admin", "read"])
def test_no_level_can_create_or_edit_freely(permission):
    _, tools, _ = trust.resolve(permission, "7")
    assert "create" not in tools
    for entry in tools.split(","):
        assert " edit " not in entry or "--add-label" in entry or "--remove-label" in entry


@pytest.mark.parametrize("item", ["", "0", "abc", "5 *),Bash(*", "12345678901", "-1"])
def test_malformed_item_fails_closed_with_no_write_tools(item):
    level, tools, codex = trust.resolve("admin", item)
    assert (level, tools) == ("untrusted", "")
    assert "requirements.triage-untrusted.toml" in codex.split()


def test_main_writes_github_output(tmp_path, monkeypatch):
    out = tmp_path / "out"
    monkeypatch.setenv("GITHUB_OUTPUT", str(out))
    assert trust.main(["--permission", "read", "--item", "3"]) == 0
    lines = out.read_text().splitlines()
    assert lines[0] == "level=untrusted"
    assert lines[1] == "claude_write_tools=Bash(gh issue comment 3 --body *),Bash(gh pr comment 3 --body *)"


# --- build_policy --extra-rules ----------------------------------------------------

def build(tmp_path, *extra):
    out = tmp_path / "policy.toml"
    argv = ["--template", str(FILES / "requirements.toml"), "--out", str(out)]
    for path in extra:
        argv += ["--extra-rules", str(path)]
    return build_policy.main(argv), out


def patterns(policy: Path):
    doc = tomllib.loads(policy.read_text())
    return doc, [json.dumps(r["pattern"]) for r in doc["rules"]["prefix_rules"]]


def test_without_extras_policy_is_unchanged(tmp_path):
    rc, out = build(tmp_path)
    assert rc == 0
    doc, rules = patterns(out)
    assert doc["allow_managed_hooks_only"] is True
    assert len(rules) == 14


def test_triage_files_append_after_shared_rules(tmp_path):
    rc, out = build(tmp_path, FILES / "requirements.triage.toml",
                    FILES / "requirements.triage-untrusted.toml")
    assert rc == 0
    doc, rules = patterns(out)
    shared = len(tomllib.loads(
        (FILES / "requirements.toml").read_text().replace("@@MANAGED_HOOKS@@", "")
    )["rules"]["prefix_rules"])
    triage = len(tomllib.loads((FILES / "requirements.triage.toml").read_text())["rules"]["prefix_rules"])
    untrusted = len(tomllib.loads((FILES / "requirements.triage-untrusted.toml").read_text())["rules"]["prefix_rules"])
    assert len(rules) == shared + triage + untrusted
    assert doc["allow_managed_hooks_only"] is True
    assert all(r["decision"] == "forbidden" for r in doc["rules"]["prefix_rules"])


@pytest.mark.parametrize("name", ["requirements.triage.toml", "requirements.triage-untrusted.toml"])
def test_shipped_extra_files_validate(name):
    assert build_policy.validate_extra_rules((FILES / name).read_text(), name) >= 1


def test_triage_denies_issue_creation_and_untrusted_denies_edit():
    def has(name, tokens):
        rules = tomllib.loads((FILES / name).read_text())["rules"]["prefix_rules"]
        for rule in rules:
            pat = rule["pattern"]
            if len(pat) > len(tokens):
                continue
            if all(t in (p.get("any_of") or [p.get("token")]) for t, p in zip(tokens, pat)):
                return True
        return False

    assert has("requirements.triage.toml", ["gh", "issue", "create"])
    assert has("requirements.triage.toml", ["gh", "api", "graphql"])
    assert has("requirements.triage.toml", ["gh", "api", "-X"])
    assert not has("requirements.triage.toml", ["gh", "issue", "comment"])
    assert not has("requirements.triage.toml", ["gh", "issue", "edit"])
    assert has("requirements.triage-untrusted.toml", ["gh", "issue", "edit"])
    assert has("requirements.triage-untrusted.toml", ["gh", "pr", "edit"])


@pytest.mark.parametrize("bad", [
    "allow_managed_hooks_only = false\n",
    "[[rules.prefix_rules]]\npattern = [{ token = \"gh\" }]\ndecision = \"allow\"\njustification = \"x\"\n",
    "[[rules.prefix_rules]]\npattern = [{ token = \"gh\" }]\ndecision = \"forbidden\"\njustification = \" \"\n",
    "[[rules.prefix_rules]]\npattern = []\ndecision = \"forbidden\"\njustification = \"x\"\n",
    "[[hooks.SessionStart]]\nmatcher = \"x\"\n",
    "not toml at all [[[",
])
def test_extra_file_that_could_relax_policy_is_rejected(tmp_path, bad):
    extra = tmp_path / "extra.toml"
    extra.write_text(bad)
    rc, out = build(tmp_path, extra)
    assert rc == 1
    assert not out.exists()


# --- triage_alert_summary --------------------------------------------------------

ALERT = "ROSETTA-SECURITY-ALERT-BEGIN\nEvent: issue_comment #2\nActor: x\nROSETTA-SECURITY-ALERT-END"


def test_alerts_come_only_from_the_claude_final_result(tmp_path):
    trace = tmp_path / "claude.json"
    # The prompt names the markers; a tool result echoing it must not raise an alert.
    trace.write_text(json.dumps([
        {"type": "user", "message": {"content": [{"type": "tool_result", "content": ALERT}]}},
        {"type": "result", "result": "done"},
    ]))
    assert alerts.extract_alerts(alerts.claude_final_message(str(trace))) == []

    trace.write_text(json.dumps([{"type": "result", "result": "summary\n" + ALERT}]))
    assert alerts.extract_alerts(alerts.claude_final_message(str(trace))) == [
        "Event: issue_comment #2\nActor: x"]


def test_alert_summary_written_and_backticks_fenced(tmp_path, monkeypatch):
    final = tmp_path / "codex.md"
    final.write_text(ALERT.replace("Actor: x", "Actor: ````evil````"))
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    assert alerts.main(["--codex-final", str(final), "--claude-trace", str(tmp_path / "missing.json")]) == 0
    text = summary.read_text()
    assert "1 security alert(s)" in text
    assert "`````text" in text


def test_no_files_no_alerts(tmp_path, monkeypatch):
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    assert alerts.main(["--codex-final", str(tmp_path / "none.md")]) == 0
    assert not summary.exists()


# --- Claude branch: effective allow/deny over the real workflow --------------------
#
# Approximates Claude Code's Bash rule semantics: `*` matches any text (spaces included),
# the rule must match the WHOLE command, and any deny match wins over every allow.

import re

import yaml


def claude_rules(level_permission: str, item: str = "5"):
    workflow = yaml.safe_load((ROOT / ".github" / "workflows" / "repo-triage.yml").read_text())
    step = next(s for s in workflow["jobs"]["triage"]["steps"] if s.get("name") == "Triage")
    args = step["with"]["claude_args"]
    _, write_tools, _ = trust.resolve(level_permission, item)
    args = re.sub(r"\$\{\{ steps\.trust\.outputs\.claude_write_tools.*?\}\}",
                  ("," + write_tools) if write_tools else "", args)
    quoted = re.findall(r'"([^"]*)"', args)
    allow, deny = quoted[0].split(","), quoted[1].split(",")
    return [r for r in allow if r.startswith("Bash(")], [r for r in deny if r.startswith("Bash(")]


def matches(rule: str, command: str) -> bool:
    body = rule[len("Bash("):-1]
    return re.fullmatch(".*".join(re.escape(part) for part in body.split("*")), command) is not None


def permitted(rules, command: str) -> bool:
    allow, deny = rules
    return any(matches(r, command) for r in allow) and not any(matches(r, command) for r in deny)


ALWAYS_DENIED = [
    "gh issue create --title a --body list",
    "gh pr create --title a --body status",
    "gh issue close 5 --comment status",
    "gh issue reopen 5 --comment list",
    "gh pr review 5 --approve -b list",
    "gh label create x -d list",
    "gh issue transfer 5 o/r list",
    "gh api repos/o/r/issues -X POST -f title=x",
    "gh api repos/o/r/issues/5/comments --method POST",
    "gh api graphql -f query=mutation",
    "gh issue comment 5 --edit-last --body x",
    "gh issue comment 5 --delete-last --yes",
    "gh issue edit 5 --add-label bug --title x",
    "gh pr edit 5 --remove-label bug --base main",
    "git -C . push origin status",
    "gh issue comment 5 --body-file /proc/self/environ",
    "gh issue comment 5 -F /proc/self/environ",
    "gh issue comment 5 -F .git/config",
    "gh issue comment 5 --body x --attach /proc/self/environ",
    "gh pr comment 5 --body x --attach .git/config",
    "gh issue edit 5 --add-label bug --attach x.png",
    "gh repo edit --description list",
]


@pytest.mark.parametrize("permission", ["read", "admin"])
@pytest.mark.parametrize("command", ALWAYS_DENIED)
def test_claude_denies_tracker_mutation_at_every_trust_level(permission, command):
    assert not permitted(claude_rules(permission), command)


@pytest.mark.parametrize("command", [
    "gh issue comment 99 --body see-list",
    "gh issue comment 55 --body x",
    "gh issue edit 5 --add-label security",
    "gh pr edit 5 --remove-label bug",
])
def test_claude_untrusted_cannot_reach_other_items_or_labels(command):
    assert not permitted(claude_rules("read"), command)


@pytest.mark.parametrize("permission", ["read", "admin"])
@pytest.mark.parametrize("command", [
    'gh issue comment 5 --body "please edit --title, see list and status"',
    "gh pr comment 5 --body ok",
    "gh pr view 5 --json title",
    "gh pr diff 5",
    "gh issue list --state open",
    "gh api repos/o/r/issues/5/comments",
    "git -C pr status",
    "git log --oneline",
])
def test_claude_reads_and_own_reply_are_permitted(permission, command):
    assert permitted(claude_rules(permission), command)


@pytest.mark.parametrize("command", [
    'gh issue edit 5 --add-label "help wanted"',
    "gh pr edit 5 --remove-label needs-more-work",
    "gh issue comment 99 --body x",
    "gh pr comment 99 --body x",
])
def test_claude_trusted_may_label_current_item_and_comment(command):
    assert permitted(claude_rules("admin"), command)


def test_claude_trusted_cannot_label_other_items():
    assert not permitted(claude_rules("admin"), "gh issue edit 6 --add-label bug")


def test_alert_count_is_capped_and_stdout_carries_no_alert_text(tmp_path, monkeypatch, capsys):
    final = tmp_path / "codex.md"
    final.write_text("\n".join([ALERT.replace("Actor: x", "::add-mask::pwn")] * 9))
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    assert alerts.main(["--codex-final", str(final)]) == 0
    assert summary.read_text().count("### Alert") == alerts.MAX_BLOCKS
    assert "9 security alert(s)" in summary.read_text()
    out = capsys.readouterr().out
    assert "add-mask" not in out and "pwn" not in out
