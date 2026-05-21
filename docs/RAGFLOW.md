## RAGFlow Documentation (Tested 0.25.1, server + ragflow-sdk 0.25.1)

### Maintenance Rule

MUST update this document on new features and capabilities discovered and tested with exact specs but brief. Document what works and what does not (also briefly).

### Source of Truth for This Section

Derived from code in `refsrc/ragflow-0.25.1/`:
- `api/apps/sdk/doc.py` — public SDK download + retrieval routes (chunk APIs and `POST /retrieval`)
- `api/apps/restful_apis/document_api.py` — public document CRUD + metadata routes (list/get/upload/PATCH/delete + new metadata endpoints)
- `api/apps/sdk/dify_retrieval.py` — Dify-compatible retrieval
- `api/apps/document_app.py` — internal document downloads only (`GET /get/<doc_id>`, `GET /download/<attachment_id>`); the legacy `POST /document/list` is gone in 0.25.1
- `common/metadata_utils.py` — `meta_filter`, `convert_conditions`
- `agent/component/list_operations.py` — agent-side list operators
- `sdk/python/ragflow_sdk/{ragflow.py,modules/*}` — Python SDK

### Public Routes Moved In 0.25.1

`/api/v1/datasets/<dataset_id>/documents` `GET/POST/DELETE` and `/datasets/<dataset_id>/documents/<document_id>` `PATCH` moved out of `sdk/doc.py` into `restful_apis/document_api.py`. `sdk/doc.py` now hosts only document downloads, chunk APIs, and `POST /retrieval`. Both blueprints register under `/api/v1`, so external paths are unchanged.

### New Endpoints In 0.25.1

- `POST /api/v1/documents/upload` — upload + return raw doc info (no dataset binding)
- `POST /api/v1/documents/ingest` — single-call ingest (upload + parse trigger)
- `GET  /api/v1/datasets/<dataset_id>/metadata/summary` — aggregated metadata summary
- `POST /api/v1/datasets/<dataset_id>/metadata/update` — batch metadata write
- `PUT  /api/v1/datasets/<dataset_id>/documents/<document_id>/metadata/config` — auto-metadata config per document
- `PATCH /api/v1/datasets/<dataset_id>/documents/metadatas` — batch update document metadatas
- `POST /api/v1/datasets/<dataset_id>/documents/parse` — start/restart parsing
- `POST /api/v1/datasets/<dataset_id>/documents/stop` — stop parsing
- `POST /api/v1/datasets/<dataset_id>/documents/batch-update-status` — flip enabled flag in bulk
- `GET  /api/v1/documents/images/<image_id>`, `GET /api/v1/documents/artifact/<filename>`, `GET /api/v1/thumbnails`

### System Token Bootstrap (Observed)

For tenant-level API access derived from a frontend login session:
- `POST /v1/user/login` expects the frontend RSA-encrypted password format and returns an `Authorization` response header.
- `GET /v1/system/token_list` with that `Authorization` header lists tenant tokens.
- `POST /v1/system/new_token` creates a tenant token when none exist.
- Use `data.token` from those responses as `Authorization: Bearer <token>` for `/api/v1/...` and `ragflow-sdk`.

Server version probe: `GET /api/v1/system/version` (returns `{"data":"v0.25.1"}`).

### Metadata Condition (Public API Shape)

For public API payloads/params, `metadata_condition` uses:

```json
{
  "logic": "and",
  "conditions": [
    {
      "name": "tags",
      "comparison_operator": "contains",
      "value": "bootstrap"
    }
  ]
}
```

Notes:
- `logic`: `and` | `or`
- `conditions[*].name`: metadata field name
- `conditions[*].comparison_operator`: operator (see list below)
- `conditions[*].value`: comparison value
- `common/metadata_utils.py::convert_conditions` rewrites the public payload to internal form:
  - `name -> key`
  - `comparison_operator -> op`
  - `is -> =`
  - `not is -> ≠`
  - `>= -> ≥`, `<= -> ≤`, `!= -> ≠`

