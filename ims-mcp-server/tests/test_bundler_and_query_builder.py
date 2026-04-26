from ims_mcp.clients.document import DocumentClient
from ims_mcp.services.bundler import Bundler
from ims_mcp.services.query_builder import QueryBuilder


class _Doc:
    def __init__(self, doc_id, name, content, meta_fields):
        self.id = doc_id
        self.name = name
        self._content = content
        self.meta_fields = meta_fields

    def download(self):
        return self._content.encode("utf-8")


class _DocClient(DocumentClient):
    def download_content(self, doc):
        return doc._content


def test_bundler_sorts_and_wraps():
    bundler = Bundler(_DocClient())
    docs = [
        _Doc("2", "z.md", "Z", {"sort_order": 2, "tags": ["t2"], "resource_path": "rules/z.md"}),
        _Doc("1", "a.md", "A", {"sort_order": 1, "tags": ["t1"], "resource_path": "agents/a.md"}),
    ]

    xml = bundler.bundle(docs, "aia-r1")
    assert xml.index('id="1"') < xml.index('id="2"')
    assert '<rosetta:file id="1" dataset="aia-r1" path="agents/a.md" name="a.md" tags="t1">' in xml
    assert '<rosetta:file id="2" dataset="aia-r1" path="rules/z.md" name="z.md" tags="t2">' in xml


def test_listing_uses_frontmatter_attr_and_self_closing():
    bundler = Bundler(_DocClient())
    docs = [
        _Doc(
            "1",
            "a.md",
            "A",
            {
                "sort_order": 1,
                "tags": ["t1", "skills/a.md"],
                "resource_path": "skills/a.md",
                "frontmatter": {
                    "title": 'A "quoted" title',
                    "nested": {"k": "v"},
                },
            },
        ),
    ]

    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'tag="skills/a.md"' in xml
    assert 'tags="' not in xml
    assert 'frontmatter="title: A &quot;quoted&quot; title' in xml
    assert "resource_path=" not in xml
    assert "<content_not_loaded/>" not in xml
    assert "/>" in xml


def test_format_as_listing_keeps_duplicate_paths_as_separate_entries():
    bundler = Bundler(_DocClient())
    docs = [
        _Doc("2", "same-b.md", "SECOND", {"sort_order": 2, "tags": ["t2"], "resource_path": "rules/same.md"}),
        _Doc("1", "same-a.md", "FIRST", {"sort_order": 1, "tags": ["t1"], "resource_path": "rules/same.md"}),
        _Doc("3", "other.md", "OTHER", {"sort_order": 3, "tags": ["t3"], "resource_path": "rules/other.md"}),
    ]

    xml = bundler.format_as_listing(docs, "aia-r2")

    assert xml.count('path="rules/same.md"') == 2
    assert 'id="1"' in xml
    assert 'id="2"' in xml
    assert "FIRST" not in xml
    assert "SECOND" not in xml
    assert 'path="rules/other.md"' in xml
    assert "OTHER" not in xml


def test_query_builder_tag_format():
    import json
    qb = QueryBuilder()
    params = qb.build_list_params(tags=["agents", "r1"])
    assert "keywords" not in params
    mc = json.loads(params["metadata_condition"])
    assert mc["logic"] == "or"
    assert len(mc["conditions"]) == 2
    assert mc["conditions"][0] == {"name": "tags", "comparison_operator": "contains", "value": "agents"}
    assert mc["conditions"][1] == {"name": "tags", "comparison_operator": "contains", "value": "r1"}


def test_query_builder_query_as_keywords():
    qb = QueryBuilder()
    params = qb.build_list_params(query="bootstrap")
    assert params["keywords"] == "bootstrap"
    assert "metadata_condition" not in params


def test_query_builder_tags_and_query():
    import json
    qb = QueryBuilder()
    params = qb.build_list_params(tags=["r1"], query="bootstrap")
    assert params["keywords"] == "bootstrap"
    mc = json.loads(params["metadata_condition"])
    assert mc["conditions"][0]["value"] == "r1"


# ── Frontmatter stripping ────────────────────────────────────────────────────

class TestStripFrontmatter:
    def test_strips_yaml_frontmatter(self):
        content = "---\nname: test\ndescription: foo\n---\n\n# Title\ncontent here"
        result = Bundler._strip_frontmatter(content)
        assert result == "# Title\ncontent here"

    def test_no_frontmatter_unchanged(self):
        content = "# Title\ncontent here"
        assert Bundler._strip_frontmatter(content) == content

    def test_empty_frontmatter(self):
        content = "---\n---\n\n# Title"
        result = Bundler._strip_frontmatter(content)
        assert result == "# Title"

    def test_four_dashes(self):
        content = "----\nname: test\n----\n\n# Title"
        result = Bundler._strip_frontmatter(content)
        assert result == "# Title"

    def test_trailing_whitespace_on_delimiter(self):
        content = "---  \nname: test\n---  \n\n# Title"
        result = Bundler._strip_frontmatter(content)
        assert result == "# Title"

    def test_no_leading_newlines_after_strip(self):
        content = "---\nname: test\n---\n\n\n\n# Title"
        result = Bundler._strip_frontmatter(content)
        assert result == "# Title"

    def test_frontmatter_not_at_start_is_unchanged(self):
        content = "some text\n---\nname: test\n---\n# Title"
        result = Bundler._strip_frontmatter(content)
        assert result == content

    def test_bundle_strip_frontmatter_false_keeps_frontmatter(self):
        bundler = Bundler(_DocClient())
        docs = [
            _Doc(
                "1",
                "a.md",
                "---\nname: a\n---\n\n# Title",
                {"sort_order": 1, "tags": ["t1"], "resource_path": "rules/a.md"},
            )
        ]
        xml = bundler.bundle(docs, "ds", strip_frontmatter=False)
        assert "---\nname: a\n---" in xml
        assert "# Title" in xml

    def test_bundle_strip_frontmatter_true_removes_frontmatter(self):
        bundler = Bundler(_DocClient())
        docs = [
            _Doc(
                "1",
                "a.md",
                "---\nname: a\n---\n\n# Title",
                {"sort_order": 1, "tags": ["t1"], "resource_path": "rules/a.md"},
            )
        ]
        xml = bundler.bundle(docs, "ds", strip_frontmatter=True)
        assert "---\nname: a\n---" not in xml
        assert "# Title" in xml

    def test_bundle_default_does_not_strip(self):
        bundler = Bundler(_DocClient())
        docs = [
            _Doc(
                "1",
                "a.md",
                "---\nname: a\n---\n\n# Title",
                {"sort_order": 1, "tags": ["t1"], "resource_path": "rules/a.md"},
            )
        ]
        xml = bundler.bundle(docs, "ds")
        assert "---\nname: a\n---" in xml
