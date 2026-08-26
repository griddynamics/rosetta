"""
Dataset Service

Handles dataset resolution, auto-detection, and management operations.
Eliminates code duplication across commands.
"""

from typing import List, Optional

from ..rosetta_config import RosettaConfig
from ..ragflow_client import RAGFlowClient


class DatasetService:
    """Service for handling dataset operations"""
    
    def __init__(self, client: RAGFlowClient, config: RosettaConfig):
        """
        Initialize DatasetService.
        
        Args:
            client: RAGFlow client instance
            config: Rosetta configuration
        """
        self.client = client
        self.config = config
    
    def resolve_dataset_name(self, args_dataset: Optional[str]) -> tuple[Optional[str], bool]:
        """
        Resolve which dataset to act on.

        How the name is picked:
          1. --dataset given      -> use it               (False)
          2. else list server datasets, keep those starting with the template
             prefix ("aia-" from "aia-{release}")
          3. exactly one match    -> use it               (True)
          4. several matches      -> give up, ask user    (None, False)
          5. no matches           -> use dataset_default  (True)

        Args:
            args_dataset: Dataset name from arguments (can be None)

        Returns:
            Tuple of (dataset_name: str or None, auto_detected: bool)
            Returns (None, False) if resolution fails

            auto_detected answers "did the caller supply this name?", not "did
            we find it on the server". False only for step 1. True for steps 3
            and 5 alike: the caller supplied nothing and this method chose.
            True on step 5 is correct.
        """
        # Explicit dataset provided
        if args_dataset:
            return args_dataset, False
        
        # Try to find one matching the template pattern
        template_prefix = self.config.dataset_template.split('{')[0]
        
        # List all datasets since RAGFlow's name filter is exact match, not substring
        # For prefix matching, we need client-side filtering
        all_datasets = self.client.list_datasets(page_size=self.config.page_size)
        
        # Filter for exact prefix match
        matching = [ds for ds in all_datasets if ds.name.startswith(template_prefix)]
        
        if len(matching) == 1:
            print(f"Auto-detected dataset: {matching[0].name} (from template pattern '{template_prefix}*')")
            return matching[0].name, True
        elif len(matching) > 1:
            print(f"Multiple datasets match pattern '{template_prefix}*':")
            for ds in matching:
                print(f"  - {ds.name}")
            print(f"\nPlease specify which dataset using --dataset flag")
            return None, False
        else:
            # Fall back to default
            print(f"Using default dataset: {self.config.dataset_default}")
            return self.config.dataset_default, True
    
    def display_available_datasets(self) -> None:
        """Display list of available datasets"""
        datasets = self.client.list_datasets(page_size=self.config.page_size)
        print(f"\nAvailable datasets:")
        for ds in datasets:
            print(f"  - {ds.name}")
