import logging

from rosetta_cli.rosetta_config import RosettaConfig


def test_validate_warns_when_key_missing_ragflow_prefix(caplog):
    config = RosettaConfig(base_url="http://localhost", api_key="mykey12345")
    with caplog.at_level(logging.WARNING, logger="rosetta_cli.rosetta_config"):
        result = config.validate()
    assert result is True
    assert any("ragflow-" in msg for msg in caplog.messages)


def test_validate_no_warning_when_key_has_ragflow_prefix(caplog):
    config = RosettaConfig(base_url="http://localhost", api_key="ragflow-abc123")
    with caplog.at_level(logging.WARNING, logger="rosetta_cli.rosetta_config"):
        result = config.validate()
    assert result is True
    assert caplog.messages == []
