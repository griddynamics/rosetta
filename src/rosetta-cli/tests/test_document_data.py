from pathlib import Path

import pytest

from rosetta_cli.services.document_data import DocumentData


def test_frontmatter_metadata_merge_and_sort_order(tmp_path: Path):
    workspace = tmp_path / "ws"
    file_path = workspace / "instructions" / "agents" / "r1" / "x.md"
    file_path.parent.mkdir(parents=True)
    file_path.write_text(
        """---\ntags: [alpha, Agents]\nsort_order: 7\n---\n\nbody\n""",
        encoding="utf-8",
    )

    data = DocumentData.from_file(
        file_path=file_path,
        workspace_root=workspace,
        publish_root=workspace / "instructions",
    )

    assert data.sort_order == 7
    assert data.original_path == "agents/r1/x.md"
    assert "instructions" in data.tags
    assert "alpha" in data.tags


def test_hash_changes_when_sort_order_changes(tmp_path: Path):
    workspace = tmp_path / "ws"
    path = workspace / "instructions" / "agents" / "r1" / "same.md"
    path.parent.mkdir(parents=True)

    path.write_text("---\nsort_order: 1\n---\n\nbody\n", encoding="utf-8")
    a = DocumentData.from_file(path, workspace_root=workspace, publish_root=workspace / "instructions")
    path.write_text("---\nsort_order: 2\n---\n\nbody\n", encoding="utf-8")
    b = DocumentData.from_file(path, workspace_root=workspace, publish_root=workspace / "instructions")

    assert a.content_hash != b.content_hash


def test_r2_normalized_paths_drive_metadata(tmp_path: Path):
    workspace = tmp_path / "ws"
    path = workspace / "instructions" / "r2" / "core" / "skills" / "planning" / "SKILL.md"
    path.parent.mkdir(parents=True)
    path.write_text("body\n", encoding="utf-8")

    data = DocumentData.from_file(path, workspace_root=workspace, publish_root=workspace / "instructions")

    assert data.release == "r2"
    assert data.domain == "core"
    assert data.original_path == "r2/core/skills/planning/SKILL.md"
    assert data.doc_title == "core/skills/planning/SKILL.md"
    assert data.resource_path == "skills/planning/SKILL.md"
    assert "instructions" in data.tags
    assert "planning/SKILL.md" in data.tags
    assert "skills/planning/SKILL.md" in data.tags


def test_hash_changes_when_resource_path_changes():
    hash_a = DocumentData._calculate_hash(
        content="body",
        tags=["instructions", "r2", "core", "agents", "planner.md"],
        domain="core",
        release="r2",
        title="core/agents/planner.md",
        doc_name="core/agents/planner.md",
        sort_order=1,
        original_path="r2/core/agents/planner.md",
        resource_path="agents/planner.md",
    )
    hash_b = DocumentData._calculate_hash(
        content="body",
        tags=["instructions", "r2", "core", "agents", "planner.md"],
        domain="core",
        release="r2",
        title="core/agents/planner.md",
        doc_name="core/agents/planner.md",
        sort_order=1,
        original_path="r2/core/agents/planner.md",
        resource_path="agents-v2/planner.md",
    )

    assert hash_a != hash_b


def test_hash_changes_when_doc_name_changes():
    hash_a = DocumentData._calculate_hash(
        content="body",
        tags=["instructions", "r2", "core", "agents", "planner.md"],
        domain="core",
        release="r2",
        title="core/agents/planner.md",
        doc_name="core/agents/planner.md",
        sort_order=1,
        original_path="r2/core/agents/planner.md",
        resource_path="agents/planner.md",
    )
    hash_b = DocumentData._calculate_hash(
        content="body",
        tags=["instructions", "r2", "core", "agents", "planner.md"],
        domain="core",
        release="r2",
        title="core/agents/planner.md",
        doc_name="planner.md",
        sort_order=1,
        original_path="r2/core/agents/planner.md",
        resource_path="agents/planner.md",
    )

    assert hash_a != hash_b


@pytest.mark.parametrize("extension", [".bin", ".pdf"])
def test_binary_hash_changes_for_same_size_replacement(tmp_path: Path, extension: str):
    path = tmp_path / f"asset{extension}"
    path.write_bytes(b"\x00\xff\x01\x02")
    original = DocumentData.from_file(path, workspace_root=tmp_path)
    path.write_bytes(b"\x00\xfe\x01\x02")
    replacement = DocumentData.from_file(path, workspace_root=tmp_path)

    assert not original.is_text and not replacement.is_text
    assert original.content_str is None and replacement.content_str is None
    assert len(original.content) == len(replacement.content)
    assert original.ims_doc_id == replacement.ims_doc_id
    assert original.tags == replacement.tags
    assert original.content_hash != replacement.content_hash


@pytest.mark.parametrize("content", [b"", b"\x00\xff\x01", b"text in a binary extension"])
def test_binary_hash_is_stable_for_identical_bytes(tmp_path: Path, content: bytes):
    path = tmp_path / "asset.bin"
    path.write_bytes(content)
    original = DocumentData.from_file(path, workspace_root=tmp_path)
    path.write_bytes(content)
    unchanged = DocumentData.from_file(path, workspace_root=tmp_path)

    assert original.content == unchanged.content == content
    assert original.content_hash == unchanged.content_hash


def test_text_hash_preserves_existing_format(tmp_path: Path):
    path = tmp_path / "example.md"
    content = "# Example\r\n\nUnicode: café\n"
    path.write_bytes(content.encode("utf-8"))
    data = DocumentData.from_file(path, workspace_root=tmp_path)

    assert data.is_text
    assert data.content_hash == DocumentData._calculate_hash(
        content, data.tags, data.domain, data.release, data.doc_title,
        data.doc_title, data.sort_order, data.original_path, data.resource_path,
    )


def test_invalid_utf8_text_suffix_uses_binary_content_state(tmp_path: Path):
    path = tmp_path / "example.md"
    path.write_bytes(b"\xff---\ntags: [ignored]\n---\nbody")
    original = DocumentData.from_file(path, workspace_root=tmp_path)
    path.write_bytes(b"\xfe---\ntags: [ignored]\n---\nbody")
    replacement = DocumentData.from_file(path, workspace_root=tmp_path)

    assert not original.is_text and not replacement.is_text
    assert original.content_str is None and replacement.content_str is None
    assert original.line_count is None and replacement.line_count is None
    assert original.frontmatter is None and replacement.frontmatter is None
    assert "ignored" not in original.tags and "ignored" not in replacement.tags
    assert original.content_hash != replacement.content_hash


def test_binary_hash_still_includes_metadata(tmp_path: Path):
    path = tmp_path / "asset.bin"
    path.write_bytes(b"\x00\xff")
    original = DocumentData.from_file(path, workspace_root=tmp_path)
    renamed_path = path.rename(tmp_path / "renamed.bin")
    renamed = DocumentData.from_file(renamed_path, workspace_root=tmp_path)

    assert original.content == renamed.content
    assert original.content_hash != renamed.content_hash
