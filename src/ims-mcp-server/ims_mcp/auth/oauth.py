"""OAuth provider builder for HTTP transports using FastMCP 3 OAuthProxy."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastmcp.server.auth import AuthProvider
    from key_value.aio.protocols.key_value import AsyncKeyValue
    from ims_mcp.config import RosettaConfig

from ims_mcp.auth.offline_refresh_fix import with_offline_refresh_fix
from ims_mcp.auth.loopback_redirect_fix import with_loopback_redirect_fix
from ims_mcp.constants import OAUTH_MODE_GITHUB, OAUTH_MODE_OAUTH, OAUTH_MODE_OIDC, TRANSPORT_HTTP


def build_oauth_provider(
    config: "RosettaConfig",
    client_storage: "AsyncKeyValue | None" = None,
) -> "AuthProvider | None":
    """Build a FastMCP auth provider for HTTP transports.

    Returns ``None`` when the transport is not HTTP or when required OAuth
    environment variables are missing.  In that case the server runs without
    authentication (STDIO mode uses ``ROSETTA_API_KEY`` directly).

    Env vars:
      ROSETTA_OAUTH_MODE             — "oauth" (default), "oidc", or "github"
      ROSETTA_OAUTH_OIDC_CONFIG_URL  — IdP OIDC discovery URL (mode=oidc only)
      ROSETTA_OAUTH_VALID_SCOPES     — space-separated valid scopes advertised in
                                       .well-known/oauth-authorization-server
                                       (e.g. "openid email offline_access").
                                       Only used in mode=oauth. None = FastMCP default.
      ROSETTA_OAUTH_REQUIRED_SCOPES  — space-separated scopes required on tokens.
                                       Passed to IntrospectionTokenVerifier (oauth mode)
                                       or OIDCProxy JWTVerifier (oidc mode).
      ROSETTA_OAUTH_EXTRA_SCOPES     — space-separated scopes forwarded to upstream
                                       IdP authorization endpoint via extra_authorize_params.
                                       Include "offline_access" to avoid daily re-auth. Optional.
      ROSETTA_JWT_SIGNING_KEY        — independent secret for signing FastMCP JWTs.
      ROSETTA_OAUTH_REVOCATION_ENDPOINT — upstream token revocation URL. Optional.
      FERNET_KEY                     — Fernet key for encrypting OAuth token storage in Redis.
    """
    if config.transport != TRANSPORT_HTTP:
        return None

    # Notes for security reviewers:
    # 1. MCP uses two-leg auth: Client (IDE) -> MCP (mcp internal tokens) -> IdP (upstream tokens). Upstream tokens are never exposed to the client.
    # 2. MCP uses DCR/CIMD and fully implements MCP Authentication specification.
    # 3. It is impossible to know in advance which redirect URI will be used by the client. Moreover, it is common practice to use http://localhost as the redirect URI.
    # 4. SECURITY.md contains recommendations for security features that are offloaded to the hosting environment.

    # Security by default: require authentication configuration!
    if not config.oauth_configured:
        raise ValueError("Rosetta HTTP mode requires OAuth configuration!")

    base_url = config.resolve_oauth_base_url()

    if config.oauth_mode == OAUTH_MODE_OIDC:
        from fastmcp.server.auth.oidc_proxy import OIDCProxy

        OIDCProxy = with_offline_refresh_fix(OIDCProxy)
        OIDCProxy = with_loopback_redirect_fix(OIDCProxy)
        extra_authorize_params: dict[str, str] | None = (
            {"scope": config.oauth_extra_scopes} if config.oauth_extra_scopes else None
        )

        return OIDCProxy(
            config_url=config.oauth_oidc_config_url,
            client_id=config.oauth_client_id,
            client_secret=config.oauth_client_secret,
            base_url=base_url,
            required_scopes=config.oauth_required_scopes,
            extra_authorize_params=extra_authorize_params,
            client_storage=client_storage,
            jwt_signing_key=config.oauth_jwt_signing_key,
            redirect_path=config.oauth_callback_path,
            require_authorization_consent=True,
            timeout_seconds=config.oauth_http_timeout,  # A6: bound OIDC config fetch
        )

    if config.oauth_mode == OAUTH_MODE_GITHUB:
        from fastmcp.server.auth.providers.github import GitHubProvider

        GitHubProvider = with_offline_refresh_fix(GitHubProvider)
        GitHubProvider = with_loopback_redirect_fix(GitHubProvider)

        return GitHubProvider(
            client_id=config.oauth_client_id,
            client_secret=config.oauth_client_secret,
            base_url=base_url,
            redirect_path=config.oauth_callback_path,
            required_scopes=config.oauth_required_scopes,
            client_storage=client_storage,
            jwt_signing_key=config.oauth_jwt_signing_key,
            require_authorization_consent=True,
            timeout_seconds=config.oauth_http_timeout,  # F11/A6: bound GitHub API calls
        )

    if config.oauth_mode not in {OAUTH_MODE_OAUTH, OAUTH_MODE_OIDC, OAUTH_MODE_GITHUB}:
        raise ValueError(
            f"Unknown ROSETTA_OAUTH_MODE={config.oauth_mode!r}. "
            "Supported: oauth, oidc, github."
        )

    # mode=oauth (default)
    from fastmcp.server.auth.oauth_proxy import OAuthProxy
    from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier

    OAuthProxy = with_offline_refresh_fix(OAuthProxy)
    OAuthProxy = with_loopback_redirect_fix(OAuthProxy)

    from ims_mcp.constants import INTROSPECTION_CACHE_TTL_SECONDS

    token_verifier = IntrospectionTokenVerifier(
        introspection_url=config.oauth_introspection_endpoint,
        client_id=config.oauth_client_id,
        client_secret=config.oauth_client_secret,
        cache_ttl_seconds=INTROSPECTION_CACHE_TTL_SECONDS,
        required_scopes=config.oauth_required_scopes,
        timeout_seconds=config.oauth_http_timeout,  # A6: explicit introspection timeout
    )

    # valid_scopes: advertised in .well-known/oauth-authorization-server
    # None = fall back to FastMCP default (token_verifier.required_scopes)
    valid_scopes: list[str] | None = (
        config.oauth_valid_scopes.split() if config.oauth_valid_scopes else None
    )
    # extra_authorize_params: forwarded to upstream IdP authorization endpoint
    extra_authorize_params_oauth: dict[str, str] | None = (
        {"scope": config.oauth_extra_scopes} if config.oauth_extra_scopes else None
    )

    return OAuthProxy(
        upstream_authorization_endpoint=config.oauth_authorization_endpoint,
        upstream_token_endpoint=config.oauth_token_endpoint,
        upstream_client_id=config.oauth_client_id,
        upstream_client_secret=config.oauth_client_secret,
        upstream_revocation_endpoint=config.oauth_revocation_endpoint or None,
        token_verifier=token_verifier,
        base_url=base_url,
        redirect_path=config.oauth_callback_path,
        require_authorization_consent=True,
        client_storage=client_storage,
        valid_scopes=valid_scopes,
        extra_authorize_params=extra_authorize_params_oauth,
        jwt_signing_key=config.oauth_jwt_signing_key,
        enable_cimd=True,
    )
