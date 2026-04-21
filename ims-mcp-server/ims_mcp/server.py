"""Rosetta MCP V2 server assembly."""

from __future__ import annotations

import base64
import logging
import os
import sys
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from importlib import resources as pkg_resources
from typing import Annotated, Any, TYPE_CHECKING, TypeAlias, cast

from fastmcp import Context, FastMCP

if TYPE_CHECKING:
    from key_value.aio.protocols.key_value import AsyncKeyValue
from mcp.types import Icon
from pydantic import Field

from ims_mcp import __version__ as _MCP_VERSION
from ims_mcp.analytics.tracker import register_signal_handlers, set_runtime_config, track_tool_call
from ims_mcp.analytics.user_context import get_repository_from_context, get_username
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
from ims_mcp.typing_utils import JsonObject

AsyncStringFactory: TypeAlias = Callable[[], Awaitable[str]]

# MUST READ: docs/ARCHITECTURE.md, docs/CONTEXT.md, docs/SECURITY.md to understand the solution and how it works.

_CONFIG = RosettaConfig.from_env()
set_runtime_config(_CONFIG)
register_signal_handlers()

_logger = logging.getLogger("ims_mcp")
_MCP_VERSION_TEXT = str(_MCP_VERSION)

if _CONFIG.debug:
    _logger.setLevel(logging.DEBUG)
    if _CONFIG.transport == TRANSPORT_STDIO:
        _handler = logging.StreamHandler(sys.stderr)
        _logger.addHandler(_handler)
    _logger.debug("Rosetta v%s debug mode enabled", _MCP_VERSION_TEXT)


def _build_redis_store() -> AsyncKeyValue | None:
    """Return a shared RedisStore if REDIS_URL is configured, else None."""
    if not _CONFIG.redis_url:
        return None
    try:
        from key_value.aio.stores.redis import RedisStore
        return RedisStore(url=_CONFIG.redis_url)
    except ImportError:
        _logger.debug("[ims-mcp] py-key-value-aio[redis] not installed; falling back to in-memory stores")
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
_DATASET_LOOKUP = DatasetLookup(_RAGFLOW) if _RAGFLOW else None
_DOCUMENT_CLIENT = DocumentClient()
_QUERY_BUILDER = QueryBuilder()
_BUNDLER = Bundler(_DOCUMENT_CLIENT)
_DOC_CACHE = InstructionDocCache(_DOCUMENT_CLIENT)
_FEEDBACK = FeedbackService()
_CONTEXT_INSTRUCTIONS_CACHE: str | None = None
_CONTEXT_INSTRUCTIONS_CACHE_TIME: float = 0.0
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
        dataset = _RAGFLOW.get_dataset(name=dataset_name)
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


def _is_context_instructions_stale() -> bool:
    """Check if context instructions cache is stale (older than TTL)."""
    if _CONTEXT_INSTRUCTIONS_CACHE is None:
        return True
    return (time.time() - _CONTEXT_INSTRUCTIONS_CACHE_TIME) > DOC_CACHE_TTL_SECONDS


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

# Write-data tool visibility:
# - HTTP: hide by default, reveal per-session in get_context_instructions
#   based on OAuth token scopes.
# - STDIO: single user — decide once at startup from env var.
if _CONFIG.transport == TRANSPORT_HTTP:
    mcp.disable(tags={TAG_WRITE_DATA})
    _logger.info("Write-data tools hidden by default (HTTP mode, revealed per-session via scopes)")
