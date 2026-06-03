"""Environment-backed configuration for Rosetta MCP."""

from __future__ import annotations

import json
import os
from base64 import b64encode
from dataclasses import dataclass, replace
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ims_mcp.constants import (
    DEFAULT_HTTP_HOST,
    DEFAULT_HTTP_PORT,
    DEFAULT_OAUTH_CALLBACK_PATH,
    DEFAULT_PLAN_TTL_DAYS,
    DEFAULT_POSTHOG_HOST,
    DEFAULT_READ_POLICY,
    DEFAULT_SERVER_PUBLIC_KEY_PEM,
    DEFAULT_SERVER_URL,
    DEFAULT_USER_EMAIL,
    DEFAULT_VERSION,
    DEFAULT_WRITE_POLICY,
    ENV_LEGACY_R2R_API_BASE,
    ENV_LEGACY_R2R_EMAIL,
    ENV_LEGACY_R2R_PASSWORD,
    ENV_ALLOWED_ORIGINS,
    ENV_ALLOWED_SCOPES,
    ENV_FERNET_KEY,
    ENV_HTTP_HOST,
    ENV_HTTP_PORT,
    ENV_IMS_DEBUG,
    ENV_INSTRUCTION_ROOT_FILTER,
    ENV_INVITE_EMAILS,
    ENV_OAUTH_AUTHORIZATION_ENDPOINT,
    ENV_OAUTH_BASE_URL,
    ENV_OAUTH_CALLBACK_PATH,
    ENV_OAUTH_CLIENT_ID,
    ENV_OAUTH_CLIENT_SECRET,
    ENV_OAUTH_INTROSPECTION_ENDPOINT,
    ENV_OAUTH_JWT_SIGNING_KEY,
    ENV_OAUTH_REVOCATION_ENDPOINT,
    ENV_OAUTH_EXTRA_SCOPES,
    ENV_OAUTH_MODE,
    ENV_OAUTH_OIDC_CONFIG_URL,
    ENV_OAUTH_REQUIRED_SCOPES,
    ENV_OAUTH_SCOPE,
    ENV_OAUTH_TOKEN_ENDPOINT,
    OAUTH_MODE_GITHUB,
    OAUTH_MODE_OAUTH,
    OAUTH_MODE_OIDC,
    ENV_PLAN_TTL_DAYS,
    ENV_POSTHOG_API_KEY,
    ENV_POSTHOG_HOST,
    ENV_READ_POLICY,
    ENV_REDIS_URL,
    ENV_ROSETTA_API_KEY,
    ENV_ROSETTA_SERVER_URL,
    ENV_TRANSPORT,
    ENV_USER_EMAIL,
    ENV_VERSION,
    ENV_WRITE_POLICY,
    INSTRUCTION_DATASET_TEMPLATE,
    TRANSPORT_HTTP,
    TRANSPORT_STDIO,
    VALID_POLICIES,
    # Observability + timeout knobs
    DEFAULT_RAGFLOW_HTTP_TIMEOUT,
    DEFAULT_TOOL_TIMEOUT,
    DEFAULT_REDIS_SOCKET_TIMEOUT,
    DEFAULT_REDIS_SOCKET_CONNECT_TIMEOUT,
    DEFAULT_REDIS_HEALTH_CHECK_INTERVAL,
    DEFAULT_INFLIGHT_WARN_THRESHOLD,
    DEFAULT_HEALTHZ_RAGFLOW_TIMEOUT,
    DEFAULT_HEALTHZ_CACHE_TTL,
    DEFAULT_OAUTH_HTTP_TIMEOUT,
    ENV_RAGFLOW_HTTP_TIMEOUT,
    ENV_TOOL_TIMEOUT,
    ENV_REDIS_SOCKET_TIMEOUT,
    ENV_REDIS_SOCKET_CONNECT_TIMEOUT,
    ENV_REDIS_HEALTH_CHECK_INTERVAL,
    ENV_INFLIGHT_WARN_THRESHOLD,
    ENV_HEALTHZ_RAGFLOW_TIMEOUT,
    ENV_HEALTHZ_CACHE_TTL,
    ENV_OAUTH_HTTP_TIMEOUT,
)


