# TTL Cache Pattern

A single-dataset in-memory cache with a time-to-live (TTL) check on every read, invalidated immediately on write or dataset switch, prevents repeated RAGFlow list-all-docs calls within a short serving window.

## Problem Solved

`list_instructions` and VFS resource reads both need the full document list. Without caching, every agent interaction triggers an expensive RAGFlow API call. With per-dataset TTL caching, the list is fetched once and reused for the TTL window.

## When to Use

- Any read-heavy service layer wrapping an expensive external API call.
- Instruction listing and VFS resource resolution (the two primary consumers).

## Structure

```python
class InstructionDocCache:
    def __init__(self, document_client: DocumentClient, ttl: int = DOC_CACHE_TTL_SECONDS):
        self._ttl = ttl
        self._docs: list[DocumentLike] = []
        self._dataset_name: str = ""
        self._last_refresh: float = 0.0

    def _is_stale(self, dataset_name: str) -> bool:
        if dataset_name != self._dataset_name:  # dataset switch → always stale
            return True
        return (time.time() - self._last_refresh) > self._ttl

    def get_all_docs(self, dataset: DatasetLike, dataset_name: str) -> list[DocumentLike]:
        if not self._is_stale(dataset_name):
            return self._docs
        self._docs = self._document_client.list_docs(dataset=dataset, page_size=10000)
        self._dataset_name = dataset_name
        self._last_refresh = time.time()
        return self._docs

    def invalidate(self) -> None: ...
```

## Context Instructions Cache

A similar pattern is used for `get_context_instructions` results in `server.py`:
```python
_CONTEXT_INSTRUCTIONS_CACHE: str | None = None
_CONTEXT_INSTRUCTIONS_CACHE_TIME: float = 0.0

def _is_context_instructions_stale() -> bool:
    return (time.time() - _CONTEXT_INSTRUCTIONS_CACHE_TIME) > DOC_CACHE_TTL_SECONDS
```

## Occurrences

- `ims-mcp-server/ims_mcp/clients/doc_cache.py` — `InstructionDocCache`
- `ims-mcp-server/ims_mcp/server.py` — `_CONTEXT_INSTRUCTIONS_CACHE`, `_is_context_instructions_stale()`
- `ims-mcp-server/ims_mcp/constants.py` — `DOC_CACHE_TTL_SECONDS`
- `ims-mcp-server/tests/test_cache_ttl.py` — TTL behavior tests
