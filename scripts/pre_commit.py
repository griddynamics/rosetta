#!/usr/bin/env python3
"""Native Git pre-commit entrypoint for repository validation."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
CORE_SOURCE = REPO_ROOT / "instructions" / "r2" / "core"
CORE_CLAUDE_DEST = REPO_ROOT / "plugins" / "core-claude"
CORE_CURSOR_DEST = REPO_ROOT / "plugins" / "core-cursor"
TYPECHECK_SCRIPT = REPO_ROOT / "validate-types.sh"
MYPY_CONFIG = REPO_ROOT / "mypy.ini"
ALLOWED_CLAUDE_MODELS = {"opus", "sonnet", "haiku", "inherit"}


@dataclass(frozen=True)
class Check:
    name: str
    runner: Callable[[], int]


@dataclass(frozen=True)
class PluginSyncSpec:
    name: str
    destination: Path
    preserved_folder: str
    normalize_models: bool = False


def run_command(command: list[str]) -> int:
    result = subprocess.run(command, cwd=REPO_ROOT, check=False)
    return result.returncode


def normalize_claude_model(value: str) -> str:
    lowered = value.strip().lower()
    if lowered in ALLOWED_CLAUDE_MODELS:
        return lowered
    if "opus" in lowered:
        return "opus"
    if "sonnet" in lowered:
        return "sonnet"
    if "haiku" in lowered:
        return "haiku"
    return "inherit"


def rewrite_frontmatter_models(content: str) -> str:
    if not content.startswith("---\n"):
        return content

    end = content.find("\n---\n", 4)
    if end == -1:
        return content

    frontmatter = content[4:end]

    def replace_model(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        value = match.group("value")
        suffix = match.group("suffix")
        return f"{prefix}{normalize_claude_model(value)}{suffix}"

    updated = re.sub(
        r"(?m)^(?P<prefix>model:\s*)(?P<value>.*?)(?P<suffix>\s*)$",
        replace_model,
        frontmatter,
    )
    return f"---\n{updated}{content[end:]}"


def reset_generated_tree(destination: Path, preserved_folder: str) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    deleted_count = 0
    for child in destination.iterdir():
        if child.name == preserved_folder:
            continue
        if child.is_symlink():
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
        deleted_count += 1

    print(
        f"      deleted {deleted_count} item(s) from {destination} preserving {preserved_folder}",
        flush=True,
    )


def copy_core_tree(destination: Path, normalize_models: bool) -> None:
    copied_count = 0
    for source_file in sorted(CORE_SOURCE.rglob("*")):
        relative_path = source_file.relative_to(CORE_SOURCE)
        target = destination / relative_path

        # Distribute only the self-contained adapter.js (and loose-files.js) from hooks/.
        # Source modules (adapters/), tests/, and fixtures/ live in hooks/ at repo root.
        if relative_path.parts and relative_path.parts[0] == "hooks":
            if len(relative_path.parts) > 1:
                continue  # skip adapters/, tests/, and any nested files
        # Exclude test artifacts — never distribute into plugins
        if source_file.name.endswith(".test.js"):
            continue
        if "test-fixtures" in relative_path.parts:
            continue

        if source_file.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue

        target.parent.mkdir(parents=True, exist_ok=True)

        if normalize_models and source_file.suffix == ".md":
            rewritten = rewrite_frontmatter_models(source_file.read_text(encoding="utf-8"))
            target.write_text(rewritten, encoding="utf-8")
            shutil.copystat(source_file, target, follow_symlinks=True)
            copied_count += 1
            continue

        shutil.copy2(source_file, target)
        copied_count += 1

    print(f"      copied {copied_count} item(s) to {destination}", flush=True)


def sync_generated_plugins() -> int:
    if not CORE_SOURCE.is_dir():
        print(f"ERROR: Core source folder not found: {CORE_SOURCE}", file=sys.stderr)
        return 1

    plugin_specs = [
        PluginSyncSpec(
            name="core-claude",
            destination=CORE_CLAUDE_DEST,
            preserved_folder=".claude-plugin",
            normalize_models=True,
        ),
        PluginSyncSpec(
            name="core-cursor",
            destination=CORE_CURSOR_DEST,
            preserved_folder=".cursor-plugin",
        ),
    ]

    for spec in plugin_specs:
        print(f"   syncing {spec.name}", flush=True)
        reset_generated_tree(spec.destination, spec.preserved_folder)
        copy_core_tree(spec.destination, normalize_models=spec.normalize_models)
    return 0


def run_type_validation() -> int:
    if os.name != "nt" and TYPECHECK_SCRIPT.is_file():
        bash_path = shutil.which("bash")
        if bash_path:
            return run_command([bash_path, str(TYPECHECK_SCRIPT)])

    if not MYPY_CONFIG.is_file():
        print(f"ERROR: mypy config not found: {MYPY_CONFIG}", file=sys.stderr)
        return 1

    uvx_path = shutil.which("uvx")
    if uvx_path:
        return run_command([uvx_path, "mypy", "--config-file", str(MYPY_CONFIG)])

    if subprocess.run(
        [sys.executable, "-m", "mypy", "--version"],
        cwd=REPO_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode == 0:
        return run_command([sys.executable, "-m", "mypy", "--config-file", str(MYPY_CONFIG)])

    mypy_path = shutil.which("mypy")
    if mypy_path:
        return run_command([mypy_path, "--config-file", str(MYPY_CONFIG)])

    print(
        "ERROR: No mypy runner found. Install dependencies in the root venv or install uv.",
        file=sys.stderr,
    )
    return 1


def main() -> int:
    checks = [
        Check(name="plugin sync", runner=sync_generated_plugins),
        Check(name="type validation", runner=run_type_validation),
    ]

    for check in checks:
        print(f"==> Running {check.name}", flush=True)
        exit_code = check.runner()
        if exit_code != 0:
            print(f"Pre-commit failed during {check.name}.", file=sys.stderr)
            return exit_code

    print("Pre-commit checks passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
