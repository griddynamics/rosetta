"""Unit tests for the Authorizer service."""

import pytest

from rosetta_mcp.services.authorizer import Authorizer


@pytest.mark.parametrize("policy", ["all", "none", "unsupported"])
def test_instruction_datasets_are_always_readable(policy):
    authorizer = Authorizer(read_policy=policy)

    assert authorizer.can_read("aia-r3", "user@example.com") is True


@pytest.mark.parametrize(
    ("policy", "expected"),
    [
        ("all", True),
        ("none", False),
        ("unsupported", False),
    ],
)
def test_other_datasets_follow_supported_policy(policy, expected):
    authorizer = Authorizer(read_policy=policy)

    assert authorizer.can_read("custom-dataset", "user@example.com") is expected
