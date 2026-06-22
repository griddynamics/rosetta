"""Unit tests for project dataset naming (transparent prefix)."""

from types import SimpleNamespace

from ims_mcp.config import RosettaConfig
from ims_mcp.context import CallContext
from ims_mcp.clients.dataset import DatasetLookup
from ims_mcp.tools.projects import _to_dataset_name, _to_project_name
from ims_mcp.tools.validation import normalize_project_name


class _Ragflow:
    def __init__(self, datasets=None):
        self._datasets = datasets or []

    def list_datasets(self, page=1, page_size=1000):
        return list(self._datasets)


class _SelectiveAuthorizer:
    def __init__(self, readable: set[str]):
        self.readable = readable

    def can_read(self, dataset_name: str, user_email: str) -> bool:
        return dataset_name in self.readable


def make_call_ctx(*, authorizer=None, ragflow=None) -> CallContext:
    ragflow = ragflow or _Ragflow()
    return CallContext(
        config=RosettaConfig.from_env(),
        ragflow=ragflow,
        dataset_lookup=DatasetLookup(ragflow=ragflow),
        ctx=None,
        username="tester",
        repository="RulesOfPower",
        tool_name="test",
        params={},
        user_email="tester@example.com",
        authorizer=authorizer or _SelectiveAuthorizer(set()),
    )


class TestToDatasetName:
    def test_adds_prefix(self):
        assert _to_dataset_name("myapp") == "project-myapp"

    def test_always_adds_prefix(self):
        assert _to_dataset_name("project-myapp") == "project-project-myapp"

    def test_empty(self):
        assert _to_dataset_name("") == "project-"


class TestToProjectName:
    def test_strips_prefix(self):
        assert _to_project_name("project-myapp") == "myapp"

    def test_no_prefix_passthrough(self):
        assert _to_project_name("myapp") == "myapp"

    def test_prefix_only(self):
        assert _to_project_name("project-") == ""


class TestNormalizeProjectName:
    def test_accepts_regular_name(self):
        assert normalize_project_name("my repo")[0] == "my repo"

    def test_rejects_path_like_values(self):
        assert normalize_project_name("../demo")[1] == "Error: repository_name must not contain '/' or '\\' characters"
        assert normalize_project_name("demo/test")[1] == "Error: repository_name must not contain '/' or '\\' characters"
        assert normalize_project_name(r"demo\test")[1] == "Error: repository_name must not contain '/' or '\\' characters"


class TestDiscoverProjectsOrdering:
    @staticmethod
    async def _run():
        from ims_mcp.tools.projects import discover_projects

        ragflow = _Ragflow(
            datasets=[
                SimpleNamespace(id="1", name="project-zeta"),
                SimpleNamespace(id="9", name="project-alpha"),
                SimpleNamespace(id="2", name="project-bravo"),
            ]
        )
        call_ctx = make_call_ctx(
            ragflow=ragflow,
            authorizer=_SelectiveAuthorizer({"project-zeta", "project-alpha", "project-bravo"}),
        )
        return await discover_projects(call_ctx=call_ctx)

    def test_sorts_by_project_name_not_dataset_id(self):
        import asyncio

        result = asyncio.run(self._run())
        assert result.index('name="alpha"') < result.index('name="bravo"') < result.index('name="zeta"')
