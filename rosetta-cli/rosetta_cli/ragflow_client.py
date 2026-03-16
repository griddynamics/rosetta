"""
RAGFlow Client Wrapper for IMS Publishing

This module provides a wrapper around the ragflow-sdk for IMS-specific operations.

Key Features:
- Dataset management with template resolution (aia-{release})
- Document upload with change detection (MD5 hashing)
- Tag-in-title format: [tag1][tag2][tag3] filename.ext
- Two-stage filtering support (server keyword + client metadata)
"""

import hashlib
import json
import time
import requests
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, cast

from ragflow_sdk import RAGFlow
from ragflow_sdk.modules.dataset import DataSet
from ragflow_sdk.modules.document import Document
from .typing_utils import DatasetLike, DocumentLike, JsonDict



@dataclass
class DocumentMetadata:
    """Metadata structure for IMS documents"""
    tags: list[str]
    domain: str
    release: str
    content_hash: str
    ims_doc_id: str
    original_path: str = ""
    resource_path: str | None = None
    sort_order: int | None = None
    frontmatter: JsonDict | None = None
    line_count: int | None = None
    doc_title: str = ""  # Bare filename for server-side filtering


class RAGFlowClientError(Exception):
    """Base exception for RAGFlow client errors"""
    pass


class AuthenticationError(RAGFlowClientError):
    """Authentication/authorization errors (401, 403)"""
    pass


class NotFoundError(RAGFlowClientError):
    """Resource not found errors (404)"""
    pass


class NetworkError(RAGFlowClientError):
    """Network-related errors"""
    pass


