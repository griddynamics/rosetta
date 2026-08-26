from argparse import Namespace
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from rosetta_cli.commands.cleanup_command import CleanupCommand


@pytest.mark.parametrize(
    ("args", "method_name", "filter_value"),
    [
        (
            Namespace(tags="one,two", prefix=None),
            "filter_documents_by_tags",
            ["one", "two"],
        ),
        (Namespace(tags=None, prefix="guide-"), "filter_documents_by_prefix", "guide-"),
    ],
)
def test_filtered_cleanup_uses_configured_page_size(
    monkeypatch, args, method_name, filter_value
):
    document_service = Mock()
    getattr(document_service, method_name).return_value = []
    monkeypatch.setattr(
        "rosetta_cli.commands.cleanup_command.DocumentService",
        lambda client: document_service,
    )
    command = CleanupCommand(SimpleNamespace(), SimpleNamespace(page_size=2048))
    dataset = SimpleNamespace()

    command._get_filtered_documents(dataset, SimpleNamespace(), args)

    getattr(document_service, method_name).assert_called_once_with(
        dataset, filter_value, limit=2048
    )
