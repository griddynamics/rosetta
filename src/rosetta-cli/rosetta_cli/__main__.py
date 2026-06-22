"""Entry point for running rosetta-cli as a module."""

from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())
