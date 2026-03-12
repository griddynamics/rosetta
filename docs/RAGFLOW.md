## RAGFlow Documentation (Tested)

### Maintenance Rule

MUST update this document on new features and capabilities discovered and tested with exact specs but brief. Document what works and what does not (also briefly).

### Source of Truth for This Section

Derived from code in:
- `refsrc/ragflow-0.24.0/api/apps/sdk/doc.py`
- `refsrc/ragflow-0.24.0/api/apps/sdk/dify_retrieval.py`
- `refsrc/ragflow-0.24.0/api/apps/document_app.py`
- `refsrc/ragflow-0.24.0/common/metadata_utils.py`

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
- `conditions[*].comparison_operator`: operator
- `conditions[*].value`: comparison value
- In `common/metadata_utils.py`, server converts this to internal shape:
  - `name -> key`
  - `comparison_operator -> op`
  - `is -> =`
  - `not is -> ≠`

Supported operators (from `meta_filter`):
- `contains`
- `not contains`
- `in`
- `not in`
- `start with`
- `end with`
- `empty`
- `not empty`
- `=`
- `≠`
- `>`
- `<`
- `≥`
- `≤`

### Query and Filter Capabilities (Code-Derived)

`GET /datasets/{dataset_id}/documents` (`sdk/doc.py`) supports:
- Paging/sort: `page`, `page_size`, `orderby`, `desc`
- Keyword query: `keywords`
- Direct identity filters: `id`, `name`
- Type/status/time filters:
  - `suffix` (list)
  - `run` (list, accepts text and numeric status values)
  - `create_time_from`, `create_time_to`
- `metadata_condition` as JSON string query parameter, parsed server-side

`POST /retrieval` (`sdk/doc.py`) supports:
- `dataset_ids`, `question`
- `document_ids` (explicit doc filter)
- Retrieval controls: `similarity_threshold`, `vector_similarity_weight`, `top_k`, `highlight`
- Optional behaviors: `keyword`, `cross_languages`, `rerank_id`, `toc_enhance`, `use_kg`
- `metadata_condition` object (applied when `document_ids` not supplied)

`POST /dify/retrieval` (`sdk/dify_retrieval.py`) supports:
- `knowledge_id`, `query`
- `retrieval_setting.score_threshold`, `retrieval_setting.top_k`
- `metadata_condition` object
- `use_kg`

`POST /document/list` (`document_app.py`) supports:
- Same base list filters plus:
  - `metadata_condition` object
  - `metadata` object (`key -> value/list`) with intersection behavior across keys
  - `return_empty_metadata` shortcut (disables metadata filtering)

### Known Issue (Observed): Filter by Non-Existing Document Name Returns False "You Don't Own" Error

- Problem: `list_documents(name=<missing>)` returns `You don't own...` instead of an empty result.
- Conditions: dataset is team shared, API KEY is NOT owners.
- What works: `list_documents(name=<existing>)`
- Solution: for existence checks, handle ownership-style errors as "not found" (empty), and continue normal upsert flow.

### Known Issue (Observed): Metadata Update Fails "You Don't Own" Error

- Problem: publishing or updating metadata return `You don't own...`
- Conditions: dataset is team shared, API KEY is NOT owners.
- Solution: none, except using owners API KEY.

### How to Call It (REST)

Use named parameters exactly as shown below.

Canonical list endpoint contract:
- Method: `GET /api/v1/datasets/{dataset_id}/documents`
- Query params:
  - `id` (optional)
  - `name` (optional)
  - `keywords` (optional)
  - `page` (default `1`)
  - `page_size` (default `30`)
  - `orderby` (default `create_time`)
  - `desc` (default `true`)
  - `create_time_from` (default `0`)
  - `create_time_to` (default `0`)
  - `suffix` (repeatable query key)
  - `run` (repeatable query key; accepts `UNSTART|RUNNING|CANCEL|DONE|FAIL` or `0|1|2|3|4`)
  - `metadata_condition` (JSON string in query)

