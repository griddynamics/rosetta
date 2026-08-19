"""Regression checks for package-publish workflow concurrency policies."""

from pathlib import Path

import yaml

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = REPOSITORY_ROOT / ".github" / "workflows"


def load_workflow(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def test_helm_chart_validation_and_publish_use_separate_concurrency_groups() -> None:
    workflow = load_workflow("publish-mcp-helm-chart.yml")

    assert "concurrency" not in workflow
    assert workflow["jobs"]["validate"]["concurrency"] == {
        "group": "${{ github.workflow }}-${{ github.ref }}",
        "cancel-in-progress": True,
    }
    assert workflow["jobs"]["publish"]["concurrency"] == {
        "group": "publish-mcp-helm-chart-main",
        "cancel-in-progress": False,
    }


def test_other_package_publish_workflows_serialize_releases() -> None:
    expected_groups = {
        "publish-curiocity.yml": "publish-curiocity-main",
        "publish-ims-mcp.yml": "publish-ims-mcp-main",
        "publish-rosetta-cli.yml": "publish-rosetta-cli-main",
        "publish-rosetta-mcp.yml": "publish-rosetta-mcp-main",
        "publish-rosettify.yml": "publish-rosettify-main",
        "publish-rosettify-plugins.yml": "publish-rosettify-plugins-main",
        "publish-rosettify-prompts.yml": "publish-rosettify-prompts-main",
    }

    for workflow_name, group in expected_groups.items():
        workflow = load_workflow(workflow_name)
        assert workflow["concurrency"] == {
            "group": group,
            "cancel-in-progress": False,
        }
