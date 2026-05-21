"""Resource read with bundling by resource_path metadata."""

from __future__ import annotations

from ims_mcp.clients.doc_cache import InstructionDocCache
from ims_mcp.clients.document import DocumentClient
from ims_mcp.context import CallContext
from ims_mcp.services.bundler import Bundler
from ims_mcp.tools.validation import normalize_relative_path


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
    if not call_ctx.authorizer.can_read(dataset_name, call_ctx.user_email):
        return "Error: reading instructions is not permitted"
    try:
        dataset = call_ctx.dataset_lookup.get_dataset(name=dataset_name)
    except Exception as exc:
        return f"Error: failed to open instruction dataset '{dataset_name}': {exc}"

    if not dataset:
        return f"Error: instruction dataset not found: {dataset_name}"

    # Resource_path lookup goes through the cache and filters client-side.
    # The server-side metadata_condition filter is unreliable on RAGFlow 0.25.x
    # (silently returns all docs when the filter matches zero), so we never use
    # it here.
    if doc_cache is None:
        return f"Error: doc cache unavailable for resource lookup '{normalized_path}'"

    try:
        all_docs = doc_cache.get_all_docs(dataset, dataset_name)
    except Exception as exc:
        return f"Error: failed to load documents for resource_path '{normalized_path}': {exc}"

    docs = [doc for doc in all_docs if Bundler._resource_path(doc) == normalized_path]
    if not docs:
        return f"Error: No documents found for resource path: {normalized_path}"
    return bundler.bundle(docs, dataset_name)
