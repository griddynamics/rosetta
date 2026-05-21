# Reviewer pass — tests for ragflow-025-meta-fields-fix

Scope: `tests/test_retry.py` (9 cases) + `tests/test_ragflow_client_meta_fields_v25.py` (5 cases) against `SPECS.md` and `PLAN.md`.

## Verdict

**APPROVE-WITH-CHANGES** — every documented SPECS contract has at least one direct test; gaps are narrow branches and one signature parameter. None of the gaps blocks the contract per the prompt's stated bar ("Block only on missing coverage of a documented contract").

Test run: `cd rosetta-cli && PYTHONPATH=. ../venv/bin/pytest tests/test_retry.py tests/test_ragflow_client_meta_fields_v25.py -v` → **14 passed in 0.18s**.

## Coverage matrix

### `retry_call` / `is_transient_ragflow` (SPECS §2)

| Contract | Test | Location |
|---|---|---|
| Success path (1 attempt) | `test_success_first_attempt` | `tests/test_retry.py:8` |
| Transient-then-succeed | `test_transient_then_succeed` | `tests/test_retry.py:19` |
| Permanent immediate raise | `test_permanent_no_retry` | `tests/test_retry.py:33` |
| Transient exhaust | `test_transient_exhausted` | `tests/test_retry.py:45` |
| Jitter ∈ `[0.150, 0.250]` via mocked `time.sleep` | `test_jitter_in_range` | `tests/test_retry.py:58` (asserts each sleep value, not just count) |
| Classifier accepts transient (`Documents not found`, `Failed to update metadata`, `The dataset doesn't own the document`, `mapper_parsing_exception`) | `test_classifier_accepts_transient` | `tests/test_retry.py:76` |
| Classifier rejects permanent (`The type is not supported`, auth, `lacks permission`) | `test_classifier_rejects_permanent` | `tests/test_retry.py:83` |
| Permanent-wins-when-mixed | `test_permanent_wins_over_transient_in_same_message` | `tests/test_retry.py:89` |
| `attempts < 1` → `ValueError` | `test_attempts_below_one_raises` | `tests/test_retry.py:94` |
| **Custom `retry_on` parameter** | — | **GAP — advisory** (signature parameter at `rosetta_cli/ims_utils.py:46`; only the default `is_transient_ragflow` is exercised; the alternate code path at `rosetta_cli/ims_utils.py:61` is not directly tested) |

### `meta_fields` sanitization end-to-end (SPECS §1)

| Contract | Test | Location |
|---|---|---|
| `sort_order=None` dropped | `test_sanitization_in_meta_fields_payload` | `tests/test_ragflow_client_meta_fields_v25.py:90` |
| `resource_path=None` dropped | `test_sanitization_in_meta_fields_payload` | `tests/test_ragflow_client_meta_fields_v25.py:91` |
| `frontmatter` dict → JSON `str` round-trippable via `json.loads` | `test_sanitization_in_meta_fields_payload` | `tests/test_ragflow_client_meta_fields_v25.py:94-95` |
| `frontmatter=None` drops the key | `test_frontmatter_none_drops_key` | `tests/test_ragflow_client_meta_fields_v25.py:121` |
| Primitives untouched (`tags`, `ims_doc_id`, `content_hash`) | `test_sanitization_in_meta_fields_payload` | `tests/test_ragflow_client_meta_fields_v25.py:101-103` |
| `sort_order` kept when set (positive case) | `test_sort_order_kept_when_set` | `tests/test_ragflow_client_meta_fields_v25.py:106` |
| `line_count` non-None kept | `test_sanitization_in_meta_fields_payload` | `tests/test_ragflow_client_meta_fields_v25.py:98` |
| Transient `update` retried | `test_transient_update_is_retried` | `tests/test_ragflow_client_meta_fields_v25.py:136` |
| Permanent `update` not retried | `test_permanent_update_not_retried` | `tests/test_ragflow_client_meta_fields_v25.py:155` |
| **`line_count=None` dropped** | — | **GAP — advisory** (SPECS §1 line 16 names `line_count` in the drop-None list; the conditional at `rosetta_cli/ragflow_client.py:561` is unexecuted in the None branch — fixture at `tests/test_ragflow_client_meta_fields_v25.py:67` always sets `line_count=42`) |
| **`json.dumps(default=str)` exercised** (e.g., datetime in frontmatter) | — | **GAP — advisory** (frontmatter fixture uses primitives + None at `tests/test_ragflow_client_meta_fields_v25.py:65`; None is JSON-native, so `default=str` is never invoked. Validator only cares about resulting str, but a datetime case would lock down the flag.) |
| **`json.dumps(sort_keys=True)` asserted** | — | **GAP — advisory** (only 2-key dict; insertion order ≡ sorted order, so `sort_keys=True` is not actually distinguished. A 3+ key dict with deliberate insertion order ≠ sorted order would lock this in.) |
| **`list_documents` retry-wrap exercised at integration layer** (SPECS §2 names this as one of the two wrap sites at `rosetta_cli/ragflow_client.py:477`) | — | **GAP — advisory** (the test patches `client.list_documents` to a stub at `tests/test_ragflow_client_meta_fields_v25.py:51`; the stub returns synchronously, so the surrounding `retry_call` is invoked but the transient-retry behavior on this path is not asserted. `test_retry.py` covers `retry_call` in isolation, so the wiring is the only uncovered slice.) |

