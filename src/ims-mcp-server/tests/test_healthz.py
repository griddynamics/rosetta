"""F3 — Unit tests for the /healthz handler (D1-D3, §4.2, NFR-5).

Covers:
- Probe ok → 200 + status:ok
- Second call within TTL → cached:true, RAGFlow NOT called again
- Probe timeout → 503 + ragflow:timeout; body contains NO internal URL/hostname
- Probe raises generic Exception → 503 + ragflow:error; detail is generic
- _RAGFLOW is None → 200 + ragflow:disabled

All tests mock external boundaries (RAGFlow client, monotonic clock, module-level
cache) and do NOT touch network or real RAGFlow.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import ims_mcp.server as server_module
from ims_mcp.server import _healthz_handler


# ── helpers ──────────────────────────────────────────────────────────────────

class _FakeRequest:
    """Minimal Starlette-like request object; _healthz_handler only uses `request` as a param."""
    pass


def _parse_body(response: Any) -> dict[str, Any]:
    """Extract JSON body from a Starlette Response object."""
    content = response.body if hasattr(response, "body") else response.content
    return json.loads(content)


# ── F3-1: probe ok → HTTP 200 + status:ok ────────────────────────────────────

@pytest.mark.asyncio
async def test_healthz_ok_returns_200_status_ok():
    """RAGFlow probe succeeds → 200 {"status":"ok","ragflow":"ok",...}."""
    mock_ragflow = MagicMock()
    mock_ragflow.get = MagicMock(return_value=MagicMock(status_code=200))

    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 10.0
    mock_config.healthz_ragflow_timeout = 5.0

    with (
        patch.object(server_module, "_RAGFLOW", mock_ragflow),
        patch.object(server_module, "_HEALTHZ_CACHE", None),
        patch.object(server_module, "_CONFIG", mock_config),
    ):
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 200
    body = _parse_body(response)
    assert body["status"] == "ok"
    assert body["ragflow"] == "ok"
    assert body["cached"] is False


# ── F3-2: second call within TTL → cached:true, no second probe ──────────────

@pytest.mark.asyncio
async def test_healthz_cached_within_ttl_no_second_probe():
    """Within cache TTL, result is returned with cached:true and probe NOT called."""
    mock_ragflow = MagicMock()
    probe_call_count = 0

    def _counting_get(*args, **kwargs):
        nonlocal probe_call_count
        probe_call_count += 1
        return MagicMock(status_code=200)

    mock_ragflow.get = _counting_get

    # Pre-populate cache with an "ok" result
    cached_result = {"status": "ok", "ragflow": "ok", "cached": False, "checked_at": 1000.0}
    cache_ts = 500.0  # monotonic timestamp when the cache was stored

    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 10.0  # 10s TTL

    with (
        patch.object(server_module, "_RAGFLOW", mock_ragflow),
        patch.object(server_module, "_HEALTHZ_CACHE", (cached_result, cache_ts)),
        patch.object(server_module, "_CONFIG", mock_config),
        patch("ims_mcp.server.time") as mock_time,
    ):
        # Now = cache_ts + 5s (within the 10s TTL)
        mock_time.monotonic.return_value = cache_ts + 5.0
        mock_time.time.return_value = 9999.0
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 200
    body = _parse_body(response)
    assert body["cached"] is True
    assert body["ragflow"] == "ok"
    # RAGFlow probe must NOT have been called
    assert probe_call_count == 0, "RAGFlow probe was called despite cache hit"


# ── F3-3: probe timeout → 503 + generic detail (no internal URL) ─────────────

@pytest.mark.asyncio
async def test_healthz_probe_timeout_returns_503_no_internal_url():
    """asyncio.TimeoutError → 503 {"status":"unhealthy","ragflow":"timeout",...}.

    The detail field must NOT contain internal hostnames or URLs.
    Simulate the timeout by making the probe hang and using a very short timeout.
    """
    import ims_mcp.server as srv

    mock_ragflow = MagicMock()

    # Make the probe block in a thread long enough for wait_for to expire
    # Accept *args/**kwargs because _RAGFLOW.get("/datasets", params=...) is how
    # it's called inside _healthz_handler's _probe() inner function.
    def _hanging_get(*args: Any, **kwargs: Any) -> None:
        import time as _t
        _t.sleep(10)  # will be cancelled by wait_for timeout

    mock_ragflow.get = MagicMock(side_effect=_hanging_get)

    # Patch the config timeout to be tiny so wait_for fires immediately
    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 0  # no cache
    mock_config.healthz_ragflow_timeout = 0.05  # 50ms timeout

    with (
        patch.object(server_module, "_RAGFLOW", mock_ragflow),
        patch.object(server_module, "_HEALTHZ_CACHE", None),
        patch.object(server_module, "_CONFIG", mock_config),
    ):
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 503
    body = _parse_body(response)
    assert body["status"] == "unhealthy"
    assert body["ragflow"] == "timeout"
    # SPEC §8: detail must be the literal "timeout" — no config value or internal info.
    assert body["detail"] == "timeout", (
        f"Expected detail=='timeout' (literal), got: {body.get('detail')!r}"
    )


# ── F3-4: probe raises generic Exception → 503 + "error" (generic detail) ────

@pytest.mark.asyncio
async def test_healthz_probe_error_returns_503_generic_detail():
    """Generic Exception in probe → 503 {"ragflow":"error","detail":"error",...}.

    The body must NOT include internal error message text (no info leakage).
    We simulate a ConnectionRefusedError raised from within asyncio.to_thread.
    """
    internal_url = "http://ragflow-internal.prod.svc.cluster.local:8080"
    mock_ragflow = MagicMock()

    # Make the probe raise a connection error with an internal URL in the message
    def _connection_fail():
        raise ConnectionRefusedError(f"connect to {internal_url} refused")

    mock_ragflow.get = MagicMock(side_effect=_connection_fail)

    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 0  # no cache
    mock_config.healthz_ragflow_timeout = 5.0  # generous — error fires immediately

    with (
        patch.object(server_module, "_RAGFLOW", mock_ragflow),
        patch.object(server_module, "_HEALTHZ_CACHE", None),
        patch.object(server_module, "_CONFIG", mock_config),
    ):
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 503
    body = _parse_body(response)
    assert body["status"] == "unhealthy"
    assert body["ragflow"] == "error"
    # CRITICAL: internal URL must NOT appear in the response body
    body_str = json.dumps(body)
    assert internal_url not in body_str, (
        f"Internal URL leaked into response body: {body_str}"
    )
    assert "svc.cluster" not in body_str
    assert "detail" in body
    # Detail is the generic string "error", not the exception message
    assert body["detail"] == "error"


# ── F3-5: _RAGFLOW is None → 200 + ragflow:disabled ─────────────────────────

@pytest.mark.asyncio
async def test_healthz_ragflow_disabled_returns_200():
    """When _RAGFLOW is None, handler returns 200 {"ragflow":"disabled",...}."""
    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 10.0
    mock_config.healthz_ragflow_timeout = 5.0

    with (
        patch.object(server_module, "_RAGFLOW", None),
        patch.object(server_module, "_HEALTHZ_CACHE", None),
        patch.object(server_module, "_CONFIG", mock_config),
    ):
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 200
    body = _parse_body(response)
    assert body["status"] == "ok"
    assert body["ragflow"] == "disabled"
    assert body["cached"] is False


# ── F3-6: TTL expiry triggers new probe (cache miss after TTL) ───────────────

@pytest.mark.asyncio
async def test_healthz_cache_expires_and_new_probe_runs():
    """After TTL expires, a fresh probe is issued (no stale cache returned)."""
    mock_ragflow = MagicMock()
    probe_calls: list[str] = []

    def _counting_get(path, **kwargs):
        probe_calls.append(path)
        return MagicMock(status_code=200)

    mock_ragflow.get = _counting_get

    # Pre-populate cache with a result that is already expired
    old_result = {"status": "ok", "ragflow": "ok", "cached": False, "checked_at": 100.0}
    old_ts = 100.0  # stored at t=100

    mock_config = MagicMock()
    mock_config.healthz_cache_ttl = 10.0  # 10s TTL
    mock_config.healthz_ragflow_timeout = 5.0

    with (
        patch.object(server_module, "_RAGFLOW", mock_ragflow),
        patch.object(server_module, "_HEALTHZ_CACHE", (old_result, old_ts)),
        patch.object(server_module, "_CONFIG", mock_config),
        patch("ims_mcp.server.time") as mock_time,
    ):
        # Now = 100 + 30s (well past the 10s TTL)
        mock_time.monotonic.return_value = old_ts + 30.0
        mock_time.time.return_value = 9999.0
        response = await _healthz_handler(_FakeRequest())

    assert response.status_code == 200
    body = _parse_body(response)
    # A new probe ran
    assert body["cached"] is False
    assert probe_calls, "Expected a new probe call after TTL expiry"