Supported operators (from `meta_filter`):
- `contains`, `not contains`
- `in`, `not in` (0.25.1: list-side strings are lowercased so matching is case-insensitive on both sides)
- `start with`, `end with`
- `empty`, `not empty`
- `=`, `≠` (use `is`/`not is` on the public payload)
- `>`, `<`, `≥`, `≤`
- Date-aware: `=/≠/>/</≥/≤` detect `YYYY-MM-DD` strings on either side and compare as dates; mismatched-format records are skipped.

### Verified-Broken Server Behavior (0.25.1)

`metadata_condition` is silently dropped on `GET /api/v1/datasets/<dataset_id>/documents` when zero docs match. Empirically: filtering by a fake `ims_doc_id` returns ALL docs in the dataset.

Root cause in `restful_apis/document_api.py::_parse_doc_id_filter_with_metadata`:
- When `metadata_condition.conditions` are present and the filter matches no docs, it returns `doc_ids_filter = []` (empty list).
- `DocumentService.get_by_kb_id` then evaluates `if doc_ids:` against the empty list — falsy — so it skips the `where(id.in_(doc_ids))` clause and returns every document in the dataset.

Practical impact: do NOT use `metadata_condition` on the document-list endpoint as a "find by ims_doc_id" lookup. Either:
- list the dataset once and build a `{ims_doc_id: doc}` index client-side (current `rosetta-cli` approach), or
- use `id=` / `ids=` / `name=` query params, which go through a different code path and DO filter correctly.

`POST /api/v1/retrieval` and `POST /api/v1/dify/retrieval` handle the "filter matches none" path differently — they detect it and return empty results (or use the `["-999"]` sentinel internally to force "match nothing"). Filtering works there.

### Query and Filter Capabilities (Code-Derived)

`GET /datasets/{dataset_id}/documents` (`restful_apis/document_api.py`) supports:
- Paging/sort: `page`, `page_size`, `orderby`, `desc`
- Keyword query: `keywords`
- Direct identity filters: `id`, `name`, `ids` (0.25.1, repeatable; `id` and `ids` are mutually exclusive)
- Type/status/time filters:
  - `suffix` (repeatable)
  - `types` (repeatable; validated against `VALID_FILE_TYPES`)
  - `run` (repeatable; accepts text and numeric status values)
  - `create_time_from`, `create_time_to`
- `metadata_condition` (JSON string) — see broken-behavior note above
- `metadata` (JSON string) — exact-match key-value with intersection across keys, OR within a key; `empty_metadata` shortcut returns docs with no metadata
- `return_empty_metadata` (bool) — short-circuit to docs with no stored metadata
- `type=filter` — switches the response to a faceted aggregation rather than docs

`POST /retrieval` (`sdk/doc.py`) supports:
- `dataset_ids` (required), `question` (required, trimmed)
- `document_ids` (explicit doc filter; if non-empty, `metadata_condition` is ignored)
- `page`, `page_size`
- Retrieval controls: `similarity_threshold`, `vector_similarity_weight`, `top_k`, `highlight`
- Optional behaviors: `keyword`, `cross_languages`, `rerank_id`, `tenant_rerank_id`, `toc_enhance`, `use_kg`
- `metadata_condition` (object). When `metadata_condition.conditions` are present and match no docs, the endpoint returns empty results; if `metadata_condition` is present but produces no doc_ids, the server passes `doc_ids=["-999"]` internally as a "match nothing" sentinel.

`POST /dify/retrieval` (`sdk/dify_retrieval.py`) supports:
- `knowledge_id`, `query`
- `retrieval_setting.score_threshold` (default 0.0), `retrieval_setting.top_k` (default 1024)
- `metadata_condition` object (same shape; same `["-999"]` sentinel)
- `use_kg`
- 0.25.1 adds `metadata.document_id` to each record (alongside `doc_id`) for Dify external-retrieval compatibility

