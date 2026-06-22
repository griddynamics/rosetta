# Protocol-Based Typing Pattern

`typing.Protocol` classes define minimal structural interfaces for external SDK objects (`DocumentLike`, `DatasetLike`, `PlanStore`), decoupling business logic from the RAGFlow SDK's concrete types and enabling easy mocking in tests.

## Problem Solved

RAGFlow SDK objects (`Base`, `Dataset`, `Document`) have unstable APIs and complex initialization. Direct type references throughout the codebase would tightly couple all code to the SDK version. Protocols allow duck-typed compatibility without inheritance.

## When to Use

- Any code that receives or operates on SDK objects but should be testable without a live RAGFlow instance.
- Adding a new storage backend (e.g., new `PlanStore` implementation).
- Passing SDK objects between service layers.

## Structure

```python
# ims_mcp/typing_utils.py
class DocumentLike(Protocol):
    id: str
    name: str | None
    meta_fields: object
    rag: object

    def download(self) -> bytes: ...
    def update(self, payload: Mapping[str, object]) -> object: ...

# ims_mcp/services/plan_store.py
@runtime_checkable
class PlanStore(Protocol):
    async def get(self, key: str) -> JsonObject | None: ...
    async def set(self, key: str, value: JsonObject) -> None: ...
```

## Test Usage

Tests pass plain dataclasses or `MagicMock` objects satisfying the protocol; no real SDK or server needed.

## Occurrences

- `src/ims-mcp-server/ims_mcp/typing_utils.py` — `DocumentLike`, `DatasetLike`, `ResponseLike`, `JsonObject`
- `src/ims-mcp-server/ims_mcp/services/plan_store.py` — `PlanStore` protocol
- `src/ims-mcp-server/ims_mcp/migrations.py` — `RedisClient` protocol
- `src/rosetta-cli/rosetta_cli/typing_utils.py` — `DatasetLike`, `DocumentLike`, `JsonDict`
- `src/ims-mcp-server/tests/` — all test files using protocol-typed mocks
