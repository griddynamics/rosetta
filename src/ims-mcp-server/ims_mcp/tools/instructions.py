"""Instruction retrieval tools."""

from __future__ import annotations

import json
import logging
from collections.abc import Iterable

from ims_mcp.clients.doc_cache import InstructionDocCache
from ims_mcp.clients.document import DocumentClient
from ims_mcp.constants import (
    COMPATIBILITY_MODE_UPGRADE_NOTICE,
    QUERY_LIST_THRESHOLD,
    QUERY_TOO_MANY_THRESHOLD,
    TAG_BOOTSTRAP,
    TAG_WORKFLOW,
    WORKFLOWS_PATH_PREFIX,
    WORKFLOWS_PSEUDO_FILE_HEADER,
    XML_FILE_CLOSE,
)
from ims_mcp.context import CallContext
from ims_mcp.services.bundler import Bundler
from ims_mcp.services.keyword_search import list_docs_with_keyword_fallback
from ims_mcp.services.query_builder import QueryBuilder
from ims_mcp.tracing import get_request_trace_id, offload
from ims_mcp.typing_utils import DocumentLike, JsonObject, as_json_object
from ims_mcp.tools.validation import normalize_query, normalize_relative_path, normalize_tags, normalize_format

_logger = logging.getLogger("ims_mcp")


def _unique_docs(docs: Iterable[DocumentLike]) -> list[DocumentLike]:
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


def _filter_docs_by_any_tag(docs: list[DocumentLike], tags: list[str] | None) -> list[DocumentLike]:
    required = {tag.strip().lower() for tag in (tags or []) if tag and tag.strip()}
    if not required:
        return docs
    return [doc for doc in docs if required & _extract_tags(doc)]


def _resource_path(doc: DocumentLike) -> str:
    meta = getattr(doc, "meta_fields", {}) or {}
    if isinstance(meta, dict):
        resource_path = meta.get("resource_path", "")
        return str(resource_path) if resource_path else ""
    return getattr(meta, "resource_path", "") or ""


def _longest_tag(doc: DocumentLike) -> str:
    tags = list(_extract_tags(doc))
    return max(tags, key=len, default="") if tags else ""


def _frontmatter_description(doc: DocumentLike) -> str:
    meta = getattr(doc, "meta_fields", {}) or {}
    if isinstance(meta, str):
        try:
            meta = as_json_object(json.loads(meta))
        except Exception:
            return ""
    if not isinstance(meta, dict) and hasattr(meta, "__dict__"):
        meta = as_json_object({k: v for k, v in vars(meta).items() if k != "rag"})
    # Prefer "fm" (written since the key rename; legacy "frontmatter" kept for
    # backward compat with docs written before the rename).
    if isinstance(meta, dict):
        fm = meta.get("fm") if meta.get("fm") is not None else meta.get("frontmatter")
    else:
        fm = getattr(meta, "fm", None) or getattr(meta, "frontmatter", None)
    if fm is None:
        return ""
    # Unwrap RAGFlow SDK Base objects
    if not isinstance(fm, (dict, str)) and hasattr(fm, "__dict__"):
        fm = {k: v for k, v in vars(fm).items() if k != "rag"}
    if isinstance(fm, str):
        try:
            fm = json.loads(fm)
        except Exception:
            return ""
    if isinstance(fm, dict):
        desc = fm.get("description", "")
        return str(desc).strip() if desc else ""
    return ""


async def _build_workflows_listing(call_ctx: CallContext, doc_cache: InstructionDocCache) -> str:
    # F2: offload the blocking list_docs call via get_all_docs_async (A4) so this
    # most-called path never blocks the asyncio event loop on a cache miss.
    dataset_name = call_ctx.config.instruction_dataset
    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception:
        return ""
    if not dataset:
        return ""
    try:
        all_docs = await doc_cache.get_all_docs_async(dataset, dataset_name)
    except Exception:
        return ""
    prefix = WORKFLOWS_PATH_PREFIX + "/"
    workflow_docs = [
        doc for doc in all_docs
        if _resource_path(doc).startswith(prefix) and TAG_WORKFLOW in _extract_tags(doc)
    ]
    if not workflow_docs:
        return ""
    lines = [WORKFLOWS_PSEUDO_FILE_HEADER]
    for doc in sorted(workflow_docs, key=lambda d: _resource_path(d)):
        tag = _longest_tag(doc)
        description = _frontmatter_description(doc)
        desc_part = f" — {description}" if description else ""
        lines.append(f"- `{tag}`{desc_part}")
    content = "\n".join(lines)
    open_tag = f'<rosetta:file dataset="{dataset_name}" name="ALL AVAILABLE WORKFLOWS">\n'
    return f"\n{open_tag}{content}\n{XML_FILE_CLOSE}"


