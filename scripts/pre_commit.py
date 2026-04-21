#!/usr/bin/env python3
"""Native Git pre-commit entrypoint for repository validation."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from plugin_generator import sync_generated_plugins

REPO_ROOT = Path(__file__).resolve().parent.parent
TYPECHECK_SCRIPT = REPO_ROOT / "validate-types.sh"
TEST_SCRIPT = REPO_ROOT / "run-tests.sh"
MYPY_CONFIG = REPO_ROOT / "mypy.ini"


@dataclass(frozen=True)
class Check:
    name: str
    runner: Callable[[], int]


def run_command(command: list[str]) -> int:
    result = subprocess.run(command, cwd=REPO_ROOT, check=False)
    return result.returncode


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


def run_tests() -> int:
    if os.name != "nt" and TEST_SCRIPT.is_file():
        bash_path = shutil.which("bash")
        if bash_path:
            return run_command([bash_path, str(TEST_SCRIPT)])

    print(f"ERROR: test runner script not found or unsupported platform: {TEST_SCRIPT}", file=sys.stderr)
    return 1


def main() -> int:
    checks = [
        Check(name="plugin sync", runner=lambda: sync_generated_plugins(REPO_ROOT)),
        Check(name="type validation", runner=run_type_validation),
        Check(name="tests", runner=run_tests),
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
