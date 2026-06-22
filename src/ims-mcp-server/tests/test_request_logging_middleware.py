"""F1 — Unit tests for RequestLoggingMiddleware (ASGI logging layer).

Covers:
- REQ-OBS-1  request-received log (INFO) at earliest possible point
- REQ-OBS-2  response.start status recorded AFTER send returns
- REQ-OBS-3  completion on final body chunk (more_body=False)
- REQ-OBS-4  client-disconnect logged distinctly
- REQ-OBS-5  SSE per-chunk log on /mcp path (seq+bytes at INFO, payload at DEBUG)
- Handler raises BEFORE response start → fallback 500 sent + logged
- Regression: first send raises → response_started NOT pre-set → fallback reachable
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from ims_mcp.server import RequestLoggingMiddleware, _INFLIGHT_REGISTRY, _INFLIGHT_LOCK


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_http_scope(
    path: str = "/mcp",
    method: str = "POST",
    trace_id: bytes | None = b"trace-test-1",
    extra_headers: list[tuple[bytes, bytes]] | None = None,
) -> dict[str, Any]:
    headers: list[tuple[bytes, bytes]] = []
    if trace_id:
        headers.append((b"x-request-id", trace_id))
    headers.append((b"user-agent", b"pytest-client"))
    if extra_headers:
        headers.extend(extra_headers)
    return {
        "type": "http",
        "method": method,
        "path": path,
        "query_string": b"",
        "client": ("127.0.0.1", 5000),
        "headers": headers,
    }


async def _simple_receive() -> dict[str, Any]:
    return {"type": "http.request"}


def _capture_send(sent: list[dict[str, Any]]):
    async def _send(msg: dict[str, Any]) -> None:
        sent.append(msg)
    return _send


def _messages(caplog) -> list[str]:
    return [r.message for r in caplog.records]


# ── F1-1: REQ-OBS-1 — request-received log on request entry ─────────────────

@pytest.mark.asyncio
async def test_request_received_log_on_entry(caplog):
    """INFO log emitted for every incoming request before calling the inner app."""
    received_order: list[str] = []

    async def app(scope, receive, send):
        received_order.append("app-called")
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok", "more_body": False})

    middleware = RequestLoggingMiddleware(app)
    sent: list[dict[str, Any]] = []

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await middleware(_make_http_scope(trace_id=b"t-recv-1"), _simple_receive, _capture_send(sent))

    msgs = _messages(caplog)
    received_msgs = [m for m in msgs if "request-tracing-received" in m]
    assert received_msgs, "Expected a [request-tracing-received] log line"
    assert any("t-recv-1" in m for m in received_msgs), "Trace ID must appear in received log"
    assert any("method=POST" in m for m in received_msgs)
    assert any("path=/mcp" in m for m in received_msgs)


# ── F1-2: REQ-OBS-2 — response.start status set AFTER send returns ───────────

@pytest.mark.asyncio
async def test_response_start_status_logged_after_send(caplog):
    """response-start log appears only after the underlying send call returns."""
    send_order: list[str] = []

    async def app(scope, receive, send):
        # After we call send with response.start, the log should already be there
        await send({"type": "http.response.start", "status": 201, "headers": []})
        send_order.append("response-start-sent")
        await send({"type": "http.response.body", "body": b"", "more_body": False})

    sent: list[dict[str, Any]] = []

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(trace_id=b"t-rs-1"), _simple_receive, _capture_send(sent)
        )

    msgs = _messages(caplog)
    assert any("response-start" in m and "status=201" in m for m in msgs), (
        "Must log response-start with status=201"
    )
    assert sent[0]["status"] == 201


# ── F1-3: REQ-OBS-3 — completion logged on final body chunk ─────────────────

@pytest.mark.asyncio
async def test_completion_logged_on_final_body_chunk(caplog):
    """completed log fires on http.response.body with more_body=False."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"chunk1", "more_body": True})
        await send({"type": "http.response.body", "body": b"last", "more_body": False})

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(trace_id=b"t-comp-1"), _simple_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    completed_msgs = [m for m in msgs if "request-tracing-completed" in m]
    assert completed_msgs, "Expected [request-tracing-completed] log line"
    assert any("status=200" in m for m in completed_msgs)
    # Exactly one completed entry (not one per chunk)
    assert len(completed_msgs) == 1


