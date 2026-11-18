"""Unit tests for the Authorizer service."""

from rosetta_mcp.services.authorizer import Authorizer


def test_instruction_datasets_are_always_readable():
    assert Authorizer().can_read("aia-r3", "user@example.com") is True


def test_other_datasets_are_denied():
    assert Authorizer().can_read("custom-dataset", "user@example.com") is False
    assert Authorizer().can_read("project-foo", "user@example.com") is False
