"""Entry point for running rosetta-mcp as a module.

This allows the package to be executed as:
    python -m rosetta_mcp
"""

from .server import main

if __name__ == "__main__":
    main()
