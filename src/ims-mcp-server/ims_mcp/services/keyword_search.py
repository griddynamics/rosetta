"""Shared keyword-search helpers for document listing."""

from __future__ import annotations

from typing import cast

from ims_mcp.clients.document import DocumentClient
from ims_mcp.services.query_builder import QueryBuilder
from ims_mcp.typing_utils import DatasetLike, DocumentLike


def list_docs_with_keyword_fallback(
    *,
    document_client: DocumentClient,
    dataset: DatasetLike,
    query_builder: QueryBuilder,
    tags: list[str] | None,
    query: str | None,
    page_size: int = 1000,
) -> list[DocumentLike]:
    """List docs by phrase query, fallback to token queries when needed.

    Behavior:
    1) Run the original phrase query once.
    2) If no docs and query has multiple words, run one query per token.
    """
    params = query_builder.build_list_params(tags=tags, query=query)
    docs = document_client.list_docs(
        dataset=dataset,
        page_size=page_size,
        keywords=cast(str | None, params.get("keywords")),
        metadata_condition=cast(str | None, params.get("metadata_condition")),
    )

    query_text = (query or "").strip()
    if docs or not query_text or " " not in query_text:
        return docs

    seen_ids = {getattr(doc, "id", None) for doc in docs}
    for token in [part.strip() for part in query_text.split() if part.strip()]:
        token_params = query_builder.build_list_params(tags=tags, query=token)
        token_docs = document_client.list_docs(
            dataset=dataset,
            page_size=page_size,
            keywords=cast(str | None, token_params.get("keywords")),
            metadata_condition=cast(str | None, token_params.get("metadata_condition")),
        )
        for doc in token_docs:
            doc_id = getattr(doc, "id", None)
            if doc_id in seen_ids:
                continue
            docs.append(doc)
            seen_ids.add(doc_id)
    return docs
