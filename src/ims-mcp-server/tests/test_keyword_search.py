from ims_mcp.services.keyword_search import list_docs_with_keyword_fallback


class _Doc:
    def __init__(self, doc_id: str):
        self.id = doc_id


class _DocClient:
    def __init__(self, mapping: dict[str, list[_Doc]]):
        self.mapping = mapping
        self.calls = []

    def list_docs(self, *, dataset, page_size, metadata_condition=None, keywords=None):
        self.calls.append(keywords)
        return list(self.mapping.get(keywords or "", []))


class _QueryBuilder:
    def build_list_params(self, tags=None, query=None):
        return {"metadata_condition": "x" if tags else None, "keywords": query}


def test_phrase_hit_skips_token_fallback():
    dc = _DocClient({"retry test document": [_Doc("d1")]})
    docs = list_docs_with_keyword_fallback(
        document_client=dc,
        dataset=object(),
        query_builder=_QueryBuilder(),
        tags=None,
        query="retry test document",
    )
    assert [d.id for d in docs] == ["d1"]
    assert dc.calls == ["retry test document"]


def test_phrase_miss_falls_back_to_tokens_and_dedupes():
    dc = _DocClient(
        {
            "retry test document": [],
            "retry": [_Doc("d1")],
            "test": [_Doc("d1"), _Doc("d2")],
            "document": [],
        }
    )
    docs = list_docs_with_keyword_fallback(
        document_client=dc,
        dataset=object(),
        query_builder=_QueryBuilder(),
        tags=None,
        query="retry test document",
    )
    assert [d.id for d in docs] == ["d1", "d2"]
    assert dc.calls == ["retry test document", "retry", "test", "document"]
