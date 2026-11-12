"""Guard: every RosettaConfig field must have a production reader (issue #325).

A field that ``from_env`` parses but no code reads is a dead control: operators
set the env var and nothing changes. This test walks the production modules
under ``rosetta_mcp/`` (excluding ``config.py`` itself) and requires each
dataclass field to be read somewhere: as an attribute load on a config-like
object (``_CONFIG.x``, ``call_ctx.config.x``, ``self._config.x``, a parameter
annotated ``RosettaConfig`` or a local alias of one), via
``getattr(<config>, "x")``, or through a ``RosettaConfig`` property/method that
production code uses (``config.instruction_dataset`` reads ``version``).

Fields that are intentionally parsed but not yet consumed go in
``_UNREAD_ALLOWLIST`` with a link to the tracking issue. The allowlist is also
checked for staleness, so wiring a field up forces its removal from the list.
"""

from __future__ import annotations

import ast
from dataclasses import fields
from pathlib import Path

from rosetta_mcp.config import RosettaConfig

_PACKAGE_DIR = Path(__file__).resolve().parents[1] / "rosetta_mcp"

# field name -> reason (with tracking issue)
_UNREAD_ALLOWLIST: dict[str, str] = {
    "root_filter": (
        "INSTRUCTION_ROOT_FILTER is parsed but not enforced yet; "
        "wire or remove in https://github.com/griddynamics/rosetta/issues/172"
    ),
}


def _terminal_name(node: ast.expr) -> str:
    """Return the last name in an expression like ``a.b.config`` or ``_CONFIG``."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Call):
        return _terminal_name(node.func)
    return ""


def _is_config_name(name: str) -> bool:
    lowered = name.lower()
    return "config" in lowered or lowered in {"cfg", "conf"}


def _config_aliases(tree: ast.AST) -> set[str]:
    """Local names bound to a config object.

    Covers parameters annotated ``RosettaConfig`` and assignments such as
    ``active = config or _runtime_config``.
    """
    aliases: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.arg) and node.annotation is not None:
            if "RosettaConfig" in ast.unparse(node.annotation):
                aliases.add(node.arg)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)) and node.value is not None:
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            refers_to_config = any(
                isinstance(sub, (ast.Name, ast.Attribute)) and _is_config_name(_terminal_name(sub))
                for sub in ast.walk(node.value)
            )
            if refers_to_config:
                aliases.update(t.id for t in targets if isinstance(t, ast.Name))
    return aliases


def _direct_reads(tree: ast.AST) -> set[str]:
    aliases = _config_aliases(tree)

    def is_config_like(expr: ast.expr) -> bool:
        name = _terminal_name(expr)
        return _is_config_name(name) or name in aliases

    reads: set[str] = set()
    for node in ast.walk(tree):
        # _CONFIG.field / call_ctx.config.field / active.field (loads only)
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.ctx, ast.Load)
            and is_config_like(node.value)
        ):
            reads.add(node.attr)
        # getattr(config, "field"[, default])
        elif (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "getattr"
            and len(node.args) >= 2
            and is_config_like(node.args[0])
            and isinstance(node.args[1], ast.Constant)
            and isinstance(node.args[1].value, str)
        ):
            reads.add(node.args[1].value)
    return reads


def _member_reads() -> dict[str, set[str]]:
    """For each RosettaConfig property/method, the ``self.<attr>`` names it reads."""
    tree = ast.parse((_PACKAGE_DIR / "config.py").read_text(encoding="utf-8"))
    members: dict[str, set[str]] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == RosettaConfig.__name__:
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    members[item.name] = {
                        sub.attr
                        for sub in ast.walk(item)
                        if isinstance(sub, ast.Attribute)
                        and isinstance(sub.ctx, ast.Load)
                        and isinstance(sub.value, ast.Name)
                        and sub.value.id == "self"
                    }
    return members


def _production_reads() -> set[str]:
    reads: set[str] = set()
    for path in sorted(_PACKAGE_DIR.rglob("*.py")):
        if path.name == "config.py" and path.parent == _PACKAGE_DIR:
            continue
        reads |= _direct_reads(ast.parse(path.read_text(encoding="utf-8"), filename=str(path)))
    # A field read only through a RosettaConfig property/method counts when that
    # member is itself used in production (e.g. version via instruction_dataset).
    members = _member_reads()
    changed = True
    while changed:
        changed = False
        for member, member_reads in members.items():
            if member in reads and not member_reads <= reads:
                reads |= member_reads
                changed = True
    return reads


def _field_names() -> set[str]:
    return {f.name for f in fields(RosettaConfig)}


def test_every_config_field_has_a_production_reader():
    unread = _field_names() - _production_reads() - set(_UNREAD_ALLOWLIST)
    assert not unread, (
        "RosettaConfig fields with no reader under rosetta_mcp/ (excluding config.py): "
        f"{sorted(unread)}. Wire them up, remove them, or add them to _UNREAD_ALLOWLIST "
        "with a tracking issue."
    )


def test_unread_allowlist_is_not_stale():
    names = _field_names()
    reads = _production_reads()
    missing = sorted(set(_UNREAD_ALLOWLIST) - names)
    assert not missing, f"allowlisted fields no longer exist on RosettaConfig: {missing}"
    now_read = sorted(set(_UNREAD_ALLOWLIST) & reads)
    assert not now_read, f"allowlisted fields now have a reader, drop them from the allowlist: {now_read}"


def test_scanner_detects_known_read_styles():
    reads = _production_reads()
    # Sanity: known readers are found, so an empty scan cannot pass silently.
    assert {"server_url", "transport", "redis_url"} <= reads  # direct attribute
    assert {"posthog_api_key", "posthog_host"} <= reads  # local alias (analytics)
    assert "version" in reads  # via the instruction_dataset property


def test_scanner_handles_getattr_and_ignores_writes():
    tree = ast.parse(
        "def f(config):\n"
        "    a = getattr(config, 'alpha', None)\n"
        "    config.beta = 1\n"
        "    other.gamma\n"
    )
    assert _direct_reads(tree) == {"alpha"}
