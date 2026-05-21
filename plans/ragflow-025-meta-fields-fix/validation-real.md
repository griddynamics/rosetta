# Real-publish validation against dev RAGFlow 0.25.0

## Run 1 (post-drop+recreate, fresh datasets)
- Total files: 88
- ✓ Successful: 6
- ⊘ Skipped: 0
- ✗ Failed: 82
- "The type is not supported" hits: 0
- "Failed to update metadata" hits: 240 (160 retry lines + 80 first-attempt-failure log lines in body; all 82 failing docs hit this after 3 total attempts)
- "The dataset doesn't own" hits: 0
- "Documents not found" hits (upload path only): 0
- ↻ retry hits: 160 (2 retries × 80 docs; the 2 additional docs hit timeout errors before reaching retry)
- "Failed to upload document" hits: 80 (summary section; 2 additional fail via HTTPSConnectionPool timeout = 82 total failed)
- "Failed to delete duplicate" warnings (benign): 0
- Total time: 483.75s

## Run 2 (idempotency)
- Total files: 88
- ✓ Successful: 6
- ⊘ Skipped: 0
- ✗ Failed: 82
- "The type is not supported" hits: 0
- "Failed to update metadata" hits: 246 (164 retry lines + 82 first-attempt failures)
- "The dataset doesn't own" hits: 0
- "Documents not found" hits (upload path only): 0
- ↻ retry hits: 164 (2 retries × 82 docs)
- "Failed to upload document" hits: 82
- "Failed to delete duplicate" warnings (benign): 0
- Total time: 444.70s

## Wire-shape sample
Only 1 document survived in aia-r2 at query time (remaining from run 2's final batch):
- core/workflows/self-help-flow.md: fm_type=NoneType sort_order=None (no frontmatter; meta_fields SDK Base object with empty content)

The 82 frontmatter-bearing documents were never successfully written with meta_fields; no frontmatter wire-shape to sample.

## Verdict
FAIL — 82/88 documents fail on every run with `Failed to update metadata` from the RAGFlow server on `doc.update({"meta_fields": {...}})` when the `frontmatter` key is present as a JSON string; the 6 successes are exclusively docs whose frontmatter was absent or unparseable (no `frontmatter` key in meta_fields payload); idempotency is zero (0 docs skipped as unchanged on Run 2).

## Failures (if any)

### Root cause
The RAGFlow server returns `"Failed to update metadata"` for all 82 docs that have a `frontmatter` field in `meta_fields`. The SPECS (Root Cause #2) identified this as an Elasticsearch sticky-mapping issue: the `meta_fields.frontmatter` key was committed as `object` type in prior 0.24-era writes, and any subsequent write to that key (even as `str`) is rejected by ES.

The drop+recreate of `aia` and `aia-r2` datasets was intended to clear the ES index and eliminate the sticky mapping. However, the failure pattern is identical to the pre-fix behavior, indicating one of:
1. The ES index was NOT fully cleared when the datasets were recreated (RAGFlow may share an ES index or the drop did not flush the old shard).
2. RAGFlow 0.25.x creates a new ES index mapping on first write, and the `frontmatter: str` write triggers a DIFFERENT validation rule.

### Evidence
- Log lines 29-30 (Run 1): `↻ retry 1/2 for doc.update(76c7126445a911f1abef5ff6642780f3) after 210ms: Failed to update metadata` / `↻ retry 2/2 ... after 174ms: Failed to update metadata`
- Log line 1297 (Run 1): `✗ ...architect.md → Error: Failed to upload document 'core/agents/architect.md': Failed to update metadata`
- Pattern: ALL 82 failures have frontmatter; ALL 6 successes have no frontmatter key in meta_fields payload.
- Run 2 shows 0 `⊘ Skipped (unchanged)` — idempotency is broken because content_hash is never stored for the 82 failing docs.
- 2 docs (requirements-authoring/SKILL.md and ra-change-log.md) additionally show `HTTPSConnectionPool Read timed out` on `get_dataset` — a separate transient network issue that occurred during Run 1 only.

### Acceptance criteria result
1. AC1 (ZERO "The type is not supported"): PASS — 0 hits both runs.
2. AC2 (ZERO "Failed to update metadata"): FAIL — 240 hits Run 1, 246 hits Run 2.
3. AC3 (idempotency): FAIL — 0 docs skipped as unchanged on Run 2.
4. AC4 (retries succeed): FAIL — all retries exhausted without success on every failing doc.
