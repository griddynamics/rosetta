"""MINOR-4 — Unit tests for the requests-timeout patch in ims_mcp.tracing.

Covers:
- After _install_requests_timeout_patch, a Session.request call WITHOUT timeout
  receives the configured default timeout (setdefault semantics).
- A call WITH an explicit timeout=N is NOT overridden (setdefault is preserved).
- The patch is idempotent: calling _install_requests_timeout_patch twice does
  NOT double-wrap (verified via the _requests_session_patched guard).

All tests mock the underlying original Session.request so no network is used.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch, call
from typing import Any

import pytest

import ims_mcp.tracing as tracing_module
from ims_mcp.tracing import _install_requests_timeout_patch


# ── helpers ───────────────────────────────────────────────────────────────────

def _reset_patch_state() -> None:
    """Reset the module-level guard so we can test install behaviour cleanly."""
    tracing_module._requests_session_patched = False


# ── MINOR-4-1: no explicit timeout → default injected ────────────────────────

def test_requests_timeout_patch_injects_default_when_not_provided():
    """Without timeout kwarg, the patched Session.request injects the default."""
    import requests.sessions as _sessions

    _reset_patch_state()
    original_request = _sessions.Session.request

    captured_kwargs: list[dict[str, Any]] = []

    def _fake_original(self: Any, method: str, url: str, **kwargs: Any) -> MagicMock:
        captured_kwargs.append(dict(kwargs))
        return MagicMock(status_code=200)

    try:
        with patch.object(_sessions.Session, "request", _fake_original):
            _install_requests_timeout_patch()
            # Now call through the patched method without timeout
            session = _sessions.Session()
            session.request("GET", "http://fake-host/test")

        assert captured_kwargs, "Original request was never called"
        assert "timeout" in captured_kwargs[0], (
            "Expected timeout to be injected into kwargs"
        )
        injected = captured_kwargs[0]["timeout"]
        assert isinstance(injected, int) and injected > 0, (
            f"Expected a positive int timeout, got: {injected!r}"
        )
    finally:
        # Restore original to prevent cross-test contamination
        _sessions.Session.request = original_request  # type: ignore[assignment]
        _reset_patch_state()


# ── MINOR-4-2: explicit timeout preserved (setdefault semantics) ──────────────

def test_requests_timeout_patch_preserves_explicit_timeout():
    """When caller passes timeout=N explicitly, it is NOT overridden."""
    import requests.sessions as _sessions

    _reset_patch_state()
    original_request = _sessions.Session.request

    captured_kwargs: list[dict[str, Any]] = []

    def _fake_original(self: Any, method: str, url: str, **kwargs: Any) -> MagicMock:
        captured_kwargs.append(dict(kwargs))
        return MagicMock(status_code=200)

    try:
        with patch.object(_sessions.Session, "request", _fake_original):
            _install_requests_timeout_patch()
            session = _sessions.Session()
            session.request("POST", "http://fake-host/test", timeout=99)

        assert captured_kwargs, "Original request was never called"
        assert captured_kwargs[0].get("timeout") == 99, (
            f"Explicit timeout=99 was overridden; got: {captured_kwargs[0].get('timeout')!r}"
        )
    finally:
        _sessions.Session.request = original_request  # type: ignore[assignment]
        _reset_patch_state()


# ── MINOR-4-3: patch is idempotent (no double-wrap) ───────────────────────────

def test_requests_timeout_patch_idempotent():
    """Calling _install_requests_timeout_patch twice does not double-wrap."""
    import requests.sessions as _sessions

    _reset_patch_state()
    original_request = _sessions.Session.request

    call_count = [0]

    def _fake_original(self: Any, method: str, url: str, **kwargs: Any) -> MagicMock:
        call_count[0] += 1
        return MagicMock(status_code=200)

    try:
        with patch.object(_sessions.Session, "request", _fake_original):
            _install_requests_timeout_patch()
            _install_requests_timeout_patch()  # second install — must be a no-op

            # After both install calls, the guard must be True
            assert tracing_module._requests_session_patched is True

            session = _sessions.Session()
            session.request("GET", "http://fake-host/idempotent")

        # Underlying original called exactly once — not twice (no double-wrap)
        assert call_count[0] == 1, (
            f"Double-wrap detected: original was called {call_count[0]} times (expected 1)"
        )
    finally:
        _sessions.Session.request = original_request  # type: ignore[assignment]
        _reset_patch_state()
