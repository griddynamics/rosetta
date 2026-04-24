"""Execution timing and RAGFlow HTTP-level call tracing.

Two layers:

1. ``traced_execution`` — async context manager for timing any operation
   (tool call, resource read, etc.).  Sets the ``current_trace_id``
   contextvar so inner code can correlate logs.

2. ``instrument_ragflow_client`` — monkey-patches a ``RAGFlow`` instance's
   HTTP methods (``get``, ``post``, ``put``, ``delete``, ``patch``) so that
   every outgoing request is individually logged with URL, method, elapsed
   time, and a 5-second ``threading.Timer`` watchdog that fires ERROR while
   the request is still in-flight.  Works in both HTTP and STDIO modes.

``get_request_trace_id`` extracts ``X-Request-ID`` from incoming MCP HTTP
headers (GKE nginx ingress) for end-to-end correlation.
"""

from __future__ import annotations

import asyncio
import contextvars
import functools
import logging
import threading
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, TypeVar

_logger = logging.getLogger("ims_mcp.tracing")

SLOW_CALL_THRESHOLD_SECONDS = 5.0

T = TypeVar("T")

# ── Trace context propagation ─────────────────────────────────────
# Set by ``traced_execution``; read by ``_traced_http_method`` so
# per-HTTP-call logs include the MCP request trace ID.
current_trace_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_trace_id", default=None,
)


def get_request_trace_id() -> str | None:
    """Extract X-Request-ID from the current HTTP MCP request headers.

    GKE nginx ingress injects ``X-Request-ID`` for every request.
    Returns None when running in STDIO mode or when the header is absent.
    """
    try:
        from fastmcp.server.dependencies import get_http_headers
        headers = get_http_headers(include_all=True)
        return (
            headers.get("x-request-id")
            or headers.get("x-trace-id")
            or None
        )
    except Exception:
        return None


def _log_prefix(tag: str, trace_id: str | None) -> str:
    if trace_id:
        return f"[{tag}] [trace={trace_id}]"
    return f"[{tag}]"


# ── Layer 1: Outer execution timing ──────────────────────────────

@asynccontextmanager
async def traced_execution(operation: str, trace_id: str | None = None) -> AsyncIterator[None]:
    """Async context manager that times an operation and sets ``current_trace_id``.

    - Logs INFO at start and end (with elapsed time).
    - After ``SLOW_CALL_THRESHOLD_SECONDS`` (5 s), logs ERROR while the
      operation is still running — does NOT cancel it.
    - Populates ``current_trace_id`` so inner RAGFlow HTTP calls include
      the trace ID in their own log lines automatically.
    """
    token = current_trace_id.set(trace_id)
    prefix = _log_prefix("mcp", trace_id)
    _logger.info("%s %s — started", prefix, operation)
    start = time.monotonic()

    slow_logged = False

    async def _slow_watchdog() -> None:
        nonlocal slow_logged
        await asyncio.sleep(SLOW_CALL_THRESHOLD_SECONDS)
        elapsed = time.monotonic() - start
        slow_logged = True
        _logger.error(
            "%s %s — SLOW: still running after %.1fs",
            prefix,
            operation,
            elapsed,
        )

    watchdog = asyncio.create_task(_slow_watchdog())
    try:
        yield
    except Exception as exc:
        elapsed = time.monotonic() - start
        _logger.error("%s %s — failed after %.3fs: %s", prefix, operation, elapsed, exc)
        raise
    finally:
        watchdog.cancel()
        try:
            await watchdog
        except asyncio.CancelledError:
            pass
        elapsed = time.monotonic() - start
        level = logging.WARNING if slow_logged else logging.INFO
        _logger.log(level, "%s %s — completed in %.3fs", prefix, operation, elapsed)
        current_trace_id.reset(token)


async def run_traced(
    operation: str,
    fn: Callable[..., T],
    *args: Any,
    trace_id: str | None = None,
    **kwargs: Any,
) -> T:
    """Run a sync function inside a traced execution context.

    Wraps ``fn(*args, **kwargs)`` in ``asyncio.to_thread`` so the event
    loop stays free while the blocking call executes.
    """
    async with traced_execution(operation, trace_id=trace_id):
        return await asyncio.to_thread(functools.partial(fn, *args, **kwargs))


async def run_traced_async(
    operation: str,
    coro: Awaitable[T],
    trace_id: str | None = None,
) -> T:
    """Await an async coroutine inside a traced execution context."""
    async with traced_execution(operation, trace_id=trace_id):
        return await coro


# ── Layer 2: Per-HTTP-call RAGFlow instrumentation ────────────────

def _traced_http_method(
    original_method: Callable[..., Any],
    method_name: str,
) -> Callable[..., Any]:
    """Wrap a RAGFlow HTTP method (get/post/put/delete/patch).

    Logs every outgoing request with URL path, fires a 5 s
    ``threading.Timer`` ERROR if still in-flight, and logs the
    response status + elapsed time on completion.
    """

    @functools.wraps(original_method)
    def wrapper(path: str, *args: Any, **kwargs: Any) -> Any:
        trace_id = current_trace_id.get()
        prefix = _log_prefix("ragflow", trace_id)
        label = f"{method_name.upper()} {path}"

        _logger.info("%s %s — started", prefix, label)
        start = time.monotonic()

        slow_fired = threading.Event()

        def _slow_timer() -> None:
            slow_fired.set()
            elapsed = time.monotonic() - start
            _logger.error(
                "%s %s — SLOW: still in-flight after %.1fs",
                prefix,
                label,
                elapsed,
            )

        timer = threading.Timer(SLOW_CALL_THRESHOLD_SECONDS, _slow_timer)
        timer.daemon = True
        timer.start()

        try:
            result = original_method(path, *args, **kwargs)
            elapsed = time.monotonic() - start
            status = getattr(result, "status_code", "?")
            level = logging.WARNING if slow_fired.is_set() else logging.INFO
            _logger.log(
                level,
                "%s %s — %s in %.3fs",
                prefix,
                label,
                status,
                elapsed,
            )
            return result
        except Exception as exc:
            elapsed = time.monotonic() - start
            _logger.error(
                "%s %s — failed after %.3fs: %s",
                prefix,
                label,
                elapsed,
                exc,
            )
            raise
        finally:
            timer.cancel()

    return wrapper


def instrument_ragflow_client(ragflow: Any) -> None:
    """Monkey-patch a RAGFlow instance to trace every HTTP call.

    Call once at startup after creating the RAGFlow client.
    Safe to call with ``None`` (no-op).
    """
    if ragflow is None:
        return
    for method_name in ("get", "post", "put", "delete", "patch"):
        original = getattr(ragflow, method_name, None)
        if original is not None:
            setattr(ragflow, method_name, _traced_http_method(original, method_name))
    _logger.info("[ragflow] HTTP methods instrumented for tracing")