Canonical retrieval endpoint contract:
- Method: `POST /api/v1/retrieval`
- JSON body:
  - Required: `dataset_ids`, `question`
  - Optional: `document_ids`, `page`, `page_size`, `similarity_threshold`, `vector_similarity_weight`, `top_k`, `highlight`, `rerank_id`, `keyword`, `cross_languages`, `metadata_condition`, `use_kg`, `toc_enhance`
- Important behavior: if `document_ids` is non-empty, `metadata_condition` is not applied for doc-id selection.

List documents with metadata filter:

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

### Compatibility Note: `key/op/value` on Public APIs

Public API `metadata_condition.conditions[*]` expects `name/comparison_operator/value`.
Directly sending `key/op/value` in `metadata_condition` is not accepted by those endpoints.

Example (public payload that fails):

```json
{
  "logic": "and",
  "conditions": [
    {
      "key": "tags",
      "op": "contains",
      "value": "bootstrap"
    }
  ]
}
```

Observed behavior:
- `name/comparison_operator/value` -> works
- `key/op/value` in public `metadata_condition` -> fails (server expects `comparison_operator`)

### Verified Behaviors

Works:
- `metadata_condition` with `name/comparison_operator/value`.
- `logic`=`and`/`or` combination.
- Rich operators (`contains`, `in`, numeric comparators, empty/not-empty).
- Combined retrieval controls (`top_k`, thresholds, rerank, keyword expansion, KG/toc options).
- List endpoints with status/type/time/keyword filters.

Does not work:
- Public `metadata_condition` in `key/op/value` format without translation.

### Python SDK Usage

Use cases in `ragflow-sdk` (from `sdk/python/ragflow_sdk`):

1) Standard list (high-level SDK, exposed):

Exact signature:
- `DataSet.list_documents(id=None, name=None, keywords=None, page=1, page_size=30, orderby="create_time", desc=True, create_time_from=0, create_time_to=0)`

```python
docs = dataset.list_documents(
    page=1,
    page_size=30,
    orderby="create_time",
    desc=True,
    keywords="bootstrap",
    create_time_from=0,
    create_time_to=0,
)
```

2) Retrieval (high-level SDK, metadata_condition exposed):

Exact signature:
- `RAGFlow.retrieve(dataset_ids, document_ids=None, question="", page=1, page_size=30, similarity_threshold=0.2, vector_similarity_weight=0.3, top_k=1024, rerank_id=None, keyword=False, cross_languages=None, metadata_condition=None, use_kg=False, toc_enhance=False)`

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
- Not exposed directly: `run`, `suffix`, `metadata_condition`.
- `DataSet.list_documents(...)` is strict signature (no `**kwargs`), so extra args raise `TypeError`.
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

4) Dify retrieval endpoint is not wrapped by a dedicated high-level SDK method in this codebase:
- Call raw HTTP or low-level SDK transport if you need `/dify/retrieval`.

### Is Everything Exposed?

Short answer: no.

- Exposed well in SDK:
  - Retrieval controls in `rag.retrieve(...)`, including `metadata_condition`, `rerank_id`, `keyword`, `cross_languages`, `use_kg`, `toc_enhance`.
- Not exposed in `DataSet.list_documents(...)`:
  - `run`, `suffix`, `metadata_condition` query filtering.
- Additional parameters can still be passed via low-level `dataset.get(...)` and `rag.get(...)`/raw HTTP, but that bypasses typed SDK convenience methods.

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

# RAGFlow Filter References

List Operation Filters, see `refsrc/ragflow-*/agent/component/list_operations.py`
Metadata Filters, see `refsrc/ragflow-*/common/metadata_utils.py`
See APIs (note, that doc for method do not reflect actual implementation): `refsrc/ragflow-*/api/apps/sdk/doc.py` , `refsrc/ragflow-*/api/apps/sdk/dify_retrieval.py` ,
`refsrc/ragflow-*/api/apps/document_app.py`
And others.
