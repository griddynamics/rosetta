"""Project-context tools."""

from __future__ import annotations

import json
from typing import cast

from ims_mcp.clients.document import DocumentClient
from ims_mcp.constants import (
    COMPATIBILITY_MODE_ERROR,
    POLICY_ALL,
    PROJECT_DATASET_PREFIX,
    QUERY_TOO_MANY_THRESHOLD,
    XML_DATASET,
)
from ims_mcp.context import CallContext
from ims_mcp.services.bundler import Bundler
from ims_mcp.services.invite import auto_invite
from ims_mcp.services.keyword_search import list_docs_with_keyword_fallback
from ims_mcp.services.query_builder import QueryBuilder
from ims_mcp.typing_utils import DocumentLike, JsonArray, JsonObject, as_json_object
from ims_mcp.tools.validation import (
    normalize_content,
    normalize_discover_query,
    normalize_project_name,
    normalize_query,
    normalize_relative_path,
    normalize_tags,
)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _to_dataset_name(project_name: str) -> str:
    # Contract: callers pass raw project names; Rosetta always adds the
    # internal `project-` dataset prefix here and strips it on output.
    """Map a user-facing project name to its RAGFlow dataset name."""
    return f"{PROJECT_DATASET_PREFIX}{project_name}"


def _to_project_name(dataset_name: str) -> str:
    # Reverse side of the same contract: external callers never see the
    # internal `project-` dataset prefix in tool output.
    """Strip the dataset prefix to get the user-facing project name."""
    if dataset_name.startswith(PROJECT_DATASET_PREFIX):
        return dataset_name[len(PROJECT_DATASET_PREFIX):]
    return dataset_name


def _should_auto_invite(call_ctx: CallContext) -> bool:
    return not (
        call_ctx.config.read_policy == POLICY_ALL
        and call_ctx.config.write_policy == POLICY_ALL
    )


def _tagged_title(document: str, tags: list[str]) -> str:
    return document


def _unique_docs(docs: list[DocumentLike]) -> list[DocumentLike]:
    seen: set[str] = set()
    out: list[DocumentLike] = []
    for doc in docs:
        if doc.id not in seen:
            out.append(doc)
            seen.add(doc.id)
    return out


def _extract_tags(doc: DocumentLike) -> set[str]:
    meta = getattr(doc, "meta_fields", {}) or {}
    if isinstance(meta, str):
        try:
            meta = as_json_object(json.loads(meta))
        except Exception:
            meta = {}
    if not isinstance(meta, dict) and hasattr(meta, "__dict__"):
        meta = as_json_object({k: v for k, v in vars(meta).items() if k != "rag"})
    if isinstance(meta, dict):
        tags = meta.get("tags", [])
    else:
        tags = getattr(meta, "tags", [])
    return {str(tag).lower() for tag in tags if str(tag).strip()}


def _filter_docs_by_all_tags(docs: list[DocumentLike], tags: list[str] | None) -> list[DocumentLike]:
    required = {tag.strip().lower() for tag in (tags or []) if tag and tag.strip()}
    if not required:
        return docs
    return [doc for doc in docs if required.issubset(_extract_tags(doc))]


# ------------------------------------------------------------------
# Tools
# ------------------------------------------------------------------

async def query_project_context(
    call_ctx: CallContext,
    document_client: DocumentClient,
    bundler: Bundler,
    query_builder: QueryBuilder,
    repository_name: str,
    query: str | None = None,
    tags: list[str] | None = None,
    topic: str | None = None,
) -> str:
    if call_ctx.config.compatibility_mode:
        return COMPATIBILITY_MODE_ERROR
    normalized_repo, repo_err = normalize_project_name(repository_name)
    if repo_err:
        return repo_err
    normalized_query, query_err = normalize_query(query)
    if query_err:
        return query_err
    normalized_tags, tags_err = normalize_tags(tags)
    if tags_err:
        return tags_err
    if not normalized_query and not normalized_tags:
        return "Error: at least one of query or tags is required"

    assert normalized_repo is not None
    dataset_name = _to_dataset_name(normalized_repo)

    if not call_ctx.authorizer.can_read(dataset_name, call_ctx.user_email):
        return f"Error: read is not permitted on '{normalized_repo}'"

    dataset_id = call_ctx.dataset_lookup.get_id(dataset_name)
    if not dataset_id:
        return f"Error: project '{normalized_repo}' not found"

    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception as exc:
        return f"Error: could not open project '{normalized_repo}': {exc}"

    if not dataset:
        return f"Error: project '{normalized_repo}' not found"

    docs = []

    # Keyword search: tags via metadata_condition, query via keywords.
    if normalized_tags or normalized_query:
        try:
            docs.extend(
                list_docs_with_keyword_fallback(
                    document_client=document_client,
                    dataset=dataset,
                    query_builder=query_builder,
                    tags=normalized_tags,
                    query=normalized_query,
                    page_size=1000,
                )
            )
        except Exception as exc:
            return f"Error: failed to list project context: {exc}"

    # Semantic expansion via retrieve when topic is provided.
    if topic and topic.strip():
        try:
            semantic = call_ctx.ragflow.retrieve(
                **query_builder.build_retrieve_params(
                    dataset_ids=[dataset_id],
                    query=topic.strip(),
                    tags=normalized_tags,
                )
            )
            for chunk in semantic:
                if getattr(chunk, "document_id", ""):
                    docs.extend(document_client.list_docs(dataset=dataset, doc_id=chunk.document_id, page_size=1))
        except Exception:
            # Semantic expansion should not block keyword results.
            pass

    docs = _filter_docs_by_all_tags(_unique_docs(docs), normalized_tags)
    if not docs:
        return "No project context found"
    # Defensive ceiling: a server-side metadata_condition filter bypass on
    # RAGFlow 0.25.x can dump every doc in the dataset; refuse to bundle.
    if len(docs) > QUERY_TOO_MANY_THRESHOLD:
        return "Error: No documents found or too many documents found"
    return bundler.bundle(docs, normalized_repo)


