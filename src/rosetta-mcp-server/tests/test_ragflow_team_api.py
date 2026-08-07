from types import SimpleNamespace

from rosetta_mcp.services._ragflow_team_api import RAGFlowTeamAPI


def test_from_config_uses_configured_timeout() -> None:
    config = SimpleNamespace(
        server_url="https://ragflow.example.invalid/",
        api_key="test-key",
        ragflow_http_timeout=123,
    )

    api = RAGFlowTeamAPI.from_config(config)

    assert api._timeout == 123
