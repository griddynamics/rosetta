import ast
from pathlib import Path


def test_async_handlers_do_not_call_sync_bundle():
    # Async MCP handlers live in server.py and tools/*.py. Scan those production
    # entry points to ensure none call synchronous bundle(), which would block
    # the event loop during document downloads.
    violations: list[str] = []

    package_root = Path(__file__).resolve().parents[1] / "rosetta_mcp"
    paths = [
        package_root / "server.py",
        *sorted((package_root / "tools").glob("*.py")),
    ]

    for path in paths:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))

        for node in ast.walk(tree):
            if not isinstance(node, ast.AsyncFunctionDef):
                continue

            for child in ast.walk(node):
                if (
                    isinstance(child, ast.Call)
                    and isinstance(child.func, ast.Attribute)
                    and child.func.attr == "bundle"
                ):
                    violations.append(
                        f"{path}:{child.lineno} async function '{node.name}' calls synchronous .bundle()"
                    )

    assert not violations, "\n".join(violations)
