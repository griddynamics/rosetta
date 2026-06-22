"""
Cleanup Command - Delete documents from a dataset
"""

from ..services.dataset_service import DatasetService
from ..services.document_service import DocumentService

from .base_command import BaseCommand
from ..typing_utils import CommandArgs, DatasetLike, DocumentLike


class CleanupCommand(BaseCommand):
    """
    Delete documents from a RAGFlow dataset.
    
    CRITICAL: Implements safety measures (dry-run, confirmation) to prevent accidental data loss.
    """
    
    def execute(self, args: CommandArgs) -> int:
        """Execute cleanup-dataset command."""
        self._start_timing()

        # Verify authentication before any dataset auto-detection touches the API.
        from ..services.auth_service import AuthService
        AuthService.verify_or_exit(self.client, self.config)
        
        # Resolve dataset name
        dataset_service = DatasetService(self.client, self.config)
        dataset_name, auto_detected = dataset_service.resolve_dataset_name(args.dataset)
        
        if not dataset_name:
            return 1
        
        # Print header
        print(f"Cleaning up Dataset: {dataset_name}")
        print(f"Environment: {self.config.environment}")
        print(f"RAGFlow Instance: {self.config.base_url}\n")
        
        try:
            # Get dataset
            dataset = self.client.get_dataset(name=dataset_name)
            
            if not dataset:
                print(f"✗ Dataset '{dataset_name}' not found")
                dataset_service.display_available_datasets()
                return 1
            
            # Filter documents
            filtered_documents = self._get_filtered_documents(
                dataset, dataset_service, args
            )
            
            if not filtered_documents:
                print(f"✓ No documents found")
                return 0
            
            # Show documents
            self._display_documents(filtered_documents)
            
            # Dry-run mode
            if args.dry_run:
                return self._handle_dry_run(filtered_documents)
            
            # Confirm deletion
            if not self._confirm_deletion(filtered_documents, dataset_name, args):
                print("\n✗ Cleanup cancelled")
                return 1
            
            # Delete documents
            deleted, failed = self._delete_documents(dataset, filtered_documents)
            
            # Print summary
            self._print_summary(deleted, failed)
            
            return 0 if failed == 0 else 1
            
        except Exception as e:
            print(f"\n✗ Error cleaning up dataset: {e}")
            self._print_timing()
            import traceback
            traceback.print_exc()
            return 1
    
    def _get_filtered_documents(
        self,
        dataset: DatasetLike,
        dataset_service: DatasetService,
        args: CommandArgs,
    ) -> list[DocumentLike]:
        """Get documents to delete based on filters."""
        document_service = DocumentService(self.client)
        
        if args.tags:
            # Filter by tags (metadata condition)
            tags_list = self._parse_tags(args.tags)
            filtered_documents = document_service.filter_documents_by_tags(
                dataset, tags_list
            )
            print(f"\nFiltered {len(filtered_documents)} document(s) with tags: {', '.join(tags_list)}\n")
        elif args.prefix:
            # Filter by prefix
            filtered_documents = document_service.filter_documents_by_prefix(
                dataset, args.prefix
            )
            print(f"\nFiltered {len(filtered_documents)} document(s) matching prefix '{args.prefix}'\n")
        else:
            # No filter - fetch all
            filtered_documents = dataset.list_documents(page_size=self.config.page_size)
            if filtered_documents:
                print(f"\nFound {len(filtered_documents)} document(s) to delete\n")
        
        return filtered_documents
    
    def _parse_tags(self, tags_arg: str) -> list[str]:
        """Parse tags from comma or space separated string."""
        # Support both comma and space separated tags
        if ',' in tags_arg:
            tags = [tag.strip() for tag in tags_arg.split(',')]
        else:
            tags = tags_arg.split()
        
        # Filter out empty strings
        return [tag for tag in tags if tag]
    
    def _display_documents(self, documents: list[DocumentLike]) -> None:
        """Display documents that will be deleted."""
        print("Documents to delete:")
        print("="*80)
        for document in documents:
            doc_name = document.name if hasattr(document, 'name') else 'Untitled'
            print(f"  • {doc_name}")
        print("="*80)
        print()
    
    def _handle_dry_run(self, documents: list[DocumentLike]) -> int:
        """Handle dry-run mode."""
        print("🔍 DRY-RUN MODE - No documents will be deleted\n")
        print(f"Summary: {len(documents)} document(s) would be deleted")
        print("="*80)
        self._print_timing()
        return 0
    
    def _confirm_deletion(
        self,
        documents: list[DocumentLike],
        dataset_name: str,
        args: CommandArgs,
    ) -> bool:
        """Confirm deletion with user (unless force flag set)."""
        if args.force:
            return True
        
        # Build filter message
        filter_msg = ""
        if args.tags:
            tags_list = self._parse_tags(args.tags)
            filter_msg = f" with tags ({', '.join(tags_list)})"
        elif args.prefix:
            filter_msg = f" with prefix '{args.prefix}'"
        
        response = input(
            f"⚠️  Delete {len(documents)} documents{filter_msg} from '{dataset_name}'? (yes/no): "
        )
        return response.lower() in ['yes', 'y']
    
    def _delete_documents(
        self,
        dataset: DatasetLike,
        documents: list[DocumentLike],
    ) -> tuple[int, int]:
        """Delete documents and return counts."""
        deleted_count = 0
        failed_count = 0
        
        # Collect document IDs
        doc_ids_to_delete = []
        doc_id_to_name = {}
        
        for document in documents:
            doc_id = document.id if hasattr(document, 'id') else None
            doc_name = document.name if hasattr(document, 'name') else 'Untitled'
            
            if not doc_id:
                print(f"✗ Cannot delete {doc_name}: No document ID")
                failed_count += 1
                continue
            
            doc_ids_to_delete.append(doc_id)
            doc_id_to_name[doc_id] = doc_name
        
        # Delete batch
        if doc_ids_to_delete:
            try:
                dataset.delete_documents(ids=doc_ids_to_delete)
                deleted_count = len(doc_ids_to_delete)
                
                for doc_id in doc_ids_to_delete:
                    doc_name = doc_id_to_name.get(doc_id, 'Unknown')
                    print(f"✓ Deleted: {doc_name}")
                    
            except Exception as e:
                print(f"✗ Failed to delete documents: {e}")
                failed_count = len(doc_ids_to_delete)
        
        return deleted_count, failed_count
    
    def _print_summary(self, deleted: int, failed: int) -> None:
        """Print cleanup summary."""
        print("\n" + "="*80)
        print(f"Cleanup Summary:")
        print(f"  ✓ Deleted: {deleted}")
        print(f"  ✗ Failed: {failed}")
        print("="*80)
        self._print_timing()
