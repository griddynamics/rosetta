import pytest


@pytest.fixture(autouse=True)
def clear_legacy_stdio_env(monkeypatch):
    for name in ("R2R_API_BASE", "R2R_EMAIL", "R2R_PASSWORD"):
        monkeypatch.delenv(name, raising=False)