async def store_project_context(
    call_ctx: CallContext,
    document_client: DocumentClient,
    repository_name: str,
    document: str,
    tags: list[str],
    content: str,
    force: bool = False,
) -> str:
    if call_ctx.config.compatibility_mode:
        return COMPATIBILITY_MODE_ERROR
    normalized_repo, repo_err = normalize_project_name(repository_name)
    if repo_err:
        return repo_err
    normalized_document, document_err = normalize_relative_path(document, field="document")
    if document_err:
        return document_err
    normalized_tags, tags_err = normalize_tags(tags, required=True)
    if tags_err:
        return tags_err
    normalized_content, content_err = normalize_content(content)
    if content_err:
        return content_err

    assert normalized_repo is not None
    assert normalized_document is not None
    assert normalized_tags is not None
    assert normalized_content is not None
    dataset_name = _to_dataset_name(normalized_repo)

    if not call_ctx.authorizer.can_write(dataset_name, call_ctx.user_email):
        return f"Error: write is not permitted on '{normalized_repo}'"

    dataset_id = call_ctx.dataset_lookup.get_id(dataset_name)

    if not dataset_id:
        if not force:
            return (
                f"Error: project '{normalized_repo}' not found. "
                "Run discover_projects first, then retry with force=true if creation is intended."
            )
        if not call_ctx.authorizer.can_create(call_ctx.user_email):
            return "Error: creating new projects is not permitted"
        try:
            dataset = call_ctx.ragflow.create_dataset(name=dataset_name, permission="team")
        except Exception as exc:
            return f"Error: could not create project '{normalized_repo}': {exc}"
        call_ctx.dataset_lookup.invalidate()
        call_ctx.dataset_lookup.remember(dataset)
        if _should_auto_invite(call_ctx):
            await auto_invite(
                ragflow=call_ctx.ragflow,
                dataset=dataset,
                config=call_ctx.config,
                user_email=call_ctx.user_email,
                invite_emails=call_ctx.config.invite_emails,
            )
    else:
        try:
            dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
        except Exception as exc:
            return f"Error: could not open project '{normalized_repo}': {exc}"

    if not dataset:
        return f"Error: project '{normalized_repo}' not found"

    title = _tagged_title(document=normalized_document, tags=normalized_tags)
    meta_fields: JsonObject = {
        "tags": cast(JsonArray, normalized_tags),
        "resource_path": normalized_document,
    }
    try:
        upserted = document_client.upsert_doc(
            dataset=dataset,
            name=title,
            content=normalized_content.encode("utf-8"),
            meta_fields=meta_fields,
        )
    except Exception as exc:
        return f"Error: could not store '{normalized_document}' in '{normalized_repo}': {exc}"

    parse_warning = ""
    try:
        document_client.submit_background_parse(dataset=dataset, document_ids=[upserted.id])
    except Exception as exc:
        parse_warning = f" WARNING: background parsing was not submitted: {exc}"

    return (
        f"Stored '{normalized_document}' in project '{normalized_repo}' (id: {upserted.id}). "
        "Background parsing submitted; semantic search is typically available in about 1 minute."
        f"{parse_warning}"
    )


async def discover_projects(call_ctx: CallContext, query: str | None = None) -> str:
    """List all project datasets (``project-*``), returning names with prefix stripped."""
    if call_ctx.config.compatibility_mode:
        return COMPATIBILITY_MODE_ERROR
    normalized_query, query_err = normalize_discover_query(query)
    if query_err:
        return query_err

    datasets = call_ctx.dataset_lookup.list_datasets()
    matches: list[tuple[str, str]] = []
    for ds in datasets:
        if not ds.name.startswith(PROJECT_DATASET_PREFIX):
            continue
        project_name = _to_project_name(ds.name)
        _, project_err = normalize_project_name(project_name)
        if project_err:
            continue
        if not call_ctx.authorizer.can_read(ds.name, call_ctx.user_email):
            continue
        if normalized_query and normalized_query.lower() not in project_name.lower():
            continue
        matches.append((project_name, XML_DATASET.format(id=ds.id, name=project_name)))
    matches.sort(key=lambda item: item[0].lower())
    lines = [line for _, line in matches]
    return "\n".join(lines) if lines else "No projects found"
