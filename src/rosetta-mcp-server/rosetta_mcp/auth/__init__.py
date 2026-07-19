"""Authentication providers for Rosetta MCP."""

from .oauth import build_oauth_provider

__all__ = ["build_oauth_provider"]
