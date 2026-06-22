import sys

from rosetta_cli import __version__
from rosetta_cli import cli


def test_version_command_prints_version_and_skips_config(monkeypatch, capsys):
    def fail_from_env(*args, **kwargs):
        raise AssertionError("version command should not load config")

    monkeypatch.setattr(cli.IMSConfig, "from_env", fail_from_env)
    monkeypatch.setattr(sys, "argv", ["rosetta-cli", "version"])

    assert cli.main() == 0

    captured = capsys.readouterr()
    assert captured.out == f"Rosetta Version: {__version__}\n"