elif SCOPE_ALLOW_WRITE_DATA not in _CONFIG.allowed_scopes:
    mcp.disable(tags={TAG_WRITE_DATA})
    _logger.info("Write-data tools disabled (STDIO mode, allow_write_data scope not present)")


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
    return CallContext(
        config=_CONFIG,
        ragflow=_RAGFLOW,
        dataset_lookup=_DATASET_LOOKUP,
        ctx=ctx,
        username=get_username(),
        repository=await get_repository_from_context(ctx),
        tool_name=tool_name,
        params=params,
        user_email=_resolve_user_email(),
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


async def _retry_once(fn: AsyncStringFactory) -> str:
    last_exc: Exception | None = None
    for _ in range(2):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
            if _RAGFLOW is None:
                break
    raise RuntimeError(str(last_exc) if last_exc is not None else "unknown error")


@mcp.resource(
    "rosetta://{path*}",
    name="instructions",
    description="Read bundled instruction documents by resource path.",
    mime_type="text/plain",
)
async def _read_resource(path: str, ctx: Context | None = None) -> str:
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"
    call_ctx = await _build_call_context("resource_read", {"path": path}, ctx)
    return await read_instruction_resource(
        path=path,
        call_ctx=call_ctx,
        document_client=_DOCUMENT_CLIENT,
        bundler=_BUNDLER,
        doc_cache=_DOC_CACHE,
    )


@mcp.tool(name=TOOL_GET_CONTEXT_INSTRUCTIONS, description=PROMPT_GET_CONTEXT_INSTRUCTIONS)
@track_tool_call
async def get_context_instructions(
    ctx: Context | None = None,
) -> str:
    # HTTP only: reveal write_data tools for this session if the user
    # has the scope.  STDIO visibility is decided once at startup.
    if (
        _CONFIG.transport == TRANSPORT_HTTP
        and ctx is not None
        and SCOPE_ALLOW_WRITE_DATA in _resolve_allowed_scopes()
    ):
        await ctx.enable_components(tags={TAG_WRITE_DATA})
        await _log(ctx, "info", "Write-data tools enabled for this session (allow_write_data scope present)")

    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    global _CONTEXT_INSTRUCTIONS_CACHE, _CONTEXT_INSTRUCTIONS_CACHE_TIME
    if not _is_context_instructions_stale():
        assert _CONTEXT_INSTRUCTIONS_CACHE is not None
        return _CONTEXT_INSTRUCTIONS_CACHE

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
        )
    )
    if result and not result.startswith("Error:"):
        _CONTEXT_INSTRUCTIONS_CACHE = result
        _CONTEXT_INSTRUCTIONS_CACHE_TIME = time.time()
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
    await _log(ctx, "info", "Querying instructions")
    call_ctx = await _build_call_context(
        TOOL_QUERY_INSTRUCTIONS,
        {"query": query, "tags": normalized_tags},
        ctx,
    )
    return await _retry_once(
        lambda: query_instructions_tool(
            call_ctx=call_ctx,
            document_client=_DOCUMENT_CLIENT,
            bundler=_BUNDLER,
            query_builder=_QUERY_BUILDER,
            query=query,
            tags=normalized_tags,
            topic=None, # no topic, as it creates too many results and noise
        )
    )


@mcp.tool(name=TOOL_LIST_INSTRUCTIONS, description=PROMPT_LIST_INSTRUCTIONS)
@track_tool_call
async def list_instructions(
    full_path_from_root: Annotated[str, Field(description='Virtual folder path to list immediate children of (e.g. "skills", "rules", "skills/coding-agents-prompt-authoring"), or "all".')], # root
    format: Annotated[str | None, Field(description='Output format: "XML" (with tags and metadata) or "flat" (resource paths only).')] = None,
    ctx: Context | None = None,
) -> str:
    if not _RAGFLOW:
        return "Error: ROSETTA_API_KEY is required"

    await _log(ctx, "info", f"Listing instructions at {full_path_from_root}")
    call_ctx = await _build_call_context(
        TOOL_LIST_INSTRUCTIONS,
        {"full_path_from_root": full_path_from_root, "format": format},
        ctx,
    )
    return await _retry_once(
        lambda: list_instructions_tool(
            call_ctx=call_ctx,
            doc_cache=_DOC_CACHE,
            bundler=_BUNDLER,
            full_path_from_root=full_path_from_root,
            format=format,
        )
    )


@mcp.tool(name=TOOL_SUBMIT_FEEDBACK, description=PROMPT_SUBMIT_FEEDBACK, tags={TAG_WRITE_DATA})
@track_tool_call
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
        )
    )


@mcp.tool(name=TOOL_QUERY_PROJECT_CONTEXT, description=PROMPT_QUERY_PROJECT_CONTEXT, tags={TAG_WRITE_DATA})
@track_tool_call
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
        )
    )


@mcp.tool(name=TOOL_STORE_PROJECT_CONTEXT, description=PROMPT_STORE_PROJECT_CONTEXT, tags={TAG_WRITE_DATA})
@track_tool_call
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
        )
    )


@mcp.tool(name=TOOL_DISCOVER_PROJECTS, description=PROMPT_DISCOVER_PROJECTS, tags={TAG_WRITE_DATA})
@track_tool_call
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
    return await _retry_once(lambda: discover_projects_tool(call_ctx=call_ctx, query=query))


@mcp.tool(name=TOOL_PLAN_MANAGER, description=PROMPT_PLAN_MANAGER, tags={TAG_WRITE_DATA})
@track_tool_call
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


def main() -> None:
    if _CONFIG.transport == TRANSPORT_HTTP:
        import uvicorn
        from starlette.middleware import Middleware

        # A lot of security features are offloaded to the hosting environment: check SECURITY.md for more details.
        # There is no point to implement them here, as there are dedicated services for that.

        middleware: list[Middleware] = []
        if _CONFIG.allowed_origins:
            middleware.append(Middleware(OriginValidationMiddleware, allowed_origins=_CONFIG.allowed_origins))

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

        app = mcp.http_app(
            transport="http",
            stateless_http=False,
            middleware=middleware,
            event_store=event_store,
        )

        config = uvicorn.Config(
            app,
            host=_CONFIG.http_host,
            port=_CONFIG.http_port,
            log_level="debug" if _CONFIG.debug else "info",
            timeout_graceful_shutdown=0,
            lifespan="on",
        )
        server = uvicorn.Server(config)

        import asyncio
        asyncio.run(server.serve())
    else:
        mcp.run(transport=TRANSPORT_STDIO)


if __name__ == "__main__":
    main()
