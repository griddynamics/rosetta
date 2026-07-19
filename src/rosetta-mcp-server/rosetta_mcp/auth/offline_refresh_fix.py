"""Patch for refresh_expires_in=0 in upstream OAuth token responses.

Some IdPs (e.g. Keycloak with offline_access scope) return refresh_expires_in=0
to signal "no expiry information available" rather than "token expires now".
The value 0 is falsy in Python, which causes two bugs in FastMCP's OAuthProxy:

  1. Initial code exchange (exchange_authorization_code):
       ``if refresh_jti and refresh_expires_in:`` evaluates to False when
       refresh_expires_in=0, so FastMCP silently discards the refresh token
       even though the upstream provided one.

  2. Subsequent refresh (exchange_refresh_token):
       ``refresh_ttl = new_refresh_expires_in or (...)`` — 0 propagates
       through both sides of the chain producing refresh_ttl=0, so JTI
       mapping and refresh-token metadata are stored with ttl=0 and
       expires_at=now, making the token immediately invalid.

Fix
---
Intercept at the lowest possible level: ``AsyncOAuth2Client.parse_response_token``,
which is the single authlib method that converts the raw HTTP JSON into the
OAuth2Token dict returned to every caller.  A single override covers both
``fetch_token`` (initial code exchange) and ``refresh_token`` (refresh flow).

Behaviour by case:
  - Key absent entirely:    leave unchanged — OAuthProxy already has its own
                            30-day fallback for the absent-key case.
  - Key present, value > 0: leave unchanged — trust upstream.
  - Key present, value == 0: replace with _FALLBACK_REFRESH_EXPIRES_IN and
                              log a warning so operators can see the substitution.

Public API
----------
``with_offline_refresh_fix(cls)``
    Call once per proxy class (OAuthProxy, OIDCProxy) during server setup.
    Patches the FastMCP proxy module in-place (idempotent) and returns ``cls``
    unchanged, preserving the existing call-site pattern in oauth.py::

        OAuthProxy = with_offline_refresh_fix(OAuthProxy)
        OIDCProxy  = with_offline_refresh_fix(OIDCProxy)
"""

from __future__ import annotations

import importlib
import logging
import sys
from typing import Any, TypeVar

from authlib.integrations.httpx_client import AsyncOAuth2Client

logger = logging.getLogger(__name__)

# 30 days — identical to the fallback OAuthProxy already uses when
# refresh_expires_in is absent entirely (see exchange_authorization_code and
# exchange_refresh_token in fastmcp/server/auth/oauth_proxy/proxy.py).
_FALLBACK_REFRESH_EXPIRES_IN: int = 60 * 60 * 24 * 30

# Sentinel attribute written onto the target module once the patch is applied,
# so calling with_offline_refresh_fix multiple times is safe.
_PATCHED_SENTINEL = "_ims_offline_refresh_patched"

# FastMCP module whose AsyncOAuth2Client reference we replace.
# Both OAuthProxy._handle_idp_callback and OAuthProxy.exchange_refresh_token
# (the latter inherited by OIDCProxy) look up AsyncOAuth2Client by name from
# this module's namespace at call time, so replacing it here covers all paths.
_TARGET_MODULE = "fastmcp.server.auth.oauth_proxy.proxy"

T = TypeVar("T", bound=type)


class PatchedAsyncOAuth2Client(AsyncOAuth2Client):
    """Drop-in replacement for AsyncOAuth2Client that normalises refresh_expires_in=0.

    Only parse_response_token is overridden; every other behaviour is identical
    to the parent class.
    """

    def parse_response_token(self, resp: Any) -> Any:
        token = super().parse_response_token(resp)

        raw = token.get("refresh_expires_in")

        if raw is None:
            # Key not present in response — nothing to do.  OAuthProxy's own
            # 30-day fallback for the absent case will apply as normal.
            return token

        try:
            value = int(raw)
        except (TypeError, ValueError):
            logger.debug(
                "offline_refresh_fix: refresh_expires_in=%r is not an integer"
                " — leaving token unchanged",
                raw,
            )
            return token

        if value > 0:
            # Positive value — trust upstream as-is.
            logger.debug(
                "offline_refresh_fix: refresh_expires_in=%d — no patch needed",
                value,
            )
            return token

        # value <= 0: replace before FastMCP ever sees it.
        logger.warning(
            "offline_refresh_fix: upstream returned refresh_expires_in=0;"
            " replacing with %d seconds (%d days)."
            " Some IdPs (e.g. Keycloak with offline_access) use 0 to mean"
            " 'no fixed expiry', not 'expires immediately'.",
            _FALLBACK_REFRESH_EXPIRES_IN,
            _FALLBACK_REFRESH_EXPIRES_IN // 86400,
        )
        token["refresh_expires_in"] = _FALLBACK_REFRESH_EXPIRES_IN
        logger.debug(
            "offline_refresh_fix: refresh_expires_in patched 0 → %d",
            _FALLBACK_REFRESH_EXPIRES_IN,
        )
        return token


def with_offline_refresh_fix(cls: T) -> T:
    """Activate the refresh_expires_in=0 fix for a FastMCP proxy class.

    Replaces ``AsyncOAuth2Client`` in the FastMCP proxy module's namespace with
    ``PatchedAsyncOAuth2Client``.  Safe to call multiple times — the patch is
    applied at most once regardless of how many proxy classes are wrapped.

    Args:
        cls: OAuthProxy or OIDCProxy (or any subclass).  The class itself is
             not modified; it is returned unchanged so the call-site pattern
             ``OAuthProxy = with_offline_refresh_fix(OAuthProxy)`` keeps working.

    Returns:
        cls unchanged.
    """
    module = sys.modules.get(_TARGET_MODULE)
    if module is None:
        try:
            module = importlib.import_module(_TARGET_MODULE)
        except ImportError:
            logger.warning(
                "offline_refresh_fix: could not import %s"
                " — patch not applied (FastMCP API may have changed)",
                _TARGET_MODULE,
            )
            return cls

    if getattr(module, _PATCHED_SENTINEL, False):
        logger.debug(
            "offline_refresh_fix: already applied to %s — skipping",
            _TARGET_MODULE,
        )
        return cls

    if not hasattr(module, "AsyncOAuth2Client"):
        logger.warning(
            "offline_refresh_fix: AsyncOAuth2Client not found in %s"
            " — patch not applied (FastMCP API may have changed)",
            _TARGET_MODULE,
        )
        return cls

    module.AsyncOAuth2Client = PatchedAsyncOAuth2Client  # type: ignore[attr-defined]
    setattr(module, _PATCHED_SENTINEL, True)

    logger.info(
        "offline_refresh_fix: %s.AsyncOAuth2Client → PatchedAsyncOAuth2Client",
        _TARGET_MODULE,
    )
    return cls
