"""Tests for execution timing and RAGFlow HTTP-level tracing."""

from __future__ import annotations

import asyncio
import logging
from unittest.mock import MagicMock, patch

import pytest

from ims_mcp.tracing import (
    SLOW_CALL_THRESHOLD_SECONDS,
    current_trace_id,
    get_request_trace_id,
    instrument_ragflow_client,
    run_traced,
    traced_execution,
)


def test_get_request_trace_id_returns_none_outside_http():
    """Without a FastMCP HTTP context, returns None."""
    assert get_request_trace_id() is None


@pytest.mark.asyncio
async def test_traced_execution_logs_start_and_end(caplog):
    """Normal (fast) call logs INFO at start and completion."""
    with caplog.at_level(logging.INFO, logger="ims_mcp.tracing"):
        async with traced_execution("test_op"):
            pass
    messages = [r.message for r in caplog.records]
    assert any("test_op" in m and "started" in m for m in messages)
    assert any("test_op" in m and "completed" in m for m in messages)


@pytest.mark.asyncio
async def test_traced_execution_logs_error_on_exception(caplog):
    """Exception during call logs ERROR with elapsed time."""
    with caplog.at_level(logging.ERROR, logger="ims_mcp.tracing"):
        with pytest.raises(ValueError, match="boom"):
            async with traced_execution("fail_op"):
                raise ValueError("boom")
    messages = [r.message for r in caplog.records]
    assert any("fail_op" in m and "failed" in m for m in messages)


@pytest.mark.asyncio
async def test_traced_execution_includes_trace_id(caplog):
    """When trace_id is provided, it appears in log messages."""
    with caplog.at_level(logging.INFO, logger="ims_mcp.tracing"):
        async with traced_execution("traced_op", trace_id="abc-123"):
            pass
    messages = [r.message for r in caplog.records]
    assert any("abc-123" in m for m in messages)


@pytest.mark.asyncio
async def test_traced_execution_sets_contextvar():
    """traced_execution populates current_trace_id contextvar."""
    async with traced_execution("ctx_op", trace_id="my-trace-42"):
        assert current_trace_id.get() == "my-trace-42"
    # After exiting, contextvar is reset
    assert current_trace_id.get() is None


@pytest.mark.asyncio
async def test_traced_execution_slow_call_warning(caplog):
    """Call exceeding threshold logs ERROR while still running."""
    with caplog.at_level(logging.ERROR, logger="ims_mcp.tracing"):
        async with traced_execution("slow_op"):
            await asyncio.sleep(SLOW_CALL_THRESHOLD_SECONDS + 0.5)
    messages = [r.message for r in caplog.records]
    assert any("SLOW" in m and "slow_op" in m for m in messages)


@pytest.mark.asyncio
async def test_run_traced_wraps_sync_function(caplog):
    """run_traced runs a sync function via asyncio.to_thread."""

    def add(a: int, b: int) -> int:
        return a + b

    with caplog.at_level(logging.INFO, logger="ims_mcp.tracing"):
        result = await run_traced("add_op", add, 2, 3)

    assert result == 5
    messages = [r.message for r in caplog.records]
    assert any("add_op" in m and "started" in m for m in messages)


@pytest.mark.asyncio
async def test_slow_threshold_is_five_seconds():
    """Verify the slow-call threshold constant."""
    assert SLOW_CALL_THRESHOLD_SECONDS == 5.0


def test_instrument_ragflow_client_wraps_http_methods():
    """instrument_ragflow_client wraps get/post/put/delete/patch."""
    mock_client = MagicMock()
    mock_client.get = MagicMock(return_value=MagicMock(status_code=200))
    mock_client.post = MagicMock(return_value=MagicMock(status_code=200))

    instrument_ragflow_client(mock_client)

    # The methods should be replaced with wrappers
    # Calling get should still work and eventually call the original
    result = mock_client.get("/test/path")
    assert result.status_code == 200


def test_instrument_ragflow_client_none_is_noop():
    """instrument_ragflow_client(None) does not raise."""
    instrument_ragflow_client(None)


def test_instrument_ragflow_client_traces_with_contextvar(caplog):
    """Instrumented methods pick up trace_id from contextvar."""
    mock_client = MagicMock()
    mock_response = MagicMock(status_code=200)
    original_get = MagicMock(return_value=mock_response)
    mock_client.get = original_get

    instrument_ragflow_client(mock_client)

    token = current_trace_id.set("test-trace-99")
    try:
        with caplog.at_level(logging.INFO, logger="ims_mcp.tracing"):
            mock_client.get("/datasets")
        messages = [r.message for r in caplog.records]
        assert any("test-trace-99" in m for m in messages)
        assert any("/datasets" in m for m in messages)
    finally:
        current_trace_id.reset(token)