`document_app.py` no longer hosts a `POST /document/list` route in 0.25.1 — list capabilities are consolidated under `/api/v1/datasets/<dataset_id>/documents`.

### How to Call It (REST)

Use named parameters exactly as shown below.

Canonical list endpoint contract:
- Method: `GET /api/v1/datasets/{dataset_id}/documents`
- Query params:
  - `id` (optional)
  - `ids` (optional, repeatable; mutex with `id`) — 0.25.1
  - `name` (optional)
  - `keywords` (optional)
  - `page` (default `1`)
  - `page_size` (default `30`)
  - `orderby` (default `create_time`)
  - `desc` (default `true`)
  - `create_time_from` (default `0`)
  - `create_time_to` (default `0`)
  - `suffix` (repeatable query key)
  - `types` (repeatable query key)
  - `run` (repeatable query key; accepts `UNSTART|RUNNING|CANCEL|DONE|FAIL` or `0|1|2|3|4`)
  - `metadata` (JSON string)
  - `metadata_condition` (JSON string) — broken when filter matches zero docs (see above)
  - `return_empty_metadata` (`true|false`)
  - `type=filter` to receive aggregated facets

Canonical retrieval endpoint contract:
- Method: `POST /api/v1/retrieval`
- JSON body:
  - Required: `dataset_ids`, `question`
  - Optional: `document_ids`, `page`, `page_size`, `similarity_threshold`, `vector_similarity_weight`, `top_k`, `highlight`, `rerank_id`, `tenant_rerank_id`, `keyword`, `cross_languages`, `metadata_condition`, `use_kg`, `toc_enhance`
- Important behavior: if `document_ids` is non-empty, `metadata_condition` is not applied for doc-id selection.

List documents with metadata filter (server bug caveat applies):

```bash
curl -sS -X GET "$RAGFLOW_BASE_URL/api/v1/datasets/$DATASET_ID/documents" \
  -H "Authorization: Bearer $RAGFLOW_API_KEY" \
  --get \
  --data-urlencode "page=1" \
  --data-urlencode "page_size=50" \
  --data-urlencode "run=FAIL" \
  --data-urlencode "run=UNSTART" \
  --data-urlencode "suffix=md" \
  --data-urlencode "metadata_condition={\"logic\":\"and\",\"conditions\":[{\"name\":\"tags\",\"comparison_operator\":\"contains\",\"value\":\"bootstrap\"}]}"
```

List documents by ID set (0.25.1):

```bash
curl -sS -X GET "$RAGFLOW_BASE_URL/api/v1/datasets/$DATASET_ID/documents" \
  -H "Authorization: Bearer $RAGFLOW_API_KEY" \
  --get \
  --data-urlencode "ids=doc_id_1" \
  --data-urlencode "ids=doc_id_2"
```

Retrieval with metadata filter:

```bash
curl -sS -X POST "$RAGFLOW_BASE_URL/api/v1/retrieval" \
  -H "Authorization: Bearer $RAGFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_ids": ["'"$DATASET_ID"'"],
    "question": "bootstrap rules",
    "top_k": 20,
    "similarity_threshold": 0.2,
    "vector_similarity_weight": 0.3,
    "metadata_condition": {
      "logic": "and",
      "conditions": [
        {"name": "tags", "comparison_operator": "contains", "value": "bootstrap"}
      ]
    }
  }'
```

### Compatibility Note: `key/op/value` On Public APIs

Public API `metadata_condition.conditions[*]` expects `name/comparison_operator/value`. Sending `key/op/value` directly on public endpoints fails. The `key/op/value` shape is the internal form produced by `convert_conditions(...)` and consumed by `meta_filter(...)`.

Example (public payload that fails):

```json
{
  "logic": "and",
  "conditions": [
    {"key": "tags", "op": "contains", "value": "bootstrap"}
  ]
}
```

Observed behavior:
- `name/comparison_operator/value` -> works
- `key/op/value` in public `metadata_condition` -> rejected (server expects `comparison_operator`)

