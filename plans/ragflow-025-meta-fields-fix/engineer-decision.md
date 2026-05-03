# Engineer Decision — RAGFlow meta_fields frontmatter key rename

Phase: 5 follow-up (real publish validation + root cause fix)
Date: 2026-05-01
Author: Engineer subagent (Sonnet 4.6)

## Empirical Evidence

### Source code findings

**`refsrc/ragflow-0.25.0/api/db/services/doc_metadata_service.py:40-50`**
ES index name pattern: `ragflow_doc_meta_{tenant_id}` — per-TENANT, not per-dataset.
Dropping and recreating datasets does NOT reset this index.

**`refsrc/ragflow-0.25.0/common/doc_store/es_conn_base.py:162-168`**
`delete_idx` is a no-op when `dataset_id` is non-empty: it returns early because all tenants share one index. Only called with empty `dataset_id` does it actually drop.

**`refsrc/ragflow-0.25.0/conf/doc_meta_es_mapping.json`**
Index mapping: `meta_fields` is `"type": "object", "dynamic": true`. This means sub-fields get dynamically mapped on first write. Once `frontmatter` was written as a dict (object) in a prior 0.24-era session, ES committed a permanent `object` mapping for `meta_fields.frontmatter`. Any subsequent write of a string to that key fails with `mapper_parsing_exception` → `update_document_metadata` returns `False` → RAGFlow API returns `"Failed to update metadata"`.

**`refsrc/ragflow-0.25.0/api/apps/restful_apis/document_api.py:120-122`**
```python
if "meta_fields" in req:
    if not DocMetadataService.update_document_metadata(document_id, update_doc_req.meta_fields):
        return get_error_data_result(message="Failed to update metadata")
```
The `"Failed to update metadata"` error is exactly what we see in the publish log.

### SDK probe results (against dev RAGFlow 0.25.0, dataset aia-r2, fresh drop+recreate)

| Probe | Payload | Result | Conclusion |
|---|---|---|---|
| 1 | `frontmatter: '{"title": "probe"}'` (JSON str) | FAILED: `Failed to update metadata` | Key is poisoned as object type in ES |
| 2 | `_probe_X: '{"title": "probe"}'` (new key, JSON str) | SUCCESS | New keys get fresh dynamic mapping |
| 3 | `frontmatter: ''` (empty string) | FAILED: `Failed to update metadata` | ANY string to frontmatter fails |
| 4 | `frontmatter: 'x'` (single char) | FAILED: `Failed to update metadata` | Confirmed — mapping type conflict |
| 5 | `fm: '{"title": "probe"}'` (new key `fm`, JSON str) | SUCCESS | `fm` key works as text |

### Prior publish run (from validation-real.md)

- 88 total docs, 82 failed, 6 succeeded
- 6 successes are exactly docs WITHOUT frontmatter (no `frontmatter` key in meta_fields payload)
- 82 failures: all docs WITH frontmatter; 240 `"Failed to update metadata"` hits (3 attempts × 80 docs)
- Run 2 idempotency: 0 skipped (hash never stored for 82 failing docs)

## Root Cause

The `ragflow_doc_meta_{tenant_id}` Elasticsearch index is per-tenant and NOT reset when datasets are dropped/recreated. In prior 0.24-era writes, `meta_fields.frontmatter` was written as a dict (the RAGFlow SDK Base object), which committed a sticky `object` dynamic mapping in ES. After the 0.25.x Pydantic validator fix (which now requires `str|int|float`), we send `frontmatter` as a JSON string. ES rejects this because the committed mapping for `meta_fields.frontmatter` is `object`, not `text`. Any string write fails with mapper_parsing_exception, which bubbles up as `"Failed to update metadata"`.

Dataset drop+recreate did NOT fix this because the ES index persists at tenant scope.

## Fix Decision: Path A — Rename `frontmatter` key to `fm`

**Rationale:**
- Probe 1, 3, 4 confirm: any string (empty, single char, JSON) under `frontmatter` fails
- Probe 2, 5 confirm: new key names with string values succeed
- `fm` is the chosen name: concise, clear, not `frontmatter_json` (rejected by user)
- The per-tenant ES index retains the poisoned `frontmatter` mapping indefinitely; no in-place fix is possible without tenant-level ES index deletion (which requires server-side action)

**What gets preserved:**
- MCP readers updated to prefer `fm` with fallback to legacy `frontmatter` — old docs written before this rename remain readable via the fallback
- All existing functionality (description display in listings, frontmatter metadata) preserved

**What gets lost:**
- Nothing. The `fm` key is functionally identical to `frontmatter`; only the ES field name changes.

## Files Changed

| File | Change |
|---|---|
| `rosetta-cli/rosetta_cli/ragflow_client.py` | Write `meta_fields["fm"]` instead of `meta_fields["frontmatter"]`; verify log reads `fm` first with `frontmatter` fallback |
| `ims-mcp-server/ims_mcp/services/bundler.py:170-180` | `_frontmatter_value`: prefer `meta.get("fm")`, fall back to `meta.get("frontmatter")` |
| `ims-mcp-server/ims_mcp/tools/instructions.py:82-87` | `_frontmatter_description`: prefer `fm` key, fall back to `frontmatter` |
| `rosetta-cli/tests/test_ragflow_client_meta_fields_v25.py` | Assertions use `mf["fm"]` instead of `mf["frontmatter"]`; `frontmatter` key asserted absent |
| `ims-mcp-server/tests/test_bundler_and_query_builder.py` | 4 new dual-key reader tests: `fm` JSON string, legacy dict, legacy string, `fm` wins over legacy |
| `ims-mcp-server/tests/test_instructions.py` | 6 new `TestFrontmatterDescriptionHelper` tests: `fm`, legacy dict, legacy str, precedence, empty, no-description |

## Test Results

- `bash validate-types.sh`: green (61 source files, 0 issues)
- `rosetta-cli pytest`: 31/31 passed
- `ims-mcp-server pytest`: 407/407 passed (includes 10 new dual-key reader tests)

## Migration Notes

No data migration needed. The MCP read side now tries `fm` first, then `frontmatter`. Docs written before this rename (with dict `frontmatter`) are still readable via the `frontmatter` fallback on the MCP side. No server-side action required from user — the ES index retains the poisoned `frontmatter` mapping but we no longer write to it.
