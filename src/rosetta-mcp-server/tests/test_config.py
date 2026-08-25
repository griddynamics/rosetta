import os
from unittest.mock import MagicMock

import pytest

from rosetta_mcp.config import (
    RosettaConfig,
    _build_request,
    _derive_rosetta_url_from_r2r,
    _load_response,
)
from rosetta_mcp.constants import DEFAULT_RAGFLOW_HTTP_TIMEOUT, DEFAULT_READ_POLICY


def test_from_env_defaults(monkeypatch):
    monkeypatch.delenv("ROSETTA_SERVER_URL", raising=False)
    monkeypatch.delenv("VERSION", raising=False)
    monkeypatch.delenv("ROSETTA_API_KEY", raising=False)
    monkeypatch.delenv("ROSETTA_OAUTH_CALLBACK_PATH", raising=False)
    cfg = RosettaConfig.from_env()
    assert cfg.server_url == "http://localhost:80"
    assert cfg.instruction_dataset == "aia-r3"
    assert cfg.oauth_callback_path == "/auth/callback"


def test_root_filter_parsing(monkeypatch):
    monkeypatch.setenv("INSTRUCTION_ROOT_FILTER", "OrgA, orgB ,")
    cfg = RosettaConfig.from_env()
    assert cfg.root_filter == ["orga", "orgb"]


def test_removed_team_read_policy_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("ROSETTA_READ_POLICY", " Team ")

    cfg = RosettaConfig.from_env()

    assert cfg.read_policy == DEFAULT_READ_POLICY


def test_oauth_callback_path_override(monkeypatch):
    monkeypatch.setenv("ROSETTA_OAUTH_CALLBACK_PATH", "/oauth/custom")
    cfg = RosettaConfig.from_env()
    assert cfg.oauth_callback_path == "/oauth/custom"


def test_oauth_callback_path_gets_leading_slash(monkeypatch):
    monkeypatch.setenv("ROSETTA_OAUTH_CALLBACK_PATH", "oauth/custom")
    cfg = RosettaConfig.from_env()
    assert cfg.oauth_callback_path == "/oauth/custom"


def test_invalid_transport_falls_back_to_stdio(monkeypatch):
    monkeypatch.setenv("ROSETTA_TRANSPORT", "grpc")
    cfg = RosettaConfig.from_env()
    assert cfg.transport == "stdio"


def test_http_port_must_be_in_valid_range(monkeypatch):
    monkeypatch.setenv("ROSETTA_HTTP_PORT", "70000")
    cfg = RosettaConfig.from_env()
    assert cfg.http_port == 8000

    monkeypatch.setenv("ROSETTA_HTTP_PORT", "0")
    cfg = RosettaConfig.from_env()
    assert cfg.http_port == 8000


@pytest.mark.parametrize(
    "r2r_url, expected",
    [
        ("https://r2r-dev.corp.example.com/", "https://ims.corp.example.com/"),
        ("https://anything.example.com/", "https://ims.example.com/"),
        ("https://r2r-dev.example.com:8443/v1", "https://ims.example.com:8443/v1"),
        ("http://localhost", "http://localhost"),
        ("http://localhost:9380", "http://localhost:9380"),
    ],
)
def test_derive_rosetta_url_from_r2r(r2r_url, expected):
    assert _derive_rosetta_url_from_r2r(r2r_url) == expected


def _fake_urlopen_capturing_timeout(captured: list):
    def _urlopen(request, timeout=None):
        captured.append(timeout)
        response = MagicMock()
        response.headers.get_content_charset.return_value = "utf-8"
        response.read.return_value = b'{"code": 0}'
        response.__enter__.return_value = response
        return response

    return _urlopen


def test_legacy_load_response_uses_configured_ragflow_http_timeout(monkeypatch):
    # The legacy R2R bootstrap request must be tunable like every other
    # RAGFlow HTTP call instead of pinning a hardcoded literal.
    monkeypatch.setenv("ROSETTA_RAGFLOW_HTTP_TIMEOUT", "9")
    captured: list = []
    monkeypatch.setattr("rosetta_mcp.config.urlopen", _fake_urlopen_capturing_timeout(captured))
    body, _ = _load_response(_build_request("http://ragflow/v1/user/login", method="GET"))
    assert body == {"code": 0}
    assert captured == [9]


def test_legacy_load_response_defaults_to_ragflow_http_timeout(monkeypatch):
    monkeypatch.delenv("ROSETTA_RAGFLOW_HTTP_TIMEOUT", raising=False)
    captured: list = []
    monkeypatch.setattr("rosetta_mcp.config.urlopen", _fake_urlopen_capturing_timeout(captured))
    _load_response(_build_request("http://ragflow/v1/user/login", method="GET"))
    assert captured == [DEFAULT_RAGFLOW_HTTP_TIMEOUT]