async def get_context_instructions(
    call_ctx: CallContext,
    document_client: DocumentClient,
    bundler: Bundler,
    query_builder: QueryBuilder,
    doc_cache: InstructionDocCache,
    topic: str | None = None,
    include_frontmatter: bool = False,
) -> str:
    # Compatibility wrapper: get-context semantics are query-instructions
    # with predefined bootstrap tag.
    result = await query_instructions(
        call_ctx=call_ctx,
        document_client=document_client,
        bundler=bundler,
        query_builder=query_builder,
        query=None,
        tags=[TAG_BOOTSTRAP],
        topic=topic,
        _skip_list_threshold=True,
        _strip_frontmatter_content=not include_frontmatter,
    )
    if result and not result.startswith("Error:"):
        workflows_listing = await _build_workflows_listing(call_ctx, doc_cache)
        if workflows_listing:
            result += workflows_listing
        if call_ctx.config.compatibility_mode:
            result += COMPATIBILITY_MODE_UPGRADE_NOTICE
    return result


async def query_instructions(
    call_ctx: CallContext,
    document_client: DocumentClient,
    bundler: Bundler,
    query_builder: QueryBuilder,
    query: str | None = None,
    tags: list[str] | None = None,
    topic: str | None = None,
    _skip_list_threshold: bool = False,
    _strip_frontmatter_content: bool = False,
) -> str:
    normalized_query, query_err = normalize_query(query)
    if query_err:
        return query_err
    normalized_tags, tags_err = normalize_tags(tags)
    if tags_err:
        return tags_err

    if not normalized_query and not normalized_tags:
        return "Error: at least one of query or tags is required"

    dataset_name = call_ctx.config.instruction_dataset
    if not call_ctx.authorizer.can_read(dataset_name, call_ctx.user_email):
        return "Error: reading instructions is not permitted"
    dataset_id = call_ctx.dataset_lookup.get_id(dataset_name)
    if not dataset_id:
        return f"Error: instruction dataset not found: {dataset_name}"

    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception as exc:
        _logger.error(
            "query_instructions: failed to open dataset '%s': %s",
            dataset_name,
            exc,
            exc_info=True,
        )
        return f"Error: failed to open instruction dataset '{dataset_name}': {exc}"

    if not dataset:
        return f"Error: instruction dataset not found: {dataset_name}"

    docs = []
    trace_id = get_request_trace_id()

    # Keyword search: tags via metadata_condition, query via keywords.
    # A3: offload the sync RAGFlow call to a worker thread to keep event loop live.
    if normalized_tags or normalized_query:
        try:
            docs.extend(
                await offload(
                    list_docs_with_keyword_fallback,
                    document_client=document_client,
                    dataset=dataset,
                    query_builder=query_builder,
                    tags=normalized_tags,
                    query=normalized_query,
                    page_size=1000,
                )
            )
        except Exception as exc:
            _logger.error(
                "query_instructions: failed to list instruction documents trace=%s: %s",
                trace_id,
                exc,
                exc_info=True,
            )
            return f"Error: failed to list instruction documents: {exc}"

    # Semantic expansion via retrieve when topic is provided.
    # A3: offload the sync ragflow.retrieve call to a worker thread.
    if topic and topic.strip():
        try:
            retrieve_kwargs = query_builder.build_retrieve_params(
                dataset_ids=[dataset_id],
                query=topic.strip(),
                tags=normalized_tags,
            )
            semantic = await offload(call_ctx.ragflow.retrieve, **retrieve_kwargs)
            for chunk in semantic:
                if getattr(chunk, "document_id", ""):
                    # F4: offload sync list_docs so it never blocks the event loop
                    # even when topic-based expansion is enabled in future callers.
                    chunk_docs = await offload(
                        document_client.list_docs,
                        dataset=dataset,
                        doc_id=chunk.document_id,
                        page_size=1,
                    )
                    docs.extend(chunk_docs)
        except Exception:
            # Semantic expansion should not block keyword results.
            pass

    docs = _filter_docs_by_any_tag(_unique_docs(docs), normalized_tags)
    if not docs:
        return "No instructions found"

    # Defensive ceiling: a server-side metadata_condition filter bypass on
    # RAGFlow 0.25.x can dump every doc in the dataset; refuse to bundle.
    if len(docs) > QUERY_TOO_MANY_THRESHOLD:
        return "Error: No documents found or too many documents found"

    # When too many results, output listing instead of full content.
    if not _skip_list_threshold and len(docs) > QUERY_LIST_THRESHOLD:
        header = (
            f'Query matched too many files: {len(docs)}, only listing is returned without content. '
            f'Use query_instructions with guaranteed unique 3-part/2-part tag to read what you need:'
        )
        return header + "\n" + bundler.format_as_listing(docs, dataset_name)

    return bundler.bundle(docs, dataset_name, strip_frontmatter=_strip_frontmatter_content)


