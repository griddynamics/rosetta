"""
Document Service

Handles document operations including listing, filtering, and status management.
Eliminates code duplication and fixes naming inconsistencies.
"""

import time
from typing import cast

from tqdm import tqdm
from ..ragflow_client import RAGFlowClient
from ..typing_utils import DatasetLike, DocumentLike, JsonDict


class DocumentService:
    """Service for handling document operations"""
    
    def __init__(self, client: RAGFlowClient):
        """
        Initialize DocumentService.
        
        Args:
            client: RAGFlow client instance
        """
        self.client = client
    
    def list_documents_by_status(
        self,
        dataset: DatasetLike,
        statuses: list[str] | None = None,
        limit: int = 1000
    ) -> list[DocumentLike]:
        """
        List documents filtered by parse status using server-side filtering.
        
        Args:
            dataset: Dataset object
            statuses: List of status values to filter by (e.g., ["FAIL", "UNSTART", "CANCEL"])
                     Supported values: "UNSTART", "RUNNING", "CANCEL", "DONE", "FAIL"
            limit: Maximum number of documents to return
        
        Returns:
            List of Document objects matching the criteria
            
        Raises:
            Exception: If RAGFlow API returns error
        """
        try:
            # Use server-side filtering via HTTP API run parameter
            # If statuses is None, no filter is applied (fetches all)
            documents = self.client.list_documents(
                dataset,
                run=statuses,
                page_size=limit
            )
            
            return documents if documents else []
            
        except Exception as e:
            # Fallback to client-side filtering if HTTP API fails
            print(f"Warning: Server-side filtering failed, using fallback: {e}")
            
            all_documents = dataset.list_documents(page_size=limit)
            
            if not all_documents or not statuses:
                return all_documents or []
            
            # Client-side filtering fallback
            filtered: list[DocumentLike] = []
            for doc in all_documents:
                doc_status = getattr(doc, 'run', 'UNSTART')
                if doc_status in statuses:
                    filtered.append(doc)
            
            return filtered
    
    def filter_documents_by_prefix(
        self,
        dataset: DatasetLike,
        prefix: str,
        limit: int = 1000
    ) -> list[DocumentLike]:
        """
        Filter documents by title prefix using server-side filtering.
        
        Args:
            dataset: Dataset object
            prefix: Title prefix to filter by
            limit: Maximum number of documents to return
        
        Returns:
            List of Document objects with matching prefix
        """
        metadata_filter = {
            "logic": "and",
            "conditions": [{
                "name": "doc_title",
                "comparison_operator": "start with",
                "value": prefix
            }]
        }
        
        documents = self.client.list_documents(
            dataset,
            page_size=limit,
            metadata_condition=metadata_filter
        )
        
        return documents if documents else []
    
    def filter_documents_by_tags(
        self,
        dataset: DatasetLike,
        tags: list[str],
        limit: int = 1000
    ) -> list[DocumentLike]:
        """
        Filter documents by tags using server-side metadata filtering.
        
        Uses "or" logic to find documents containing ANY of the specified tags.
        
        Args:
            dataset: Dataset object
            tags: List of tags to filter by (e.g., ["r1", "agents"])
            limit: Maximum number of documents to return
        
        Returns:
            List of Document objects containing any of the specified tags
        
        Example:
            tags=["r1", "agents"] finds documents with tags containing "r1" OR "agents"
        """
        if not tags:
            return []
        
        # Build metadata condition with "or" logic
        # Each tag gets a "contains" condition
        metadata_filter = {
            "logic": "or",
            "conditions": [
                {
                    "name": "tags",
                    "comparison_operator": "contains",
                    "value": tag
                }
                for tag in tags
            ]
        }
        
        documents = self.client.list_documents(
            dataset,
            page_size=limit,
            metadata_condition=metadata_filter
        )
        
        return documents if documents else []
    
    def get_document_summary(self, document: DocumentLike) -> JsonDict:
        """
        Get summary information from a document.
        
        Args:
            document: Document object
        
        Returns:
            Dictionary with document summary
        """
        return {
            'id': getattr(document, 'id', 'N/A'),
            'name': getattr(document, 'name', 'Untitled'),
            'size': getattr(document, 'size', 0),
            'run': getattr(document, 'run', 'UNKNOWN'),
            'chunk_count': getattr(document, 'chunk_count', 0),
            'meta_fields': getattr(document, 'meta_fields', {})
        }
    
    def format_document_display(self, document: DocumentLike, index: int) -> str:
        """
        Format document information for display.
        
        Args:
            document: Document object
            index: Display index number
        
        Returns:
            Formatted string for display
        """
        summary = self.get_document_summary(document)
        
        # Format parse status with emoji
        status_icon = {
            'DONE': '✓',
            'RUNNING': '⏳',
            'FAIL': '✗',
            'UNSTART': '○',
            'CANCEL': '⊘'
        }.get(summary['run'], '?')
        
        lines = [
            f"{index}. {summary['name']}",
            f"   ID: {summary['id']}",
            f"   Size: {summary['size']:,} bytes",
            f"   Parse Status: {status_icon} {summary['run']} (Chunks: {summary['chunk_count']})"
        ]
        
        # Add metadata if available
        meta_fields = summary['meta_fields']
        if meta_fields:
            # meta_fields is a Base object from SDK, use getattr() directly
            tags = cast(list[str], getattr(meta_fields, 'tags', []))
            domain = getattr(meta_fields, 'domain', 'N/A')
            release = getattr(meta_fields, 'release', 'N/A')
            source = getattr(meta_fields, 'original_path', getattr(meta_fields, 'source_path', 'N/A'))
            
            if tags:
                lines.append(f"   Tags: {', '.join(tags)}")
            if domain != 'N/A':
                lines.append(f"   Domain: {domain}")
            if release != 'N/A':
                lines.append(f"   Release: {release}")
            if source != 'N/A':
                lines.append(f"   Source: {source}")
        
        return '\n'.join(lines)
    
    def wait_for_parsing(
        self,
        documents: list[JsonDict],
        timeout: int = 300,
        poll_interval: float = 0.5
    ) -> tuple[int, int]:
        """
        Wait for documents to finish parsing with progress display grouped by folder.
        
        Args:
            documents: List of {"id": doc_id, "name": name, "dataset_id": dataset_id, "folder": folder}
            timeout: Max seconds to wait (default: 300 = 5 minutes)
            poll_interval: Seconds between status checks (default: 0.5 for smooth progress)
        
        Returns:
            Tuple of (success_count, failed_count)
        """
        if not documents:
            return 0, 0
        
        # Group by folder for display
        by_folder: dict[str, list[str]] = {}
        doc_info: dict[str, JsonDict] = {}
        
        for doc in documents:
            folder = str(doc.get("folder", "."))
            if folder not in by_folder:
                by_folder[folder] = []
            by_folder[folder].append(str(doc["id"]))
            
            doc_id = str(doc["id"])
            doc_info[doc_id] = {
                "dataset_id": str(doc["dataset_id"]),
                "name": str(doc["name"]),
                "folder": folder,
                "status": "queued",
                "chunks": 0,
                "tokens": 0
            }
        
        print(f"\n📄 Parsing {len(documents)} document(s)...\n")
        
        start_time = time.time()
        completed: set[str] = set()
        failed: set[str] = set()
        
        # Create progress bar with better refresh rate
        pbar = tqdm(
            total=len(documents),
            desc="Overall progress",
            unit="doc",
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]",
            mininterval=0.1  # Update display at most every 0.1 seconds
        )
        
        try:
            while len(completed) + len(failed) < len(documents):
                elapsed = time.time() - start_time
                if elapsed > timeout:
                    pending_count = len(documents) - len(completed) - len(failed)
                    pbar.write(f"\n⚠️  Timeout after {timeout}s. {pending_count} documents still parsing.")
                    break
                
                time.sleep(poll_interval)
                
                # Check status of all pending documents
                newly_completed = []
                newly_failed = []
                
                for doc_id, info in doc_info.items():
                    if doc_id in completed or doc_id in failed:
                        continue
                    
                    try:
                        status = self.client.get_parse_status(info["dataset_id"], doc_id)
                        run_status = status.get("run", "UNKNOWN")
                        
                        if run_status == "DONE":
                            info["status"] = "done"
                            info["chunks"] = status.get("chunk_count", 0)
                            info["tokens"] = status.get("token_count", 0)
                            completed.add(doc_id)
                            newly_completed.append(doc_id)
                        elif run_status == "FAIL":
                            info["status"] = "failed"
                            failed.add(doc_id)
                            newly_failed.append(doc_id)
                        elif run_status == "RUNNING":
                            info["status"] = "parsing"
                    except Exception as e:
                        # Don't fail entire operation for single status check error
                        pbar.write(f"  ⚠️  Failed to get status for document {doc_id}: {e}")
                
                # Update progress bar and print status for newly completed/failed
                # Add small delay between updates to make progress visible
                if newly_completed or newly_failed:
                    for doc_id in newly_completed:
                        info = doc_info[doc_id]
                        if info["folder"] == ".":
                            display = info['name']  # Root folder - show only filename
                        else:
                            display = f"{info['folder']}/{info['name']}"  # Show folder/filename
                        pbar.write(f"  ✅ {display}: {info['chunks']} chunks, {info['tokens']} tokens")
                        pbar.update(1)
                        time.sleep(0.05)  # Small delay to make progress visible
                    
                    for doc_id in newly_failed:
                        info = doc_info[doc_id]
                        if info["folder"] == ".":
                            display = info['name']  # Root folder - show only filename
                        else:
                            display = f"{info['folder']}/{info['name']}"  # Show folder/filename
                        pbar.write(f"  ✗ {display}: Failed")
                        pbar.update(1)
                        time.sleep(0.05)  # Small delay to make progress visible
            
            pbar.close()
            
            elapsed = time.time() - start_time
            if len(completed) == len(documents):
                print(f"\n✅ All {len(documents)} documents parsed successfully ({elapsed:.1f}s)")
            else:
                print(f"\n⚠️  Completed: {len(completed)}, Failed: {len(failed)}, Total: {len(documents)}")
        
        except KeyboardInterrupt:
            pbar.close()
            print("\n\n⚠️  Parsing interrupted by user (Ctrl+C)")
            print("ℹ️  Parsing continues on server. Check RAGFlow UI for status.")
            raise
        
        return len(completed), len(failed)
