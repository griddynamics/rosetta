"""FastMCP workarounds for loopback redirect URI validation.

This module applies a runtime monkey patch for FastMCP redirect validation so
loopback callbacks can use ephemeral ports during OAuth flows.
"""

from __future__ import annotations

import importlib
import logging
import sys
from typing import TypeVar
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_PATCHED_SENTINEL = "_ims_loopback_redirect_fix_patched"
_REDIRECT_VALIDATION_MODULE = "fastmcp.server.auth.redirect_validation"
_MODELS_MODULE = "fastmcp.server.auth.oauth_proxy.models"
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}

T = TypeVar("T", bound=type)


def with_loopback_redirect_fix(cls: T) -> T:
    """Apply the approved FastMCP loopback redirect workaround once."""
    redirect_validation_module = sys.modules.get(_REDIRECT_VALIDATION_MODULE)
    if redirect_validation_module is None:
        try:
            redirect_validation_module = importlib.import_module(
                _REDIRECT_VALIDATION_MODULE
            )
        except ImportError:
            logger.warning(
                "loopback_redirect_fix: could not import %s; patch not applied",
                _REDIRECT_VALIDATION_MODULE,
            )
            return cls

    if getattr(redirect_validation_module, _PATCHED_SENTINEL, False):
        logger.debug("loopback_redirect_fix: already applied")
        return cls

    original_matches = getattr(redirect_validation_module, "matches_allowed_pattern", None)
    if original_matches is None:
        logger.warning(
            "loopback_redirect_fix: %s.matches_allowed_pattern missing; patch not applied",
            _REDIRECT_VALIDATION_MODULE,
        )
        return cls

    def patched_matches_allowed_pattern(uri: str, pattern: str) -> bool:
        try:
            parsed = urlparse(uri)
            host = parsed.hostname
            if host and host.lower() in _LOOPBACK_HOSTS:
                uri_no_port = parsed._replace(netloc=host).geturl()
                pattern_parsed = urlparse(pattern)
                pattern_host = pattern_parsed.hostname or ""
                if pattern_host.lower() in _LOOPBACK_HOSTS:
                    pattern_no_port = pattern_parsed._replace(
                        netloc=pattern_host
                    ).geturl()
                    return bool(original_matches(uri_no_port, pattern_no_port))
        except Exception:
            pass
        return bool(original_matches(uri, pattern))

    setattr(
        redirect_validation_module,
        "matches_allowed_pattern",
        patched_matches_allowed_pattern,
    )
    setattr(redirect_validation_module, _PATCHED_SENTINEL, True)

    models_module = sys.modules.get(_MODELS_MODULE)
    if models_module is None:
        try:
            models_module = importlib.import_module(_MODELS_MODULE)
        except ImportError:
            models_module = None

    if models_module is not None:
        setattr(models_module, "matches_allowed_pattern", patched_matches_allowed_pattern)

    logger.info(
        "loopback_redirect_fix: applied FastMCP localhost port-agnostic redirect matching"
    )
    return cls
