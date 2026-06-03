"""Tests for OriginValidationMiddleware, RequestLoggingMiddleware, _retry_once,
and tool error-path logging.

F4 additions:
- OriginValidationMiddleware logs WARN on block (REQ-OBS-7)
- _retry_once final failure preserves __cause__ (A7, REQ-OBS-9)
- Tool error path (tools/instructions.py / resources.py) emits a local error log
  while still returning its "Error:" string (C1, REQ-OBS-8)
"""

from __future__ import annotations

import logging
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from ims_mcp.server import OriginValidationMiddleware, RequestLoggingMiddleware, _retry_once


# ── shared helpers ────────────────────────────────────────────────────────────

async def _receive():
    return {"type": "http.request"}


def _capture_send(sent):
    async def _send(message):
        sent.append(message)
    return _send


# ── existing origin-middleware tests (repositioned) ──────────────────────────

@pytest.mark.asyncio
async def test_origin_middleware_blocks_http_origin_not_in_allowlist():
    calls = []

    async def app(scope, receive, send):
        calls.append("called")

    middleware = OriginValidationMiddleware(app, allowed_origins=["https://allowed.example.com"])
    sent = []

    await middleware(
        {
            "type": "http",
            "headers": [(b"origin", b"https://blocked.example.com")],
        },
        _receive,
        _capture_send(sent),
    )

    assert calls == []
    assert sent == [
        {"type": "http.response.start", "status": 403, "headers": []},
        {"type": "http.response.body", "body": b"Forbidden", "more_body": False},
    ]


@pytest.mark.asyncio
async def test_origin_middleware_blocks_websocket_origin_not_in_allowlist():
    calls = []

    async def app(scope, receive, send):
        calls.append("called")

    middleware = OriginValidationMiddleware(app, allowed_origins=["https://allowed.example.com"])
    sent = []

    await middleware(
        {
            "type": "websocket",
            "headers": [(b"origin", b"https://blocked.example.com")],
        },
        _receive,
        _capture_send(sent),
    )

    assert calls == []
    assert sent == [
        {"type": "websocket.close", "code": 1008, "reason": "Forbidden"},
    ]


@pytest.mark.asyncio
async def test_origin_middleware_allows_missing_origin_header():
    calls = []

    async def app(scope, receive, send):
        calls.append(scope["type"])

    middleware = OriginValidationMiddleware(app, allowed_origins=["https://allowed.example.com"])

    async def _send(_message):
        return None

    await middleware({"type": "http", "headers": []}, _receive, _send)

    assert calls == ["http"]


# ── F4-1: OriginValidationMiddleware logs WARN on block (REQ-OBS-7) ──────────

@pytest.mark.asyncio
async def test_origin_middleware_logs_warn_on_block(caplog):
    """When a request is rejected, OriginValidationMiddleware emits a WARNING."""

    async def app(scope, receive, send):
        pass

    middleware = OriginValidationMiddleware(app, allowed_origins=["https://allowed.example.com"])
    sent = []

    with caplog.at_level(logging.WARNING, logger="ims_mcp"):
        await middleware(
            {
                "type": "http",
                "path": "/mcp",
                "client": ("10.0.0.1", 9000),
                "headers": [(b"origin", b"https://evil.example.com")],
            },
            _receive,
            _capture_send(sent),
        )

    msgs = [r.message for r in caplog.records if r.levelno >= logging.WARNING]
    assert msgs, "Expected a WARNING log from OriginValidationMiddleware"
    assert any("evil.example.com" in m or "rejected" in m.lower() for m in msgs), (
        f"WARNING message should mention the origin or 'rejected'. Got: {msgs}"
    )
    # Confirm the request was blocked (403 sent)
    assert any(m.get("status") == 403 for m in sent)


# ── existing RequestLoggingMiddleware tests (reconciled to actual log format) ──

