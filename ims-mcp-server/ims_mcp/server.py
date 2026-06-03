"""Rosetta MCP V2 server assembly."""

from __future__ import annotations

import base64
import asyncio
import faulthandler
import logging
import os
import sys
import threading
import time
import traceback
import types
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from importlib import resources as pkg_resources
from typing import Annotated, Any, TYPE_CHECKING, TypeAlias, cast

from cachetools import TTLCache
from fastmcp import Context, FastMCP

if TYPE_CHECKING:
    from key_value.aio.protocols.key_value import AsyncKeyValue
from mcp.types import Icon
from pydantic import Field

from ims_mcp import __version__ as _MCP_VERSION
from ims_mcp.analytics.tracker import register_signal_handlers, set_runtime_config, track_tool_call
from ims_mcp.analytics.user_context import get_authenticated_identity, get_repository_from_context
from ims_mcp.auth import build_oauth_provider
from ims_mcp.clients.dataset import DatasetLookup
from ims_mcp.clients.doc_cache import InstructionDocCache
from ims_mcp.clients.document import DocumentClient
from ims_mcp.clients.ragflow import RagflowClient
from ims_mcp.config import RosettaConfig, parse_scopes
from ims_mcp.constants import (
    DOC_CACHE_TTL_SECONDS,
    ENV_ALLOWED_SCOPES,
    ENV_ROSETTA_MODE,
    SCOPE_ALLOW_WRITE_DATA,
    TAG_WRITE_DATA,
    TAG_MCP_SERVER_INSTRUCTIONS,
    TOOL_DISCOVER_PROJECTS,
    TOOL_GET_CONTEXT_INSTRUCTIONS,
    TOOL_LIST_INSTRUCTIONS,
    TOOL_PLAN_MANAGER,
    TOOL_QUERY_INSTRUCTIONS,
    TOOL_QUERY_PROJECT_CONTEXT,
    TOOL_STORE_PROJECT_CONTEXT,
    TOOL_SUBMIT_FEEDBACK,
    TRANSPORT_HTTP,
    TRANSPORT_STDIO,
)
from ims_mcp.tracing import _log_prefix as _log_prefix_fn
from ims_mcp.services.authorizer import Authorizer
from ims_mcp.context import CallContext
from ims_mcp.services.bundler import Bundler
from ims_mcp.services.feedback import FeedbackService
from ims_mcp.services.query_builder import QueryBuilder
from ims_mcp.tool_prompts import (
    PROMPT_DISCOVER_PROJECTS,
    PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD,
    PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT,
    PROMPT_LIST_INSTRUCTIONS,
    PROMPT_PLAN_MANAGER,
    PROMPT_QUERY_INSTRUCTIONS,
    PROMPT_QUERY_PROJECT_CONTEXT,
    PROMPT_SERVER_INSTRUCTIONS_HARD,
    PROMPT_SERVER_INSTRUCTIONS_SOFT,
    PROMPT_STORE_PROJECT_CONTEXT,
    PROMPT_SUBMIT_FEEDBACK,
)
from ims_mcp.tools.feedback import submit_feedback as submit_feedback_tool
from ims_mcp.tools.instructions import list_instructions as list_instructions_tool
from ims_mcp.tools.instructions import query_instructions as query_instructions_tool
from ims_mcp.tools.instructions import get_context_instructions as get_context_instructions_tool
from ims_mcp.tools.projects import (
    discover_projects as discover_projects_tool,
)
from ims_mcp.tools.projects import (
    query_project_context as query_project_context_tool,
)
from ims_mcp.tools.projects import (
    store_project_context as store_project_context_tool,
)
from ims_mcp.tools.resources import read_instruction_resource
from ims_mcp.tools.plan_manager import plan_manager_tool
from ims_mcp.services.plan_store import build_plan_store
from ims_mcp.tracing import get_request_trace_id, instrument_ragflow_client, traced_execution
from ims_mcp.typing_utils import JsonObject

AsyncStringFactory: TypeAlias = Callable[[], Awaitable[str]]

# MUST READ: docs/ARCHITECTURE.md, docs/CONTEXT.md, docs/SECURITY.md to understand the solution and how it works.

_CONFIG = RosettaConfig.from_env()
set_runtime_config(_CONFIG)
register_signal_handlers()

_logger = logging.getLogger("ims_mcp")
_MCP_VERSION_TEXT = str(_MCP_VERSION)

# IMS_DEBUG controls log level: DEBUG when set, INFO otherwise.
# Handler always attached so tracing output is visible in all modes.
_logger.setLevel(logging.DEBUG if _CONFIG.debug else logging.INFO)
if not _logger.handlers:
    _handler = logging.StreamHandler(sys.stderr)
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    _logger.addHandler(_handler)

# C4: wire MCP SDK transport loggers to the ims-mcp handler so transport/session
# crashes are visible in pod logs (they use the mcp.server.streamable_http* namespace).
for _transport_logger_name in ("mcp.server.streamable_http", "mcp.server.streamable_http_manager"):
    _transport_logger = logging.getLogger(_transport_logger_name)
    _transport_logger.setLevel(logging.DEBUG if _CONFIG.debug else logging.INFO)
    if not _transport_logger.handlers:
        _transport_logger.addHandler(_handler)
    _transport_logger.propagate = False

if _CONFIG.debug:
    _logger.debug("Rosetta v%s debug mode enabled", _MCP_VERSION_TEXT)

# A8: In-flight registry for the OS-thread watchdog.
# Populated on request-receive, removed on completion/disconnect.
# Guarded by a threading.Lock for cross-thread access (loop writes, watchdog thread reads).
_INFLIGHT_LOCK = threading.Lock()
_INFLIGHT_REGISTRY: dict[str, tuple[str, float]] = {}  # trace_id -> (path, start_monotonic)


def _register_inflight(trace_id: str, path: str) -> None:
    with _INFLIGHT_LOCK:
        _INFLIGHT_REGISTRY[trace_id] = (path, time.monotonic())


def _unregister_inflight(trace_id: str) -> None:
    with _INFLIGHT_LOCK:
        _INFLIGHT_REGISTRY.pop(trace_id, None)


