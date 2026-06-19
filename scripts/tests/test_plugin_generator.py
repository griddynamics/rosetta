"""Tests for the release-aware plugin generator and its Handlebars templates.

Proves both releases (r2: no deterministic hooks; r3: full advisory hooks) render
valid JSON, without mutating the committed plugin output.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import plugin_generator as pg

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Each committed hooks.json.tmpl and the bootstrap context variable it injects (if any).
TEMPLATES: list[tuple[str, str | None]] = [
    ("plugins/core-claude/hooks/hooks.json.tmpl", "bootstrap_hooks_claude"),
    ("plugins/core-codex/.codex-plugin/hooks.json.tmpl", "bootstrap_hooks_codex"),
    ("plugins/core-copilot/.github/plugin/hooks.json.tmpl", "bootstrap_hooks_copilot"),
    ("plugins/core-copilot/hooks/hooks.json.tmpl", None),
    ("plugins/core-cursor/hooks.json.tmpl", None),
    ("plugins/core-cursor/hooks/hooks.json.tmpl", None),
]

# Advisory hook scripts that must appear only when deterministic_hooks is true.
ADVISORY_MARKERS = [
    "dangerous-actions.js",
    "loose-files.js",
    "md-file-advisory.js",
    "codemap-refresh.js",
    "lint-format-advisory.js",
]

_SAMPLE_BOOTSTRAP = '{"type":"command","command":"printf hi"}'


def _render(tmpl_rel: str, deterministic_hooks: bool) -> str:
    text = (REPO_ROOT / tmpl_rel).read_text(encoding="utf-8")
    context: dict[str, object] = {
        "release": "r3" if deterministic_hooks else "r2",
        "deterministic_hooks": deterministic_hooks,
        "bootstrap_hooks_claude": _SAMPLE_BOOTSTRAP,
        "bootstrap_hooks_codex": _SAMPLE_BOOTSTRAP,
        "bootstrap_hooks_cursor": _SAMPLE_BOOTSTRAP,
        "bootstrap_hooks_copilot": _SAMPLE_BOOTSTRAP,
    }
    return str(pg._TEMPLATE_COMPILER.compile(text)(context))


@pytest.mark.parametrize("tmpl_rel,_var", TEMPLATES)
@pytest.mark.parametrize("deterministic_hooks", [False, True])
def test_template_renders_valid_json(tmpl_rel: str, _var: str | None, deterministic_hooks: bool) -> None:
    rendered = _render(tmpl_rel, deterministic_hooks)
    json.loads(rendered)  # raises on invalid JSON


@pytest.mark.parametrize("tmpl_rel,_var", TEMPLATES)
def test_advisory_hooks_present_only_for_r3(tmpl_rel: str, _var: str | None) -> None:
    r2 = _render(tmpl_rel, deterministic_hooks=False)
    r3 = _render(tmpl_rel, deterministic_hooks=True)
    for marker in ADVISORY_MARKERS:
        assert marker not in r2, f"{marker} must be absent in r2 output of {tmpl_rel}"
    assert any(marker in r3 for marker in ADVISORY_MARKERS), (
        f"r3 output of {tmpl_rel} must reference advisory hooks"
    )


def test_releases_table() -> None:
    releases = pg._get_releases(REPO_ROOT)
    assert set(releases) >= {"r2", "r3"}
    assert releases["r2"].template_vars["deterministic_hooks"] is False
    assert releases["r3"].template_vars["deterministic_hooks"] is True
    assert releases["r2"].template_vars["release"] == "r2"
    assert releases["r3"].template_vars["release"] == "r3"


def test_default_release_is_r2() -> None:
    assert pg.DEFAULT_RELEASE == "r2"


def test_unknown_release_errors() -> None:
    # Returns non-zero before touching the filesystem.
    assert pg.sync_generated_plugins(REPO_ROOT, release="r99") == 1
