"""
IMS Publisher Module

Reads knowledge base content files and publishes them to RAGFlow with automatic metadata extraction
from folder structure.

Features:
- RAGFlow SDK integration for document upload and management
- Tag-in-title format: [tag1][tag2] filename.ext
- Preserves dots in filenames (e.g., "agents.md" stays "agents.md")
- Two-location tag storage: title + meta_fields for optimal search performance
- Dataset-based organization
- MD5 hash-based change detection
"""

import hashlib
import json
import re
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from .services.document_service import DocumentService
from .services.document_data import DocumentData
from .ragflow_client import DocumentMetadata, RAGFlowClient, RAGFlowClientError
from .typing_utils import DocumentLike, JsonDict

# Extensions RAGFlow can actually parse (from ragflow source: api/utils/file_utils.py).
# Files with other extensions are uploaded (server stores them) but must NOT be sent to parsing.
RAGFLOW_PARSABLE_EXTENSIONS = {
    # Documents
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".pages",
    ".xls", ".xlsx", ".csv",
    # Text / Markdown / Code (parsed via TxtParser / MarkdownParser)
    ".md", ".mdx", ".txt",
    ".py", ".js", ".java", ".c", ".cpp", ".h", ".php", ".go",
    ".ts", ".sh", ".cs", ".kt", ".sql",
    # Web / Config / Data
    ".htm", ".html", ".json", ".jsonl", ".ldjson",
    ".ini",
    # Email
    ".msg", ".eml",
}


@dataclass
class PublishResult:
    """Result of publishing a single content file."""
    
    success: bool
    document_id: str
    file_path: str
    tags: list[str]
    dataset_id: str = ""  # Dataset ID where document was uploaded
    error: str | None = None
    skipped: bool = False  # True if skipped due to no changes
    
    def __str__(self) -> str:
        """String representation of result."""
        if self.skipped:
            return f"⊘ {self.file_path} (unchanged)"
        
        status = "✓" if self.success else "✗"
        if self.success:
            return f"{status} {self.file_path} → {self.document_id} (tags: {', '.join(self.tags)})"
        else:
            return f"{status} {self.file_path} → Error: {self.error}"


