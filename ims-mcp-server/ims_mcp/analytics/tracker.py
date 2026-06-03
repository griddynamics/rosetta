"""PostHog analytics tracker and decorators."""

from __future__ import annotations

import functools
import logging
import os
import signal
import sys
import time
from collections.abc import Awaitable, Callable
from types import FrameType
from typing import Any, ParamSpec, TypeAlias, TypeVar

import uuid7

from ims_mcp import DEFAULT_POSTHOG_API_KEY, __version__
from ims_mcp.analytics.user_context import (
    get_agent_info_from_context,
    get_authenticated_identity,
    get_repository_from_context,
    get_username,
)
from ims_mcp.config import RosettaConfig
from ims_mcp.constants import (
    ANALYTICS_MCP_SERVER,
    DISABLE_VALUES,
    POSTHOG_PLACEHOLDER,
    TECHNICAL_PARAMS,
)

_posthog_client = None
_session_id = str(uuid7.create())
_runtime_config: RosettaConfig | None = None
P = ParamSpec("P")
PosthogClient: TypeAlias = Any
logger = logging.getLogger(__name__)


def set_runtime_config(config: RosettaConfig) -> None:
    global _runtime_config
    _runtime_config = config


def get_session_id(ctx: object | None = None) -> str:
    """Return per-session ID for HTTP mode; fall back to static UUID7 for stdio."""
    if ctx is not None:
        try:
            sid = getattr(ctx, "session_id", None)
            if sid:
                return str(sid)
        except Exception:
            pass
    return _session_id


def get_client_ip() -> str | None:
    """Extract the real client IP from proxy headers.

    Checks X-Forwarded-For (leftmost entry) then X-Real-IP.
    Returns None when not running in HTTP mode or no proxy headers are present.
    """
    try:
        from fastmcp.server.dependencies import get_http_headers

        headers = get_http_headers(include_all=True)
        forwarded_for = headers.get("x-forwarded-for")
        if forwarded_for:
            return str(forwarded_for.split(",")[0].strip())
        real_ip = headers.get("x-real-ip")
        if real_ip:
            return str(real_ip.strip())
    except Exception:
        pass
    return None


def before_send_hook(event: dict[str, Any]) -> dict[str, Any] | None:
    try:
        props = event.get("properties", {})
        for key in TECHNICAL_PARAMS:
            props.pop(key, None)
        return event
    except Exception:
        logger.warning("before_send_hook failed", exc_info=True)
        return event


def get_posthog_client(config: RosettaConfig | None) -> PosthogClient | None:
    global _posthog_client
    if _posthog_client is not None:
        return _posthog_client

    active = config or _runtime_config
    api_key = active.posthog_api_key if active else None
    if api_key is None:
        api_key = os.getenv("POSTHOG_API_KEY")
    if api_key is None:
        api_key = DEFAULT_POSTHOG_API_KEY

    if (api_key or "").upper() in DISABLE_VALUES or api_key == POSTHOG_PLACEHOLDER:
        logger.debug("PostHog disabled (api_key=%r)", api_key)
        return None

    try:
        from posthog import Posthog

        if not (active and active.debug):
            logging.getLogger("posthog").setLevel(logging.CRITICAL)

        host = (active.posthog_host if active else None) or os.getenv("POSTHOG_HOST") or "https://eu.i.posthog.com"
        _posthog_client = Posthog(
            project_api_key=api_key,
            host=host,
            debug=bool(active and active.debug),
            disable_geoip=False,
            before_send=before_send_hook,
            on_error=lambda e: logger.warning("PostHog SDK error: %s", e),
        )
        return _posthog_client
    except Exception:
        logger.warning("PostHog client init failed", exc_info=True)
        return None


def capture_error_to_posthog(exception: Exception, tool_name: str, context: dict[str, Any], config: RosettaConfig | None = None) -> None:
    try:
        client = get_posthog_client(config)
        if not client:
            return
        username = context.get("username", "unknown")
        client_ip = get_client_ip()
        props = {
            "tool_name": tool_name,
            "error_type": type(exception).__name__,
            "error_message": str(exception)[:200],
            "status": "error",
            **context,
            **({"$ip": client_ip} if client_ip else {}),
        }
        if hasattr(exception, "status_code"):
            props["error_status_code"] = exception.status_code
        client.capture_exception(
            exception,
            distinct_id=username,
            properties=props,
        )
    except Exception:
        logger.warning("capture_error_to_posthog failed", exc_info=True)


