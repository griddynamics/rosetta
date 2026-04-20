"""Unit tests for the OAuth provider builder."""

import pytest
from unittest.mock import patch

from ims_mcp.auth.oauth import build_oauth_provider
from ims_mcp.config import RosettaConfig


def _make_config(**overrides) -> RosettaConfig:
    defaults = dict(
        server_url="http://localhost:80",
        version="r1",
        api_key="test-key",
        posthog_api_key="",
        posthog_host="https://eu.i.posthog.com",
        debug=False,
        root_filter=[],
        transport="stdio",
        http_host="0.0.0.0",
        http_port=8000,
        redis_url=None,
        fernet_key=None,
        allowed_origins=[],
        oauth_authorization_endpoint="",
        oauth_token_endpoint="",
        oauth_introspection_endpoint="",
        oauth_client_id="",
        oauth_client_secret="",
        oauth_base_url="",
        oauth_callback_path="/auth/callback",
        oauth_valid_scopes="",
        oauth_extra_scopes="",
        oauth_revocation_endpoint="",
        oauth_jwt_signing_key=None,
        oauth_mode="oauth",
        oauth_oidc_config_url="",
        oauth_required_scopes=None,
        read_policy="all",
        write_policy="all",
        user_email="rosetta@example.com",
        invite_emails=[],
        plan_ttl_days=5,
    )
    defaults.update(overrides)
    return RosettaConfig(**defaults)


def test_returns_none_for_stdio():
    cfg = _make_config(transport="stdio")
    assert build_oauth_provider(cfg) is None


def test_raises_when_oauth_incomplete():
    cfg = _make_config(
        transport="http",
        oauth_authorization_endpoint="https://kc.example.com/auth",
        # missing token/introspection/client_id/client_secret
    )
    with pytest.raises(ValueError, match="requires OAuth configuration"):
        build_oauth_provider(cfg)


def test_raises_when_all_empty():
    cfg = _make_config(transport="http")
    with pytest.raises(ValueError, match="requires OAuth configuration"):
        build_oauth_provider(cfg)


def test_returns_provider_when_fully_configured():
    cfg = _make_config(
        transport="http",
        oauth_authorization_endpoint="https://kc.example.com/auth",
        oauth_token_endpoint="https://kc.example.com/token",
        oauth_introspection_endpoint="https://kc.example.com/introspect",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="https://rosetta.example.com",
    )
    provider = build_oauth_provider(cfg)
    assert provider is not None


def test_oauth_configured_property():
    cfg = _make_config(
        oauth_authorization_endpoint="https://kc/auth",
        oauth_token_endpoint="https://kc/token",
        oauth_introspection_endpoint="https://kc/introspect",
        oauth_client_id="cid",
        oauth_client_secret="csec",
        oauth_base_url="https://rosetta.example.com",
    )
    assert cfg.oauth_configured is True

    cfg2 = _make_config()
    assert cfg2.oauth_configured is False


def test_resolve_oauth_base_url_from_env():
    cfg = _make_config(oauth_base_url="https://rosetta.example.com/")
    assert cfg.resolve_oauth_base_url() == "https://rosetta.example.com"


def test_resolve_oauth_base_url_from_host_port():
    cfg = _make_config(http_host="0.0.0.0", http_port=9000)
    assert cfg.resolve_oauth_base_url() == "http://0.0.0.0:9000"


def test_uses_callback_path_from_config():
    cfg = _make_config(
        transport="http",
        oauth_authorization_endpoint="https://kc.example.com/auth",
        oauth_token_endpoint="https://kc.example.com/token",
        oauth_introspection_endpoint="https://kc.example.com/introspect",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="https://rosetta.example.com",
        oauth_callback_path="oauth/cb",
    )
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert getattr(provider, "_redirect_path", None) == "/oauth/cb"


