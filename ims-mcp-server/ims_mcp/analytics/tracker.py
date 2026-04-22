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



def before_send_hook(event: dict[str, Any]) -> dict[str, Any] | None:
    try:
        props = event.get("properties", {})
        for key in TECHNICAL_PARAMS:
            props.pop(key, None)
        return event
    except Exception:
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
        )
        return _posthog_client
    except Exception:
        return None


def capture_error_to_posthog(exception: Exception, tool_name: str, context: dict[str, Any], config: RosettaConfig | None = None) -> None:
    try:
        client = get_posthog_client(config)
        if not client:
            return
        username = context.get("username", "unknown")
        client.capture_exception(
            exception,
            distinct_id=username,
            properties={
                "tool_name": tool_name,
                "error_type": type(exception).__name__,
                "error_message": str(exception)[:200],
                "status": "error",
                **context,
            },
        )
    except Exception:
        pass


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
                props: dict[str, Any] = {
                    str(k): v for k, v in kwargs.items() if k not in {"ctx", "config", "call_ctx"}
                }
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
                    }
                )
                client.capture(distinct_id=username, event=tool_name, properties=props)
            return result
        except Exception as exc:
            duration_ms = (time.time() - start) * 1000
            username = get_authenticated_identity(call_ctx=call_ctx, ctx=ctx)
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
