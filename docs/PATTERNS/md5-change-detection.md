# MD5 Change Detection Pattern

An MD5 hash over document content and all derived metadata fields determines whether a file must be re-published, making incremental publishes fast without a separate manifest file.

## Problem Solved

Publishing all instructions on every change is slow (~full republish). Comparing file modification times is fragile (clones, checkouts). A content+metadata hash detects real changes including tag or sort_order edits without scanning the filesystem for diffs.

## When to Use

- `rosetta-cli publish instructions` — called on every CI/CD run or local publish.
- Adding new metadata fields: include them in the hash input so changes propagate.
- Use `--force` flag to bypass change detection and republish everything.

## Hash Input

```python
hash_input = (
    f"{content}"
    f"|tags:{sorted_tags}"      # sorted for stability
    f"|domain:{domain}"
    f"|release:{release}"
    f"|title:{title}"
    f"|doc_name:{doc_name}"
    f"|sort_order:{sort_order}"
    f"|original_path:{original_path}"
    f"|resource_path:{resource_path}"
)
hashlib.md5(hash_input.encode("utf-8")).hexdigest()
```

## Flow

1. `DocumentData.from_file()` computes hash for local file.
2. Publisher fetches `content_hash` from existing RAGFlow document metadata.
3. If hashes match → skip upload; if different or missing → upsert.
4. Deterministic UUID (`uuid.uuid5(NAMESPACE_DNS, "rulesofpower.<rel_path>")`) ensures upsert hits the same document record.

## Occurrences

- `src/rosetta-cli/rosetta_cli/services/document_data.py` — `_calculate_hash()`, `_generate_doc_id()`
- `src/rosetta-cli/rosetta_cli/services/document_service.py` — upstream status polling
- Referenced in `docs/ARCHITECTURE.md` as "~77% time savings"
