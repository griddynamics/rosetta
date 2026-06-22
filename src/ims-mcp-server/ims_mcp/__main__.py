"""Entry point for running ims-mcp as a module.

This allows the package to be executed as:
    python -m ims_mcp
"""

from .server import main

if __name__ == "__main__":
    main()