def _make_full_http_config(**overrides):
    return _make_config(
        transport="http",
        oauth_authorization_endpoint="https://kc.example.com/auth",
        oauth_token_endpoint="https://kc.example.com/token",
        oauth_introspection_endpoint="https://kc.example.com/introspect",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="https://rosetta.example.com",
        **overrides,
    )


def test_extra_authorize_params_set_when_extra_scopes_configured():
    cfg = _make_full_http_config(oauth_extra_scopes="openid email offline_access")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    params = getattr(provider, "_extra_authorize_params", {})
    assert params.get("scope") == "openid email offline_access"


def test_extra_authorize_params_empty_when_extra_scopes_empty():
    cfg = _make_full_http_config(oauth_extra_scopes="")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    params = getattr(provider, "_extra_authorize_params", {})
    assert "scope" not in params


def test_valid_scopes_none_when_scope_empty():
    """When ROSETTA_OAUTH_VALID_SCOPES is empty, valid_scopes falls back to FastMCP default."""
    cfg = _make_full_http_config(oauth_valid_scopes="")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    # valid_scopes=None → FastMCP uses token_verifier.required_scopes
    reg_opts = getattr(provider, "client_registration_options", None)
    assert reg_opts is not None
    # IntrospectionTokenVerifier has no required_scopes, so valid_scopes is empty
    assert reg_opts.valid_scopes == []


def test_valid_scopes_advertised_when_scope_configured():
    """valid_scopes must be set so .well-known advertises scopes_supported."""
    cfg = _make_full_http_config(oauth_valid_scopes="openid profile")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    reg_opts = getattr(provider, "client_registration_options", None)
    assert reg_opts is not None
    assert reg_opts.valid_scopes == ["openid", "profile"]


def test_valid_scopes_and_extra_scopes_independent():
    """valid_scopes and extra_authorize_params are driven by separate env vars."""
    cfg = _make_full_http_config(
        oauth_valid_scopes="openid profile email",
        oauth_extra_scopes="openid offline_access",
    )
    provider = build_oauth_provider(cfg)
    assert provider is not None
    reg_opts = getattr(provider, "client_registration_options", None)
    assert reg_opts is not None
    assert reg_opts.valid_scopes == ["openid", "profile", "email"]
    params = getattr(provider, "_extra_authorize_params", {})
    assert params.get("scope") == "openid offline_access"


def test_revocation_endpoint_passed_when_set():
    cfg = _make_full_http_config(oauth_revocation_endpoint="https://kc.example.com/revoke")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert getattr(provider, "_upstream_revocation_endpoint", None) == "https://kc.example.com/revoke"


def test_revocation_endpoint_none_when_empty():
    cfg = _make_full_http_config(oauth_revocation_endpoint="")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert getattr(provider, "_upstream_revocation_endpoint", None) is None


def test_jwt_signing_key_passed_when_set():
    cfg = _make_full_http_config(oauth_jwt_signing_key="my-independent-secret-key-32chars!!")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    # Key is stored as bytes after derivation; presence is sufficient
    assert getattr(provider, "_jwt_signing_key", None) is not None


def test_jwt_signing_key_derived_from_secret_when_unset():
    cfg_no_key = _make_full_http_config(oauth_jwt_signing_key=None)
    cfg_with_key = _make_full_http_config(oauth_jwt_signing_key="explicit-key")
    p1 = build_oauth_provider(cfg_no_key)
    p2 = build_oauth_provider(cfg_with_key)
    # Keys should differ when explicitly provided vs derived
    assert p1._jwt_signing_key != p2._jwt_signing_key


def test_introspection_verifier_used():
    from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier
    cfg = _make_full_http_config()
    provider = build_oauth_provider(cfg)
    assert provider is not None
    verifier = getattr(provider, "_token_validator", None)
    assert isinstance(verifier, IntrospectionTokenVerifier)


# ---------------------------------------------------------------------------
# Config tests — mode, OIDC, required_scopes, env var rename
# ---------------------------------------------------------------------------

def test_oauth_mode_defaults_to_oauth():
    cfg = _make_config()
    assert cfg.oauth_mode == "oauth"


