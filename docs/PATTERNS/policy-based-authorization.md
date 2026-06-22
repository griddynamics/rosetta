# Policy-Based Authorization Pattern

Dataset access is controlled by three named policies (`all`, `team`, `none`) evaluated at the call site via an `Authorizer` service, with hard rules for system datasets (`aia-*`) that bypass policy entirely.

## Problem Solved

Different deployments need different access models: open (all), team-gated, or locked (none). Hard-coding these checks in tool handlers creates duplication. Centralizing in `Authorizer` makes policy switching a config change.

## When to Use

- Any MCP tool that reads or writes a project dataset.
- Adding a new access-controlled operation: call `authorizer.can_read()` or `can_write()` before the operation.

## Structure

```python
class Authorizer:
    def can_read(self, dataset_name: str, user_email: str) -> bool:
        if _is_aia(dataset_name):  # aia-* always readable
            return True
        return self._evaluate(self._read_policy, dataset_name, user_email)

    def can_write(self, dataset_name: str, user_email: str) -> bool:
        if _is_aia(dataset_name):  # aia-* never writable
            return False
        return self._evaluate(self._write_policy, dataset_name, user_email)

    def _evaluate(self, policy: str, dataset_name: str, user_email: str) -> bool:
        if policy == POLICY_ALL:   return True
        if policy == POLICY_NONE:  return False
        if policy == POLICY_TEAM:  return _check_team_membership(...)
        return False
```

## Hard Rules

- `aia-*` datasets: read = always allowed, write = always denied, regardless of policy.
- `project-*` datasets: governed by `READ_POLICY` / `WRITE_POLICY` env vars.

## Environment Variables

| Var | Values | Default |
|---|---|---|
| `READ_POLICY` | `all`, `team`, `none` | `all` |
| `WRITE_POLICY` | `all`, `team`, `none` | `team` |

## Occurrences

- `src/ims-mcp-server/ims_mcp/services/authorizer.py` — `Authorizer` class, `_is_aia()`
- `src/ims-mcp-server/ims_mcp/config.py` — `read_policy`, `write_policy` fields
- `src/ims-mcp-server/ims_mcp/tools/projects.py` — authorization checks before dataset ops
- `src/ims-mcp-server/tests/test_authorizer.py` — policy matrix tests
