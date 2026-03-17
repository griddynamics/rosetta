"""
List Command - Display documents in a dataset
"""

from ..services.dataset_service import DatasetService
from ..services.document_service import DocumentService

from .base_command import BaseCommand
from ..typing_utils import CommandArgs


class ListCommand(BaseCommand):
    """List documents in a RAGFlow dataset."""
    
    def execute(self, args: CommandArgs) -> int:
        """Execute list-dataset command."""
        self._start_timing()

        # Verify authentication before any dataset auto-detection touches the API.
        from ..services.auth_service import AuthService
        AuthService.verify_or_exit(self.client, self.config)
        
        # Resolve dataset name
        dataset_service = DatasetService(self.client, self.config)
        dataset_name, _auto_detected = dataset_service.resolve_dataset_name(args.dataset)
        
        if not dataset_name:
            print("✗ Failed to resolve dataset name")
            return 1
        
        # Print header
        print(f"Listing Dataset: {dataset_name}")
        print(f"Environment: {self.config.environment}")
        print(f"RAGFlow Instance: {self.config.base_url}")
        print()
        
        try:
            # Get dataset
            dataset = self.client.get_dataset(name=dataset_name)
            
            if not dataset:
                print(f"✗ Dataset '{dataset_name}' not found")
                dataset_service.display_available_datasets()
                return 1
            
            # List documents
            document_service = DocumentService(self.client)
            documents = dataset.list_documents(page_size=self.config.page_size)
            
            if not documents:
                print("\nNo documents found in dataset")
                return 0
            
            print(f"\nFound {len(documents)} document(s):")
            print("="*80)
 
            for i, document in enumerate(documents, 1):
                print(document_service.format_document_display(document, i))
            
            print("="*80)
            self._print_timing()
            
            return 0
            
        except Exception as e:
            print(f"\n✗ Error listing dataset: {e}")
            self._print_timing()
            import traceback
            traceback.print_exc()
            return 1