def test_oauth_configured_oidc_mode():
    cfg = _make_config(
        oauth_mode="oidc",
        oauth_oidc_config_url="https://idp.example.com/.well-known/openid-configuration",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="https://rosetta.example.com",
    )
    assert cfg.oauth_configured is True


def test_oauth_configured_oidc_missing_config_url():
    cfg = _make_config(
        oauth_mode="oidc",
        oauth_oidc_config_url="",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
    )
    assert cfg.oauth_configured is False


def test_oauth_valid_scopes_env_rename(monkeypatch):
    """Config reads from ROSETTA_OAUTH_VALID_SCOPES (not old ROSETTA_OAUTH_SCOPE)."""
    monkeypatch.setenv("ROSETTA_OAUTH_VALID_SCOPES", "openid email")
    monkeypatch.delenv("ROSETTA_OAUTH_SCOPE", raising=False)
    cfg = RosettaConfig.from_env()
    assert cfg.oauth_valid_scopes == "openid email"


def test_required_scopes_parsed(monkeypatch):
    monkeypatch.setenv("ROSETTA_OAUTH_REQUIRED_SCOPES", "offline_access openid")
    cfg = RosettaConfig.from_env()
    assert cfg.oauth_required_scopes == ["offline_access", "openid"]


def test_required_scopes_empty(monkeypatch):
    monkeypatch.setenv("ROSETTA_OAUTH_REQUIRED_SCOPES", "")
    cfg = RosettaConfig.from_env()
    assert cfg.oauth_required_scopes is None


# ---------------------------------------------------------------------------
# OAuth provider builder tests — OIDC mode
# ---------------------------------------------------------------------------

def _make_oidc_config(**overrides):
    """Return a config suitable for OIDC mode (discovery URL mocked at build time)."""
    defaults = dict(
        transport="http",
        oauth_mode="oidc",
        oauth_oidc_config_url="https://idp.example.com/.well-known/openid-configuration",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="https://rosetta.example.com",
    )
    defaults.update(overrides)
    return _make_config(**defaults)


def test_oauth_mode_returns_oauth_proxy():
    from fastmcp.server.auth.oauth_proxy import OAuthProxy
    cfg = _make_full_http_config()
    provider = build_oauth_provider(cfg)
    assert isinstance(provider, OAuthProxy)


def test_required_scopes_passed_to_introspection_verifier():
    from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier
    cfg = _make_full_http_config(oauth_required_scopes=["offline_access"])
    provider = build_oauth_provider(cfg)
    assert provider is not None
    verifier = getattr(provider, "_token_validator", None)
    assert isinstance(verifier, IntrospectionTokenVerifier)
    assert verifier.required_scopes == ["offline_access"]


def test_required_scopes_none_when_not_set():
    from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier
    cfg = _make_full_http_config(oauth_required_scopes=None)
    provider = build_oauth_provider(cfg)
    assert provider is not None
    verifier = getattr(provider, "_token_validator", None)
    assert isinstance(verifier, IntrospectionTokenVerifier)
    # IntrospectionTokenVerifier normalises None → [] internally
    assert verifier.required_scopes == []


# ---------------------------------------------------------------------------
# OIDC proxy builder tests
# OIDCProxy fetches the discovery doc synchronously in __init__; we mock
# get_oidc_configuration to avoid real network calls.
# ---------------------------------------------------------------------------

def _make_oidc_configuration():
    """Return a minimal valid OIDCConfiguration for mocking."""
    from fastmcp.server.auth.oidc_proxy import OIDCConfiguration
    return OIDCConfiguration(
        strict=False,
        issuer="https://idp.example.com",
        authorization_endpoint="https://idp.example.com/auth",
        token_endpoint="https://idp.example.com/token",
        jwks_uri="https://idp.example.com/.well-known/jwks.json",
        response_types_supported=["code"],
        subject_types_supported=["public"],
        id_token_signing_alg_values_supported=["RS256"],
    )