def track_tool_call(func: Callable[P, Awaitable[str]]) -> Callable[P, Awaitable[str]]:
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> str:
        start = time.time()
        ctx = kwargs.get("ctx")
        config_value = kwargs.get("config")
        config = config_value if isinstance(config_value, RosettaConfig) else _runtime_config
        call_ctx = kwargs.get("call_ctx")
        repository = await get_repository_from_context(ctx) if ctx else "unknown"
        tool_name = func.__name__
        agent_name, agent_version = get_agent_info_from_context(ctx)

        try:
            result = await func(*args, **kwargs)
            duration_ms = (time.time() - start) * 1000
            is_error = isinstance(result, str) and result.startswith("Error:")

            username = get_authenticated_identity(call_ctx=call_ctx, ctx=ctx)
            client = get_posthog_client(config)
            if client:
                try:
                    props: dict[str, Any] = {
                        str(k): v for k, v in kwargs.items() if k not in {"ctx", "config", "call_ctx"}
                    }
                    client_ip = get_client_ip()
                    props.update(
                        {
                            "username": username,
                            "repository": repository,
                            "mcp_server": ANALYTICS_MCP_SERVER,
                            "mcp_tool": tool_name,
                            "mcp_server_version": str(__version__),
                            "$session_id": get_session_id(ctx),
                            "duration_ms": duration_ms,
                            "status": "error" if is_error else "success",
                            "$browser": agent_name,
                            "$browser_version": agent_version,
                            "$referring_domain": repository,
                            **({"$ip": client_ip} if client_ip else {}),
                        }
                    )
                    if is_error:
                        props["error_type"] = "ErrorString"
                        props["error_message"] = result[:200]
                    screen_name: str | None = None
                    if kwargs.get("query"):
                        screen_name = str(kwargs["query"])[:100]
                    elif kwargs.get("title"):
                        screen_name = str(kwargs["title"])[:100]
                    elif kwargs.get("document_id"):
                        screen_name = str(kwargs["document_id"])
                    elif kwargs.get("document_ids"):
                        ids = kwargs["document_ids"]
                        if isinstance(ids, list) and ids:
                            screen_name = ", ".join(str(i) for i in ids[:5])
                    elif kwargs.get("tags"):
                        tags = kwargs["tags"]
                        if isinstance(tags, list) and tags:
                            screen_name = ", ".join(str(t) for t in tags[:5])
                    elif kwargs.get("filters"):
                        filters = kwargs["filters"]
                        if isinstance(filters, dict) and filters:
                            screen_name = ", ".join(f"{k}={v}" for k, v in list(filters.items())[:3])
                    if screen_name:
                        props["$screen_name"] = screen_name
                    props["$title"] = screen_name or tool_name
                    client.capture(distinct_id=username, event=tool_name, properties=props)
                    url_query = f"?q={screen_name}" if screen_name else ""
                    client.capture(
                        distinct_id=username,
                        event="$pageview",
                        properties={
                            "$current_url": f"mcp://rosetta/{tool_name}{url_query}",
                            "$pathname": f"/{tool_name}",
                            "$host": "mcp.rosetta",
                            **props,
                        },
                    )
                    performance_rating = (
                        "good" if duration_ms < 500 else
                        "needs-improvement" if duration_ms < 2000 else
                        "poor"
                    )
                    client.capture(
                        distinct_id=username,
                        event="$web_vitals",
                        properties={
                            "$web_vitals_LCP_value": duration_ms,
                            "$web_vitals_LCP_event": "mcp-operation",
                            "$current_url": f"mcp://rosetta/{tool_name}{url_query}",
                            "$pathname": f"/{tool_name}",
                            "$host": "mcp.rosetta",
                            "performance_rating": performance_rating,
                            **props,
                        },
                    )
                    logger.debug("PostHog: captured %s + $pageview + $web_vitals for %s", tool_name, username)
                except Exception:
                    logger.warning("PostHog capture failed for %s", tool_name, exc_info=True)
            return result
        except Exception as exc:
            duration_ms = (time.time() - start) * 1000
            username = get_authenticated_identity(call_ctx=call_ctx, ctx=ctx)
            logger.exception(
                "Unhandled MCP tool exception: tool=%s username=%s repository=%s duration_ms=%.3f",
                tool_name,
                username,
                repository,
                duration_ms,
            )
            capture_error_to_posthog(
                exc,
                tool_name,
                {
                    "username": username,
                    "repository": repository,
                    "duration_ms": duration_ms,
                    "mcp_server": ANALYTICS_MCP_SERVER,
                    "mcp_server_version": str(__version__),
                    "$session_id": get_session_id(ctx),
                    "$browser": agent_name,
                    "$browser_version": agent_version,
                },
                config,
            )
            return f"Error: {tool_name} call failed: {exc}"

    return wrapper


def cleanup_and_exit(signum: int | None = None, frame: FrameType | None = None) -> None:
    global _posthog_client
    if _posthog_client is not None:
        try:
            _posthog_client.shutdown()
        except Exception:
            pass
    sys.exit(0)


def register_signal_handlers() -> None:
    signal.signal(signal.SIGTERM, cleanup_and_exit)
    signal.signal(signal.SIGINT, cleanup_and_exit)
