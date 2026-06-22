"""Resource read with bundling by resource_path metadata."""

from __future__ import annotations

import logging

from ims_mcp.clients.doc_cache import InstructionDocCache
from ims_mcp.clients.document import DocumentClient
from ims_mcp.context import CallContext
from ims_mcp.services.bundler import Bundler
from ims_mcp.tracing import get_request_trace_id
from ims_mcp.tools.validation import normalize_relative_path

_logger = logging.getLogger("ims_mcp")


def normalize_resource_path(path: str) -> str:
    """Normalize VFS resource path to publisher metadata format."""
    normalized = (path or "").strip().replace("\\", "/")
    return normalized.lstrip("/")


async def read_instruction_resource(
    path: str,
    call_ctx: CallContext,
    document_client: DocumentClient,
    bundler: Bundler,
    doc_cache: InstructionDocCache | None = None,
) -> str:
    """Query docs by resource_path metadata and bundle with existing Bundler.

    When doc_cache is provided, filters from the cached full doc list
    instead of issuing a separate RAGFlow query.
    """
    normalized_path, err = normalize_relative_path(normalize_resource_path(path), field="path")
    if err:
        return err
    assert normalized_path is not None

    dataset_name = call_ctx.config.instruction_dataset
    trace_id = get_request_trace_id()

    if not call_ctx.authorizer.can_read(dataset_name, call_ctx.user_email):
        return "Error: reading instructions is not permitted"
    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception as exc:
        _logger.error(
            "read_instruction_resource: failed to open dataset '%s' trace=%s: %s",
            dataset_name,
            trace_id,
            exc,
            exc_info=True,
        )
        return f"Error: failed to open instruction dataset '{dataset_name}': {exc}"

    if not dataset:
        return f"Error: instruction dataset not found: {dataset_name}"

    # Resource_path lookup goes through the cache and filters client-side.
    # The server-side metadata_condition filter is unreliable on RAGFlow 0.25.x
    # (silently returns all docs when the filter matches zero), so we never use
    # it here.
    if doc_cache is None:
        return f"Error: doc cache unavailable for resource lookup '{normalized_path}'"

    # A4: use async variant to offload blocking list_docs off the event loop.
    try:
        all_docs = await doc_cache.get_all_docs_async(dataset, dataset_name)
    except Exception as exc:
        _logger.error(
            "read_instruction_resource: failed to load docs for path '%s' trace=%s: %s",
            normalized_path,
            trace_id,
            exc,
            exc_info=True,
        )
        return f"Error: failed to load documents for resource_path '{normalized_path}': {exc}"

    docs = [doc for doc in all_docs if Bundler._resource_path(doc) == normalized_path]
    if not docs:
        _logger.error(
            "read_instruction_resource: no docs for path '%s' trace=%s",
            normalized_path,
            trace_id,
        )
        return f"Error: No documents found for resource path: {normalized_path}"
    return bundler.bundle(docs, dataset_name)