def test_oidc_mode_returns_oidc_proxy():
    from fastmcp.server.auth.oidc_proxy import OIDCProxy
    cfg = _make_oidc_config()
    with patch.object(OIDCProxy, "get_oidc_configuration", return_value=_make_oidc_configuration()):
        provider = build_oauth_provider(cfg)
    assert isinstance(provider, OIDCProxy)


def test_oidc_proxy_receives_config_url_not_base_url():
    """config_url must be the IdP URL, not our base_url."""
    from fastmcp.server.auth.oidc_proxy import OIDCProxy
    idp_url = "https://idp.example.com/.well-known/openid-configuration"
    our_url = "https://rosetta.example.com"
    cfg = _make_oidc_config(oauth_oidc_config_url=idp_url, oauth_base_url=our_url)
    with patch.object(OIDCProxy, "get_oidc_configuration", return_value=_make_oidc_configuration()) as mock_get:
        build_oauth_provider(cfg)
    # First positional arg to get_oidc_configuration is the config_url
    called_url = str(mock_get.call_args[0][0])
    assert idp_url in called_url
    assert our_url not in called_url


def test_oidc_proxy_receives_base_url():
    """base_url passed to OIDCProxy must be our public URL, not the IdP URL."""
    from fastmcp.server.auth.oidc_proxy import OIDCProxy
    our_url = "https://rosetta.example.com"
    cfg = _make_oidc_config(oauth_base_url=our_url)
    with patch.object(OIDCProxy, "get_oidc_configuration", return_value=_make_oidc_configuration()):
        provider = build_oauth_provider(cfg)
    assert provider is not None
    assert our_url in str(provider.base_url)


def test_loopback_redirect_fix_accepts_localhost_with_different_port():
    from fastmcp.server.auth.cimd import CIMDDocument
    from fastmcp.server.auth.oauth_proxy.models import ProxyDCRClient
    from pydantic import AnyHttpUrl, AnyUrl

    build_oauth_provider(_make_full_http_config())

    client = ProxyDCRClient(
        client_id="https://claude.ai/oauth/claude-code-client-metadata",
        client_secret=None,
        redirect_uris=None,
        cimd_document=CIMDDocument(
            client_id=AnyHttpUrl("https://claude.ai/oauth/claude-code-client-metadata"),
            redirect_uris=["http://localhost:3000/callback"],
        ),
    )

    validated = client.validate_redirect_uri(AnyUrl("http://localhost:52605/callback"))
    assert str(validated) == "http://localhost:52605/callback"


def test_loopback_redirect_fix_does_not_relax_non_loopback_hosts():
    from fastmcp.server.auth.cimd import CIMDDocument
    from fastmcp.server.auth.oauth_proxy.models import ProxyDCRClient
    from pydantic import AnyHttpUrl, AnyUrl

    build_oauth_provider(_make_full_http_config())

    client = ProxyDCRClient(
        client_id="https://example.com/client.json",
        client_secret=None,
        redirect_uris=None,
        cimd_document=CIMDDocument(
            client_id=AnyHttpUrl("https://example.com/client.json"),
            redirect_uris=["https://app.example.com:3000/callback"],
        ),
    )

    with pytest.raises(Exception, match="does not match CIMD redirect_uris"):
        client.validate_redirect_uri(AnyUrl("https://app.example.com:52605/callback"))


# ---------------------------------------------------------------------------
# GitHub OAuth provider builder tests
# ---------------------------------------------------------------------------

def _make_github_config(**overrides):
    """Return a config suitable for GitHub mode."""
    defaults = dict(
        transport="http",
        oauth_mode="github",
        oauth_client_id="Ov23liAbcDefGhiJkLmN",
        oauth_client_secret="github-secret-value",
        oauth_base_url="https://rosetta.example.com",
    )
    defaults.update(overrides)
    return _make_config(**defaults)


def test_oauth_configured_github_mode():
    cfg = _make_github_config()
    assert cfg.oauth_configured is True