### Known Issues (Observed)

1. `metadata_condition` matches zero docs → server returns ALL docs (verified on 0.25.0 + 0.25.1 dev). See "Verified-Broken Server Behavior" above.
2. `list_documents(name=<missing>)` returns `You don't own the document <name>.` (HTTP 102 / DATA_ERROR) instead of an empty result. Same for `list_documents(id=<missing>)`. Treat ownership-style errors as "not found" in client code.
3. Metadata write path: PATCH `/datasets/<dataset_id>/documents/<document_id>` returns `Failed to update metadata` when the per-tenant ES doc-meta index `ragflow_doc_meta_<tenant_id>` already has a sticky `object` dynamic mapping for a key that is now being written as a string. The mapping is per-tenant — dropping a dataset does NOT reset it. Workaround in `rosetta-cli`: write the JSON-stringified frontmatter under a fresh key (`fm`) instead of the legacy `frontmatter` key.
4. `meta_fields` validator rejects `None` and `dict` values; permitted types are `str | int | float | list[str|int|float]`. JSON-stringify dict-shaped fields before sending.
5. SDK `DataSet.list_documents(ids=[...])` is broken — see "Python SDK Issues" below.
6. Team-shared dataset metadata writes can return `You don't own...` when the API key holder is not the dataset owner. No client workaround beyond using the owner key.

### Python SDK Usage (ragflow-sdk 0.25.1)

Source: `refsrc/ragflow-0.25.1/sdk/python/ragflow_sdk/`. Pin: `ragflow-sdk>=0.25.1,<0.26.0`.

1) Standard list (high-level SDK):

Exact signature (0.25.1):

```python
DataSet.list_documents(
    id: str | None = None,
    ids: list[str] | None = None,        # NEW in 0.25.1; mutex with id
    name: str | None = None,
    keywords: str | None = None,
    page: int = 1,
    page_size: int = 30,
    orderby: str = "create_time",
    desc: bool = True,
    create_time_from: int = 0,
    create_time_to: int = 0,
)
```

```python
docs = dataset.list_documents(
    page=1,
    page_size=30,
    orderby="create_time",
    desc=True,
    keywords="bootstrap",
)
```

2) Retrieval (high-level SDK, metadata_condition exposed):

Exact signature (0.25.1):

```python
RAGFlow.retrieve(
    dataset_ids,
    document_ids=None,
    question="",
    page=1,
    page_size=30,
    similarity_threshold=0.2,
    vector_similarity_weight=0.3,
    top_k=1024,
    rerank_id: str | None = None,
    keyword: bool = False,
    cross_languages: list[str] | None = None,
    metadata_condition: dict | None = None,
    use_kg: bool = False,
    toc_enhance: bool = False,
)
```

Server also accepts `tenant_rerank_id` and `highlight`, but the SDK does not expose them. Use raw HTTP if you need them.

```python
chunks = rag.retrieve(
    dataset_ids=[dataset.id],
    question="bootstrap rules",
    top_k=20,
    similarity_threshold=0.2,
    vector_similarity_weight=0.3,
    metadata_condition={
        "logic": "and",
        "conditions": [
            {"name": "tags", "comparison_operator": "contains", "value": "bootstrap"}
        ],
    },
)
```

3) Advanced list filters not exposed in `DataSet.list_documents()`:
- Not exposed: `run`, `suffix`, `types`, `metadata`, `metadata_condition`, `return_empty_metadata`, `type=filter`.
- `DataSet.list_documents(...)` is strict-signature (no `**kwargs`), so extra args raise `TypeError`.
- Workaround: low-level call via `dataset.get(...)`:

```python
import json

params = {
    "page": 1,
    "page_size": 50,
    "run": ["FAIL"],
    "suffix": ["md"],
    "metadata_condition": json.dumps({
        "logic": "and",
        "conditions": [
            {"name": "tags", "comparison_operator": "contains", "value": "bootstrap"}
        ],
    }),
}
res = dataset.get(f"/datasets/{dataset.id}/documents", params=params).json()
docs = res["data"]["docs"]
```

