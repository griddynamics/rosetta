# SPECS — RAGFlow 0.25.x publish fix

## Problem

`rosetta-cli publish` fails on RAGFlow 0.25.x. Three root causes:

1. **Validator** (`refsrc/ragflow-0.25.0/api/utils/validation_utils.py:442-456`) rejects `None` and `dict` values in `meta_fields`. CLI was sending `sort_order: None` and `frontmatter: <dict>`. Affects 88/88 docs.
2. **ES sticky mapping** — empirical probes against dev confirmed `meta_fields.frontmatter` was committed as `object` from 0.24-era dict writes; any new string write to that key fails with `Failed to update metadata`. Mitigated by user-managed dataset drop+recreate (manual, one-time).
3. **Transient state-sync** errors (~2-3% rate): `The dataset doesn't own the document` and `Documents not found` on the upload-then-update sequence. Currently fatal.

## Solution

Three changes, all in `rosetta-cli`. Zero MCP-server changes (the read side at `bundler.py:170-179` and `tools/instructions.py:73-96` already does `json.loads` fallback).

### 1. Sanitize `meta_fields` in place at the write site
`rosetta-cli/rosetta_cli/ragflow_client.py` inside `upload_document` — drop `None` for `sort_order`/`line_count`/`resource_path`/`frontmatter`; JSON-stringify the `frontmatter` dict under the key `fm` (`json.dumps(..., sort_keys=True, ensure_ascii=False, default=str)`). No new helper module.

Key renamed `frontmatter` → `fm` because the per-tenant `ragflow_doc_meta_{tenant_id}` Elasticsearch index commits a sticky `object` dynamic mapping for any key first written as a dict. The original `frontmatter` key was written as a dict in 0.24-era sessions; any string write to that key fails with `mapper_parsing_exception` → `Failed to update metadata`. Using `fm` gets a fresh dynamic mapping. MCP readers updated to prefer `fm`, fall back to legacy `frontmatter`.

### 2. Reusable retry helper
`rosetta-cli/rosetta_cli/ims_utils.py` — append `retry_call(fn, *, attempts=3, jitter_ms_range=(150,250), retry_on=is_transient_ragflow, label="")` and `is_transient_ragflow(exc)` classifier. Random flat jitter via `random.randint`. Permanent substrings (`"The type is not supported"`, `"format_invalid"`, auth) win over transient (`"Documents not found"`, `"The dataset doesn't own the document"`, `"Failed to update metadata"`, `"mapper_parsing_exception"`, network/5xx). Wrap exactly the two idempotent transient-prone sites: `ragflow_client.py` existence-check `list_documents` (line ~460) and `doc.update` (line ~556).

### 3. Dry-run gates at every SDK call boundary
`dry_run` flag propagates from CLI → publisher → `RAGFlowClient`. At each SDK write call site, the gate is **right before** the SDK call: `if dry_run: print(json.dumps(payload)); skip` else execute. No upstream short-circuit; the publisher delegates dry-run to the client. In dry-run, `upload_document` returns a sentinel `SimpleNamespace(id=ims_doc_id)` so the publisher correctly classifies the file as "would-publish" not "skipped".

**Full audit of `RAGFlowClient` SDK-write methods, all gated:**

| Method | SDK call gated |
|---|---|
| `create_dataset` | `self._client.create_dataset(...)` |
| `delete_datasets` | `self._client.delete_datasets(...)` |
| `_ensure_dataset` | propagates dry_run to `create_dataset` |
| `upload_document` | `dataset.delete_documents`, `dataset.upload_documents`, `doc.update`; propagates to `_ensure_dataset` |
| `trigger_parse` | `dataset.async_parse_documents` |
| `parse_documents_batch` | propagates dry_run to `trigger_parse` |
| Read-only methods (`list_*`, `get_*`, `verify_*`, `_filter_*`) | n/a |

`ContentPublisher._cleanup_duplicates` and `_cleanup_orphans` already had `if dry_run: print` guards on their `dataset.delete_documents` calls (pre-existing pattern).

### Migration
User performs a one-time drop+recreate of `aia` and `aia-r2` on dev RAGFlow before the next real publish. CLI never performs this.

## Files changed

| File | Change |
|---|---|
| `rosetta-cli/rosetta_cli/ims_utils.py` | Append `retry_call` + `is_transient_ragflow` (~70 lines) |
| `rosetta-cli/rosetta_cli/ragflow_client.py` | Add `from .ims_utils import retry_call`. Add `dry_run` param to `create_dataset`, `delete_datasets`, `_ensure_dataset`, `upload_document`, `trigger_parse`, `parse_documents_batch`. Gate every SDK write call. Sanitize `meta_fields` inline before `doc.update` (drop None, JSON-stringify frontmatter under key `fm`). Wrap existence-check `list_documents` and `doc.update` with `retry_call`. Fix dry-run dataset-missing sentinel. |
| `ims-mcp-server/ims_mcp/services/bundler.py` | `_frontmatter_value`: prefer `fm` key, fall back to `frontmatter`. |
| `ims-mcp-server/ims_mcp/tools/instructions.py` | `_frontmatter_description`: prefer `fm` key, fall back to `frontmatter`. |
| `rosetta-cli/rosetta_cli/ims_publisher.py` | Pass `dry_run=dry_run` to `client.upload_document`. Remove the upstream dry-run short-circuit (dry-run handled at SDK boundary now). |
| `rosetta-cli/tests/test_retry.py` | New, 9 cases |
| `rosetta-cli/tests/test_ragflow_client_meta_fields_v25.py` | Updated: assertions use `fm` key (not `frontmatter`), 5 cases |
| `ims-mcp-server/tests/test_bundler_and_query_builder.py` | 4 new dual-key reader tests (fm JSON str, legacy dict, legacy str, fm wins) |
| `ims-mcp-server/tests/test_instructions.py` | 6 new TestFrontmatterDescriptionHelper tests (fm, legacy dict, legacy str, precedence, empty, no-desc) |

## Acceptance criteria

1. `bash validate-types.sh` and `pytest tests/` pass.
2. Dry-run against dev prints sanitized `meta_fields` payload for every file; zero SDK writes fire (no `delete_documents`, `upload_documents`, `doc.update`, `async_parse_documents`, `create_dataset` actually called).
3. After user drops+recreates dev datasets, real publish produces zero `meta_fields` validator errors and zero `Failed to update metadata`.
4. Re-running real publish reports every doc unchanged (idempotency via hash skip).
5. Synthetic test: transient `update` error retried; permanent validator error not retried.

## Out of scope

- New keys / new modules / new abstractions (none introduced).
- MCP-server code (already type-tolerant via `json.loads` fallback).
- Project datasets `store_project_context` (already validator-safe; only writes `tags: list[str]` and `resource_path: str`).
- Server-side ES index reset (user-managed, never CLI-driven).