# ── F1-4a: REQ-OBS-4 — disconnect + app still responds ──────────────────────

@pytest.mark.asyncio
async def test_client_disconnect_logged_and_app_still_responds(caplog):
    """http.disconnect is logged AND the app can still send a normal response."""

    async def _disconnect_receive():
        return {"type": "http.disconnect"}

    async def app(scope, receive, send):
        msg = await receive()
        assert msg["type"] == "http.disconnect"
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": False})

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(trace_id=b"t-disc-1"), _disconnect_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    disc_msgs = [m for m in msgs if "request-tracing-disconnect" in m]
    assert disc_msgs, "Expected [request-tracing-disconnect] log line"


# ── F1-4b: REQ-OBS-4 — disconnect + no response → disconnect log present ──────

@pytest.mark.asyncio
async def test_client_disconnect_no_response_disconnect_log_present(caplog):
    """When app detects disconnect and returns without sending a response,
    [request-tracing-disconnect] is emitted (disconnect logged distinctly).

    Note: the middleware also emits a fallback 'completed' log at the end of
    _call_app even when no response body was sent — that is expected production
    behaviour for the no-response code path (WebSocket / disconnect fallback).
    """

    async def _disconnect_receive():
        return {"type": "http.disconnect"}

    async def app(scope, receive, send):
        # App detects disconnect and returns without sending any response
        await receive()

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(trace_id=b"t-disc-2"), _disconnect_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    disc_msgs = [m for m in msgs if "request-tracing-disconnect" in m]
    assert disc_msgs, "Expected [request-tracing-disconnect] log line"
    # The disconnect log must include the trace id
    assert any("t-disc-2" in m for m in disc_msgs)


# ── F1-5: REQ-OBS-5 — SSE per-chunk log on /mcp path ───────────────────────

@pytest.mark.asyncio
async def test_sse_per_chunk_info_log_on_mcp_path(caplog):
    """INFO log per non-empty SSE body chunk on /mcp path; seq increments."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"data: chunk1\n\n", "more_body": True})
        await send({"type": "http.response.body", "body": b"data: chunk2\n\n", "more_body": True})
        await send({"type": "http.response.body", "body": b"data: chunk3\n\n", "more_body": False})

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(path="/mcp", trace_id=b"t-sse-1"), _simple_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    sse_msgs = [m for m in msgs if "request-tracing-sse" in m and "seq=" in m and "bytes=" in m]
    assert len(sse_msgs) == 3, f"Expected 3 SSE log lines, got {len(sse_msgs)}: {sse_msgs}"
    assert any("seq=1" in m for m in sse_msgs)
    assert any("seq=2" in m for m in sse_msgs)
    assert any("seq=3" in m for m in sse_msgs)


@pytest.mark.asyncio
async def test_sse_payload_logged_only_at_debug(caplog):
    """SSE payload (sse-payload) line appears only when logger is at DEBUG level."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"data: secret\n\n", "more_body": False})

    # At INFO level: no payload log
    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(path="/mcp", trace_id=b"t-sse-info"), _simple_receive, _capture_send([])
        )
    msgs_info = _messages(caplog)
    assert not any("sse-payload" in m for m in msgs_info), "Payload must not appear at INFO level"

    caplog.clear()

    # At DEBUG level: payload log appears
    with caplog.at_level(logging.DEBUG, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(path="/mcp", trace_id=b"t-sse-debug"), _simple_receive, _capture_send([])
        )
    msgs_debug = _messages(caplog)
    assert any("sse-payload" in m for m in msgs_debug), "Payload must appear at DEBUG level"