@pytest.mark.asyncio
async def test_request_logging_middleware_logs_http_start_and_completion(caplog):
    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": False})

    middleware = RequestLoggingMiddleware(app)
    sent = []

    with caplog.at_level(logging.INFO, logger="ims_mcp"):
        await middleware(
            {
                "type": "http",
                "method": "POST",
                "path": "/mcp",
                "query_string": b"a=b",
                "client": ("127.0.0.1", 12345),
                "headers": [(b"x-request-id", b"trace-1"), (b"user-agent", b"pytest")],
            },
            _receive,
            _capture_send(sent),
        )

    messages = [record.message for record in caplog.records]
    assert sent[0]["status"] == 204
    # Reconciled: actual log format uses [request-tracing-received] not "request started"
    assert any(
        "request-tracing-received" in m and "trace=trace-1" in m for m in messages
    ), f"Expected [request-tracing-received] with trace=trace-1. Got: {messages}"
    assert any(
        "request-tracing-completed" in m and "status=204" in m for m in messages
    ), f"Expected [request-tracing-completed] with status=204. Got: {messages}"


@pytest.mark.asyncio
async def test_request_logging_middleware_returns_500_when_http_app_raises_before_response(caplog):
    async def app(scope, receive, send):
        raise RuntimeError("boom")

    middleware = RequestLoggingMiddleware(app)
    sent = []

    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/mcp",
            "query_string": b"",
            "headers": [],
        },
        _receive,
        _capture_send(sent),
    )

    messages = [record.message for record in caplog.records]
    assert sent[0]["type"] == "http.response.start"
    assert sent[0]["status"] == 500
    assert sent[0]["headers"][0] == (b"content-type", b"text/plain; charset=utf-8")
    assert sent[0]["headers"][1][0] == b"x-request-id"
    assert sent[0]["headers"][1][1]
    assert sent[1] == {
        "type": "http.response.body",
        "body": b"Internal Server Error",
        "more_body": False,
    }
    # Reconciled: actual log format uses [request-tracing-failed] not "request failed"
    assert any(
        "request-tracing-failed" in m and "path=/mcp" in m for m in messages
    ), f"Expected [request-tracing-failed] with path=/mcp. Got: {messages}"


