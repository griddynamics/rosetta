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
import os
import threading
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, TypeVar

_logger = logging.getLogger("ims_mcp.tracing")

SLOW_CALL_THRESHOLD_SECONDS = 5.0


def _get_ragflow_http_timeout() -> int:
    """Return the configured RAGFlow HTTP timeout (env-backed, no circular import)."""
    from ims_mcp.constants import DEFAULT_RAGFLOW_HTTP_TIMEOUT, ENV_RAGFLOW_HTTP_TIMEOUT
    raw = os.getenv(ENV_RAGFLOW_HTTP_TIMEOUT, "")
    try:
        val = int(raw.strip())
        return val if val > 0 else DEFAULT_RAGFLOW_HTTP_TIMEOUT
    except (ValueError, AttributeError):
        return DEFAULT_RAGFLOW_HTTP_TIMEOUT


def _get_tool_timeout() -> int:
    """Return the configured per-call tool timeout (env-backed, no circular import)."""
    from ims_mcp.constants import DEFAULT_TOOL_TIMEOUT, ENV_TOOL_TIMEOUT
    raw = os.getenv(ENV_TOOL_TIMEOUT, "")
    try:
        val = int(raw.strip())
        return val if val > 0 else DEFAULT_TOOL_TIMEOUT
    except (ValueError, AttributeError):
        return DEFAULT_TOOL_TIMEOUT