def _parse_int(value: str, default: int) -> int:
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return default


def _parse_port(value: str, default: int) -> int:
    parsed = _parse_int(value, default)
    if 1 <= parsed <= 65535:
        return parsed
    return default


def _normalize_transport(value: str) -> str:
    normalized = value.lower().strip()
    if normalized in {TRANSPORT_STDIO, TRANSPORT_HTTP}:
        return normalized
    return TRANSPORT_STDIO


def _normalize_callback_path(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return DEFAULT_OAUTH_CALLBACK_PATH
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return normalized


def parse_scopes(value: str) -> tuple[str, ...]:
    scopes: list[str] = []
    seen: set[str] = set()
    for raw_scope in value.replace(",", " ").split():
        scope = raw_scope.strip()
        if scope and scope not in seen:
            seen.add(scope)
            scopes.append(scope)
    return tuple(scopes)


def _has_non_empty_env(name: str) -> bool:
    return bool((os.getenv(name) or "").strip())


def _derive_rosetta_url_from_r2r(r2r_api_base: str) -> str:
    """Derive Rosetta server URL from legacy R2R_API_BASE.

    Replaces the subdomain (everything before the first dot) with 'ims'.
    E.g. https://ims-r2r-dev.example.com/ -> https://ims.example.com/
    If the hostname has no dots, returns the URL as-is.
    """
    from urllib.parse import urlparse, urlunparse

    parsed = urlparse(r2r_api_base)
    hostname = parsed.hostname or ""
    dot_idx = hostname.find(".")
    if dot_idx < 0:
        return r2r_api_base
    new_hostname = "ims" + hostname[dot_idx:]
    # Reconstruct netloc preserving port if present
    port = parsed.port
    new_netloc = f"{new_hostname}:{port}" if port else new_hostname
    return urlunparse(parsed._replace(netloc=new_netloc))


def _legacy_compatibility_requested() -> bool:
    return all(
        _has_non_empty_env(name)
        for name in (ENV_LEGACY_R2R_API_BASE, ENV_LEGACY_R2R_EMAIL, ENV_LEGACY_R2R_PASSWORD)
    )


def _encrypt_legacy_password(raw_password: str) -> str:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
    except ModuleNotFoundError as exc:
        raise ValueError(
            "Legacy compatibility mode requires the 'cryptography' package to encrypt the RAGFlow password"
        ) from exc

    public_key = serialization.load_pem_public_key(DEFAULT_SERVER_PUBLIC_KEY_PEM.encode("utf-8"))
    if not isinstance(public_key, RSAPublicKey):
        raise ValueError("Default server public key must be an RSA public key")
    encrypted = public_key.encrypt(b64encode(raw_password.encode("utf-8")), padding.PKCS1v15())
    return b64encode(encrypted).decode("utf-8")


def _build_request(
    url: str,
    *,
    method: str,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
) -> Request:
    request_headers = dict(headers or {})
    data: bytes | None = None
    if payload is not None:
        request_headers.setdefault("Content-Type", "application/json")
        data = json.dumps(payload).encode("utf-8")
    return Request(url=url, data=data, headers=request_headers, method=method)


def _extract_response_message(body: dict[str, Any], fallback: str) -> str:
    message = body.get("message")
    if isinstance(message, str) and message.strip():
        return message.strip()
    return fallback


def _load_response(request: Request) -> tuple[dict[str, Any], Any]:
    try:
        with urlopen(request, timeout=60) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            raw_body = response.read().decode(charset)
            payload = json.loads(raw_body) if raw_body else {}
            if not isinstance(payload, dict):
                raise ValueError("legacy compatibility request returned a non-object JSON payload")
            return payload, response.headers
    except HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed_body = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError:
            parsed_body = {}
        message = raw_body.strip() or str(exc.reason)
        if isinstance(parsed_body, dict):
            message = _extract_response_message(parsed_body, message)
        raise ValueError(f"Legacy compatibility request failed: {message}") from exc
    except URLError as exc:
        raise ValueError(f"Legacy compatibility request failed: {exc.reason}") from exc


def _require_success(body: dict[str, Any], *, action: str) -> None:
    if body.get("code") == 0:
        return
    message = _extract_response_message(body, "unexpected response")
    raise ValueError(f"Legacy compatibility {action} failed: {message}")


def _extract_legacy_token(payload: Any) -> str:
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                token = item.get("token")
                if isinstance(token, str) and token.strip():
                    return token.strip()
        return ""
    if isinstance(payload, dict):
        token = payload.get("token")
        if isinstance(token, str):
            return token.strip()
    return ""


def _resolve_legacy_api_key(*, base_url: str, email: str, password: str) -> str:
    login_request = _build_request(
        f"{base_url}/v1/user/login",
        method="POST",
        payload={"email": email, "password": _encrypt_legacy_password(password)},
    )
    login_body, login_headers = _load_response(login_request)
    _require_success(login_body, action="login")

    auth_header = login_headers.get("Authorization")
    if not auth_header:
        raise ValueError("Legacy compatibility login failed: missing Authorization header")

    auth_headers = {"Authorization": auth_header}
    token_list_request = _build_request(
        f"{base_url}/v1/system/token_list",
        method="GET",
        headers=auth_headers,
    )
    token_list_body, _ = _load_response(token_list_request)
    _require_success(token_list_body, action="token lookup")

    api_key = _extract_legacy_token(token_list_body.get("data"))
    if api_key:
        return api_key

    new_token_request = _build_request(
        f"{base_url}/v1/system/new_token",
        method="POST",
        headers=auth_headers,
        payload={},
    )
    new_token_body, _ = _load_response(new_token_request)
    _require_success(new_token_body, action="token creation")

    api_key = _extract_legacy_token(new_token_body.get("data"))
    if api_key:
        return api_key

    raise ValueError("Legacy compatibility token creation failed: missing token in response")


@dataclass(frozen=True)
class RosettaConfig:
    server_url: str
    version: str
    api_key: str
    posthog_api_key: str
    posthog_host: str
    debug: bool
    root_filter: list[str]
    transport: str
    http_host: str
    http_port: int
    redis_url: str | None
    fernet_key: str | None
    allowed_origins: list[str]
    # OAuth (HTTP transports only)
    oauth_authorization_endpoint: str
    oauth_token_endpoint: str
    oauth_introspection_endpoint: str
    oauth_client_id: str
    oauth_client_secret: str
    oauth_base_url: str
    oauth_callback_path: str
    oauth_valid_scopes: str
    oauth_extra_scopes: str
    oauth_revocation_endpoint: str
    oauth_jwt_signing_key: str | None
    oauth_mode: str
    oauth_oidc_config_url: str
    oauth_required_scopes: list[str] | None
    # Authorization policies
    read_policy: str
    write_policy: str
    user_email: str
    invite_emails: list[str]
    # Plan manager
    plan_ttl_days: int
    # Observability + timeout knobs (A1)
    ragflow_http_timeout: int = DEFAULT_RAGFLOW_HTTP_TIMEOUT
    tool_timeout: int = DEFAULT_TOOL_TIMEOUT
    redis_socket_timeout: int = DEFAULT_REDIS_SOCKET_TIMEOUT
    redis_socket_connect_timeout: int = DEFAULT_REDIS_SOCKET_CONNECT_TIMEOUT
    redis_health_check_interval: int = DEFAULT_REDIS_HEALTH_CHECK_INTERVAL
    inflight_warn_threshold: int = DEFAULT_INFLIGHT_WARN_THRESHOLD
    healthz_ragflow_timeout: int = DEFAULT_HEALTHZ_RAGFLOW_TIMEOUT
    healthz_cache_ttl: int = DEFAULT_HEALTHZ_CACHE_TTL
    oauth_http_timeout: int = DEFAULT_OAUTH_HTTP_TIMEOUT
    allowed_scopes: tuple[str, ...] = ()
    # Set to True when running in legacy compatibility mode (STDIO + R2R credentials).
    compatibility_mode: bool = False

    @classmethod
    def from_env(cls) -> "RosettaConfig":
        raw_debug = os.getenv(ENV_IMS_DEBUG, "")
        raw_filter = os.getenv(ENV_INSTRUCTION_ROOT_FILTER, "")
        root_filter = [item.strip().lower() for item in raw_filter.split(",") if item.strip()]

        http_port = _parse_port(os.getenv(ENV_HTTP_PORT, ""), DEFAULT_HTTP_PORT)

        raw_origins = os.getenv(ENV_ALLOWED_ORIGINS, "")
        allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

        raw_invite = os.getenv(ENV_INVITE_EMAILS, "")
        invite_emails = [e.strip() for e in raw_invite.split(",") if e.strip()]

        read_policy = os.getenv(ENV_READ_POLICY, DEFAULT_READ_POLICY).lower().strip() or DEFAULT_READ_POLICY
        write_policy = os.getenv(ENV_WRITE_POLICY, DEFAULT_WRITE_POLICY).lower().strip() or DEFAULT_WRITE_POLICY
        if read_policy not in VALID_POLICIES:
            read_policy = DEFAULT_READ_POLICY
        if write_policy not in VALID_POLICIES:
            write_policy = DEFAULT_WRITE_POLICY

        config = cls(
            server_url=os.getenv(ENV_ROSETTA_SERVER_URL, DEFAULT_SERVER_URL).rstrip("/"),
            version=os.getenv(ENV_VERSION, DEFAULT_VERSION).strip() or DEFAULT_VERSION,
            api_key=os.getenv(ENV_ROSETTA_API_KEY, "").strip(),
            posthog_api_key=os.getenv(ENV_POSTHOG_API_KEY, ""),
            posthog_host=os.getenv(ENV_POSTHOG_HOST, DEFAULT_POSTHOG_HOST).strip() or DEFAULT_POSTHOG_HOST,
            debug=raw_debug.lower() in {"1", "true", "yes", "on"},
            root_filter=root_filter,
            transport=_normalize_transport(os.getenv(ENV_TRANSPORT, TRANSPORT_STDIO)),
            http_host=os.getenv(ENV_HTTP_HOST, DEFAULT_HTTP_HOST).strip() or DEFAULT_HTTP_HOST,
            http_port=http_port,
            redis_url=os.getenv(ENV_REDIS_URL, "").strip() or None,
            fernet_key=os.getenv(ENV_FERNET_KEY, "").strip() or None,
            allowed_origins=allowed_origins,
            allowed_scopes=parse_scopes(os.getenv(ENV_ALLOWED_SCOPES, "")),
            oauth_authorization_endpoint=os.getenv(ENV_OAUTH_AUTHORIZATION_ENDPOINT, "").strip(),
            oauth_token_endpoint=os.getenv(ENV_OAUTH_TOKEN_ENDPOINT, "").strip(),
            oauth_introspection_endpoint=os.getenv(ENV_OAUTH_INTROSPECTION_ENDPOINT, "").strip(),
            oauth_client_id=os.getenv(ENV_OAUTH_CLIENT_ID, "").strip(),
            oauth_client_secret=os.getenv(ENV_OAUTH_CLIENT_SECRET, "").strip(),
            oauth_base_url=os.getenv(ENV_OAUTH_BASE_URL, "").strip(),
            oauth_callback_path=_normalize_callback_path(
                os.getenv(ENV_OAUTH_CALLBACK_PATH, DEFAULT_OAUTH_CALLBACK_PATH)
            ),
            oauth_valid_scopes=os.getenv(ENV_OAUTH_SCOPE, "").strip(),
            oauth_extra_scopes=os.getenv(ENV_OAUTH_EXTRA_SCOPES, "").strip(),
            oauth_mode=os.getenv(ENV_OAUTH_MODE, OAUTH_MODE_OAUTH).lower().strip(),
            oauth_oidc_config_url=os.getenv(ENV_OAUTH_OIDC_CONFIG_URL, "").strip(),
            oauth_required_scopes=[
                s.strip() for s in os.getenv(ENV_OAUTH_REQUIRED_SCOPES, "").split()
                if s.strip()
            ] or None,
            oauth_revocation_endpoint=os.getenv(ENV_OAUTH_REVOCATION_ENDPOINT, "").strip(),
            oauth_jwt_signing_key=os.getenv(ENV_OAUTH_JWT_SIGNING_KEY, "").strip() or None,
            read_policy=read_policy,
            write_policy=write_policy,
            user_email=os.getenv(ENV_USER_EMAIL, DEFAULT_USER_EMAIL).strip() or DEFAULT_USER_EMAIL,
            invite_emails=invite_emails,
            plan_ttl_days=_parse_int(os.getenv(ENV_PLAN_TTL_DAYS, ""), DEFAULT_PLAN_TTL_DAYS),
            # Observability + timeout knobs (A1)
            ragflow_http_timeout=_parse_int(
                os.getenv(ENV_RAGFLOW_HTTP_TIMEOUT, ""), DEFAULT_RAGFLOW_HTTP_TIMEOUT
            ),
            tool_timeout=_parse_int(os.getenv(ENV_TOOL_TIMEOUT, ""), DEFAULT_TOOL_TIMEOUT),
            redis_socket_timeout=_parse_int(
                os.getenv(ENV_REDIS_SOCKET_TIMEOUT, ""), DEFAULT_REDIS_SOCKET_TIMEOUT
            ),
            redis_socket_connect_timeout=_parse_int(
                os.getenv(ENV_REDIS_SOCKET_CONNECT_TIMEOUT, ""),
                DEFAULT_REDIS_SOCKET_CONNECT_TIMEOUT,
            ),
            redis_health_check_interval=_parse_int(
                os.getenv(ENV_REDIS_HEALTH_CHECK_INTERVAL, ""),
                DEFAULT_REDIS_HEALTH_CHECK_INTERVAL,
            ),
            inflight_warn_threshold=_parse_int(
                os.getenv(ENV_INFLIGHT_WARN_THRESHOLD, ""), DEFAULT_INFLIGHT_WARN_THRESHOLD
            ),
            healthz_ragflow_timeout=_parse_int(
                os.getenv(ENV_HEALTHZ_RAGFLOW_TIMEOUT, ""), DEFAULT_HEALTHZ_RAGFLOW_TIMEOUT
            ),
            healthz_cache_ttl=_parse_int(
                os.getenv(ENV_HEALTHZ_CACHE_TTL, ""), DEFAULT_HEALTHZ_CACHE_TTL
            ),
            oauth_http_timeout=_parse_int(
                os.getenv(ENV_OAUTH_HTTP_TIMEOUT, ""), DEFAULT_OAUTH_HTTP_TIMEOUT
            ),
        )
        if (
            config.transport == TRANSPORT_STDIO
            and not config.api_key
            and _legacy_compatibility_requested()
        ):
            r2r_base = (os.getenv(ENV_LEGACY_R2R_API_BASE) or "").strip()
            derived_url = _derive_rosetta_url_from_r2r(r2r_base)
            return config.init_legacy_compatibility_mode(
                base_url=derived_url.rstrip("/"),
            )
        return config

    def init_legacy_compatibility_mode(self, *, base_url: str) -> "RosettaConfig":
        email = (os.getenv(ENV_LEGACY_R2R_EMAIL) or "").strip()
        password = os.getenv(ENV_LEGACY_R2R_PASSWORD) or ""
        api_key = _resolve_legacy_api_key(base_url=base_url, email=email, password=password)
        return replace(
            self,
            server_url=base_url,
            user_email=email,
            api_key=api_key,
            compatibility_mode=True,
        )

    @property
    def instruction_dataset(self) -> str:
        return INSTRUCTION_DATASET_TEMPLATE.format(version=self.version)

    @property
    def oauth_configured(self) -> bool:
        """True when all required OAuth fields are set.

        ``oauth_base_url`` is checked for all modes so misconfigured
        deployments fail fast with a clear error instead of crashing
        inside the provider constructor.
        """
        base = bool(self.oauth_client_id and self.oauth_client_secret and self.oauth_base_url)
        if self.oauth_mode == OAUTH_MODE_OIDC:
            return base and bool(self.oauth_oidc_config_url)
        if self.oauth_mode == OAUTH_MODE_GITHUB:
            return base
        return base and bool(
            self.oauth_authorization_endpoint
            and self.oauth_token_endpoint
            and self.oauth_introspection_endpoint
        )

    def resolve_oauth_base_url(self) -> str:
        """Return the public base URL for OAuth callbacks."""
        if self.oauth_base_url:
            return self.oauth_base_url.rstrip("/")
        return f"http://{self.http_host}:{self.http_port}"
