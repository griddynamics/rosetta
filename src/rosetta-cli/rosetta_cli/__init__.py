"""Rosetta CLI package."""

from __future__ import annotations

try:
    from importlib.metadata import version

    __version__ = version("rosetta-cli")
except Exception:
    __version__ = "unknown"

__all__ = ["__version__"]