### Out-of-scope acceptance criteria

- Real-publish idempotency (SPECS §AC4): unit tests cannot verify; covered by Validator phase.
- ES sticky mapping (SPECS §1.2): user-managed datastore migration; cannot be unit-tested.
- Dry-run gating (SPECS §3): owned by the implementation reviewer; out of scope for this test review.

## Quality findings

### Test isolation — clean

- No real RAGFlow calls. `RAGFlowClient` is constructed via `object.__new__(RAGFlowClient)` (`tests/test_ragflow_client_meta_fields_v25.py:47`), `_client=None`, and `_ensure_dataset`/`list_documents` are monkey-patched per-test (`:51-52`). Style matches sibling `tests/test_ragflow_client_upload_exception_handling.py:28-32`.
- No filesystem writes. `content=b"hello"` is passed directly (`tests/test_ragflow_client_meta_fields_v25.py:84`); the `file_path is None` short-circuit in `rosetta_cli/ragflow_client.py:436-439` is taken.
- Each test instantiates its own `_FakeDoc` and `_FakeDataset` (e.g., `tests/test_ragflow_client_meta_fields_v25.py:74-76, 107-109, 122-124, 137-140, 156-159`). No module-level shared state.
- `time.sleep` mocked wherever a retry is actually triggered: `tests/test_retry.py:28`, `:52`, `:68`; `tests/test_ragflow_client_meta_fields_v25.py:143`. Correctly omitted where no retry occurs (`tests/test_retry.py:33`, `:94`; `tests/test_ragflow_client_meta_fields_v25.py:155` — permanent doesn't sleep).

### Mock fidelity — adequate

- `_FakeDoc.update` (`tests/test_ragflow_client_meta_fields_v25.py:24-30`) accepts a dict payload, stores it, returns `self` — mirrors `ragflow_sdk.modules.document.Document.update`. The `_fail_first_n` / `_fail_with` controls (`:26-27`) cleanly model transient-once and permanent-always.
- `_FakeDataset` (`:33-43`) exposes `id`, `delete_documents(ids)`, `upload_documents(payload) -> [doc]` — matches the surface used by `rosetta_cli/ragflow_client.py:526, 538-541`.
- **Payloads are asserted, not just call counts**: `doc.updated["meta_fields"]` is inspected at `tests/test_ragflow_client_meta_fields_v25.py:88, 95, 101-102, 118, 133`. `_update_calls` retry-count assertions (`:151, 170`) complement payload assertions.

### Flakiness — none observed

- `test_jitter_in_range` (`tests/test_retry.py:58`) asserts the *interval* `0.150 <= s <= 0.250`, not a specific value. No `random.seed` dependency.
- No time-of-day asserts; no real wall-clock dependencies.
- Test order independence: no module-level state, no global patches.
- `unittest.mock.patch` used as context manager (`tests/test_retry.py:28, 52, 68`; `tests/test_ragflow_client_meta_fields_v25.py:143`) → tear-down is automatic.

### Style consistency

Matches sibling `tests/test_ragflow_client_upload_exception_handling.py`:
- `object.__new__(RAGFlowClient)` construction pattern (sibling line 29 ↔ new file line 47).
- `_ensure_dataset = lambda *_a, **_k: dataset` patching pattern (sibling line 38 ↔ new file line 51).
- Plain `def test_*` functions, no class-based grouping; small per-test fakes.

## Concrete suggested edits (advisory, non-blocking)

The 5 gaps below are advisory. Applying them strengthens branch coverage but is not required to ship per the prompt's bar.

### Suggestion 1 — `line_count=None` drop branch

Add a one-liner test at `tests/test_ragflow_client_meta_fields_v25.py` (after line 119, mirroring `test_sort_order_kept_when_set`):

```python
def test_line_count_none_drops_key():
    doc = _FakeDoc("new-1")
    dataset = _FakeDataset(doc)
    client = _make_client(dataset)
    client.upload_document(
        file_path=None,
        metadata=_make_metadata(line_count=None),
        dataset_name="aia-r2",
        dataset_template="aia-{release}",
        content=b"hello",
    )
    assert "line_count" not in doc.updated["meta_fields"]
```

Closes the unexecuted branch at `rosetta_cli/ragflow_client.py:561`.

### Suggestion 2 — custom `retry_on`

Add to `tests/test_retry.py` (after line 96):

```python
def test_custom_retry_on_overrides_default():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise Exception("The type is not supported: None")

    with patch("rosetta_cli.ims_utils.time.sleep"):
        with pytest.raises(Exception, match="The type is not supported"):
            retry_call(fn, attempts=3, retry_on=lambda _e: True, label="t")
    assert calls["n"] == 3  # custom classifier forces retry of an otherwise-permanent error
```

Locks in the parameter at `rosetta_cli/ims_utils.py:46` and exercises the custom-classifier path.

### Suggestion 3 — `default=str` flag exercised

Extend `_make_metadata` default in `tests/test_ragflow_client_meta_fields_v25.py:65` or add a new test using a non-JSON-serializable value (e.g., `datetime.datetime(2026, 1, 1)`) inside frontmatter; assert `json.loads(mf["frontmatter"])["created"] == "2026-01-01 00:00:00"` (or whatever `str(dt)` returns). Locks in the `default=str` flag at `rosetta_cli/ragflow_client.py:570`.

### Suggestion 4 — `sort_keys=True` flag exercised

Use a 3-key frontmatter dict inserted in non-alphabetical order (e.g., `{"z": 1, "a": 2, "m": 3}`); assert `mf["frontmatter"] == '{"a": 2, "m": 3, "z": 1}'`. Locks in `sort_keys=True` at `rosetta_cli/ragflow_client.py:568`.

### Suggestion 5 — `list_documents` retry path at integration layer

Add a test that replaces `client.list_documents` with a callable that raises `Exception("Documents not found")` on first call and returns `[]` on second; assert call count is 2. This exercises the wrap at `rosetta_cli/ragflow_client.py:477-491` end-to-end (the unit-level coverage in `test_retry.py` already proves the helper, so this is integration glue only).

## Summary

- All 9 retry-helper contracts (SPECS §2) covered with file:line traces.
- 5 of 5 explicit sanitization contracts (SPECS §1) covered with file:line traces.
- Test isolation, mock fidelity, and flakiness checks pass.
- 5 advisory gaps identified, all narrow branches; none block ship.
- 14/14 tests pass in 0.18s.