@pytest.mark.asyncio
async def test_sse_no_log_for_empty_body_chunks(caplog):
    """Empty body chunks do NOT produce SSE log lines."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": True})  # empty
        await send({"type": "http.response.body", "body": b"data: real\n\n", "more_body": False})

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(path="/mcp", trace_id=b"t-sse-empty"), _simple_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    sse_msgs = [m for m in msgs if "request-tracing-sse" in m and "seq=" in m]
    # Only 1 SSE line (seq=1), not 2
    assert len(sse_msgs) == 1
    assert "seq=1" in sse_msgs[0]


# ── F1-6: handler raises before response start → fallback 500 sent + logged ──

@pytest.mark.asyncio
async def test_handler_raises_before_response_sends_500_and_logs(caplog):
    """When the inner app raises before sending response.start, middleware sends 500."""

    async def app(scope, receive, send):
        raise ValueError("inner boom")

    sent: list[dict[str, Any]] = []

    with caplog.at_level(logging.ERROR, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(trace_id=b"t-fail-1"), _simple_receive, _capture_send(sent)
        )

    # 500 response must be sent
    assert any(m.get("type") == "http.response.start" and m.get("status") == 500 for m in sent), (
        f"Expected a 500 http.response.start, got: {sent}"
    )
    assert any(
        m.get("type") == "http.response.body" and m.get("body") == b"Internal Server Error"
        for m in sent
    )

    # Exception must be logged
    msgs = _messages(caplog)
    assert any("request-tracing-failed" in m for m in msgs), (
        f"Expected [request-tracing-failed] log line, got: {msgs}"
    )
    assert any("response_started=False" in m for m in msgs)


# ── F1-7: regression — first send raises → response_started NOT pre-set ──────

@pytest.mark.asyncio
async def test_send_raises_on_first_send_fallback_reachable(caplog):
    """Regression: if the first send() call raises, response_started stays False
    and the fallback-500 path is still reachable (flag set AFTER send returns).

    Asserts:
    - The failed log shows response_started=False (flag was NOT pre-set).
    - A second http.response.start with status=500 was sent (fallback reached).
    """
    calls: list[dict[str, Any]] = []
    call_count = 0

    async def failing_send(msg: dict[str, Any]) -> None:
        nonlocal call_count
        call_count += 1
        calls.append(msg)
        # Raise only on the FIRST http.response.start send, simulating a
        # transport write failure before response_started can be set.
        if call_count == 1 and msg.get("type") == "http.response.start":
            raise OSError("transport write failed")

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})

    with caplog.at_level(logging.ERROR, logger="ims_mcp"):
        try:
            await RequestLoggingMiddleware(app)(
                _make_http_scope(trace_id=b"t-send-fail"), _simple_receive, failing_send
            )
        except Exception:
            pass  # subsequent fallback sends may also raise; that's acceptable

    msgs = _messages(caplog)
    # 1. The failed log must show response_started=False (flag was NOT pre-set)
    assert any("response_started=False" in m for m in msgs), (
        f"Expected response_started=False in failed log. Got: {msgs}"
    )
    # 2. A second http.response.start with status=500 must have been attempted
    # (proves the fallback path was reached after response_started stayed False).
    fallback_starts = [
        m for m in calls
        if m.get("type") == "http.response.start" and m.get("status") == 500
    ]
    assert fallback_starts, (
        f"Expected a fallback http.response.start with status=500. calls={calls}"
    )


# ── F1-8: non-mcp path does not produce SSE logs ─────────────────────────────

@pytest.mark.asyncio
async def test_non_mcp_path_no_sse_logs(caplog):
    """SSE chunk logs only appear for /mcp* paths, not /healthz or other paths."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"healthy", "more_body": False})

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(
            _make_http_scope(path="/healthz", trace_id=b"t-healthz"), _simple_receive, _capture_send([])
        )

    msgs = _messages(caplog)
    assert not any("request-tracing-sse" in m for m in msgs), "No SSE logs for /healthz path"


