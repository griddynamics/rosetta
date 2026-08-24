"""Regression tests for `_cleanup_duplicates` (issue #194).

Its docstring promises "Custom documents (no original_path) are never affected".
Before the fix, two passes broke that promise:

* the incomplete-metadata pass queued any doc missing `ims_doc_id` **or**
  `original_path`, so every custom doc was swept;
* the name-duplicate pass grouped over `all_docs`, so a custom doc whose stripped
  name collided with a managed one was swept too.

The tests below pin both guarantees, and keep positive controls so the fix cannot
be satisfied by simply deleting nothing.
"""

from types import SimpleNamespace

# Reuse the fake RAGFlow harness that already backs the orphan-cleanup tests.
from test_publish_domain_scoped_orphan_cleanup import (
    _FakeClient,
    _FakeDataset,
    _FakeDoc,
)

from rosetta_cli.rosetta_publisher import ContentPublisher


def _cache(original_path: str, release: str = "r2") -> SimpleNamespace:
    """A local-file cache entry as `_cleanup_duplicates` consumes it."""
    return SimpleNamespace(
        original_path=original_path,
        release=release,
        ims_doc_id=f"ims-{original_path}",
    )


def _managed_doc(original_path: str, doc_id: str, name: str | None = None) -> _FakeDoc:
    return _FakeDoc(
        name=name if name is not None else original_path,
        meta_fields={
            "original_path": original_path,
            "ims_doc_id": f"ims-{original_path}",
            "release": "r2",
        },
        doc_id=doc_id,
    )


def _run_cleanup(docs: list[_FakeDoc], caches: list[SimpleNamespace], tmp_path):
    dataset = _FakeDataset(docs=docs, dataset_id="aia-r2-id")
    client = _FakeClient({"aia-r2": dataset})
    publisher = ContentPublisher(client, str(tmp_path / "repo"))
    publisher._cleanup_duplicates(caches, dry_run=False)
    return dataset


# --- the documented guarantee -------------------------------------------------


def test_custom_document_without_original_path_is_never_deleted(tmp_path):
    """#194: a hand-uploaded doc carrying no managed metadata must survive."""
    custom = _FakeDoc(name="hand-uploaded.pdf", meta_fields={}, doc_id="custom-1")
    managed = _managed_doc("r2/core/skills/planning/SKILL.md", doc_id="managed-1")

    dataset = _run_cleanup(
        [custom, managed],
        [_cache("r2/core/skills/planning/SKILL.md")],
        tmp_path,
    )

    assert dataset.deleted_ids == []


def test_custom_document_with_partial_metadata_is_never_deleted(tmp_path):
    """A doc with an ims_doc_id but no original_path is still not ours to delete."""
    custom = _FakeDoc(
        name="hand-uploaded.pdf",
        meta_fields={"ims_doc_id": "some-id"},
        doc_id="custom-1",
    )

    dataset = _run_cleanup(
        [custom, _managed_doc("r2/core/agents/x.md", doc_id="managed-1")],
        [_cache("r2/core/agents/x.md")],
        tmp_path,
    )

    assert dataset.deleted_ids == []


def test_custom_document_colliding_by_name_is_never_deleted(tmp_path):
    """#194: the name-duplicate pass must not reach across into custom docs."""
    managed = _managed_doc("r2/core/skills/planning/SKILL.md", doc_id="managed-1")
    custom_collision = _FakeDoc(
        name="r2/core/skills/planning/SKILL(1).md",
        meta_fields={},
        doc_id="custom-1",
    )

    dataset = _run_cleanup(
        [managed, custom_collision],
        [_cache("r2/core/skills/planning/SKILL.md")],
        tmp_path,
    )

    assert dataset.deleted_ids == []


# --- positive controls: real duplicates are still removed ---------------------


def test_managed_document_missing_ims_doc_id_is_still_deleted(tmp_path):
    """original_path present, ims_doc_id absent -> a stale managed doc."""
    stale = _FakeDoc(
        name="r2/core/agents/stale.md",
        meta_fields={"original_path": "r2/core/agents/stale.md", "release": "r2"},
        doc_id="stale-1",
    )

    dataset = _run_cleanup(
        [stale],
        [_cache("r2/core/skills/planning/SKILL.md")],
        tmp_path,
    )

    assert dataset.deleted_ids == ["stale-1"]


def test_duplicate_original_path_still_deletes_every_copy(tmp_path):
    """Two managed docs sharing an original_path are both removed; publish recreates."""
    first = _managed_doc("r2/core/agents/dup.md", doc_id="dup-1")
    second = _managed_doc("r2/core/agents/dup.md", doc_id="dup-2")

    dataset = _run_cleanup(
        [first, second],
        [_cache("r2/core/agents/dup.md")],
        tmp_path,
    )

    assert sorted(dataset.deleted_ids) == ["dup-1", "dup-2"]


def test_managed_name_duplicates_are_still_deleted(tmp_path):
    """foo.md + foo(1).md, both managed, are still treated as name duplicates."""
    original = _managed_doc("r2/core/agents/foo.md", doc_id="name-1")
    suffixed = _managed_doc(
        "r2/core/agents/foo-copy.md",
        doc_id="name-2",
        name="r2/core/agents/foo(1).md",
    )

    dataset = _run_cleanup(
        [original, suffixed],
        [_cache("r2/core/agents/foo.md")],
        tmp_path,
    )

    assert sorted(dataset.deleted_ids) == ["name-1", "name-2"]


def test_clean_dataset_deletes_nothing(tmp_path):
    """No duplicates, no custom docs -> no deletions."""
    dataset = _run_cleanup(
        [
            _managed_doc("r2/core/agents/a.md", doc_id="a"),
            _managed_doc("r2/core/agents/b.md", doc_id="b"),
        ],
        [_cache("r2/core/agents/a.md"), _cache("r2/core/agents/b.md")],
        tmp_path,
    )

    assert dataset.deleted_ids == []


def test_dry_run_never_deletes(tmp_path):
    """dry_run reports without touching the dataset."""
    stale = _FakeDoc(
        name="r2/core/agents/stale.md",
        meta_fields={"original_path": "r2/core/agents/stale.md", "release": "r2"},
        doc_id="stale-1",
    )
    dataset = _FakeDataset(docs=[stale], dataset_id="aia-r2-id")
    client = _FakeClient({"aia-r2": dataset})
    publisher = ContentPublisher(client, str(tmp_path / "repo"))

    publisher._cleanup_duplicates([_cache("r2/core/agents/x.md")], dry_run=True)

    assert dataset.deleted_ids == []
