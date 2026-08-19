from pathlib import Path

from rosetta_cli.rosetta_config import (
    DEFAULT_PARSE_TIMEOUT,
    DEFAULT_TIMEOUT,
    RosettaConfig,
)

ENV_TEMPLATE = Path(__file__).resolve().parents[1] / "env.template"


def _template_values() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in ENV_TEMPLATE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def test_dataclass_defaults_match_env_fallbacks(monkeypatch):
    monkeypatch.delenv("RAGFLOW_PARSE_TIMEOUT", raising=False)
    monkeypatch.delenv("RAGFLOW_TIMEOUT", raising=False)
    monkeypatch.setenv("RAGFLOW_API_KEY", "ragflow-test")

    from_env = RosettaConfig.from_env_vars()
    bare = RosettaConfig(base_url="http://ragflow.local", api_key="ragflow-test")

    assert from_env.parse_timeout == bare.parse_timeout == DEFAULT_PARSE_TIMEOUT
    assert from_env.timeout == bare.timeout == DEFAULT_TIMEOUT


def test_env_template_matches_defaults():
    values = _template_values()

    assert values["RAGFLOW_PARSE_TIMEOUT"] == str(DEFAULT_PARSE_TIMEOUT)
    assert values["RAGFLOW_TIMEOUT"] == str(DEFAULT_TIMEOUT)


def test_env_vars_override_defaults(monkeypatch):
    monkeypatch.setenv("RAGFLOW_API_KEY", "ragflow-test")
    monkeypatch.setenv("RAGFLOW_PARSE_TIMEOUT", "77")
    monkeypatch.setenv("RAGFLOW_TIMEOUT", "11")

    config = RosettaConfig.from_env_vars()

    assert config.parse_timeout == 77
    assert config.timeout == 11