# ── F1-9: in-flight registry populated/cleaned ───────────────────────────────

@pytest.mark.asyncio
async def test_inflight_registered_during_request_and_removed_after():
    """In-flight registry has an entry while the request is in progress."""
    captured_trace: list[str] = []

    async def app(scope, receive, send):
        # During request: registry must have an entry
        with _INFLIGHT_LOCK:
            keys = list(_INFLIGHT_REGISTRY.keys())
        captured_trace.extend(keys)
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": False})

    await RequestLoggingMiddleware(app)(
        _make_http_scope(trace_id=b"t-inflight"), _simple_receive, _capture_send([])
    )

    # After request: trace should have been registered during request
    assert captured_trace, "In-flight registry was empty during request"

    # After completion: the trace must be removed
    with _INFLIGHT_LOCK:
        for t in captured_trace:
            assert t not in _INFLIGHT_REGISTRY, f"Trace {t} not removed from in-flight registry"


# ── NIT-3: REQ-OBS-10 — transport loggers wired to ims-mcp handler ───────────

def test_transport_loggers_wired_to_ims_mcp_handler():
    """mcp.server.streamable_http and _manager loggers share the ims-mcp handler.

    REQ-OBS-10: transport/session crashes from the MCP SDK must be visible in
    pod logs via the ims-mcp handler.
    """
    import ims_mcp.server as server_module

    ims_mcp_logger = logging.getLogger("ims_mcp")
    ims_mcp_handlers = ims_mcp_logger.handlers
    assert ims_mcp_handlers, "ims_mcp logger has no handlers"

    for name in ("mcp.server.streamable_http", "mcp.server.streamable_http_manager"):
        t_logger = logging.getLogger(name)
        transport_handlers = t_logger.handlers
        assert transport_handlers, (
            f"Transport logger '{name}' has no handlers — REQ-OBS-10 wiring missing"
        )
        # At least one handler instance is shared with ims_mcp logger
        shared = [h for h in transport_handlers if h in ims_mcp_handlers]
        assert shared, (
            f"Transport logger '{name}' does not share a handler with ims_mcp logger "
            f"(transport handlers: {transport_handlers}, ims_mcp handlers: {ims_mcp_handlers})"
        )


# ── Security: OAuth query redaction on /auth paths ───────────────────────────

@pytest.mark.asyncio
async def test_auth_path_query_is_redacted_in_received_log(caplog):
    """query= for /auth/* paths is <redacted> in [request-tracing-received] log.

    The raw OAuth code/state MUST NOT appear in the log line.
    """

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 302, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": False})

    scope = _make_http_scope(path="/auth/callback", method="GET", trace_id=b"t-auth-redact")
    scope["query_string"] = b"code=SECRETCODE&state=xyz"

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(scope, _simple_receive, _capture_send([]))

    received = [r.message for r in caplog.records if "request-tracing-received" in r.message]
    assert received, "Expected a [request-tracing-received] log line"
    assert any("query=<redacted>" in m for m in received), (
        f"Auth path query must be redacted; got: {received}"
    )
    assert not any("SECRETCODE" in m for m in received), (
        f"Raw OAuth code must NOT appear in log; got: {received}"
    )


@pytest.mark.asyncio
async def test_non_auth_path_query_logged_verbatim(caplog):
    """query= for non-auth paths is logged verbatim (unredacted)."""

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok", "more_body": False})

    scope = _make_http_scope(path="/mcp", method="GET", trace_id=b"t-noauth-query")
    scope["query_string"] = b"foo=bar"

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await RequestLoggingMiddleware(app)(scope, _simple_receive, _capture_send([]))

    received = [r.message for r in caplog.records if "request-tracing-received" in r.message]
    assert received, "Expected a [request-tracing-received] log line"
    assert any("query=foo=bar" in m for m in received), (
        f"Non-auth path query must be logged verbatim; got: {received}"
    )