@pytest.mark.asyncio
async def test_request_logging_middleware_reraises_when_http_response_already_started(caplog):
    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        raise RuntimeError("late boom")

    middleware = RequestLoggingMiddleware(app)
    sent = []

    with pytest.raises(RuntimeError, match="late boom"):
        await middleware(
            {
                "type": "http",
                "method": "GET",
                "path": "/mcp",
                "query_string": b"",
                "headers": [],
            },
            _receive,
            _capture_send(sent),
        )

    assert sent == [{"type": "http.response.start", "status": 200, "headers": []}]
    assert any("response_started=True" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_request_logging_middleware_closes_websocket_when_app_raises_before_accept():
    async def app(scope, receive, send):
        raise RuntimeError("ws boom")

    middleware = RequestLoggingMiddleware(app)
    sent = []

    await middleware(
        {
            "type": "websocket",
            "path": "/mcp",
            "headers": [(b"x-trace-id", b"trace-ws")],
        },
        _receive,
        _capture_send(sent),
    )

    assert sent == [{"type": "websocket.close", "code": 1011, "reason": "Internal Server Error"}]


# ── F4-2: _retry_once preserves __cause__ on final failure (A7, REQ-OBS-9) ───

@pytest.mark.asyncio
async def test_retry_once_preserves_cause_on_final_failure():
    """_retry_once raises RuntimeError with __cause__ set to the original exception.

    Patch _RAGFLOW to a non-None sentinel so the retry loop does not break
    early (the break-on-None-RAGFLOW is the "no RAGFlow configured" fast-exit).
    """
    import ims_mcp.server as server_module

    original_error = ValueError("root cause from ragflow")
    call_count = 0

    async def _always_fails() -> str:
        nonlocal call_count
        call_count += 1
        raise original_error

    with patch.object(server_module, "_RAGFLOW", object()):  # non-None → full retry
        with pytest.raises(RuntimeError) as exc_info:
            await _retry_once(_always_fails, operation="test_op")

    # Must retry once (2 total calls)
    assert call_count == 2, f"Expected 2 attempts, got {call_count}"

    # __cause__ must be the original exception (A7)
    assert exc_info.value.__cause__ is original_error, (
        f"__cause__ is {exc_info.value.__cause__!r}, expected {original_error!r}"
    )
    # The RuntimeError message should contain the original error text
    assert str(original_error) in str(exc_info.value)


@pytest.mark.asyncio
async def test_retry_once_succeeds_on_second_attempt():
    """_retry_once succeeds when the second attempt returns a value.

    Patch _RAGFLOW to non-None so the retry loop does not exit early.
    """
    import ims_mcp.server as server_module

    call_count = 0

    async def _fails_once() -> str:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise ConnectionError("transient")
        return "success"

    with patch.object(server_module, "_RAGFLOW", object()):  # non-None → full retry
        result = await _retry_once(_fails_once, operation="transient_op")

    assert result == "success"
    assert call_count == 2


# ── F4-3: tool error path emits local error log + returns "Error:" string ────

@pytest.mark.asyncio
async def test_query_instructions_logs_error_on_dataset_open_failure(caplog):
    """When the dataset lookup raises, query_instructions logs ERROR and returns Error:."""
    from ims_mcp.tools.instructions import query_instructions

    mock_ctx = Mock()
    mock_ctx.config = Mock()
    mock_ctx.config.instruction_dataset = "test-dataset"
    mock_ctx.authorizer = Mock()
    mock_ctx.authorizer.can_read = Mock(return_value=True)
    mock_ctx.user_email = "user@test.com"

    mock_dataset_lookup = Mock()
    mock_dataset_lookup.get_id = Mock(return_value="dataset-id-123")
    mock_dataset_lookup.get_dataset = Mock(side_effect=RuntimeError("RAGFlow connection refused"))
    mock_ctx.dataset_lookup = mock_dataset_lookup

    with caplog.at_level(logging.ERROR, logger="ims_mcp"):
        result = await query_instructions(
            call_ctx=mock_ctx,
            document_client=Mock(),
            bundler=Mock(),
            query_builder=Mock(),
            query="test query",
            tags=None,
        )

    assert result.startswith("Error:"), f"Expected Error: result, got: {result}"
    error_logs = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert error_logs, "Expected at least one ERROR log from query_instructions"


@pytest.mark.asyncio
async def test_list_instructions_logs_error_on_doc_cache_failure(caplog):
    """When doc_cache.get_all_docs_async raises, list_instructions logs ERROR and returns Error:."""
    from ims_mcp.tools.instructions import list_instructions

    mock_ctx = Mock()
    mock_ctx.config = Mock()
    mock_ctx.config.instruction_dataset = "test-dataset"
    mock_ctx.authorizer = Mock()
    mock_ctx.authorizer.can_read = Mock(return_value=True)
    mock_ctx.user_email = "user@test.com"
    mock_ctx.dataset_lookup = Mock()
    mock_ctx.dataset_lookup.get_dataset = Mock(return_value=Mock())

    mock_cache = Mock()
    mock_cache.get_all_docs_async = AsyncMock(side_effect=RuntimeError("cache failure"))

    with caplog.at_level(logging.ERROR, logger="ims_mcp"):
        result = await list_instructions(
            call_ctx=mock_ctx,
            doc_cache=mock_cache,
            bundler=Mock(),
            full_path_from_root="skills",
        )

    assert result.startswith("Error:"), f"Expected Error: result, got: {result}"
    error_logs = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert error_logs, "Expected at least one ERROR log from list_instructions"


@pytest.mark.asyncio
async def test_read_instruction_resource_logs_error_on_doc_cache_failure(caplog):
    """When doc_cache.get_all_docs_async raises, read_instruction_resource logs ERROR and returns Error:."""
    from ims_mcp.tools.resources import read_instruction_resource

    mock_ctx = Mock()
    mock_ctx.config = Mock()
    mock_ctx.config.instruction_dataset = "test-dataset"
    mock_ctx.authorizer = Mock()
    mock_ctx.authorizer.can_read = Mock(return_value=True)
    mock_ctx.user_email = "user@test.com"
    mock_ctx.dataset_lookup = Mock()
    mock_ctx.dataset_lookup.get_dataset = Mock(return_value=Mock())

    mock_cache = Mock()
    mock_cache.get_all_docs_async = AsyncMock(side_effect=IOError("network timeout"))

    with caplog.at_level(logging.ERROR, logger="ims_mcp"):
        result = await read_instruction_resource(
            path="skills/coding/SKILL.md",
            call_ctx=mock_ctx,
            document_client=Mock(),
            bundler=Mock(),
            doc_cache=mock_cache,
        )

    assert result.startswith("Error:"), f"Expected Error: result, got: {result}"
    error_logs = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert error_logs, "Expected at least one ERROR log from read_instruction_resource"
