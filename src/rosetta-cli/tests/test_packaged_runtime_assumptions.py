from pathlib import Path

from rosetta_cli.ims_config import find_env_file
from rosetta_cli.ims_utils import resolve_workspace_root


def test_find_env_file_prefers_explicit_env_var(tmp_path: Path, monkeypatch):
    env_file = tmp_path / "custom.env"
    env_file.write_text("RAGFLOW_API_KEY=ragflow-test\n", encoding="utf-8")

    monkeypatch.setenv("ROSETTA_CLI_ENV_FILE", str(env_file))

    assert find_env_file("dev") == env_file


def test_find_env_file_walks_parent_directories(tmp_path: Path, monkeypatch):
    workspace = tmp_path / "workspace"
    nested = workspace / "a" / "b"
    nested.mkdir(parents=True)
    env_file = workspace / ".env.dev"
    env_file.write_text("RAGFLOW_API_KEY=ragflow-test\n", encoding="utf-8")

    monkeypatch.delenv("ROSETTA_CLI_ENV_FILE", raising=False)
    monkeypatch.chdir(nested)

    assert find_env_file("dev") == env_file


def test_resolve_workspace_root_from_instructions_path(tmp_path: Path):
    instructions = tmp_path / "repo" / "instructions" / "r2" / "core"
    instructions.mkdir(parents=True)

    assert resolve_workspace_root(instructions) == tmp_path / "repo"