class RAGFlowClient:
    """
    Wrapper class for RAGFlow SDK operations.
    
    Provides high-level methods for dataset and document management
    with IMS-specific functionality like tag-in-title format and
    change detection.
    
    Usage:
        client = RAGFlowClient(api_key="ragflow-xxx", base_url="http://ragflow.local")
        
        # Create/get dataset
        dataset = client.create_dataset("aia-r1", "Release 1 instructions")
        
        # Upload document with tags
        doc = client.upload_document(
            file_path=Path("agents.md"),
            metadata=DocumentMetadata(...),
            dataset_id=dataset.id
        )
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str,
        version: str = "v1",
        timeout: int = 30,
        embedding_model: str | None = None,
        chunk_method: str = "naive",
        parser_config: JsonDict | None = None,
        page_size: int = 1000
    ):
        """
        Initialize RAGFlow client.
        
        Args:
            api_key: RAGFlow API key (format: ragflow-xxxx)
            base_url: RAGFlow instance URL (e.g., http://ragflow.local)
            version: API version (default: v1)
            timeout: Request timeout in seconds (default: 30)
            embedding_model: Embedding model (format: model_name@provider, e.g., text-embedding-3-small@OpenAI)
            chunk_method: Chunking method (default: naive)
            parser_config: Parser configuration dict for chunk_method settings
            page_size: Default page size for list operations (default: 1000)
            
        Raises:
            ValueError: If api_key or base_url is empty
        """
        if not api_key:
            raise ValueError("api_key cannot be empty")
        if not base_url:
            raise ValueError("base_url cannot be empty")
            
        self.api_key = api_key
        self.base_url = base_url
        self.version = version
        self.timeout = timeout
        self.embedding_model = embedding_model
        self.chunk_method = chunk_method
        self.parser_config = parser_config or {}
        self.page_size = page_size

        # Initialize RAGFlow SDK client
        self._client = RAGFlow(api_key=api_key, base_url=base_url, version=version)

    def _handle_response_error(self, response: Any, operation: str) -> None:
        """
        Handle API response errors uniformly.
        
        Args:
            response: Response object from requests
            operation: Description of the operation for error messages
            
        Raises:
            AuthenticationError: For 401/403 errors
            NotFoundError: For 404 errors
            NetworkError: For network-related errors
            RAGFlowClientError: For other errors
        """
        try:
            if hasattr(response, 'status_code'):
                if response.status_code == 401:
                    raise AuthenticationError(
                        f"{operation} failed: Invalid API key or expired token"
                    )
                elif response.status_code == 403:
                    raise AuthenticationError(
                        f"{operation} failed: Insufficient permissions"
                    )
                elif response.status_code == 404:
                    raise NotFoundError(
                        f"{operation} failed: Resource not found"
                    )
                elif response.status_code >= 500:
                    raise NetworkError(
                        f"{operation} failed: Server error (status {response.status_code})"
                    )
        except Exception as e:
            if isinstance(e, RAGFlowClientError):
                raise
            raise NetworkError(f"{operation} failed: {str(e)}")
    
    def create_dataset(
        self,
        name: str,
        description: str = "",
        embedding_model: str | None = None,
        permission: str = "team",
        chunk_method: str | None = None,
        parser_config: JsonDict | None = None
    ) -> DataSet:
        """
        Create a new dataset.
        
        Args:
            name: Dataset name
            description: Dataset description
            embedding_model: Embedding model (uses client default if not specified)
            permission: Access permission (default: "team" = shared)
            chunk_method: Chunking method (uses client default if not specified)
            parser_config: Parser configuration dict (uses client default if not specified)
            
        Returns:
            Created DataSet object
            
        Raises:
            RAGFlowClientError: If creation fails
        """
        try:
            # Use method parameters or fall back to client defaults
            emb_model = embedding_model if embedding_model is not None else self.embedding_model
            chunk_meth = chunk_method if chunk_method is not None else self.chunk_method
            parser_cfg = parser_config if parser_config is not None else self.parser_config
            
            # Build create_dataset kwargs
            kwargs: dict[str, object] = {
                "name": name,
                "description": description,
                "permission": permission,
                "chunk_method": chunk_meth
            }
            
            # Add optional parameters if provided
            if emb_model:
                kwargs["embedding_model"] = emb_model
            
            # Convert parser_config dict to DataSet.ParserConfig object if needed
            if parser_cfg:
                kwargs["parser_config"] = DataSet.ParserConfig(self._client, parser_cfg)
            
            dataset = self._client.create_dataset(**kwargs)
            
            return dataset
            
        except Exception as e:
            raise RAGFlowClientError(f"Failed to create dataset '{name}': {str(e)}")
    
    def list_datasets(
        self,
        page: int = 1,
        page_size: int = 30,
        orderby: str = "create_time",
        desc: bool = True,
        id: str | None = None,
        name: str | None = None
    ) -> list[DataSet]:
        """
        List all datasets with optional filtering.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of datasets per page
            orderby: Field to sort by
            desc: Sort in descending order
            id: Filter by dataset ID (exact match)
            name: Filter by dataset name (exact match lookup - will fail if not found)
            
        Returns:
            List of DataSet objects
            
        Raises:
            RAGFlowClientError: If listing fails
        """
        try:
            datasets = self._client.list_datasets(
                page=page,
                page_size=page_size,
                orderby=orderby,
                desc=desc,
                id=id,
                name=name
            )
            
            return cast(list[DataSet], datasets)
            
        except Exception as e:
            # If name/id filter is used and dataset doesn't exist, RAGFlow returns permission error
            # This is expected behavior - return empty list instead of raising
            if (name or id) and "lacks permission" in str(e):
                return []
            raise RAGFlowClientError(f"Failed to list datasets: {str(e)}")
    
    def get_dataset(self, id: str | None = None, name: str | None = None) -> DataSet | None:
        """
        Get a single dataset by ID or name using server-side filtering.
        
        Args:
            id: Dataset ID (exact match)
            name: Dataset name (exact match)
            
        Returns:
            DataSet object if found, None otherwise
            
        Note:
            Provide either id OR name, not both. If both provided, id takes precedence.
        """
        try:
            if id:
                # Filter by ID
                datasets = self._client.list_datasets(id=id, page_size=1)
            elif name:
                # Filter by name (RAGFlow does substring, we verify exact match)
                datasets = self._client.list_datasets(name=name, page_size=10)
                # Filter for exact match
                datasets = [ds for ds in datasets if ds.name == name]
            else:
                return None
            
            if datasets and len(datasets) > 0:
                return datasets[0]
            return None
            
        except Exception as e:
            # Check if it's a permission/not found error
            error_msg = str(e).lower()
            if "lacks permission" in error_msg or "not found" in error_msg:
                return None
            raise RAGFlowClientError(f"Failed to get dataset: {str(e)}")
    
    def delete_datasets(self, ids: list[str]) -> None:
        """
        Delete datasets by IDs.
        
        Args:
            ids: List of dataset IDs to delete
            
        Raises:
            RAGFlowClientError: If deletion fails
        """
        try:
            self._client.delete_datasets(ids=ids)
            
        except Exception as e:
            raise RAGFlowClientError(f"Failed to delete datasets: {str(e)}")
    
    def _ensure_dataset(self, name: str, description: str = "") -> DataSet:
        """
        Get dataset if exists, create if not.
        
        Args:
            name: Dataset name
            description: Dataset description (used if creating)
            
        Returns:
            DataSet object
        """
        dataset = self.get_dataset(name=name)
        if dataset is not None:
            return dataset
        
        # Dataset doesn't exist, create it
        return self.create_dataset(name, description)
    
    def _resolve_dataset_name(self, template: str, release: str | None) -> str:
        """
        Resolve dataset name from template.
        
        Args:
            template: Name template (e.g., "aia-{release}")
            release: Release identifier (e.g., "r1")
            
        Returns:
            Resolved dataset name
            
        Examples:
            >>> _resolve_dataset_name("aia-{release}", "r1")
            "aia-r1"
            >>> _resolve_dataset_name("aia", None)
            "aia"
        """
        if release and "{release}" in template:
            return template.format(release=release)
        return template
    
    def _build_title_with_tags(self, tags: list[str], filename: str) -> str:
        """
        Build document title.

        Tags are stored in metadata only, not in the title.

        Args:
            tags: List of tags (unused, kept for compatibility)
            filename: Original filename (with extension)

        Returns:
            Filename as title
        """
        return filename
    
    def upload_document(
        self,
        file_path: Path | None = None,
        metadata: DocumentMetadata | None = None,
        dataset_name: str | None = None,
        dataset_template: str = "aia-{release}",
        force: bool = False,
        content: bytes | None = None  # NEW: Pre-read content from cache
    ) -> tuple[DocumentLike, str] | None:
        """
        Upload document with upsert semantics and change detection.
        
        OPTIMIZED: Now accepts pre-read content to avoid redundant file I/O.
        
        This method:
        1. Resolves dataset name from template + release
        2. Ensures dataset exists
        3. Builds title with tag prefixes
        4. Checks if document exists (by ims_doc_id)
        5. Compares content hash (skip if unchanged, unless force=True)
        6. Deletes existing document if changed
        7. Uploads new document with metadata
        
        Args:
            file_path: Path to file (for filename, backward compatibility)
            metadata: Document metadata with pre-calculated hash
            dataset_name: Base dataset name or template
            dataset_template: Template for dataset name resolution
            force: Force upload even if unchanged
            content: Pre-read file content (NEW - avoids re-reading file)
            
        Returns:
            Tuple of (Document, dataset_id), or None if skipped (unchanged)
            
        Raises:
            FileNotFoundError: If file_path does not exist (legacy path)
            RAGFlowClientError: If upload fails
            
        Examples:
            >>> # New optimized way (with DocumentData)
            >>> cache = DocumentData.from_file(path, workspace)
            >>> doc, dataset_id = client.upload_document(
            ...     file_path=cache.file_path,
            ...     metadata=metadata,
            ...     dataset_name="aia",
            ...     content=cache.content  # Pre-read content
            ... )
        """
        # If content not provided, fall back to reading file (backward compatibility)
        if content is None:
            if file_path is None or not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            content = file_path.read_bytes()
        if metadata is None:
            raise ValueError("metadata is required")
        
        # Hash should already be in metadata (calculated in DocumentData)
        # No need to recalculate it here
        actual_hash = metadata.content_hash
        
        # Resolve dataset name
        resolved_name = self._resolve_dataset_name(
            dataset_template if "{release}" in dataset_template else (dataset_name or dataset_template),
            metadata.release
        )
        
        # Ensure dataset exists
        dataset = self._ensure_dataset(
            resolved_name,
            f"IMS Knowledge - Release {metadata.release}" if metadata.release else "IMS Knowledge"
        )
        
        # Build display name from normalized doc title when available.
        # For R1, doc_title is filename; for R2, doc_title is logical path.
        # This prevents R2 collisions like SKILL(7).md from repeated bare filenames.
        filename = metadata.doc_title or (file_path.name if file_path else "")
        title = self._build_title_with_tags(metadata.tags, filename)
        
        # Check if document exists by searching for ims_doc_id in metadata
        start_time = time.time()
        
        # Use server-side metadata filtering to find document by ims_doc_id.
        # RAGFlow may return ownership-style errors when the filtered lookup
        # misses a document in team-shared datasets; treat that as "not found".
        try:
            existing_docs = self.list_documents(
                dataset=dataset,
                metadata_condition={
                    "logic": "and",
                    "conditions": [{
                        "name": "ims_doc_id",
                        "comparison_operator": "is",
                        "value": metadata.ims_doc_id
                    }]
                },
                page_size=1
            )
        except RAGFlowClientError as e:
            msg = str(e).lower()
            if (
                "you don't own" in msg
                or "you do not own" in msg
                or "lacks permission" in msg
            ):
                existing_docs = []
            else:
                raise

        existing_doc = existing_docs[0] if existing_docs else None
        
        if existing_doc:
            # Check if content changed by comparing hashes
            existing_meta = getattr(existing_doc, 'meta_fields', {}) or {}
            
            # Handle both dict and Base object formats
            if isinstance(existing_meta, dict):
                existing_hash = existing_meta.get("content_hash")
            else:
                # It's a Base object, access as attribute
                existing_hash = getattr(existing_meta, 'content_hash', None)
            
            if not force and existing_hash and existing_hash == actual_hash:
                # Content unchanged, skip upload
                elapsed = time.time() - start_time
                print(f"    ⏩ Skipped (unchanged, {elapsed:.2f}s): {title}")
                return None
            
            # Content changed, delete old version
            dataset.delete_documents([existing_doc.id])
            print(f"    🔄 Updating: {title}")
        else:
            print(f"    ⬆️  Uploading: {title}")
        
        # Upload document
        try:
            documents = dataset.upload_documents([{
                "display_name": title,
                "blob": content
            }])

            if not documents:
                raise RAGFlowClientError("Upload returned no documents")

            doc = documents[0]

            # Update metadata
            meta_fields: JsonDict = {
                "ims_doc_id": metadata.ims_doc_id,
                "tags": metadata.tags,
                "domain": metadata.domain,
                "release": metadata.release,
                "content_hash": metadata.content_hash,
                "original_path": metadata.original_path,
                "sort_order": metadata.sort_order,
                "doc_title": metadata.doc_title,
            }
            if metadata.line_count is not None:
                meta_fields["line_count"] = metadata.line_count
            if metadata.resource_path is not None:
                meta_fields["resource_path"] = metadata.resource_path
            frontmatter_value = getattr(metadata, 'frontmatter', None)
            if frontmatter_value is not None:
                meta_fields["frontmatter"] = frontmatter_value

            doc.update({"meta_fields": meta_fields})
            # SDK update() does not echo meta_fields back in the PUT response;
            # re-fetch to get the actual stored state.
            try:
                refreshed = self.list_documents(dataset=dataset, id=doc.id, page_size=1)
                updated_meta = getattr(refreshed[0], 'meta_fields', None) if refreshed else None
                if updated_meta:
                    if isinstance(updated_meta, dict):
                        meta_tags = updated_meta.get('tags', [])
                        meta_fm = updated_meta.get('frontmatter')
                    else:
                        meta_tags = getattr(updated_meta, 'tags', []) or []
                        meta_fm = getattr(updated_meta, 'frontmatter', None)
                    tag_count = len(meta_tags) if isinstance(meta_tags, list) else 0
                    print(f"    ✅ Metadata set: {tag_count} tags, frontmatter={'yes' if meta_fm else 'no'}")
                else:
                    print(f"    ⚠️  Metadata update returned empty meta_fields!")
            except Exception as verify_err:
                print(f"    ⚠️  Metadata update sent but could not verify: {verify_err}")

            elapsed = time.time() - start_time
            print(f"    ✅ Done ({elapsed:.2f}s): {title}")
            
            # Return doc object and dataset ID for parsing
            # doc.id is RAGFlow's internal document ID needed for parsing
            return (cast(DocumentLike, doc), dataset.id)
            
        except Exception as e:
            raise RAGFlowClientError(f"Failed to upload document '{title}': {str(e)}")
    
    def trigger_parse(self, dataset_id: str, document_ids: list[str]) -> None:
        """
        Trigger async parsing for documents.
        
        Args:
            dataset_id: Dataset ID containing documents
            document_ids: List of document IDs to parse
        
        Raises:
            RAGFlowClientError: If parsing trigger fails
        """
        dataset = self.get_dataset(id=dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset not found: {dataset_id}")
        
        try:
            dataset.async_parse_documents(document_ids)
        except Exception as e:
            raise RAGFlowClientError(f"Failed to trigger parsing: {str(e)}")
    
    def parse_documents_batch(
        self,
        documents: list[JsonDict],
        silent: bool = False
    ) -> dict[str, list[str]]:
        """
        Trigger parsing for multiple documents across datasets.
        
        Groups documents by dataset and triggers parsing for each group.
        This is more efficient than calling trigger_parse separately for each document.
        
        Args:
            documents: List of {"id": doc_id, "name": name, "dataset_id": dataset_id}
            silent: If True, don't print progress messages
        
        Returns:
            Dict with "success" and "failed" lists of dataset_ids
        
        Examples:
            >>> documents = [
            ...     {"id": "doc1", "name": "file1.md", "dataset_id": "dataset_a"},
            ...     {"id": "doc2", "name": "file2.md", "dataset_id": "dataset_a"},
            ...     {"id": "doc3", "name": "file3.md", "dataset_id": "dataset_b"}
            ... ]
            >>> result = client.parse_documents_batch(documents)
            >>> print(result["success"])  # ["dataset_a", "dataset_b"]
        """
        # Group documents by dataset
        by_dataset: dict[str, list[JsonDict]] = {}
        for doc in documents:
            dataset_id = str(doc["dataset_id"])
            if dataset_id not in by_dataset:
                by_dataset[dataset_id] = []
            by_dataset[dataset_id].append(doc)
        
        if not silent:
            print(f"\n📄 Parsing {len(documents)} document(s)...")
        
        # Track success/failures
        success_datasets: list[str] = []
        failed_datasets: list[str] = []
        
        # Trigger parsing per dataset
        for dataset_id, docs in by_dataset.items():
            doc_ids = [str(d["id"]) for d in docs]
            if not silent:
                print(f"  → Triggering parse for {len(doc_ids)} documents in dataset {dataset_id}")
                print(f"  → Document IDs: {doc_ids[:3]}{'...' if len(doc_ids) > 3 else ''}")
            
            try:
                self.trigger_parse(dataset_id, doc_ids)
                success_datasets.append(dataset_id)
            except Exception as e:
                failed_datasets.append(dataset_id)
                if not silent:
                    print(f"  ✗ Parse trigger failed: {e}")
                    print(f"  ℹ️  Documents uploaded but not parsed. Check RAGFlow UI.")
        
        return {"success": success_datasets, "failed": failed_datasets}
    
    def get_parse_status(self, dataset_id: str, document_id: str) -> JsonDict:
        """
        Get parsing status for a document.
        
        Args:
            dataset_id: Dataset ID containing document
            document_id: Document ID to check
        
        Returns:
            Dict with keys: id, name, run, progress, chunk_count, token_count, progress_msg
            run values: "UNSTART", "RUNNING", "DONE", "FAIL", "CANCEL"
        
        Raises:
            NotFoundError: If document not found
            RAGFlowClientError: If status check fails
        """
        dataset = self.get_dataset(id=dataset_id)
        if not dataset:
            raise NotFoundError(f"Dataset not found: {dataset_id}")
        
        try:
            docs = dataset.list_documents(id=document_id, page_size=1)
            if not docs or len(docs) == 0:
                raise NotFoundError(f"Document not found: {document_id}")
            
            doc = docs[0]
            # Handle missing attributes gracefully
            return {
                "id": getattr(doc, 'id', document_id),
                "name": getattr(doc, 'name', 'Unknown'),
                "run": getattr(doc, 'run', 'UNSTART'),
                "progress": getattr(doc, 'progress', 0.0),
                "chunk_count": getattr(doc, 'chunk_count', 0),
                "token_count": getattr(doc, 'token_count', 0),
                "progress_msg": getattr(doc, 'progress_msg', '')
            }
        except NotFoundError:
            raise
        except Exception as e:
            raise RAGFlowClientError(f"Failed to get parse status: {str(e)}")
    
    def list_documents(
        self,
        dataset: DatasetLike,
        id: str | None = None,
        name: str | None = None,
        keywords: str | None = None,
        page: int = 1,
        page_size: int = 30,
        orderby: str = "create_time",
        desc: bool = True,
        create_time_from: int = 0,
        create_time_to: int = 0,
        run: list[str] | None = None,
        suffix: list[str] | None = None,
        metadata_condition: JsonDict | None = None
    ) -> list[DocumentLike]:
        """
        List documents in a dataset with enhanced filtering.
        
        This method extends the SDK's list_documents with server-side filtering
        support for parse status (run), file types (suffix), and metadata queries.
        
        Args:
            dataset: DataSet object to list documents from
            id: Filter by document ID
            name: Filter by document name
            keywords: Keyword search
            page: Page number (1-indexed)
            page_size: Number of documents per page
            orderby: Field to sort by (default: "create_time")
            desc: Sort in descending order
            create_time_from: Unix timestamp for filtering documents created after this time
            create_time_to: Unix timestamp for filtering documents created before this time
            run: Filter by parse status (e.g., ["DONE"], ["FAIL", "UNSTART"])
                 Supported values: "UNSTART", "RUNNING", "CANCEL", "DONE", "FAIL"
            suffix: Filter by file extension (e.g., ["pdf", "md"])
            metadata_condition: Metadata filter dict with structure:
                {
                    "logic": "and" | "or",
                    "conditions": [
                        {
                            "name": str,              # Metadata field name
                            "comparison_operator": str,  # "is", "contains", "start with", etc.
                            "value": any              # Comparison value
                        }
                    ]
                }
        
        Returns:
            List of Document objects
        
        Raises:
            RAGFlowClientError: If listing fails
        
        Examples:
            # Filter by parse status
            docs = client.list_documents(dataset, run=["DONE"])
            
            # Filter by filename prefix using metadata
            docs = client.list_documents(
                dataset,
                metadata_condition={
                    "logic": "and",
                    "conditions": [{
                        "name": "doc_title",
                        "comparison_operator": "start with",
                        "value": "agents"
                    }]
                }
            )
            
            # Combined filters
            docs = client.list_documents(
                dataset,
                run=["FAIL", "UNSTART"],
                suffix=["md", "txt"],
                page_size=self.page_size
            )
        """
        try:  
            # Build query parameters for HTTP API
            params: dict[str, object] = {
                "page": page,
                "page_size": page_size,
                "orderby": orderby,
                "desc": desc,
            }
            
            # Add optional standard parameters
            if id is not None:
                params["id"] = id
            if name is not None:
                params["name"] = name
            if keywords is not None:
                params["keywords"] = keywords
            if create_time_from > 0:
                params["create_time_from"] = create_time_from
            if create_time_to > 0:
                params["create_time_to"] = create_time_to
            
            # Add enhanced filtering parameters if provided
            if run is not None:
                params["run"] = run
            if suffix is not None:
                params["suffix"] = suffix
            if metadata_condition is not None:
                params["metadata_condition"] = json.dumps(metadata_condition)
            
            # Bypass SDK and call HTTP API directly
            # SDK doesn't support run, suffix, metadata_condition parameters
            res = dataset.get(f"/datasets/{dataset.id}/documents", params=params)
            res_json = cast(JsonDict, cast(Any, res).json())
            
            if res_json.get("code") != 0:
                raise RAGFlowClientError(f"API error: {res_json.get('message', 'Unknown error')}")
            
            # Convert response to Document objects (same as SDK does)
            documents: list[DocumentLike] = []
            data = res_json.get("data", {})
            docs = data.get("docs", []) if isinstance(data, dict) else []
            for doc_dict in docs:
                if isinstance(doc_dict, dict):
                    documents.append(cast(DocumentLike, Document(cast(Any, dataset).rag, doc_dict)))
            
            return documents
            
        except Exception as e:
            raise RAGFlowClientError(f"Failed to list documents: {str(e)}")
    
    def _filter_by_metadata(self, docs: list[DocumentLike], condition: JsonDict) -> list[DocumentLike]:
        """
        Client-side fallback for metadata filtering.
        
        Args:
            docs: List of Document objects
            condition: Metadata condition dict
        
        Returns:
            Filtered list of Document objects
        """
        logic = condition.get("logic", "and")
        conditions = condition.get("conditions", [])
        
        filtered: list[DocumentLike] = []
        for doc in docs:
            # Get document metadata
            meta = getattr(doc, 'meta_fields', {})
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except:
                    meta = {}
            
            # Evaluate conditions
            matches = []
            for cond in conditions:
                if not isinstance(cond, dict):
                    matches.append(False)
                    continue
                field_name = cond.get("name")
                operator = cond.get("comparison_operator")
                value = cond.get("value")
                
                field_value = meta.get(field_name)
                
                # Evaluate condition
                if operator == "is":
                    matches.append(field_value == value)
                elif operator == "contains":
                    matches.append(str(value) in str(field_value) if field_value is not None else False)
                elif operator == "start with":
                    matches.append(str(field_value).startswith(str(value)) if field_value else False)
                elif operator == "end with":
                    matches.append(str(field_value).endswith(str(value)) if field_value else False)
                else:
                    matches.append(False)
            
            # Apply logic
            if logic == "and":
                if all(matches):
                    filtered.append(doc)
            elif logic == "or":
                if any(matches):
                    filtered.append(doc)
        
        return filtered
    
    def verify_connection(self) -> bool:
        """
        Verify API connection and authentication.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            self.list_datasets(page_size=1)
            return True
        except Exception:
            return False
    
    def get_system_health(self) -> JsonDict | None:
        """
        Check the health status of RAGFlow's dependencies.
        
        Calls the /v1/system/healthz endpoint which checks:
        - Database (MySQL/PostgreSQL)
        - Redis
        - Document Engine (Elasticsearch/Infinity/OpenSearch)
        - Object Storage (MinIO/S3/GCS)
        
        Note: This endpoint does NOT require authentication.
        
        Returns:
            Health status dict with format:
            {
                'status': 'ok' or 'nok',
                'db': 'ok' or 'nok',
                'redis': 'ok' or 'nok',
                'doc_engine': 'ok' or 'nok',
                'storage': 'ok' or 'nok',
                '_meta': {  # Optional: Only present if there are issues
                    'db': {'elapsed': '12.3', 'error': '...'},
                    'redis': {'elapsed': '8.5', 'error': '...'},
                    ...
                }
            }
            Returns None if health check fails
        """
        try:
            # The healthz endpoint doesn't require authentication
            # Use direct GET request without auth header
            url = f"{self.base_url}/v1/system/healthz"
            response = requests.get(url, timeout=self.timeout)
            
            # Accept both 200 (all OK) and 500 (some services down)
            # Both return valid JSON health status
            if response.status_code in (200, 500):
                return cast(JsonDict, response.json())
            else:
                print(f"Health check returned unexpected status {response.status_code}")
                return None
        except Exception as e:
            print(f"Health check failed: {e}")
            return None
