# ims-mcp (deprecated alias)

**`ims-mcp` is a backward-compatibility alias for [`rosetta-mcp`](https://pypi.org/project/rosetta-mcp/).**

Installing `ims-mcp` pulls in `rosetta-mcp` and exposes the legacy `ims-mcp` command, which runs the same server (`rosetta_mcp.server:main`). It exists only so existing `uvx ims-mcp@latest` setups keep working.

## Use rosetta-mcp instead

For any new setup, install and run `rosetta-mcp`:

```bash
uvx rosetta-mcp@latest
```

See the [rosetta-mcp package](https://pypi.org/project/rosetta-mcp/) and the [Rosetta documentation](https://griddynamics.github.io/rosetta/) for full usage, configuration, and tool reference.

## License

Apache-2.0 — see the LICENSE distributed with `rosetta-mcp`.
