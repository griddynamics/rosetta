# Env-Backed Dataclass Config Pattern

All runtime configuration for the MCP server is read from environment variables in a single `RosettaConfig.from_env()` factory, stored as a frozen-like dataclass, and injected into all components at startup — no config reads in business logic.

## Problem Solved

Scattered `os.getenv()` calls throughout service code make configuration hard to test, validate, and document. A single factory validates, normalizes, and provides a typed config object with documented defaults.

## When to Use

- Adding a new environment variable to the MCP server: add to `constants.py`, add field to `RosettaConfig`, parse in `from_env()`.
- Testing with different configurations: pass a custom `RosettaConfig` instance.

## Structure

```python
# constants.py — env var name constants
ENV_ROSETTA_SERVER_URL = "ROSETTA_SERVER_URL"
ENV_REDIS_URL = "REDIS_URL"
DEFAULT_VERSION = "r2"

# config.py
@dataclass
class RosettaConfig:
    api_key: str
    server_url: str
    transport: str          # normalized: "http" or "stdio"
    redis_url: str | None
    oauth_mode: str         # normalized: "oauth" or "oidc"
    # ... all config fields ...

    @classmethod
    def from_env(cls) -> "RosettaConfig":
        return cls(
            api_key=os.getenv(ENV_ROSETTA_API_KEY, ""),
            server_url=os.getenv(ENV_ROSETTA_SERVER_URL, DEFAULT_SERVER_URL),
            transport=_normalize_transport(os.getenv(ENV_TRANSPORT, TRANSPORT_STDIO)),
            redis_url=os.getenv(ENV_REDIS_URL) or None,
            # ...
        )
```

## Usage at Startup

```python
_CONFIG = RosettaConfig.from_env()   # server.py top-level
set_runtime_config(_CONFIG)          # analytics
_OAUTH_PROVIDER = build_oauth_provider(_CONFIG, ...)
_AUTHORIZER = Authorizer(_CONFIG.read_policy, _CONFIG.write_policy, config=_CONFIG)
```

## Normalization Functions

Helper functions in `config.py` normalize raw string inputs before storing:
- `_normalize_transport()`, `_normalize_callback_path()`, `_parse_int()`, `_parse_port()`, `parse_scopes()`

## Occurrences

- `ims-mcp-server/ims_mcp/config.py` — `RosettaConfig`, all parse helpers
- `ims-mcp-server/ims_mcp/constants.py` — all `ENV_*` and `DEFAULT_*` constants
- `ims-mcp-server/ims_mcp/server.py` — `_CONFIG = RosettaConfig.from_env()`
- `ims-mcp-server/tests/test_config.py` — config validation tests
