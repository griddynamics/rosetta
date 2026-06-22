"""Compatibility wrapper for the packaged Rosetta CLI."""

from rosetta_cli.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