async def list_instructions(
    call_ctx: CallContext,
    doc_cache: InstructionDocCache,
    bundler: Bundler,
    full_path_from_root: str,
    format: str | None = None,
) -> str:
    """List immediate children (folders and files) under a virtual path prefix."""
    normalized_format, format_err = normalize_format(format)
    if format_err:
        return format_err
    
    normalized_prefix = (full_path_from_root or "").strip()
    dump_all = normalized_prefix.lower() == "all"
    if normalized_prefix in {"", "/"}:
        normalized_prefix = ""
    elif dump_all:
        normalized_prefix = "all"
    else:
        normalized_prefix_result, err = normalize_relative_path(
            normalized_prefix,
            field="full_path_from_root",
        )
        if err:
            return err
        normalized_prefix = normalized_prefix_result or ""

    dataset_name = call_ctx.config.instruction_dataset
    if not call_ctx.authorizer.can_read(dataset_name, call_ctx.user_email):
        return "Error: reading instructions is not permitted"

    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception as exc:
        _logger.error(
            "list_instructions: failed to open dataset '%s': %s",
            dataset_name,
            exc,
            exc_info=True,
        )
        return f"Error: failed to open instruction dataset '{dataset_name}': {exc}"

    if not dataset:
        return f"Error: instruction dataset not found: {dataset_name}"

    # A4: use async variant to offload the blocking list_docs off the event loop.
    try:
        all_docs = await doc_cache.get_all_docs_async(dataset, dataset_name)
    except Exception as exc:
        _logger.error(
            "list_instructions: failed to load docs for dataset '%s': %s",
            dataset_name,
            exc,
            exc_info=True,
        )
        return f"Error: failed to load instruction documents: {exc}"

    if dump_all:
        docs_with_paths = [doc for doc in all_docs if _resource_path(doc)]
        if not docs_with_paths:
            return "No instruction files found"
        
        # flat format: just sorted, deduplicated resource paths
        if normalized_format == "flat":
            header = "List of all instruction files. Use 2-part/3-part tags to load specific content: folder/file.md or parent/folder/file.md.\n"
            paths = sorted(set(_resource_path(doc) for doc in docs_with_paths if _resource_path(doc)))
            return header + "\n".join(paths)
        
        # XML format (default)
        header = (
            "List of all instruction files, without content.\n"
            "When acquired, files with duplicate path values are bundled/combined together.\n"
            "Use exact TAG attribute to load specific content.\n"
        )
        return header + "\n" + bundler.format_as_listing(docs_with_paths, dataset_name)

    prefix = normalized_prefix
    if not prefix:
        # Root level: find top-level segments
        prefix_with_slash = ""
    else:
        prefix_with_slash = prefix + "/"

    folders: set[str] = set()
    files = []

    for doc in all_docs:
        rp = _resource_path(doc)
        if not rp:
            continue

        if prefix_with_slash:
            if not rp.startswith(prefix_with_slash):
                continue
            remainder = rp[len(prefix_with_slash):]
        else:
            remainder = rp

        parts = remainder.split("/")
        if len(parts) == 1:
            # Direct child file
            files.append(doc)
        elif len(parts) > 1:
            # Folder (only immediate child)
            folder_path = prefix_with_slash + parts[0] if prefix_with_slash else parts[0]
            folders.add(folder_path)

    if not folders and not files:
        return f"No children found for path prefix: {prefix or '/'}"

    # flat format: just sorted paths (folders and files)
    if normalized_format == "flat":
        paths = []
        # Add folders (already collected as full paths)
        paths.append(f"List of immediate folders of \"{prefix or '/'}\", no tags.\n")
        paths.extend(sorted(folders))
        # Add file paths
        paths.append(f"List of immediate files of \"{prefix or '/'}\". Use 2-part/3-part tags for querying: folder/file.md or parent/folder/file.md\n")
        paths.extend(sorted(_resource_path(f) for f in files if _resource_path(f)))
        return "\n".join(paths)

    # XML format (default)
    header = (
        f'List of immediate children of "{prefix or "/"}", without content, '
        f'use guaranteed unique 3-part/2-part tag to query the content if needed:'
    )
    listing = bundler.format_children_listing(
        sorted(folders), files, dataset_name,
    )
    return header + "\n" + listing
