from pathlib import Path

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
