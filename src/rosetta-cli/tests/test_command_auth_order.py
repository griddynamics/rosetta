from argparse import Namespace
from types import SimpleNamespace

from rosetta_cli.commands.cleanup_command import CleanupCommand
from rosetta_cli.commands.list_command import ListCommand
from rosetta_cli.commands.parse_command import ParseCommand


def _config() -> SimpleNamespace:
    return SimpleNamespace(
        environment="test",
        base_url="https://example.invalid",
        page_size=1000,
        parse_timeout=300,
    )


def test_list_command_auth_precedes_dataset_resolution(monkeypatch):
    calls: list[str] = []

    def verify_or_exit(client, config):
        calls.append("auth")

    def resolve_dataset_name(self, args_dataset):
        calls.append("resolve")
        return None, False

    monkeypatch.setattr(
        "rosetta_cli.services.auth_service.AuthService.verify_or_exit",
        staticmethod(verify_or_exit),
    )
    monkeypatch.setattr(
        "rosetta_cli.services.dataset_service.DatasetService.resolve_dataset_name",
        resolve_dataset_name,
    )

    command = ListCommand(SimpleNamespace(), _config())

    assert command.execute(Namespace(dataset=None)) == 1
    assert calls == ["auth", "resolve"]


def test_parse_command_auth_precedes_dataset_resolution(monkeypatch):
    calls: list[str] = []

    def verify_or_exit(client, config):
        calls.append("auth")

    def resolve_dataset_name(self, args_dataset):
        calls.append("resolve")
        return None, False

    monkeypatch.setattr(
        "rosetta_cli.commands.parse_command.AuthService.verify_or_exit",
        staticmethod(verify_or_exit),
    )
    monkeypatch.setattr(
        "rosetta_cli.services.dataset_service.DatasetService.resolve_dataset_name",
        resolve_dataset_name,
    )

    command = ParseCommand(SimpleNamespace(), _config())

    assert command.execute(Namespace(dataset=None, parse_timeout=123, force=False, dry_run=False)) == 1
    assert calls == ["auth", "resolve"]


def test_cleanup_command_auth_precedes_dataset_resolution(monkeypatch):
    calls: list[str] = []

    def verify_or_exit(client, config):
        calls.append("auth")

    def resolve_dataset_name(self, args_dataset):
        calls.append("resolve")
        return None, False

    monkeypatch.setattr(
        "rosetta_cli.services.auth_service.AuthService.verify_or_exit",
        staticmethod(verify_or_exit),
    )
    monkeypatch.setattr(
        "rosetta_cli.services.dataset_service.DatasetService.resolve_dataset_name",
        resolve_dataset_name,
    )

    command = CleanupCommand(SimpleNamespace(), _config())

    assert command.execute(Namespace(dataset=None)) == 1
    assert calls == ["auth", "resolve"]