def test_oauth_configured_github_missing_client_id():
    cfg = _make_github_config(oauth_client_id="")
    assert cfg.oauth_configured is False


def test_oauth_configured_github_missing_client_secret():
    cfg = _make_github_config(oauth_client_secret="")
    assert cfg.oauth_configured is False


def test_oauth_configured_github_missing_base_url():
    cfg = _make_github_config(oauth_base_url="")
    assert cfg.oauth_configured is False


def test_oauth_configured_missing_base_url():
    """oauth_base_url is required for all modes including default oauth."""
    cfg = _make_config(
        oauth_authorization_endpoint="https://kc/auth",
        oauth_token_endpoint="https://kc/token",
        oauth_introspection_endpoint="https://kc/introspect",
        oauth_client_id="cid",
        oauth_client_secret="csec",
        oauth_base_url="",
    )
    assert cfg.oauth_configured is False


def test_oauth_configured_oidc_missing_base_url():
    cfg = _make_config(
        oauth_mode="oidc",
        oauth_oidc_config_url="https://idp.example.com/.well-known/openid-configuration",
        oauth_client_id="my-client",
        oauth_client_secret="my-secret",
        oauth_base_url="",
    )
    assert cfg.oauth_configured is False


def test_github_mode_returns_github_provider():
    from fastmcp.server.auth.providers.github import GitHubProvider
    cfg = _make_github_config()
    provider = build_oauth_provider(cfg)
    assert isinstance(provider, GitHubProvider)


def test_github_mode_is_oauth_proxy_subclass():
    from fastmcp.server.auth.oauth_proxy import OAuthProxy
    cfg = _make_github_config()
    provider = build_oauth_provider(cfg)
    assert isinstance(provider, OAuthProxy)


def test_github_mode_uses_callback_path():
    cfg = _make_github_config(oauth_callback_path="/github/cb")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert getattr(provider, "_redirect_path", None) == "/github/cb"


def test_github_mode_passes_required_scopes():
    cfg = _make_github_config(oauth_required_scopes=["user", "user:email"])
    provider = build_oauth_provider(cfg)
    assert provider is not None
    verifier = getattr(provider, "_token_validator", None)
    assert verifier is not None
    assert verifier.required_scopes == ["user", "user:email"]


def test_github_mode_defaults_scopes_to_user_when_none():
    cfg = _make_github_config(oauth_required_scopes=None)
    provider = build_oauth_provider(cfg)
    assert provider is not None
    verifier = getattr(provider, "_token_validator", None)
    assert verifier is not None
    assert verifier.required_scopes == ["user"]


def test_github_mode_jwt_signing_key():
    cfg = _make_github_config(oauth_jwt_signing_key="github-jwt-key-32chars!!")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert getattr(provider, "_jwt_signing_key", None) is not None


def test_github_mode_base_url():
    cfg = _make_github_config(oauth_base_url="https://rosetta-prod.example.com")
    provider = build_oauth_provider(cfg)
    assert provider is not None
    assert "rosetta-prod.example.com" in str(provider.base_url)


def test_github_mode_raises_when_incomplete():
    cfg = _make_config(
        transport="http",
        oauth_mode="github",
        oauth_client_id="Ov23liAbcDefGhiJkLmN",
        # missing client_secret
    )
    with pytest.raises(ValueError, match="requires.*configuration"):
        build_oauth_provider(cfg)


def test_unknown_oauth_mode_raises():
    cfg = _make_config(
        transport="http",
        oauth_mode="invalid_mode",
        oauth_client_id="cid",
        oauth_client_secret="csec",
        oauth_base_url="https://rosetta.example.com",
        oauth_authorization_endpoint="https://example.com/auth",
        oauth_token_endpoint="https://example.com/token",
        oauth_introspection_endpoint="https://example.com/introspect",
    )
    with pytest.raises(ValueError, match="Unknown ROSETTA_OAUTH_MODE"):
        build_oauth_provider(cfg)
