import sys
from argparse import Namespace
from pathlib import Path
from types import SimpleNamespace

from rosetta_cli import cli
from rosetta_cli.rosetta_config import RosettaConfig
from rosetta_cli.commands.parse_command import ParseCommand
from rosetta_cli.commands.publish_command import PublishCommand


def _config(parse_timeout: int = 1200) -> SimpleNamespace:
    return SimpleNamespace(
        environment="test",
        base_url="https://example.invalid",
        api_key="ragflow-test",
        dataset_default="aia",
        dataset_template="aia-{release}",
        page_size=1000,
        parse_timeout=parse_timeout,
    )


def _stub_parse_command(monkeypatch) -> None:
    monkeypatch.setattr(
        "rosetta_cli.commands.parse_command.AuthService.verify_or_exit",
        staticmethod(lambda client, config: None),
    )
    monkeypatch.setattr(
        "rosetta_cli.services.dataset_service.DatasetService.resolve_dataset_name",
        lambda self, args_dataset: (None, False),
    )


def test_parse_flag_unset_keeps_configured_timeout(monkeypatch):
    _stub_parse_command(monkeypatch)
    command = ParseCommand(SimpleNamespace(), _config(1200))

    command.execute(Namespace(dataset=None, parse_timeout=None, force=False, dry_run=False))

    assert command.config.parse_timeout == 1200


def test_parse_flag_overrides_configured_timeout(monkeypatch):
    _stub_parse_command(monkeypatch)
    command = ParseCommand(SimpleNamespace(), _config(1200))

    command.execute(Namespace(dataset=None, parse_timeout=900, force=False, dry_run=False))

    assert command.config.parse_timeout == 900


class _CapturingPublisher:
    """Captures the constructor kwargs ContentPublisher would receive."""

    last_kwargs: dict = {}

    def __init__(self, client, workspace_root, **kwargs):
        type(self).last_kwargs = kwargs

    def publish_file(self, *args, **kwargs):
        return SimpleNamespace(success=True)


def _run_publish(monkeypatch, tmp_path: Path, config, parse_timeout) -> dict:
    monkeypatch.setattr(
        "rosetta_cli.commands.publish_command.AuthService.verify_or_exit",
        staticmethod(lambda client, config: None),
    )
    monkeypatch.setattr(
        "rosetta_cli.commands.publish_command.ContentPublisher",
        _CapturingPublisher,
    )

    doc = tmp_path / "agents.md"
    doc.write_text("# agents\n", encoding="utf-8")

    command = PublishCommand(SimpleNamespace(), config)
    args = Namespace(
        path=str(doc),
        dry_run=True,
        force=False,
        no_parse=True,
        parse_timeout=parse_timeout,
    )

    assert command.execute(args) == 0
    return _CapturingPublisher.last_kwargs


def test_publish_flag_reaches_publisher(monkeypatch, tmp_path: Path):
    kwargs = _run_publish(monkeypatch, tmp_path, _config(1200), 900)

    assert kwargs["parse_timeout"] == 900


def test_publish_flag_unset_uses_configured_timeout(monkeypatch, tmp_path: Path):
    kwargs = _run_publish(monkeypatch, tmp_path, _config(1200), None)

    assert kwargs["parse_timeout"] == 1200


def test_cli_parse_timeout_flag_defaults_to_none(monkeypatch, tmp_path: Path):
    """argparse must leave the flag unset so config/env can win."""
    seen: dict = {}

    monkeypatch.setattr(
        cli.RosettaConfig,
        "from_env",
        classmethod(lambda cls, env_file=None, environment=None: RosettaConfig(
            base_url="http://ragflow.local", api_key="ragflow-test"
        )),
    )
    monkeypatch.setattr(cli, "RAGFlowClient", lambda **kwargs: SimpleNamespace(**kwargs))

    def fake_execute(command_name, args, client, config):
        seen["args"] = args
        return 0

    monkeypatch.setattr(cli, "execute_command", fake_execute)

    for argv in (["rosetta-cli", "parse"], ["rosetta-cli", "publish", str(tmp_path)]):
        monkeypatch.setattr(sys, "argv", argv)
        assert cli.main() == 0
        assert seen["args"].parse_timeout is None, argv

        monkeypatch.setattr(sys, "argv", [*argv, "--parse-timeout", "900"])
        assert cli.main() == 0
        assert seen["args"].parse_timeout == 900, argv