class ContentPublisher:
    """Publishes knowledge base content files to RAGFlow with metadata extraction."""
    
    def __init__(
        self,
        client: RAGFlowClient,
        workspace_root: str,
        dataset_default: str = "aia",
        dataset_template: str = "aia-{release}",
        enable_change_tracking: bool = True,
        file_extensions: list[str] | None = None
    ):
        """
        Initialize the publisher.
        
        Args:
            client: RAGFlow client instance
            workspace_root: Root directory of the workspace
            dataset_default: Default dataset name for docs without release
            dataset_template: Dataset name template (can use {release} placeholder)
            enable_change_tracking: Enable hash-based change detection (default: True)
            file_extensions: List of file extensions to publish (default: None = all files)
        """
        self.client = client
        self.workspace_root = Path(workspace_root).resolve()
        self.dataset_default = dataset_default
        self.dataset_template = dataset_template
        self.enable_change_tracking = enable_change_tracking
        self.file_extensions = file_extensions  # None = all files (no extension filter)
        self._skip_names = {'.DS_Store', 'Thumbs.db', '.gitkeep', '.mcp.json'}
        self._skip_folders = {'.cursor-plugin', '.claude-plugin'}
    
    def publish_folder(
        self,
        folder_path: str,
        dry_run: bool = False,
        recursive: bool = True,
        force: bool = False,
        parse_documents: bool = True,
        wait_for_parsing: bool = True
    ) -> list[PublishResult]:
        """
        Publish all content files in a folder to RAGFlow.
        
        Args:
            folder_path: Path to folder containing content files
            dry_run: If True, only simulate publishing
            recursive: If True, include subfolders
            force: If True, force republish ignoring change detection
            parse_documents: If True, trigger parsing after upload (default: True)
            wait_for_parsing: If True, wait for parsing to complete (default: True)
        
        Returns:
            List of PublishResult for each file
        """
        folder = Path(folder_path).resolve()
        
        if not folder.exists() or not folder.is_dir():
            print(f"✗ Folder not found: {folder}")
            return []
        
        # Find all content files
        files: list[Path] = []
        if self.file_extensions:
            # Explicit extension filter
            for ext in self.file_extensions:
                if recursive:
                    files.extend(folder.rglob(f"*{ext}"))
                else:
                    files.extend(folder.glob(f"*{ext}"))
        else:
            # All files (skip junk and plugin folders)
            glob_iter = folder.rglob("*") if recursive else folder.glob("*")
            files = [
                f for f in glob_iter 
                if f.is_file() 
                and f.name not in self._skip_names
                and not any(part in self._skip_folders for part in f.parts)
            ]

        if not files:
            print(f"No content files found in {folder}")
            return []
        
        # Sort files for consistent ordering
        files = sorted(files)
        
        print(f"Found {len(files)} file(s) to publish")
        if dry_run:
            print("DRY RUN MODE - No actual publishing will occur")
        if force:
            print("FORCE MODE - Republishing all files regardless of changes")
        print()
        
        # Build caches for all files upfront (read ONCE, extract ONCE, hash ONCE)
        print("Reading files...")
        all_caches = []   # ALL successfully read caches (for cleanup/orphan detection)
        results = []

        for file in files:
            try:
                # Create cache (reads file, extracts metadata, calculates hash - ALL ONCE)
                cache = DocumentData.from_file(
                    file,
                    self.workspace_root,
                    self.file_extensions,
                    publish_root=folder,
                )
                all_caches.append(cache)

            except Exception as e:
                print(f"✗ Error reading {file.name}: {e}")
                continue

        # Duplicate cleanup: remove stale server copies of the same file (before publish)
        self._cleanup_duplicates(all_caches, dry_run)

        # Check for changes after cleanup so skip decisions reflect current server state.
        doc_caches = []   # Only changed caches (for publishing)
        skipped_count = 0

        if self.enable_change_tracking and not force and not dry_run:
            print("\nChecking for changes...")

        for cache in all_caches:
            if self.enable_change_tracking and not force and not dry_run:
                if self._has_content_changed_cached(cache):
                    doc_caches.append(cache)
                else:
                    skipped_count += 1
                    print(f"⊘ Skipped (unchanged): {cache.doc_title}")
                    # Add skipped file to results for summary
                    results.append(PublishResult(
                        success=True,
                        document_id=cache.ims_doc_id,
                        file_path=str(cache.file_path),
                        tags=cache.tags,
                        skipped=True
                    ))
            else:
                doc_caches.append(cache)

        if skipped_count > 0:
            print(f"\nSkipped {skipped_count} unchanged file(s)")
            print(f"Publishing {len(doc_caches)} changed file(s)\n")

        current_folder = None
        docs_to_parse = []

        for cache in doc_caches:  # Iterate over caches, not files
            # Print folder header when entering new folder
            file_folder = str(cache.file_path.parent.relative_to(folder))
            if file_folder != current_folder:
                if current_folder is not None:
                    print()  # Blank line between folders
                folder_display = file_folder if file_folder != "." else "<root>"
                # Show path relative to workspace root for cleaner output
                folder_relative = folder.relative_to(self.workspace_root)
                print(f"{folder_relative}" if file_folder == "." else f"{folder_relative}/{file_folder}")
                current_folder = file_folder
            
            # Upload file (skip redundant change check - already verified above)
            result = self.publish_file(
                cache=cache,
                dry_run=dry_run,
                force=force,
                parse_documents=False,
                skip_change_check=True 
            )
            results.append(result)

            # Collect documents for batch parsing — only parsable extensions
            if parse_documents and result.success and not result.skipped and not dry_run:
                if cache.file_path.suffix.lower() in RAGFLOW_PARSABLE_EXTENSIONS:
                    docs_to_parse.append({
                        "id": result.document_id,
                        "name": cache.file_path.name,
                        "dataset_id": result.dataset_id,
                        "folder": str(cache.file_path.parent.relative_to(folder))
                    })
                else:
                    print(f"    ⊘ Skipping parse (unsupported extension): {cache.doc_title}")

        # Batch parse all uploaded documents at once
        if parse_documents and wait_for_parsing and not dry_run:
            if docs_to_parse:
                print(f"\nStarting parsing for {len(docs_to_parse)} document(s)...")
                self._parse_documents(docs_to_parse, wait_for_completion=False, silent=True)
                self._wait_for_all_parsing_with_progress(docs_to_parse)
        
        # Print summary
        self._print_summary(results, dry_run)

        # Orphan cleanup: only safe when publishing the full instructions root.
        # When publishing a subfolder, local caches cover only a subset of server
        # docs — running orphan detection would delete everything else.
        is_full_publish = folder.name == "instructions" or folder.parent == self.workspace_root
        if is_full_publish:
            managed_domains_by_dataset: dict[str, set[str]] = {}
            for cache in all_caches:
                dataset_name = self._resolve_dataset_name({"release": cache.release})
                managed_domains_by_dataset.setdefault(dataset_name, set()).add(cache.domain)
            self._cleanup_orphans(
                all_caches,
                dry_run,
                managed_domains_by_dataset=managed_domains_by_dataset,
            )
        else:
            print("\nOrphan detection skipped (subfolder publish)")

        return results
    
    def publish_file(
        self,
        file_path: str | None = None,
        metadata: JsonDict | None = None,
        cache: DocumentData | None = None,
        dry_run: bool = False,
        force: bool = False,
        parse_documents: bool = True,
        wait_for_parsing: bool = True,
        skip_change_check: bool = False
    ) -> PublishResult:
        """
        Publish a single content file to RAGFlow.
        
        Args:
            file_path: Path to content file (legacy, for backward compatibility)
            metadata: Optional metadata override (auto-extracted if not provided)
            cache: Pre-built DocumentData (preferred, avoids re-reading)
            dry_run: If True, only simulate publishing
            force: If True, force republish ignoring change detection
            parse_documents: If True, trigger parsing after upload (default: True)
            wait_for_parsing: If True, wait for parsing to complete (default: True)
            skip_change_check: If True, skip change verification (already verified)
        
        Returns:
            PublishResult with outcome
        """
        # If cache provided, use it (no re-reading, no re-calculation)
        if cache:
            file = cache.file_path
            ims_doc_id = cache.ims_doc_id
            content = cache.content
            content_str = cache.content_str
            is_text = cache.is_text
            
            # Build metadata dict from cache if not provided
            if metadata is None:
                metadata = cache.to_metadata_dict()
        else:
            # Legacy path: file_path provided (for backward compatibility)
            if not file_path:
                return PublishResult(
                    success=False,
                    document_id="",
                    file_path="",
                    tags=[],
                    error="Either file_path or cache must be provided"
                )
            
            file = Path(file_path).resolve()
            
            # Validate file exists
            if not file.exists():
                return PublishResult(
                    success=False,
                    document_id="",
                    file_path=str(file),
                    tags=[],
                    error="File not found"
                )
            
            # Create cache on-the-fly (still better than reading multiple times)
            cache = DocumentData.from_file(
                file,
                self.workspace_root,
                self.file_extensions,
                publish_root=file.parent,
            )
            
            ims_doc_id = cache.ims_doc_id
            content = cache.content
            content_str = cache.content_str
            is_text = cache.is_text
            
            if metadata is None:
                metadata = cache.to_metadata_dict()
        
        # Determine dataset name from template and metadata
        dataset_name = self._resolve_dataset_name(metadata)
        
        try:
            # Skip empty text files
            if is_text and (not content_str or content_str.strip() == ""):
                return PublishResult(
                    success=False,
                    document_id=ims_doc_id,
                    file_path=str(file),
                    tags=metadata.get('tags', []),
                    error="File is empty - skipping"
                )
            
            # Check if changed (only if not already verified)
            if not skip_change_check and self.enable_change_tracking and not force and not dry_run:
                if not self._has_content_changed_cached(cache):
                    print(f"⊘ Skipped (unchanged): {file.name}")
                    return PublishResult(
                        success=True,
                        document_id=ims_doc_id,
                        file_path=str(file),
                        tags=metadata.get('tags', []),
                        skipped=True
                    )
            
            # Add file size for binary files
            if not is_text:
                metadata['file_size'] = len(content)
            
            
            if dry_run:
                print(f"[DRY RUN] Would publish: {metadata.get('doc_title', metadata.get('original_path', file.name))}")
                print(f"  Document ID: {ims_doc_id}")
                print(f"  Dataset: {dataset_name}")
                print(f"  File type: {'text' if is_text else 'binary'}")
                print(f"  Metadata: {metadata}")
                if is_text and content_str:
                    print(f"  Content size: {len(content_str)} characters")
                else:
                    print(f"  File size: {metadata.get('file_size', 0)} bytes")
                
                return PublishResult(
                    success=True,
                    document_id=ims_doc_id,
                    file_path=str(file),
                    tags=metadata.get('tags', [])
                )
            
            original_path = metadata.get("original_path", "")

            # Create DocumentMetadata for RAGFlow
            doc_metadata = DocumentMetadata(
                tags=cast(list[str], metadata.get('tags', [])),
                domain=str(metadata.get('domain', 'general')),
                release=str(metadata.get('release', '')),
                content_hash=str(metadata.get('content_hash', '')),
                ims_doc_id=ims_doc_id,
                original_path=str(original_path),
                resource_path=cast(str | None, metadata.get("resource_path")),
                sort_order=cast(int | None, metadata.get("sort_order")),
                frontmatter=cast(JsonDict | None, metadata.get("frontmatter")),
                line_count=cast(int | None, metadata.get("line_count")),
                doc_title=str(metadata.get('doc_title', file.name))
            )
            
            # Upload to RAGFlow using pre-read content from cache (no re-reading!)
            result = self.client.upload_document(
                file_path=file,
                metadata=doc_metadata,
                dataset_name=dataset_name,
                dataset_template=self.dataset_template,
                force=force,
                content=content  # Pass pre-read content from cache
            )
            
            # None means document was skipped (unchanged)
            if result is None:
                return PublishResult(
                    success=True,
                    document_id=ims_doc_id,
                    file_path=str(file),
                    tags=metadata.get('tags', []),
                    dataset_id="",
                    skipped=True
                )
            
            doc, dataset_id = result
            # Use RAGFlow's internal doc.id for parsing (not ims_doc_id)
            publish_result = PublishResult(
                success=True,
                document_id=doc.id,  # RAGFlow internal ID for parsing
                file_path=str(file),
                tags=metadata.get('tags', []),
                dataset_id=dataset_id
            )
            
            # Trigger parsing if enabled — only for parsable extensions
            if parse_documents and not dry_run:
                if file.suffix.lower() in RAGFLOW_PARSABLE_EXTENSIONS:
                    documents = [{
                        "id": doc.id,
                        "name": file.name,
                        "dataset_id": dataset_id
                    }]
                    self._parse_documents(
                        documents,
                        wait_for_completion=wait_for_parsing
                    )
                else:
                    print(f"    ⊘ Skipping parse (unsupported extension): {file.name}")
            
            return publish_result
            
        except RAGFlowClientError as e:
            return PublishResult(
                success=False,
                document_id="",
                file_path=str(file),
                tags=[],
                error=str(e)
            )
        except Exception as e:
            return PublishResult(
                success=False,
                document_id="",
                file_path=str(file),
                tags=[],
                error=str(e)
            )
    
    def _parse_documents(
        self,
        documents: list[JsonDict],
        wait_for_completion: bool = True,
        silent: bool = False
    ) -> None:
        """
        Trigger parsing for one or more documents.
        
        Args:
            documents: List of {"id": doc_id, "name": name, "dataset_id": dataset_id}
            wait_for_completion: Wait for parsing to complete
            silent: If True, don't print progress messages (for streaming mode)
        """
        # Delegate to client's batch parsing method
        result = self.client.parse_documents_batch(documents, silent=silent)
        
        # Wait for completion if requested (only for successful datasets)
        if wait_for_completion and not silent and result["success"]:
            # Filter to only successfully triggered documents
            docs_to_wait = [
                doc for doc in documents 
                if doc["dataset_id"] in result["success"]
            ]
            
            if docs_to_wait:
                # Use DocumentService for consistent waiting with progress bar
                doc_service = DocumentService(self.client)
                doc_service.wait_for_parsing(docs_to_wait)
    
    def _wait_for_all_parsing_with_progress(
        self,
        documents: list[JsonDict],
        timeout: int = 300,  # 5 minutes
        poll_interval: float = 0.5
    ) -> None:
        """
        Wait for all documents to finish parsing with clean progress display grouped by folder.
        
        Delegates to DocumentService.wait_for_parsing() for reusable implementation.
        
        Args:
            documents: List of {"id": doc_id, "name": name, "dataset_id": dataset_id, "folder": folder}
            timeout: Max seconds to wait
            poll_interval: Seconds between status checks (reduced to 0.5 for smoother progress)
        """ 
        doc_service = DocumentService(self.client)
        doc_service.wait_for_parsing(documents, timeout, poll_interval)
    
    def _has_content_changed_cached(self, cache: DocumentData) -> bool:
        """
        Check if document content has changed using pre-calculated hash.
        
        Args:
            cache: DocumentData with pre-calculated hash
        
        Returns:
            True if changed or new, False if unchanged
        """
        try:
            # Resolve dataset name from cache metadata
            dataset_name = self._resolve_dataset_name({
                'release': cache.release,
                'tags': cache.tags,
                'domain': cache.domain
            })
            
            # Get dataset
            dataset = self.client.get_dataset(name=dataset_name)
            if not dataset:
                return True  # New dataset = new document
            
            # Search for existing document by ims_doc_id
            metadata_filter = {
                "logic": "and",
                "conditions": [{
                    "name": "ims_doc_id",
                    "comparison_operator": "is",
                    "value": cache.ims_doc_id
                }]
            }
            
            docs = self.client.list_documents(
                dataset,
                page_size=1,
                metadata_condition=metadata_filter
            )
            
            if not docs:
                return True  # Document doesn't exist
            
            # Compare hashes (use pre-calculated hash from cache)
            existing_doc = docs[0]
            existing_meta = getattr(existing_doc, 'meta_fields', {}) or {}
            
            if isinstance(existing_meta, dict):
                existing_hash = existing_meta.get("content_hash")
            else:
                existing_hash = getattr(existing_meta, 'content_hash', None)
            
            if not existing_hash:
                return True  # No hash = changed

            # Compare: cache.content_hash was already calculated in DocumentData
            return cache.content_hash != str(existing_hash)
            
        except Exception as e:
            print(f"  Warning: Could not check existing document: {e}")
            return True  # Assume changed on error
    
    def _resolve_dataset_name(self, metadata: JsonDict) -> str:
        """
        Resolve dataset name from template using metadata.
        
        Args:
            metadata: Document metadata containing release info
        
        Returns:
            Resolved dataset name
        """
        release = metadata.get('release', '')
        
        if release:
            # Use template and replace {release} placeholder
            return self.dataset_template.replace('{release}', release)
        else:
            # No release - use default dataset
            return self.dataset_default
    
    def _cleanup_duplicates(self, all_caches: list[DocumentData], dry_run: bool) -> None:
        """Remove stale duplicate server docs before publishing.

        For each dataset, finds server docs where the same original_path appears
        more than once. Keeps the copy whose ims_doc_id matches the local file
        (authoritative). If no copy matches, keeps the most recently created one
        (first in desc create_time order). Deletes the rest.

        Only touches documents with a non-empty original_path.
        Custom documents (no original_path) are never affected.

        Args:
            all_caches: DocumentData for every local file in the published folder tree.
            dry_run: If True, report duplicates but do not delete.
        """
        # Build: dataset_name -> {original_path -> canonical ims_doc_id}
        canonical_by_dataset: dict[str, dict[str, str]] = {}
        for cache in all_caches:
            if not cache.original_path:
                continue
            dataset_name = self._resolve_dataset_name({"release": cache.release})
            canonical_by_dataset.setdefault(dataset_name, {})[cache.original_path] = cache.ims_doc_id

        if not canonical_by_dataset:
            return

        print("\nDuplicate detection...")
        for dataset_name, canonical_ids in canonical_by_dataset.items():
            dataset = self.client.get_dataset(name=dataset_name)
            if not dataset:
                continue

            try:
                all_docs = self.client.list_documents(
                    dataset,
                    page_size=self.client.page_size,
                )
            except Exception as e:
                print(f"  Warning: Could not list documents in '{dataset_name}': {e}")
                continue

            def _strip_duplicate_suffix(name: str) -> str:
                path = Path(name)
                new_name = f"{re.sub(r'\(\d+\)$', '', path.stem)}{path.suffix}"
                return name[: -len(path.name)] + new_name

            # Collect all docs to delete into one list: (doc, label)
            # Start with unmanaged: incomplete metadata (ims_doc_id or original_path absent)
            duplicates: list[tuple[DocumentLike, str]] = []
            for doc in all_docs:
                meta = getattr(doc, "meta_fields", {}) or {}
                ims_doc_id = meta.get("ims_doc_id") if isinstance(meta, dict) else getattr(meta, "ims_doc_id", None)
                doc_original_path = meta.get("original_path", "") if isinstance(meta, dict) else getattr(meta, "original_path", "")
                if not ims_doc_id or not doc_original_path:
                    doc_name = getattr(doc, "name", "") or doc.id
                    duplicates.append((doc, doc_name))

            managed_docs = []
            for doc in all_docs:
                meta = getattr(doc, "meta_fields", {}) or {}
                original_path = meta.get("original_path", "") if isinstance(meta, dict) else getattr(meta, "original_path", "")
                if original_path:
                    managed_docs.append(doc)

            # Group by original_path; list order is desc create_time (most recent first)
            by_path: dict[str, list[DocumentLike]] = defaultdict(list)
            for doc in managed_docs:
                meta = getattr(doc, "meta_fields", {}) or {}
                original_path = meta.get("original_path", "") if isinstance(meta, dict) else getattr(meta, "original_path", "")
                if original_path:
                    by_path[original_path].append(doc)

            # All copies of a duplicated original_path are deleted; publish creates a fresh copy.
            for original_path, docs in by_path.items():
                if len(docs) <= 1:
                    continue
                for doc in docs:
                    duplicates.append((doc, original_path))

            # Name duplicates: foo.md + foo(1).md + foo(2).md ...
            name_groups: dict[str, list[DocumentLike]] = defaultdict(list)
            for doc in all_docs:
                doc_name = getattr(doc, "name", "") or ""
                if not doc_name:
                    continue
                name_groups[_strip_duplicate_suffix(doc_name)].append(doc)

            for doc_name_stripped, docs in name_groups.items():
                if len(docs) > 1:
                    for doc in docs:
                        duplicates.append((doc, getattr(doc, "name", "") or ""))

            if not duplicates:
                print(f"  '{dataset_name}': no duplicates")
                continue

            print(f"  '{dataset_name}': {len(duplicates)} duplicate(s)")
            seen_doc_ids = set()
            for doc, original_path in duplicates:
                if doc.id in seen_doc_ids:
                    continue
                seen_doc_ids.add(doc.id)
                if dry_run:
                    print(f"    [DRY RUN] Would delete duplicate: {original_path}")
                else:
                    try:
                        dataset.delete_documents([doc.id])
                        print(f"    Deleted duplicate: {original_path}")
                    except Exception as e:
                        print(f"    Warning: Failed to delete duplicate '{original_path}': {e}")

    def _cleanup_orphans(
        self,
        all_caches: list[DocumentData],
        dry_run: bool,
        managed_domains_by_dataset: dict[str, set[str]] | None = None,
    ) -> None:
        """Delete server documents whose original_path is no longer present locally.

        Only touches documents that have a non-empty original_path metadata field.
        Custom documents (uploaded via put_document, no original_path) are NEVER deleted.

        Args:
            all_caches: DocumentData for every local file in the published folder tree.
            dry_run: If True, report orphans but do not delete.
        """
        # Build: dataset_name -> set of local original_paths
        local_paths_by_dataset: dict[str, set[str]] = {}
        for cache in all_caches:
            if not cache.original_path:
                continue
            dataset_name = self._resolve_dataset_name({"release": cache.release})
            local_paths_by_dataset.setdefault(dataset_name, set()).add(cache.original_path)

        if not local_paths_by_dataset:
            return

        print("\nOrphan detection...")
        for dataset_name, local_paths in local_paths_by_dataset.items():
            managed_domains = (
                managed_domains_by_dataset.get(dataset_name, set())
                if managed_domains_by_dataset
                else set()
            )
            dataset = self.client.get_dataset(name=dataset_name)
            if not dataset:
                continue

            # Fetch only publisher-managed docs (non-empty original_path) via server-side filter.
            # Custom documents (no original_path) are skipped at the query level.
            try:
                managed_docs = self.client.list_documents(
                    dataset,
                    page_size=self.client.page_size,
                    metadata_condition={
                        "logic": "and",
                        "conditions": [{
                            "name": "original_path",
                            "comparison_operator": "not empty",
                            "value": ""
                        }]
                    }
                )
            except Exception as e:
                print(f"  Warning: Could not list documents in '{dataset_name}': {e}")
                continue

            orphans = []
            for doc in managed_docs:
                meta = getattr(doc, "meta_fields", {}) or {}
                if isinstance(meta, dict):
                    original_path = meta.get("original_path", "")
                    domain = meta.get("domain", "")
                else:
                    original_path = getattr(meta, "original_path", "")
                    domain = getattr(meta, "domain", "")

                if not original_path:
                    continue

                if managed_domains and domain not in managed_domains:
                    continue

                if original_path not in local_paths:
                    orphans.append((doc, original_path))

            if not orphans:
                print(f"  '{dataset_name}': no orphans")
                continue

            print(f"  '{dataset_name}': {len(orphans)} orphan(s)")
            for doc, original_path in orphans:
                if dry_run:
                    print(f"    [DRY RUN] Would delete: {original_path}")
                else:
                    try:
                        dataset.delete_documents([doc.id])
                        print(f"    Deleted orphan: {original_path}")
                    except Exception as e:
                        print(f"    Warning: Failed to delete orphan '{original_path}': {e}")

    @staticmethod
    def _print_summary(results: list[PublishResult], dry_run: bool = False) -> None:
        """
        Print summary of publishing results.
        
        Args:
            results: List of PublishResult
            dry_run: Whether this was a dry run
        """
        successful = [r for r in results if r.success and not r.skipped]
        skipped = [r for r in results if r.skipped]
        failed = [r for r in results if not r.success]
        
        print("\n" + "="*60)
        if dry_run:
            print("DRY RUN SUMMARY")
        else:
            print("PUBLISHING SUMMARY")
        print("="*60)
        
        print(f"Total files: {len(results)}")
        print(f"✓ Successful: {len(successful)}")
        print(f"⊘ Skipped (unchanged): {len(skipped)}")
        print(f"✗ Failed: {len(failed)}")
        
        if failed:
            print("\nFailed files:")
            for result in failed:
                print(f"  {result}")
        
        print("="*60)
