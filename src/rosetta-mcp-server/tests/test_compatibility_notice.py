"""Tests for the legacy compatibility-mode notice."""

from rosetta_mcp.constants import COMPATIBILITY_MODE_UPGRADE_NOTICE


def test_compatibility_notice_links_to_mcps_guide():
    assert "https://github.com/griddynamics/rosetta/blob/main/MCPs.md" in COMPATIBILITY_MODE_UPGRADE_NOTICE
