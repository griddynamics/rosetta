import sys
from types import SimpleNamespace

from rosetta_cli import cli
from rosetta_cli.rosetta_config import RosettaConfig


def test_cli_passes_configured_http_timeout_to_client(monkeypatch):
    captured: dict = {}

    monkeypatch.setattr(
        cli.RosettaConfig,
        "from_env",
        classmethod(lambda cls, env_file=None, environment=None: RosettaConfig(
            base_url="http://ragflow.local", api_key="ragflow-test", timeout=99
        )),
    )

    def fake_client(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(**kwargs)

    monkeypatch.setattr(cli, "RAGFlowClient", fake_client)
    monkeypatch.setattr(cli, "execute_command", lambda *args, **kwargs: 0)
    monkeypatch.setattr(sys, "argv", ["rosetta-cli", "verify"])

    assert cli.main() == 0
    assert captured["timeout"] == 99


def test_client_timeout_is_used_for_system_health_request(monkeypatch):
    from rosetta_cli.ragflow_client import RAGFlowClient

    captured: dict = {}

    monkeypatch.setattr(
        "rosetta_cli.ragflow_client.RAGFlow",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    def fake_get(url, timeout=None):
        captured["timeout"] = timeout
        return SimpleNamespace(status_code=200, json=lambda: {"status": "ok"})

    monkeypatch.setattr("rosetta_cli.ragflow_client.requests.get", fake_get)

    client = RAGFlowClient(api_key="ragflow-test", base_url="http://ragflow.local", timeout=99)
    assert client.get_system_health() == {"status": "ok"}
    assert captured["timeout"] == 99
