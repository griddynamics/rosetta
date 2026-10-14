#!/usr/bin/env python3
"""Native Git pre-commit entrypoint for repository validation."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TYPECHECK_SCRIPT = REPO_ROOT / "src" / "validate-types.sh"
TEST_SCRIPT = REPO_ROOT / "src" / "run-tests.sh"
MYPY_CONFIG = REPO_ROOT / "mypy.ini"
@dataclass(frozen=True)
class Check:
    name: str
    runner: Callable[[], int]


def run_command(command: list[str]) -> int:
    result = subprocess.run(command, cwd=REPO_ROOT, check=False)
    return result.returncode


def build_hooks() -> int:
    npm = shutil.which("npm")
    if npm is None:
        print("ERROR: npm not found — install Node.js to build hooks", file=sys.stderr)
        return 1
    return run_command([npm, "--prefix", "src/hooks", "run", "build:quiet", "--silent"])


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


def verify_python(script: str) -> Callable[[], int]:
    def runner() -> int:
        return run_command([sys.executable, str(REPO_ROOT / "scripts" / "verify" / script)])

    return runner


def verify_bash(script: str) -> Callable[[], int]:
    def runner() -> int:
        bash_path = shutil.which("bash")
        if bash_path is None:
            print("ERROR: bash not found — required for verify checks", file=sys.stderr)
            return 1
        return run_command([bash_path, str(REPO_ROOT / "scripts" / "verify" / script)])

    return runner


def build_checks() -> list[Check]:
    return [
        Check(name="hooks build",     runner=build_hooks),
        # Single invocation: the generator reads plugins.json and emits every
        # <set>-<ide> plugin, including the -light variants, in one pass.
        # Decided (owner): this uses the PUBLISHED generator via npx, not a local
        # build. Publish rosettify-plugins before running this script whenever the
        # local generator is ahead of the published one; until then, build plugins
        # with `npm --prefix src/rosettify-plugins start -- ...` and run checks alone.
        Check(name="plugin sync",     runner=lambda: run_command(["npx", "-y", "rosettify-plugins@latest", "--release", "r3", "--deterministic-hooks", "false"])),
        Check(name="verify structure",     runner=verify_bash("ac_structure.sh")),
        Check(name="verify crossrefs",     runner=verify_python("ac_crossrefs.py")),
        Check(name="verify hooks content", runner=verify_python("ac_hooks_content.py")),
        Check(name="verify counts",        runner=verify_python("ac_counts.py")),
        Check(name="verify links",         runner=verify_bash("ac_links.sh")),
        Check(name="type validation", runner=run_type_validation),
        Check(name="tests",           runner=run_tests),
    ]


def slugify(name: str) -> str:
    return name.replace(" ", "-")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Repository pre-commit checks.")
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="NAME",
        help="run only the named check (name or slug, repeatable)",
    )
    args = parser.parse_args(argv)

    checks = build_checks()
    if args.only:
        valid = {c.name: c for c in checks}
        valid.update({slugify(c.name): c for c in checks})
        unknown = [n for n in args.only if n not in valid]
        if unknown:
            slugs = ", ".join(slugify(c.name) for c in checks)
            print(f"ERROR: unknown check(s): {', '.join(unknown)}. Valid: {slugs}", file=sys.stderr)
            return 64
        selected = {id(valid[n]) for n in args.only}
        checks = [c for c in checks if id(c) in selected]

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