def _watchdog_tick(now: float, threshold: float, already_dumped: set[str]) -> None:
    """Single watchdog poll tick — pure function, no sleeps, testable directly.

    Snapshots _INFLIGHT_REGISTRY under the lock, WARN-logs over-threshold
    entries, calls faulthandler.dump_traceback() once per stuck trace_id, and
    prunes already_dumped to remove completed requests (mutates in-place).
    """
    with _INFLIGHT_LOCK:
        snapshot = list(_INFLIGHT_REGISTRY.items())
        current_ids = {t for t, _ in snapshot}
    # Prune trace IDs that have since completed.
    already_dumped &= current_ids
    for trace_id, (path, started) in snapshot:
        elapsed = now - started
        if elapsed >= threshold:
            _logger.warning(
                "%s elapsed_s=%.1f path=%s",
                _log_prefix_fn("slow", "asgi", trace_id),
                elapsed,
                path,
            )
            # Dump all-thread stack traces once per stuck request.
            if trace_id not in already_dumped:
                faulthandler.dump_traceback()
                already_dumped.add(trace_id)


def _start_inflight_watchdog() -> None:
    """Start the OS-thread in-flight watchdog (A8, REQ-OBS-6).

    Uses a daemon threading.Thread — NOT an asyncio task — so it keeps running
    even when the event loop is frozen by a blocking sync call (GIL released
    during blocking socket I/O allows other threads to run).
    """
    # Deduplicate: if a thread with this name already exists, don't start another.
    for _t in threading.enumerate():
        if _t.name == "inflight-watchdog":
            return

    threshold = _CONFIG.inflight_warn_threshold
    interval = max(5, threshold // 6)

    def _watchdog_loop() -> None:
        # F5: track which trace_ids have already had a faulthandler dump so we
        # dump once per stuck request, not once per watchdog tick.
        already_dumped: set[str] = set()
        while True:
            time.sleep(interval)
            _watchdog_tick(time.monotonic(), threshold, already_dumped)

    t = threading.Thread(target=_watchdog_loop, name="inflight-watchdog", daemon=True)
    t.start()


def _install_process_exception_logging() -> None:
    """Install process-level exception logging hooks once."""
    if getattr(_install_process_exception_logging, "_installed", False):
        return

    original_excepthook = sys.excepthook

    def _excepthook(
        exc_type: type[BaseException], exc: BaseException, tb: types.TracebackType | None
    ) -> None:
        _logger.critical("Unhandled process exception", exc_info=(exc_type, exc, tb))
        original_excepthook(exc_type, exc, tb)

    sys.excepthook = _excepthook

    if hasattr(threading, "excepthook"):
        original_threading_excepthook = threading.excepthook

        def _threading_excepthook(args: threading.ExceptHookArgs) -> None:
            exc_info: tuple[type[BaseException], BaseException, types.TracebackType | None] | None = None
            if args.exc_type is not None and args.exc_value is not None:
                exc_info = (args.exc_type, args.exc_value, args.exc_traceback)
            _logger.critical(
                "Unhandled thread exception: thread=%s",
                getattr(args.thread, "name", "unknown"),
                exc_info=exc_info,
            )
            original_threading_excepthook(args)

        threading.excepthook = _threading_excepthook

    setattr(_install_process_exception_logging, "_installed", True)


def _install_loop_exception_logging(loop: asyncio.AbstractEventLoop) -> None:
    """Log asyncio background task exceptions that do not reach ASGI handlers."""

    def _handle_exception(loop: asyncio.AbstractEventLoop, context: dict[str, Any]) -> None:
        exc = context.get("exception")
        message = str(context.get("message") or "Unhandled asyncio exception")
        if exc:
            _logger.critical("%s", message, exc_info=(type(exc), exc, exc.__traceback__))
        else:
            _logger.critical("%s context=%r", message, context)

    loop.set_exception_handler(_handle_exception)


_install_process_exception_logging()


def _build_redis_store() -> AsyncKeyValue | None:
    """Return a shared RedisStore if REDIS_URL is configured, else None.

    A5 (DD-4): Append socket timeout query params to the URL when not already
    present so the redis.asyncio client has bounded connection deadlines.
    """
    if not _CONFIG.redis_url:
        return None
    try:
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
        parsed = urlparse(_CONFIG.redis_url)
        params = parse_qs(parsed.query, keep_blank_values=True)
        changed = False
        for param, value in (
            ("socket_timeout", str(_CONFIG.redis_socket_timeout)),
            ("socket_connect_timeout", str(_CONFIG.redis_socket_connect_timeout)),
            ("health_check_interval", str(_CONFIG.redis_health_check_interval)),
        ):
            if param not in params:
                params[param] = [value]
                changed = True
        redis_url = _CONFIG.redis_url
        if changed:
            new_query = urlencode({k: v[0] for k, v in params.items()})
            redis_url = urlunparse(parsed._replace(query=new_query))
        from key_value.aio.stores.redis import RedisStore
        return RedisStore(url=redis_url)
    except ImportError:
        _logger.debug("[ims-mcp] py-key-value-aio[redis] not installed; falling back to in-memory stores")
        return None
    except Exception as exc:
        _logger.warning("[ims-mcp] Failed to build Redis store with timeout params: %s", exc)
        # Fallback: build without timeout params rather than crash
        try:
            from key_value.aio.stores.redis import RedisStore
            return RedisStore(url=_CONFIG.redis_url)
        except ImportError:
            return None


_REDIS_STORE = _build_redis_store()
_PLAN_STORE = build_plan_store(_REDIS_STORE, _CONFIG.plan_ttl_days * 86400)


def _get_raw_redis_client(store: object) -> Any:
    """Return the underlying redis.asyncio.Redis client from a RedisStore.

    FernetEncryptionWrapper encrypts values only — keys are stored in plaintext,
    so SCAN by prefix and DELETE work directly on the raw client without decryption.
    """
    return store._client  # type: ignore[attr-defined]


def _build_oauth_client_storage() -> AsyncKeyValue | None:
    """Wrap Redis store with Fernet encryption if FERNET_KEY is set."""
    if _REDIS_STORE is None:
        return None
    if not _CONFIG.fernet_key:
        return _REDIS_STORE
    try:
        from cryptography.fernet import Fernet
        from key_value.aio.wrappers.encryption import FernetEncryptionWrapper
        return FernetEncryptionWrapper(
            key_value=_REDIS_STORE,
            fernet=Fernet(_CONFIG.fernet_key),
            raise_on_decryption_error=False,
        )
    except ImportError:
        _logger.debug("[ims-mcp] cryptography not installed; OAuth client_storage unencrypted")
        return _REDIS_STORE


_RAGFLOW = RagflowClient(_CONFIG).client if _CONFIG.api_key else None
instrument_ragflow_client(_RAGFLOW)
_DATASET_LOOKUP = DatasetLookup(_RAGFLOW) if _RAGFLOW else None
_DOCUMENT_CLIENT = DocumentClient()
_QUERY_BUILDER = QueryBuilder()
_BUNDLER = Bundler(_DOCUMENT_CLIENT)
_DOC_CACHE = InstructionDocCache(_DOCUMENT_CLIENT)
_FEEDBACK = FeedbackService()

# ── Tool-level response cache ─────────────────────────────────────
# Caches the final response string of read tools so that identical
# calls (same params + dataset version + server URL) skip RAGFlow
# entirely.  Errors are never cached.
#
# Key: tuple(config_fingerprint, tool_name, sorted_params)
# Value: response string
#
# Thread safety: TTLCache is not thread-safe, but all access happens
# on the asyncio event loop thread.  The worst-case race between
# concurrent .get() and []= for the same key is a harmless duplicate
# computation — no data corruption or loss is possible.
_TOOL_CACHE: TTLCache[tuple, str] = TTLCache(maxsize=256, ttl=DOC_CACHE_TTL_SECONDS)
_CONFIG_FINGERPRINT = (_CONFIG.server_url, _CONFIG.instruction_dataset)


def _tool_cache_key(tool_name: str, **params: object) -> tuple[Any, ...]:
    """Build a stable, hashable cache key from tool name and all inputs."""
    sorted_params = tuple(sorted(
        (k, tuple(v) if isinstance(v, list) else v)
        for k, v in params.items()
    ))
    return (_CONFIG_FINGERPRINT, tool_name, sorted_params)


_AUTHORIZER = Authorizer(_CONFIG.read_policy, _CONFIG.write_policy, config=_CONFIG)
_OAUTH_PROVIDER = build_oauth_provider(_CONFIG, client_storage=_build_oauth_client_storage())



def load_rosetta_icon() -> Icon | None:
    try:
        ref = pkg_resources.files("ims_mcp.resources").joinpath("rosetta-icon.png")
        icon_data = ref.read_bytes()
        data_uri = f"data:image/png;base64,{base64.b64encode(icon_data).decode('utf-8')}"
        return Icon(src=data_uri, mimeType="image/png", sizes=["160x160"])
    except Exception:
        return None


def _load_mcp_server_instructions() -> str:
    if not _RAGFLOW or not _DATASET_LOOKUP:
        return ""
    try:
        dataset_name = _CONFIG.instruction_dataset
        dataset_id = _DATASET_LOOKUP.get_id(dataset_name)
        if not dataset_id:
            return ""
        dataset = _DATASET_LOOKUP.get_dataset(name=dataset_name)
        if not dataset:
            return ""
        params = _QUERY_BUILDER.build_list_params(tags=[TAG_MCP_SERVER_INSTRUCTIONS])
        docs = _DOCUMENT_CLIENT.list_docs(
            dataset=dataset,
            page_size=1000,
            keywords=cast(str | None, params.get("keywords")),
            metadata_condition=cast(str | None, params.get("metadata_condition")),
        )
        return _BUNDLER.bundle(docs, dataset_name) if docs else ""
    except Exception as exc:
        _logger.debug(f"[ims-mcp] server instructions load failed: {exc}")
        return ""


# Intentionally not relied on: many IDE clients do not consistently inject
# server-level instructions into agent context.
#_MCP_SERVER_INSTRUCTIONS = _load_mcp_server_instructions()
_ROSETTA_ICON = load_rosetta_icon()


# Select prompt mode based on ROSETTA_MODE environment variable
# HARD is the default mode
_rosetta_mode = os.getenv(ENV_ROSETTA_MODE, "HARD").upper()

if _rosetta_mode == "SOFT":
    PROMPT_SERVER_INSTRUCTIONS = PROMPT_SERVER_INSTRUCTIONS_SOFT
    PROMPT_GET_CONTEXT_INSTRUCTIONS = PROMPT_GET_CONTEXT_INSTRUCTIONS_SOFT
else:
    # Default to HARD mode
    PROMPT_SERVER_INSTRUCTIONS = PROMPT_SERVER_INSTRUCTIONS_HARD
    PROMPT_GET_CONTEXT_INSTRUCTIONS = PROMPT_GET_CONTEXT_INSTRUCTIONS_HARD

@asynccontextmanager
async def _lifespan(app: object) -> AsyncIterator[None]:
    """Run schema migrations on startup, before serving requests."""
    if _REDIS_STORE is not None:
        from ims_mcp.migrations import RosettaMigrations
        migrations = RosettaMigrations(redis_client=_get_raw_redis_client(_REDIS_STORE))
        await migrations.run()
    yield


mcp = FastMCP(
    name="Rosetta",
    lifespan=_lifespan,
    # Server-level instructions are not relied on for prep/context because
    # many IDE clients do not consistently inject them into agent context.
    instructions=(
        f"Rosetta v{_MCP_VERSION_TEXT} is a centralized instruction and knowledge "
        "management system intentionally installed by the user for you to follow as a must."
        + PROMPT_SERVER_INSTRUCTIONS
    ),
    # instructions=_MCP_SERVER_INSTRUCTIONS,
    icons=[_ROSETTA_ICON] if _ROSETTA_ICON else [],
    session_state_store=_REDIS_STORE,
    auth=_OAUTH_PROVIDER,
)

# ── Health check state (D2) ───────────────────────────────────────
# Cache: (result_dict, monotonic_ts). Single-flight within TTL.
_HEALTHZ_CACHE: tuple[dict[str, Any], float] | None = None


@mcp.custom_route("/healthz", methods=["GET"])
async def _healthz_handler(request: Any) -> Any:
    """Unauthenticated /healthz endpoint (D1, DD-6, §4.2).

    Probes RAGFlow off-loop with a bounded timeout and returns cached results
    within ROSETTA_HEALTHZ_CACHE_TTL to prevent flapping (NFR-5).
    Body exposes ONLY status + dependency health — no secrets/version/traces.
    """
    import json as _json
    from starlette.responses import Response

    global _HEALTHZ_CACHE
    now = time.monotonic()

    # Return cached result within TTL.
    if _HEALTHZ_CACHE is not None:
        result, ts = _HEALTHZ_CACHE
        if (now - ts) < _CONFIG.healthz_cache_ttl:
            body = dict(result)
            body["cached"] = True
            return Response(
                content=_json.dumps(body),
                media_type="application/json",
                status_code=200 if result.get("status") == "ok" else 503,
            )

    # RAGFlow disabled: liveness-only response.
    if _RAGFLOW is None:
        result = {
            "status": "ok",
            "ragflow": "disabled",
            "cached": False,
            "checked_at": time.time(),
        }
        _HEALTHZ_CACHE = (result, now)
        return Response(content=_json.dumps(result), media_type="application/json", status_code=200)

    # Run the RAGFlow probe off-loop with a bounded timeout (NFR-5).
    checked_at = time.time()
    try:
        def _probe() -> None:
            _RAGFLOW.get("/datasets", params={"page": 1, "page_size": 1})

        await asyncio.wait_for(
            asyncio.to_thread(_probe),
            timeout=_CONFIG.healthz_ragflow_timeout,
        )
        result = {
            "status": "ok",
            "ragflow": "ok",
            "cached": False,
            "checked_at": checked_at,
        }
        _HEALTHZ_CACHE = (result, now)
        return Response(content=_json.dumps(result), media_type="application/json", status_code=200)
    except asyncio.TimeoutError:
        _logger.warning(
            "[ims-mcp] /healthz RAGFlow probe timed out after %ss",
            _CONFIG.healthz_ragflow_timeout,
        )
        result = {
            "status": "unhealthy",
            "ragflow": "timeout",
            "detail": "timeout",
            "cached": False,
            "checked_at": checked_at,
        }
        _HEALTHZ_CACHE = (result, now)
        return Response(content=_json.dumps(result), media_type="application/json", status_code=503)
    except Exception as exc:
        # F10: log full exc detail at WARNING (may contain internal URLs); expose
        # only a generic category in the response body to prevent info leakage.
        _logger.warning("[ims-mcp] /healthz RAGFlow probe failed: %s", exc, exc_info=True)
        result = {
            "status": "unhealthy",
            "ragflow": "error",
            "detail": "error",
            "cached": False,
            "checked_at": checked_at,
        }
        _HEALTHZ_CACHE = (result, now)
        return Response(content=_json.dumps(result), media_type="application/json", status_code=503)


# Write-data tools are permanently disabled (feature no longer used).
# The tool functions and their implementations are kept intact so we can
# re-enable them later if needed — only the @mcp.tool registrations are
# commented out below.
#
# Previously this block dynamically enabled/disabled write tools:
# if _CONFIG.transport == TRANSPORT_HTTP:
#     mcp.disable(tags={TAG_WRITE_DATA})
#     _logger.info("Write-data tools hidden by default (HTTP mode, revealed per-session via scopes)")
# elif SCOPE_ALLOW_WRITE_DATA not in _CONFIG.allowed_scopes:
#     mcp.disable(tags={TAG_WRITE_DATA})
#     _logger.info("Write-data tools disabled (STDIO mode, allow_write_data scope not present)")


async def _log(ctx: Context | None, level: str, message: str) -> None:
    if not ctx:
        return
    try:
        fn = getattr(ctx, level)
        await fn(message)
    except Exception:
        pass


def _resolve_user_email() -> str:
    """Return the authenticated user's email.

    HTTP mode: extracted from the OAuth access-token claims.
    STDIO mode (or when no token is available): falls back to
    ``ROSETTA_USER_EMAIL`` env var.
    """
    if _CONFIG.transport == TRANSPORT_HTTP:
        try:
            from fastmcp.server.dependencies import get_access_token
            token = get_access_token()
            if token and getattr(token, "claims", None):
                email = cast(str | None, token.claims.get("email"))
                if email:
                    return email
        except Exception:
            pass
    return _CONFIG.user_email

# ROSETTA_ALLOWED_SCOPES is not a security feature, it is only used to control tool visibility as OPT-IN mechanism.

def _resolve_allowed_scopes() -> tuple[str, ...]:
    if _CONFIG.transport == TRANSPORT_HTTP:
        try:
            from fastmcp.server.dependencies import get_http_headers

            # include_all keeps custom application headers such as ROSETTA_ALLOWED_SCOPES.
            headers = get_http_headers(include_all=True)
        except Exception:
            headers = {}
        return parse_scopes(headers.get(ENV_ALLOWED_SCOPES.lower()) or "")
    return _CONFIG.allowed_scopes


def _require_write_data_scope() -> str | None:
    allowed_scopes = _resolve_allowed_scopes()
    logging.getLogger("ims_mcp").info("Resolved allowed scopes: %s", list(allowed_scopes))
    if SCOPE_ALLOW_WRITE_DATA in allowed_scopes:
        return None
    return f"Error: this feature is not available for your user account!"


async def _build_call_context(tool_name: str, params: dict[str, Any], ctx: Context | None) -> CallContext:
    assert _RAGFLOW is not None
    assert _DATASET_LOOKUP is not None
    assert ctx is not None, "Context is required for building CallContext"
    _identity = get_authenticated_identity(ctx=ctx)
    return CallContext(
        config=_CONFIG,
        ragflow=_RAGFLOW,
        dataset_lookup=_DATASET_LOOKUP,
        ctx=ctx,
        username=_identity,
        repository=await get_repository_from_context(ctx),
        tool_name=tool_name,
        params=params,
        user_email=_identity,
        authorizer=_AUTHORIZER,
    )


def _validate_topic(topic: str | None) -> str | None:
    # >10 is intentional: AI will always add more words, gives extra word buffer
    if topic and len(topic.split()) > 10:
        return "Error: topic must be 10 words or less"
    return None


# This is required, as sometimes models hallucinate tags as single string, but we don't want tool contract to be different (as it causes more hallucinations)
def _normalize_tags(tags: list[str] | str | None) -> tuple[list[str] | None, str | None]:
    """Normalize single-string or list tag input for tool wrappers."""
    if tags is None:
        return None, None
    if isinstance(tags, str):
        normalized = tags.strip()
        if not normalized:
            return None, "Error: tags must not be empty"
        return [normalized], None
    if not isinstance(tags, list):
        return None, "Error: tags must be a string or list of strings"
    return (tags if tags else None), None


async def _retry_once(fn: AsyncStringFactory, *, operation: str = "ragflow_call") -> str:
    """Execute fn with one retry, wrapping each attempt in RAGFlow tracing."""
    trace_id = get_request_trace_id()
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            async with traced_execution(f"{operation} (attempt={attempt + 1})", trace_id=trace_id):
                return await fn()
        except Exception as exc:
            last_exc = exc
            if _RAGFLOW is None:
                break
    # A7: preserve exception cause chain (REQ-OBS-9)
    raise RuntimeError(str(last_exc) if last_exc is not None else "unknown error") from last_exc


@mcp.resource(
    "rosetta://{path*}",
    name="instructions",
    description="Read bundled instruction documents by resource path.",
    mime_type="text/plain",
)
async def _read_resource(path: str, ctx: Context | None = None) -> str:
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    cache_key = _tool_cache_key("resource_read", path=path)
    cached: str | None = _TOOL_CACHE.get(cache_key)
    if cached is not None:
        return cached

    call_ctx = await _build_call_context("resource_read", {"path": path}, ctx)
    trace_id = get_request_trace_id()
    async with traced_execution(f"resource_read path={path}", trace_id=trace_id):
        result = await read_instruction_resource(
            path=path,
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            bundler=_BUNDLER,
            doc_cache=_DOC_CACHE,
        )
    if result and not result.startswith("Error:"):
        _TOOL_CACHE[cache_key] = result
    return result


@mcp.tool(name=TOOL_GET_CONTEXT_INSTRUCTIONS, description=PROMPT_GET_CONTEXT_INSTRUCTIONS)
@track_tool_call
async def get_context_instructions(
    ctx: Context | None = None,
) -> str:
    # Write-data tool visibility is permanently disabled.
    # Previously this block revealed write_data tools per-session:
    # if (
    #     _CONFIG.transport == TRANSPORT_HTTP
    #     and ctx is not None
    #     and SCOPE_ALLOW_WRITE_DATA in _resolve_allowed_scopes()
    # ):
    #     await ctx.enable_components(tags={TAG_WRITE_DATA})
    #     await _log(ctx, "info", "Write-data tools enabled for this session (allow_write_data scope present)")

    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    cache_key = _tool_cache_key(TOOL_GET_CONTEXT_INSTRUCTIONS)
    cached: str | None = _TOOL_CACHE.get(cache_key)
    if cached is not None:
        return cached

    await _log(ctx, "info", "Loading context instructions")
    call_ctx = await _build_call_context(TOOL_GET_CONTEXT_INSTRUCTIONS, {}, ctx)
    result = await _retry_once(
        lambda: get_context_instructions_tool(
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            bundler=_BUNDLER,
            query_builder=_QUERY_BUILDER,
            doc_cache=_DOC_CACHE,
            topic=None, # no topic, as it creates too many results and noise
            include_frontmatter=False,
        ),
        operation="get_context_instructions",
    )
    if result and not result.startswith("Error:"):
        _TOOL_CACHE[cache_key] = result
    return result


@mcp.tool(name=TOOL_QUERY_INSTRUCTIONS, description=PROMPT_QUERY_INSTRUCTIONS)
@track_tool_call
async def query_instructions(
    query: Annotated[str | None, Field(description="Keyword search text for instruction documents.")] = None,
    tags: Annotated[list[str] | str | None, Field(description='Known files and families tags ("OR" logic). No JSON encoding.')] = None,
    ctx: Context | None = None,
) -> str:
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    normalized_tags, tags_err = _normalize_tags(tags)
    if tags_err:
        return tags_err

    cache_key = _tool_cache_key(TOOL_QUERY_INSTRUCTIONS, query=query, tags=normalized_tags)
    cached: str | None = _TOOL_CACHE.get(cache_key)
    if cached is not None:
        return cached

    await _log(ctx, "info", "Querying instructions")
    call_ctx = await _build_call_context(
        TOOL_QUERY_INSTRUCTIONS,
        {"query": query, "tags": normalized_tags},
        ctx,
    )
    result = await _retry_once(
        lambda: query_instructions_tool(
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            bundler=_BUNDLER,
            query_builder=_QUERY_BUILDER,
            query=query,
            tags=normalized_tags,
            topic=None, # no topic, as it creates too many results and noise
        ),
        operation="query_instructions",
    )
    if result and not result.startswith("Error:"):
        _TOOL_CACHE[cache_key] = result
    return result


@mcp.tool(name=TOOL_LIST_INSTRUCTIONS, description=PROMPT_LIST_INSTRUCTIONS)
@track_tool_call
async def list_instructions(
    full_path_from_root: Annotated[str, Field(description='Virtual folder path to list immediate children of (e.g. "skills", "rules", "skills/coding-agents-prompt-authoring"), or "all".')], # root
    format: Annotated[str | None, Field(description='Output format: "XML" (with tags and metadata) or "flat" (resource paths only).')] = None,
    ctx: Context | None = None,
) -> str:
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    cache_key = _tool_cache_key(TOOL_LIST_INSTRUCTIONS, full_path_from_root=full_path_from_root, format=format)
    cached: str | None = _TOOL_CACHE.get(cache_key)
    if cached is not None:
        return cached

    await _log(ctx, "info", f"Listing instructions at {full_path_from_root}")
    call_ctx = await _build_call_context(
        TOOL_LIST_INSTRUCTIONS,
        {"full_path_from_root": full_path_from_root, "format": format},
        ctx,
    )
    result = await _retry_once(
        lambda: list_instructions_tool(
            call_ctx=call_ctx,
            doc_cache=_DOC_CACHE,
            bundler=_BUNDLER,
            full_path_from_root=full_path_from_root,
            format=format,
        ),
        operation="list_instructions",
    )
    if result and not result.startswith("Error:"):
        _TOOL_CACHE[cache_key] = result
    return result


# ── Write-data tools ──────────────────────────────────────────────
# These tools are permanently disabled (feature no longer used).
# The @mcp.tool annotations are commented out so the tools are not
# registered with the MCP server.  All function bodies, imports, and
# logic are kept intact so we can re-enable them later if needed.
# To re-enable: uncomment the @mcp.tool and @track_tool_call lines.

# @mcp.tool(name=TOOL_SUBMIT_FEEDBACK, description=PROMPT_SUBMIT_FEEDBACK, tags={TAG_WRITE_DATA})
# @track_tool_call
async def submit_feedback(
    request_mode: Annotated[str, Field(description='Workflow classification. Examples: "coding.md", "help.md", "research.md", "aqa.md".')],
    feedback: Annotated[JsonObject, Field(description="Structured brief feedback payload.")],
    ctx: Context | None = None,
) -> str:

    scope_err = _require_write_data_scope()
    if scope_err:
        return scope_err
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"
    await _log(ctx, "info", "Submitting feedback")
    call_ctx = await _build_call_context(
        TOOL_SUBMIT_FEEDBACK,
        {"request_mode": request_mode, "feedback": feedback},
        ctx,
    )
    return await _retry_once(
        lambda: submit_feedback_tool(
            call_ctx=call_ctx,
            feedback_service=_FEEDBACK,
            request_mode=request_mode,
            feedback=feedback,
        ),
        operation="submit_feedback",
    )


# @mcp.tool(name=TOOL_QUERY_PROJECT_CONTEXT, description=PROMPT_QUERY_PROJECT_CONTEXT, tags={TAG_WRITE_DATA})
# @track_tool_call
async def query_project_context(
    repository_name: Annotated[str, Field(description="Project/workspace name.")],
    query: Annotated[str | None, Field(description="Keyword search text for project context documents.")] = None,
    tags: Annotated[list[str] | str | None, Field(description="Filter by context tags. Single tag string or array of tags.")] = None,
    ctx: Context | None = None,
) -> str:
    scope_err = _require_write_data_scope()
    if scope_err:
        return scope_err

    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    normalized_tags, tags_err = _normalize_tags(tags)
    if tags_err:
        return tags_err
    await _log(ctx, "info", f"Querying project context for {repository_name}")
    call_ctx = await _build_call_context(
        TOOL_QUERY_PROJECT_CONTEXT,
        {"repository_name": repository_name, "query": query, "tags": normalized_tags},
        ctx,
    )
    return await _retry_once(
        lambda: query_project_context_tool(
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            bundler=_BUNDLER,
            query_builder=_QUERY_BUILDER,
            repository_name=repository_name,
            query=query,
            tags=normalized_tags,
            topic=None, # no topic, as it creates too many results and noise
        ),
        operation="query_project_context",
    )


# @mcp.tool(name=TOOL_STORE_PROJECT_CONTEXT, description=PROMPT_STORE_PROJECT_CONTEXT, tags={TAG_WRITE_DATA})
# @track_tool_call
async def store_project_context(
    repository_name: Annotated[str, Field(description="Project/workspace name.")],
    document: Annotated[str, Field(description='Document name. Examples: "ARCHITECTURE.md"')],
    tags: Annotated[list[str] | str, Field(description='Tags to categorize the document. Single tag string or array of tags.')],
    content: Annotated[str, Field(description="The actual content of the document.")],
    force: Annotated[bool, Field(description="Do not force. Try to discover the repository first. If true, create repository dataset if it doesn't exist.")] = False,
    ctx: Context | None = None,
) -> str:
    scope_err = _require_write_data_scope()
    if scope_err:
        return scope_err

    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"
    normalized_tags, tags_err = _normalize_tags(tags)
    if tags_err:
        return tags_err
    normalized_tags = normalized_tags or []
    await _log(ctx, "info", f"Storing project context for {repository_name}")
    call_ctx = await _build_call_context(
        TOOL_STORE_PROJECT_CONTEXT,
        {
            "repository_name": repository_name,
            "document": document,
            "tags": normalized_tags,
            "force": force,
        },
        ctx,
    )
    return await _retry_once(
        lambda: store_project_context_tool(
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            repository_name=repository_name,
            document=document,
            tags=normalized_tags,
            content=content,
            force=force,
        ),
        operation="store_project_context",
    )


# @mcp.tool(name=TOOL_DISCOVER_PROJECTS, description=PROMPT_DISCOVER_PROJECTS, tags={TAG_WRITE_DATA})
# @track_tool_call
async def discover_projects(
    query: Annotated[str | None, Field(description="Optional search term to filter projects by name.")] = None,
    ctx: Context | None = None,
) -> str:
    scope_err = _require_write_data_scope()
    if scope_err:
        return scope_err

    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"
    await _log(ctx, "info", "Discovering project datasets")
    call_ctx = await _build_call_context(TOOL_DISCOVER_PROJECTS, {"query": query}, ctx)
    return await _retry_once(
        lambda: discover_projects_tool(call_ctx=call_ctx, query=query),
        operation="discover_projects",
    )


# @mcp.tool(name=TOOL_PLAN_MANAGER, description=PROMPT_PLAN_MANAGER, tags={TAG_WRITE_DATA})
# @track_tool_call
async def plan_manager(
    command: Annotated[str, Field(description="Command to execute.")],
    plan_name: Annotated[str, Field(description="Plan identifier string.")] = "",
    target_id: Annotated[str, Field(description='Target scope: "entire_plan" (default), or phase-id/step-id.')] = "entire_plan",
    data: Annotated[JsonObject | str | None, Field(description="RFC 7396 merge-patch payload for upsert. Accepts a JSON object or JSON-object string.")] = None,
    new_status: Annotated[str | None, Field(description="New status for update_status. open|in_progress|complete|blocked|failed.")] = None,
    limit: Annotated[int, Field(description="Max steps returned by next (0 = all).")] = 0,
    ctx: Context | None = None,
) -> str:
    scope_err = _require_write_data_scope()
    if scope_err:
        return scope_err
    await _log(ctx, "info", f"plan_manager command={command} plan={plan_name} target={target_id}")
    return await plan_manager_tool(
        command=command,
        plan_name=plan_name,
        target_id=target_id,
        data=data,
        new_status=new_status,
        limit=limit,
        store=_PLAN_STORE,
    )


class OriginValidationMiddleware:
    """ASGI middleware that validates the Origin header against an allowlist.

    Protects against DNS rebinding attacks. No-op when allowlist is empty.
    """

    def __init__(self, app: object, allowed_origins: list[str]) -> None:
        self.app = app
        self._allowed = set(allowed_origins)

    async def __call__(self, scope: dict[str, Any], receive: object, send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        if scope["type"] in {"http", "websocket"} and self._allowed:
            headers = {k.lower(): v for k, v in cast(list[tuple[bytes, bytes]], scope.get("headers", []))}
            origin = headers.get(b"origin", b"").decode()
            if origin and origin not in self._allowed:
                # C5: log origin block (REQ-OBS-7)
                client = cast(tuple[str, int] | None, scope.get("client"))
                client_host = client[0] if client else "-"
                path = str(scope.get("path") or "")
                _logger.warning(
                    "Origin rejected: origin=%s path=%s client=%s",
                    origin,
                    path,
                    client_host,
                )
                if scope["type"] == "http":
                    await send({"type": "http.response.start", "status": 403, "headers": []})
                    await send({"type": "http.response.body", "body": b"Forbidden", "more_body": False})
                    return
                await send({"type": "websocket.close", "code": 1008, "reason": "Forbidden"})
                return
        app = cast(
            Callable[[dict[str, Any], object, Callable[[dict[str, Any]], Awaitable[None]]], Awaitable[None]],
            self.app,
        )
        await app(scope, receive, send)


class RequestLoggingMiddleware:
    """ASGI middleware for earliest HTTP/WebSocket request and exception logs.

    Positioned as the OUTERMOST wrapper of mcp.http_app(...) (B1/DD-5) so it
    sees every request including those rejected by auth or origin checks.
    """

    def __init__(self, app: object) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: object, send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        scope_type = str(scope.get("type", "unknown"))
        if scope_type not in {"http", "websocket", "lifespan"}:
            await self._call_app(scope, receive, send)
            return

        if scope_type == "lifespan":
            await self._call_lifespan(scope, receive, send)
            return

        headers = {k.lower(): v for k, v in cast(list[tuple[bytes, bytes]], scope.get("headers", []))}
        trace_id = (
            self._decode_header(headers.get(b"x-request-id"))
            or self._decode_header(headers.get(b"x-trace-id"))
            or str(uuid.uuid4())
        )
        method = str(scope.get("method") or scope_type.upper())
        path = str(scope.get("path") or "")
        query_string = cast(bytes, scope.get("query_string", b""))
        client = cast(tuple[str, int] | None, scope.get("client"))
        client_host = client[0] if client else "-"
        user_agent = self._decode_header(headers.get(b"user-agent")) or "-"
        started = time.monotonic()
        response_started = False
        status_code: int | None = None
        sse_seq = 0
        is_sse_path = path.startswith("/mcp")

        query = self._decode_header(query_string) or ""
        # Security: redact query string for auth endpoints (OAuth callback carries code/state).
        logged_query = "<redacted>" if path.startswith("/auth") else query
        # REQ-OBS-1: earliest possible request log
        _logger.info(
            "%s method=%s path=%s query=%s client=%s user_agent=%s",
            _log_prefix_fn("received", "asgi", trace_id),
            method,
            path,
            logged_query,
            client_host,
            user_agent,
        )

        # A8/B3: register in-flight so the watchdog OS thread can observe it.
        _register_inflight(trace_id, path)

        async def _wrapped_receive() -> dict[str, Any]:
            """Wrap receive to detect client disconnects (REQ-OBS-4)."""
            msg = await cast(Callable[[], Awaitable[dict[str, Any]]], receive)()
            msg_type = msg.get("type")
            if msg_type in {"http.disconnect", "websocket.disconnect"}:
                elapsed_ms = (time.monotonic() - started) * 1000
                _logger.info(
                    "%s path=%s elapsed_ms=%.3f",
                    _log_prefix_fn("disconnect", "asgi", trace_id),
                    path,
                    elapsed_ms,
                )
                _unregister_inflight(trace_id)
            return msg

        async def _send(message: dict[str, Any]) -> None:
            nonlocal response_started, status_code, sse_seq
            message_type = message.get("type")

            # B4: SSE per-chunk logging (REQ-OBS-5)
            if message_type == "http.response.body" and is_sse_path:
                body = message.get("body", b"")
                more_body = message.get("more_body", False)
                if body:
                    sse_seq += 1
                    _logger.info(
                        "%s seq=%d bytes=%d",
                        _log_prefix_fn("sse", "asgi", trace_id),
                        sse_seq,
                        len(body),
                    )
                    if _logger.isEnabledFor(logging.DEBUG):
                        _logger.debug(
                            "%s payload=%r",
                            _log_prefix_fn("sse-payload", "asgi", trace_id),
                            body[:512],
                        )
                if not more_body:
                    # Final body chunk — log completion after send below.
                    pass

            # Perform the actual send FIRST, then update flags (B2: fix flag ordering).
            await send(message)

            # B2: set response_started AFTER successful send (REQ-OBS-2).
            if message_type == "http.response.start":
                response_started = True
                status_code = int(message.get("status", 0) or 0)
                _logger.info(
                    "%s status=%s",
                    _log_prefix_fn("response-start", "asgi", trace_id),
                    status_code,
                )
            elif message_type == "websocket.accept":
                response_started = True
                status_code = 101
            elif message_type == "websocket.close":
                status_code = int(message.get("code", 0) or 0)

            # B3: final body chunk = request completed (REQ-OBS-3).
            if message_type == "http.response.body" and not message.get("more_body", False):
                elapsed_ms = (time.monotonic() - started) * 1000
                _logger.info(
                    "%s method=%s path=%s status=%s elapsed_ms=%.3f",
                    _log_prefix_fn("completed", "asgi", trace_id),
                    method,
                    path,
                    status_code or "-",
                    elapsed_ms,
                )
                _unregister_inflight(trace_id)

        try:
            await self._call_app(scope, _wrapped_receive, _send)
        except Exception:
            elapsed_ms = (time.monotonic() - started) * 1000
            _logger.exception(
                "%s method=%s path=%s status=%s elapsed_ms=%.3f response_started=%s",
                _log_prefix_fn("failed", "asgi", trace_id),
                method,
                path,
                status_code or "-",
                elapsed_ms,
                response_started,
            )
            _unregister_inflight(trace_id)
            if response_started:
                raise
            if scope_type == "http":
                await send({
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [
                        (b"content-type", b"text/plain; charset=utf-8"),
                        (b"x-request-id", trace_id.encode("utf-8")),
                    ],
                })
                await send({
                    "type": "http.response.body",
                    "body": b"Internal Server Error",
                    "more_body": False,
                })
                return
            await send({"type": "websocket.close", "code": 1011, "reason": "Internal Server Error"})
            return

        # Fallback completion log for cases where no final body chunk was sent
        # (e.g. WebSocket, or app returned without sending body).
        if not response_started or status_code is None:
            elapsed_ms = (time.monotonic() - started) * 1000
            _logger.info(
                "%s method=%s path=%s status=%s elapsed_ms=%.3f",
                _log_prefix_fn("completed", "asgi", trace_id),
                method,
                path,
                status_code or "-",
                elapsed_ms,
            )
        _unregister_inflight(trace_id)

    async def _call_lifespan(self, scope: dict[str, Any], receive: object, send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        try:
            await self._call_app(scope, receive, send)
        except Exception:
            _logger.exception("Unhandled ASGI lifespan exception")
            raise

    async def _call_app(self, scope: dict[str, Any], receive: object, send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        app = cast(
            Callable[[dict[str, Any], object, Callable[[dict[str, Any]], Awaitable[None]]], Awaitable[None]],
            self.app,
        )
        await app(scope, receive, send)

    @staticmethod
    def _decode_header(value: bytes | None) -> str | None:
        if not value:
            return None
        return value.decode("latin-1", errors="replace")


async def _serve_http(server: object) -> None:
    loop = asyncio.get_running_loop()
    _install_loop_exception_logging(loop)
    await cast(Any, server).serve()


def main() -> None:
    if _CONFIG.transport == TRANSPORT_HTTP:
        import uvicorn
        from starlette.middleware import Middleware

        # A lot of security features are offloaded to the hosting environment: check SECURITY.md for more details.
        # There is no point to implement them here, as there are dedicated services for that.

        # B1 (DD-5): OriginValidationMiddleware stays INSIDE via the middleware= list;
        # RequestLoggingMiddleware is applied OUTSIDE as a wrapper of the returned app
        # so it sees every request including auth-rejected ones.
        inner_middleware: list[Middleware] = []
        if _CONFIG.allowed_origins:
            inner_middleware.append(Middleware(OriginValidationMiddleware, allowed_origins=_CONFIG.allowed_origins))

        from fastmcp.server.event_store import EventStore
        event_store: EventStore | None = None
        if _REDIS_STORE is not None:
            event_store = EventStore(storage=_REDIS_STORE, max_events_per_stream=100, ttl=3600)

            try:
                from fastmcp.server.middleware.caching import ResponseCachingMiddleware
                mcp.add_middleware(ResponseCachingMiddleware(
                    cache_storage=_REDIS_STORE,
                    list_tools_settings={"enabled": False},  # disabled: per-session visibility requires fresh list
                    list_resources_settings={"ttl": 300},
                    list_prompts_settings={"ttl": 3600},
                    read_resource_settings={"ttl": 300},
                    get_prompt_settings={"ttl": 300},
                    call_tool_settings={"enabled": False},
                ))
            except Exception as exc:
                _logger.debug(f"[ims-mcp] ResponseCachingMiddleware not available: {exc}")

        # B1: build inner app WITHOUT RequestLoggingMiddleware in the middleware= list.
        _inner_app = mcp.http_app(
            transport="http",
            stateless_http=False,
            middleware=inner_middleware,
            event_store=event_store,
            # Recommend 10s client reconnection delay to reduce SSE Conflict (409)
            # errors when clients drop and reconnect before server cleans up.
            retry_interval=10000,
        )
        # B1: wrap with RequestLoggingMiddleware as OUTERMOST layer (DD-5).
        app = RequestLoggingMiddleware(_inner_app)

        # A8: start the OS-thread in-flight watchdog before the event loop starts.
        _start_inflight_watchdog()

        config = uvicorn.Config(
            app,
            host=_CONFIG.http_host,
            port=_CONFIG.http_port,
            log_level="debug" if _CONFIG.debug else "info",
            timeout_graceful_shutdown=0,
            lifespan="on",
        )
        server = uvicorn.Server(config)
        asyncio.run(_serve_http(server))
    else:
        mcp.run(transport=TRANSPORT_STDIO)


if __name__ == "__main__":
    main()
