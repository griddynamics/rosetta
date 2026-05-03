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


# --- dual-key reader tests (fm rename) ---


def test_listing_reads_fm_key_as_json_string():
    """New write shape: frontmatter stored under 'fm' as a JSON string."""
    import json
    bundler = Bundler(_DocClient())
    fm_dict = {"title": "New Key Title", "description": "A description"}
    docs = [
        _Doc(
            "1",
            "a.md",
            "A",
            {
                "sort_order": 1,
                "tags": ["t1", "skills/a.md"],
                "resource_path": "skills/a.md",
                "fm": json.dumps(fm_dict),
            },
        ),
    ]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: New Key Title' in xml


def test_listing_falls_back_to_legacy_frontmatter_dict():
    """Legacy read shape: frontmatter stored under 'frontmatter' as a dict."""
    bundler = Bundler(_DocClient())
    docs = [
        _Doc(
            "1",
            "a.md",
            "A",
            {
                "sort_order": 1,
                "tags": ["t1"],
                "resource_path": "agents/a.md",
                "frontmatter": {"title": "Legacy Dict Title"},
            },
        ),
    ]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: Legacy Dict Title' in xml


def test_listing_falls_back_to_legacy_frontmatter_str():
    """Legacy read shape: frontmatter stored under 'frontmatter' as a JSON string."""
    import json
    bundler = Bundler(_DocClient())
    fm_dict = {"title": "Legacy String Title"}
    docs = [
        _Doc(
            "1",
            "a.md",
            "A",
            {
                "sort_order": 1,
                "tags": ["t1"],
                "resource_path": "agents/a.md",
                "frontmatter": json.dumps(fm_dict),
            },
        ),
    ]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: Legacy String Title' in xml


def test_listing_fm_key_takes_precedence_over_legacy_frontmatter():
    """When both 'fm' and 'frontmatter' are present, 'fm' wins."""
    import json
    bundler = Bundler(_DocClient())
    docs = [
        _Doc(
            "1",
            "a.md",
            "A",
            {
                "sort_order": 1,
                "tags": ["t1"],
                "resource_path": "agents/a.md",
                "fm": json.dumps({"title": "FM Wins"}),
                "frontmatter": {"title": "Legacy Loses"},
            },
        ),
    ]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: FM Wins' in xml
    assert "Legacy Loses" not in xml


class _BaseLikeMeta:
    """Mimics the RAGFlow SDK ragflow_sdk.modules.base.Base object that backs
    Document.meta_fields in real responses: attribute access only, not a dict.
    Bundler._meta must extract both 'fm' and 'frontmatter' from this shape.
    """

    def __init__(self, **fields):
        for k, v in fields.items():
            setattr(self, k, v)


def test_listing_reads_fm_from_sdk_base_object():
    """Regression: when meta_fields is a SDK Base (attr-only, not dict),
    Bundler._meta must still pick up the 'fm' key. Previously it extracted
    only 'frontmatter' from Base objects, so fm-stored docs lost the
    frontmatter attribute in listing output.
    """
    import json
    bundler = Bundler(_DocClient())
    fm_dict = {"title": "Base FM Title", "description": "From Base object"}
    base_meta = _BaseLikeMeta(
        sort_order=1,
        tags=["t1"],
        resource_path="skills/a.md",
        fm=json.dumps(fm_dict),
    )
    docs = [_Doc("1", "a.md", "A", base_meta)]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: Base FM Title' in xml


def test_listing_reads_legacy_frontmatter_from_sdk_base_object():
    """Mirror of the above for the legacy 'frontmatter' key on a Base object."""
    bundler = Bundler(_DocClient())
    base_meta = _BaseLikeMeta(
        sort_order=1,
        tags=["t1"],
        resource_path="agents/a.md",
        frontmatter={"title": "Base Legacy Title"},
    )
    docs = [_Doc("1", "a.md", "A", base_meta)]
    xml = bundler.format_as_listing(docs, "aia-r2")
    assert 'frontmatter="title: Base Legacy Title' in xml
