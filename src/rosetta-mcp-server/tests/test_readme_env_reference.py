"""The README environment reference must list the timeout and limit variables (#349)."""

from __future__ import annotations

from pathlib import Path

import pytest

from rosetta_mcp import constants

README = Path(__file__).resolve().parent.parent / "README.md"

TIMEOUT_VARIABLES = [
    ("ENV_RAGFLOW_HTTP_TIMEOUT", "DEFAULT_RAGFLOW_HTTP_TIMEOUT"),
    ("ENV_TOOL_TIMEOUT", "DEFAULT_TOOL_TIMEOUT"),
    ("ENV_REDIS_SOCKET_TIMEOUT", "DEFAULT_REDIS_SOCKET_TIMEOUT"),
    ("ENV_REDIS_SOCKET_CONNECT_TIMEOUT", "DEFAULT_REDIS_SOCKET_CONNECT_TIMEOUT"),
    ("ENV_REDIS_HEALTH_CHECK_INTERVAL", "DEFAULT_REDIS_HEALTH_CHECK_INTERVAL"),
    ("ENV_INFLIGHT_WARN_THRESHOLD", "DEFAULT_INFLIGHT_WARN_THRESHOLD"),
    ("ENV_HEALTHZ_RAGFLOW_TIMEOUT", "DEFAULT_HEALTHZ_RAGFLOW_TIMEOUT"),
    ("ENV_HEALTHZ_CACHE_TTL", "DEFAULT_HEALTHZ_CACHE_TTL"),
    ("ENV_OAUTH_HTTP_TIMEOUT", "DEFAULT_OAUTH_HTTP_TIMEOUT"),
]


@pytest.mark.parametrize(("env_const", "default_const"), TIMEOUT_VARIABLES)
def test_timeout_variable_documented_with_default(env_const, default_const):
    name = getattr(constants, env_const)
    default = getattr(constants, default_const)
    rows = [
        line
        for line in README.read_text(encoding="utf-8").splitlines()
        if line.startswith(f"| `{name}` |")
    ]
    assert len(rows) == 1, f"{name} must have exactly one row in the README"
    cells = [c.strip() for c in rows[0].strip("|").split("|")]
    assert cells[2] == f"`{default}`", f"{name} default in README does not match {default_const}"