4) Dify retrieval is not wrapped by a dedicated high-level SDK method; call raw HTTP via `rag.post("/dify/retrieval", json=...)` or your own client.

### What Changed In ragflow-sdk 0.25.1 (vs 0.24.0)

Breaking and notable changes (from `sdk/python/ragflow_sdk/modules/`):

- HTTP method change: `Chat.update`, `Document.update`, `Chunk.update`, `Session.update` switched from `PUT` to `PATCH`. New `Base.patch(...)` helper added.
- `Chat`: nested `Chat.LLM` / `Chat.Prompt` removed; replaced with flat fields on `Chat` (`llm_id`, `llm_setting`, `prompt_config`, `dataset_ids`, `similarity_threshold`, `vector_similarity_weight`, `top_n`, `top_k`, `rerank_id`, `icon`). Code that constructed `Chat.LLM(...)` / `Chat.Prompt(...)` no longer compiles.
- `Chat.list_sessions(..., user_id=None)` added.
- `Chat.delete_sessions(..., delete_all=False)` and `Agent.delete_sessions(..., delete_all=False)` added.
- `DataSet.list_documents(..., ids=None)` added (mutex with `id`).
- `DataSet.delete_documents(..., delete_all=False)` added.
- `DataSet.get_auto_metadata()` / `update_auto_metadata()` URL changed: `/auto_metadata` → `/metadata/config`.
- `Document.add_chunk(..., image_base64=None, *, tag_kwd=[])` adds image and tag-keyword params. `Document.delete_chunks(..., delete_all=False)` adds bulk-delete flag.
- `Chunk` field name fix: `documnet_keyword` → `document_keyword`. New `tag_kwd` field exposed.
- `Session.ask` for agent sessions now POSTs `{"agent_id", "query", "stream", "session_id", "openai-compatible": false}` to `/agents/chat/completion` (was `/agents/{agent_id}/completions` with `{"question", ...}`).

### Python SDK Issues (0.25.1)

`DataSet.list_documents(ids=[...])` is broken in the SDK. Implementation in `sdk/python/ragflow_sdk/modules/dataset.py`:

```python
params = {"id": id, "name": name, ...}     # dict
if ids:
    for doc_id in ids:
        params.append(("ids", doc_id))     # AttributeError: dict has no append
```

`params` is a dict; the loop calls `.append(...)` on it. Calling the SDK with `ids=[...]` raises `AttributeError`. The server-side `ids` query param works correctly when called directly via raw HTTP (`dataset.get(f"/datasets/{dataset.id}/documents", params=[("ids", x)])` etc.).

### Ready-to-Use `metadata_condition` Template

```json
{
  "logic": "and",
  "conditions": [
    {
      "name": "<metadata_field>",
      "comparison_operator": "<operator>",
      "value": "<value>"
    }
  ]
}
```

Rules:
- Use `name/comparison_operator/value` on public APIs.
- Do not send `key/op/value` to public endpoints.
- Use named arguments in SDK calls; avoid positional calls for optional parameters.
- Do not use `metadata_condition` against the document-list endpoint as a precise lookup — see the server bug above.

# RAGFlow Filter References

- List Operation Filters: `refsrc/ragflow-0.25.1/agent/component/list_operations.py`
- Metadata Filters: `refsrc/ragflow-0.25.1/common/metadata_utils.py`
- Public document + metadata APIs (rebound in 0.25.1): `refsrc/ragflow-0.25.1/api/apps/restful_apis/document_api.py`
- Public retrieval + chunks + downloads: `refsrc/ragflow-0.25.1/api/apps/sdk/doc.py`
- Dify retrieval: `refsrc/ragflow-0.25.1/api/apps/sdk/dify_retrieval.py`
- Internal-only document downloads: `refsrc/ragflow-0.25.1/api/apps/document_app.py`
