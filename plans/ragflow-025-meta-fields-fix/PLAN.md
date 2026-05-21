# PLAN — RAGFlow 0.25.x publish fix

Companion: `SPECS.md`. Status: COMPLETE — real publish validated 88/88 on dev RAGFlow 0.25.0. See `engineer-decision.md` for root cause and evidence.

## Edits applied

### `rosetta-cli/rosetta_cli/ims_utils.py`
Append `retry_call`, `is_transient_ragflow`, transient/permanent substring tuples. ~70 lines.

### `rosetta-cli/rosetta_cli/ragflow_client.py`
- Import `from .ims_utils import retry_call`.
- `create_dataset(..., dry_run=False)`: print + return `None` when dry_run.
- `delete_datasets(ids, dry_run=False)`: print + return when dry_run.
- `_ensure_dataset(name, description="", dry_run=False)`: propagates to `create_dataset`.
- `upload_document(..., dry_run=False)`:
  - Existence-check `list_documents` wrapped in `retry_call`.
  - `dataset.delete_documents([existing_doc.id])` gated by `dry_run` — print would-be delete.
  - `dataset.upload_documents([...])` gated — print would-be upload (`blob_bytes` instead of raw blob).
  - Inline sanitization (drop None, JSON-stringify `frontmatter` dict under key `fm` — not `frontmatter`; see `engineer-decision.md`).
  - `doc.update({"meta_fields": ...})` wrapped in `retry_call`; gated by `dry_run` — print full sanitized payload.
  - Dry-run dataset-missing path returns sentinel `(SimpleNamespace(id=ims_doc_id), resolved_name)` (fixed per review-impl.md Finding 3-A).
  - Dry-run dataset-exists path returns `(SimpleNamespace(id=metadata.ims_doc_id), dataset.id)` so publisher classifies as "would-publish" not skipped.
- `trigger_parse(dataset_id, document_ids, dry_run=False)`: print + return when dry_run.
- `parse_documents_batch(..., dry_run=False)`: propagates to `trigger_parse`.

### `rosetta-cli/rosetta_cli/ims_publisher.py`
- `publish_file` passes `dry_run=dry_run` to `client.upload_document`.
- Removed the upstream dry-run print/early-return block (now handled at SDK boundary).

## Tests

### `rosetta-cli/tests/test_retry.py` — 9 cases
Success first attempt; transient-then-succeed; permanent-no-retry; transient-exhaust; jitter range `[0.150, 0.250]`; classifier accept/reject; permanent-wins-when-mixed; `attempts<1` raises `ValueError`.

### `rosetta-cli/tests/test_ragflow_client_meta_fields_v25.py` — 5 cases (updated)
- Sanitization: no `sort_order` / `resource_path` keys; `fm` (not `frontmatter`) is JSON `str` round-trippable; `frontmatter` key absent; primitives untouched.
- `sort_order` kept when set.
- `frontmatter=None` drops both `fm` and `frontmatter` keys.
- Transient `update` once → retried and succeeds.
- Permanent `update` → not retried, raises `RAGFlowClientError`.

### `ims-mcp-server/tests/test_bundler_and_query_builder.py` — 4 new cases
- fm key as JSON string reads correctly.
- Legacy frontmatter dict falls back correctly.
- Legacy frontmatter JSON string falls back correctly.
- fm key takes precedence over legacy frontmatter.

### `ims-mcp-server/tests/test_instructions.py` — 6 new cases (TestFrontmatterDescriptionHelper)
- fm JSON string reads description.
- Legacy frontmatter dict reads description.
- Legacy frontmatter string reads description.
- fm takes precedence over legacy frontmatter.
- Returns empty when no frontmatter keys.
- Returns empty when description field missing.

All 31 rosetta-cli tests pass; all 407 MCP server tests pass; type-check green.

## Validation steps

1. `bash validate-types.sh` ✓
2. `cd rosetta-cli && PYTHONPATH=. ../venv/bin/pytest tests/ -v` ✓ (31/31)
3. `cd ims-mcp-server && PYTHONPATH=. ../venv/bin/pytest tests/ -v` ✓ (407/407)
4. **Real publish Run 1** ✓ — 88/88 successful, 0 failed, 0 "Failed to update metadata", 0 "The type is not supported", 1 transient retry (connection abort → recovered). Total: 495s.
5. **Real publish Run 2** ✓ — 87 successful, 1 skipped (unchanged), 0 failed. Idempotency restored. Total: 894s.

## Risks

| Risk | Status |
|---|---|
| Validator rejects sanitized payload | RESOLVED — payload is `str|int|float|list[str|int|float]` only |
| ES sticky `meta_fields.frontmatter: object` mapping | MITIGATED — user drops+recreates datasets manually before real publish |
| Retry creates duplicate uploads | RESOLVED — only idempotent calls (PATCH update, GET list) wrapped |
| Validator errors waste retries | RESOLVED — classifier excludes them |
| Dry-run silently writes | RESOLVED — full audit; every SDK write call gated; verified end-to-end against dev |

## Rollback

`git revert` the three file changes. New `frontmatter` JSON-string data already written stays in dev tenant ES (harmless; readers tolerate via `json.loads` fallback).
