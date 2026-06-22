from pathlib import Path
from uuid import uuid4

from rosetta_cli.ims_publisher import ContentPublisher


class _FakeDoc:
    def __init__(self, name: str, meta_fields: dict[str, object], doc_id: str | None = None):
        self.id = doc_id or str(uuid4())
        self.name = name
        self.meta_fields = dict(meta_fields)


class _FakeDataset:
    def __init__(self, docs: list[_FakeDoc], dataset_id: str):
        self.docs = docs
        self.id = dataset_id
        self.deleted_ids: list[str] = []

    def delete_documents(self, ids):
        self.deleted_ids.extend(ids)


class _FakeClient:
    def __init__(self, datasets: dict[str, _FakeDataset]):
        self.datasets = datasets
        self.page_size = 1000

    def get_dataset(self, name: str):
        return self.datasets.get(name)

    def list_documents(self, dataset, page_size=1000, metadata_condition=None):
        docs = list(dataset.docs)
        if metadata_condition:
            for condition in metadata_condition.get("conditions", []):
                field = condition.get("name")
                operator = condition.get("comparison_operator")
                value = condition.get("value")
                if operator == "not empty":
                    docs = [doc for doc in docs if str(doc.meta_fields.get(field, "")) != ""]
                elif operator == "is":
                    docs = [doc for doc in docs if str(doc.meta_fields.get(field, "")) == str(value)]
        return docs[:page_size]


def _write_instruction(root: Path, rel_path: str, content: str = "body\n") -> Path:
    path = root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def _server_doc(original_path: str, domain: str, release: str = "r2") -> _FakeDoc:
    return _FakeDoc(
        name=original_path,
        meta_fields={
            "original_path": original_path,
            "domain": domain,
            "release": release,
            "ims_doc_id": f"{domain}-{Path(original_path).stem}",
            "content_hash": f"hash-{original_path}",
        },
    )


def test_publish_folder_dry_run_orphans_are_scoped_to_managed_domains(tmp_path: Path, capsys):
    workspace = tmp_path / "repo"
    instructions_root = workspace / "instructions"
    _write_instruction(instructions_root, "r2/core/skills/planning/SKILL.md")

    dataset = _FakeDataset(
        docs=[
            _server_doc("r2/core/agents/old.md", domain="core"),
            _server_doc("r2/grid/agents/prompt-engineer.md", domain="grid"),
        ],
        dataset_id="aia-r2-id",
    )
    client = _FakeClient({"aia-r2": dataset})
    publisher = ContentPublisher(client, str(workspace))

    publisher.publish_folder(str(instructions_root), dry_run=True, parse_documents=False)

    output = capsys.readouterr().out
    assert "'aia-r2': 1 orphan(s)" in output
    assert "[DRY RUN] Would delete: r2/core/agents/old.md" in output
    assert "r2/grid/agents/prompt-engineer.md" not in output
    assert dataset.deleted_ids == []


def test_publish_folder_dry_run_cleans_all_managed_domains_present_locally(tmp_path: Path, capsys):
    workspace = tmp_path / "repo"
    instructions_root = workspace / "instructions"
    _write_instruction(instructions_root, "r2/core/skills/planning/SKILL.md")
    _write_instruction(instructions_root, "r2/grid/skills/research/SKILL.md")

    dataset = _FakeDataset(
        docs=[
            _server_doc("r2/core/agents/old.md", domain="core"),
            _server_doc("r2/grid/agents/old.md", domain="grid"),
        ],
        dataset_id="aia-r2-id",
    )
    client = _FakeClient({"aia-r2": dataset})
    publisher = ContentPublisher(client, str(workspace))

    publisher.publish_folder(str(instructions_root), dry_run=True, parse_documents=False)

    output = capsys.readouterr().out
    assert "'aia-r2': 2 orphan(s)" in output
    assert "[DRY RUN] Would delete: r2/core/agents/old.md" in output
    assert "[DRY RUN] Would delete: r2/grid/agents/old.md" in output
    assert dataset.deleted_ids == []