async def offload(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Offload a sync callable to a worker thread with a per-call timeout ceiling.

    ``asyncio.to_thread`` keeps the event loop live while the blocking call
    runs.  ``asyncio.wait_for`` bounds the wait so a stuck thread yields a
    logged ``TimeoutError`` rather than freezing the loop forever (DD-1/DD-2).

    contextvars (incl. ``current_trace_id``) are copied to the thread
    automatically by ``asyncio.to_thread``.
    """
    timeout = _get_tool_timeout()
    return await asyncio.wait_for(
        asyncio.to_thread(functools.partial(fn, *args, **kwargs)),
        timeout=timeout,
    )

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


def _log_prefix(event: str, layer: str, trace_id: str | None) -> str:
    base = f"[request-tracing] [request-tracing-{event}] [{layer}]"
    if trace_id:
        return f"{base} [trace={trace_id}]"
    return base


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
    _logger.info(
        "%s %s — started",
        _log_prefix("started", "mcp", trace_id),
        operation,
    )
    start = time.monotonic()

    slow_logged = False

    async def _slow_watchdog() -> None:
        nonlocal slow_logged
        await asyncio.sleep(SLOW_CALL_THRESHOLD_SECONDS)
        elapsed = time.monotonic() - start
        slow_logged = True
        _logger.error(
            "%s %s — SLOW: still running after %.1fs",
            _log_prefix("slow", "mcp", trace_id),
            operation,
            elapsed,
        )

    watchdog = asyncio.create_task(_slow_watchdog())
    try:
        yield
    except Exception as exc:
        elapsed = time.monotonic() - start
        _logger.error(
            "%s %s — failed after %.3fs: %s",
            _log_prefix("failed", "mcp", trace_id),
            operation,
            elapsed,
            exc,
            exc_info=True,
        )
        raise
    else:
        _logger.info(
            "%s %s — success",
            _log_prefix("success", "mcp", trace_id),
            operation,
        )
    finally:
        watchdog.cancel()
        try:
            await watchdog
        except asyncio.CancelledError:
            pass
        elapsed = time.monotonic() - start
        if slow_logged:
            _logger.warning(
                "%s %s — completed in %.3fs",
                _log_prefix("completed-slow", "mcp", trace_id),
                operation,
                elapsed,
            )
        else:
            _logger.info(
                "%s %s — completed in %.3fs",
                _log_prefix("completed", "mcp", trace_id),
                operation,
                elapsed,
            )
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
        label = f"{method_name.upper()} {path}"

        _logger.info(
            "%s %s — started",
            _log_prefix("started", "ragflow", trace_id),
            label,
        )
        start = time.monotonic()

        slow_fired = threading.Event()

        def _slow_timer() -> None:
            slow_fired.set()
            elapsed = time.monotonic() - start
            _logger.error(
                "%s %s — SLOW: still in-flight after %.1fs",
                _log_prefix("slow", "ragflow", trace_id),
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
            _logger.info(
                "%s %s — success",
                _log_prefix("success", "ragflow", trace_id),
                label,
            )
            if slow_fired.is_set():
                _logger.warning(
                    "%s %s — %s in %.3fs",
                    _log_prefix("completed-slow", "ragflow", trace_id),
                    label,
                    status,
                    elapsed,
                )
            else:
                _logger.info(
                    "%s %s — %s in %.3fs",
                    _log_prefix("completed", "ragflow", trace_id),
                    label,
                    status,
                    elapsed,
                )
            return result
        except Exception as exc:
            elapsed = time.monotonic() - start
            _logger.error(
                "%s %s — failed after %.3fs: %s",
                _log_prefix("failed", "ragflow", trace_id),
                label,
                elapsed,
                exc,
                exc_info=True,
            )
            raise
        finally:
            timer.cancel()

    return wrapper


_requests_session_patched = False


def _install_requests_timeout_patch() -> None:
    """Patch requests.sessions.Session.request once to inject a finite default timeout.

    RAGFlow SDK methods (get/post/put/delete/patch) call module-level requests.*
    functions which all route through requests.sessions.Session.request.  The SDK
    signatures do NOT accept a ``timeout`` kwarg, so it must be injected here at
    the transport layer — the single chokepoint for all sync requests-based HTTP.

    Blast radius: every requests.Session call in this process that does NOT pass
    an explicit ``timeout`` will receive the configured RAGFlow HTTP timeout as the
    default.  This bounds RAGFlow SDK calls *and* PostHog (also requests-based) with
    a finite timeout when neither passes one explicitly.  Callers that already pass
    ``timeout=N`` are unaffected (setdefault semantics).

    Idempotent: installs at most once per process via the ``_requests_session_patched``
    module-level guard.
    """
    global _requests_session_patched
    if _requests_session_patched:
        return

    import requests.sessions as _sessions

    _original_session_request = _sessions.Session.request

    @functools.wraps(_original_session_request)
    def _request_with_default_timeout(
        self: Any, method: str, url: str, **kwargs: Any
    ) -> Any:
        # Apply configured timeout only when the caller did not pass one.
        kwargs.setdefault("timeout", _get_ragflow_http_timeout())
        return _original_session_request(self, method, url, **kwargs)

    _sessions.Session.request = _request_with_default_timeout  # type: ignore[assignment]
    _requests_session_patched = True
    _logger.info(
        "%s requests.sessions.Session.request patched with default timeout=%ds",
        _log_prefix("init", "ragflow", None),
        _get_ragflow_http_timeout(),
    )


def instrument_ragflow_client(ragflow: Any) -> None:
    """Monkey-patch a RAGFlow instance to trace every HTTP call.

    Call once at startup after creating the RAGFlow client.
    Safe to call with ``None`` (no-op).

    Also installs a one-time patch on ``requests.sessions.Session.request``
    so that every requests-based HTTP call (RAGFlow SDK + PostHog) receives a
    finite default timeout when the caller does not supply one explicitly.
    The RAGFlow SDK methods (get/post/put/delete/patch) do NOT accept a
    ``timeout`` kwarg — injection must happen at the requests transport layer.
    """
    if ragflow is None:
        return
    # A2: enforce a finite default HTTP timeout at the requests transport layer.
    # Must be done before tracing wrappers so any direct requests call is also bounded.
    _install_requests_timeout_patch()
    for method_name in ("get", "post", "put", "delete", "patch"):
        original = getattr(ragflow, method_name, None)
        if original is not None:
            setattr(ragflow, method_name, _traced_http_method(original, method_name))
    _logger.info(
        "%s HTTP methods instrumented for tracing",
        _log_prefix("init", "ragflow", None),
    )
