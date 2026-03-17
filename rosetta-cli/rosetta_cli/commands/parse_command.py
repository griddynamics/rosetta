"""
Parse Command - Trigger document parsing without re-uploading
"""

import time

from ..services.dataset_service import DatasetService
from ..services.document_service import DocumentService
from ..services.auth_service import AuthService



from .base_command import BaseCommand
from ..typing_utils import CommandArgs, DatasetLike, JsonDict


class ParseCommand(BaseCommand):
    """
    Trigger parsing for documents in a dataset.
    
    Handles selective parsing (failed/unparsed) or force re-parse all documents.
    """
    
    def execute(self, args: CommandArgs) -> int:
        """Execute parse command."""
        self._start_timing()

        # CLI flag must override config default for this run.
        self.config.parse_timeout = args.parse_timeout

        # Verify authentication before any dataset auto-detection touches the API.
        AuthService.verify_or_exit(self.client, self.config)
        
        # Resolve dataset name
        dataset_service = DatasetService(self.client, self.config)
        dataset_name, auto_detected = dataset_service.resolve_dataset_name(args.dataset)
        
        if not dataset_name:
            print("✗ Failed to resolve dataset name")
            return 1
        
        # Print header
        print(f"Parsing Documents in Dataset: {dataset_name}")
        if args.force:
            print("FORCE MODE - Will re-parse ALL documents")
        if args.dry_run:
            print("DRY-RUN MODE - No parsing will be triggered")
        print(f"Environment: {self.config.environment}")
        print(f"RAGFlow Instance: {self.config.base_url}\n")
        print()
        
        try:
            # Get dataset
            dataset = self.client.get_dataset(name=dataset_name)
            
            if not dataset:
                print(f"✗ Dataset '{dataset_name}' not found")
                dataset_service.display_available_datasets()
                return 1
            
            # Get documents to parse
            docs_to_parse, status_counts = self._get_documents_to_parse(
                dataset, args
            )
            
            # Print status
            self._print_parse_status(docs_to_parse, status_counts, args)
            
            # Dry-run mode
            if args.dry_run:
                return self._handle_dry_run(docs_to_parse, status_counts)
            
            # Check if anything to parse
            if not docs_to_parse:
                print("✓ All documents are already parsed or currently parsing")
                self._print_timing()
                return 0
            
            # Confirm only in force mode (re-parsing all documents is destructive)
            if args.force and not self._confirm_parsing(docs_to_parse, args):
                print("\n✗ Parsing cancelled")
                return 1
            
            # Parse documents
            success, failed = self._parse_and_wait(docs_to_parse, args)
            
            # Print summary
            self._print_parse_summary(success, failed, status_counts, args)
            
            return 0 if failed == 0 else 1
            
        except KeyboardInterrupt:
            print("\n\n✗ Parsing interrupted by user (Ctrl+C)")
            self._print_timing()
            return 1
        except Exception as e:
            print(f"\n✗ Error during parsing: {e}")
            self._print_timing()
            import traceback
            traceback.print_exc()
            return 1
    
    def _get_documents_to_parse(self, dataset: DatasetLike, args: CommandArgs) -> tuple[list[JsonDict], dict[str, int]]:
        """Get documents that need parsing."""
        document_service = DocumentService(self.client)
        docs_to_parse: list[JsonDict] = []
        status_counts = {'done': 0, 'running': 0}
        
        print(f"Checking parsing status for documents...")
        
        if args.force:
            # Force mode: all documents
            documents = dataset.list_documents(page_size=self.config.page_size)
            
            print(f"Found {len(documents)} document(s) (force mode - parsing all)\n")
            
            for document in documents:
                doc_id = getattr(document, 'id', None)
                if doc_id:
                    docs_to_parse.append({
                        "id": doc_id,
                        "name": getattr(document, 'name', 'Untitled'),
                        "dataset_id": dataset.id,
                        "folder": ".",
                        "status": getattr(document, 'run', 'UNSTART')
                    })
        else:
            # Default mode: filter by status (need parsing)
            documents_needing_parse = document_service.list_documents_by_status(
                dataset,
                statuses=["FAIL", "UNSTART", "CANCEL"],
                limit=self.config.page_size
            )
            
            print(f"Found {len(documents_needing_parse)} document(s) needing parsing\n")
            
            for document in documents_needing_parse:
                doc_id = getattr(document, 'id', None)
                if doc_id:
                    docs_to_parse.append({
                        "id": doc_id,
                        "name": getattr(document, 'name', 'Untitled'),
                        "dataset_id": dataset.id,
                        "folder": ".",
                        "status": getattr(document, 'run', 'UNSTART')
                    })
        
        return docs_to_parse, status_counts
    
    def _print_parse_status(self, docs_to_parse: list[JsonDict], status_counts: dict[str, int], args: CommandArgs) -> None:
        """Print parsing status."""
        if docs_to_parse:
            print(f"Documents to parse ({len(docs_to_parse)}):")
            for doc in docs_to_parse:
                print(f"  📄 {doc['name']} ({doc['status']})")
            print()
    
    def _handle_dry_run(self, docs_to_parse: list[JsonDict], status_counts: dict[str, int]) -> int:
        """Handle dry-run mode."""
        print("="*80)
        print(f"Summary (DRY-RUN):")
        print(f"  Would parse: {len(docs_to_parse)}")
        print(f"  Already done: {status_counts['done']}")
        print(f"  Currently running: {status_counts['running']}")
        print("="*80)
        self._print_timing()
        return 0
    
    def _confirm_parsing(self, docs_to_parse: list[JsonDict], args: CommandArgs) -> bool:
        """Confirm parsing with user."""
        if args.yes:
            return True
        
        response = input(f"⚠️  Trigger parsing for {len(docs_to_parse)} documents? (yes/no): ")
        return response.lower() in ['yes', 'y']
    
    def _parse_and_wait(self, docs_to_parse: list[JsonDict], args: CommandArgs) -> tuple[int, int]:
        """Parse documents and wait for completion."""
        
        # Use client's batch parsing method (handles grouping and triggering)
        _ = self.client.parse_documents_batch(docs_to_parse, silent=True)
        
        # Wait with progress bar using DocumentService
        doc_service = DocumentService(self.client)
        success, failed = doc_service.wait_for_parsing(
            docs_to_parse,
            timeout=self.config.parse_timeout
        )
        
        return success, failed
    
    def _print_parse_summary(self, success: int, failed: int, status_counts: dict[str, int], args: CommandArgs) -> None:
        """Print parsing summary."""
        print("\n" + "="*80)
        print(f"Parse Summary:")
        print(f"  ✓ Successfully parsed: {success}")
        if failed > 0:
            print(f"  ✗ Failed: {failed}")
        if not args.force:
            if status_counts['done'] > 0:
                print(f"  ⏭️  Skipped (already done): {status_counts['done']}")
            if status_counts['running'] > 0:
                print(f"  ⏭️  Skipped (running): {status_counts['running']}")
        print("="*80)
        self._print_timing()
