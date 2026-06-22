"""
Base Command Abstract Class

Defines the interface and common functionality for all IMS CLI commands.
"""

import time
from abc import ABC, abstractmethod

from ..ims_config import IMSConfig
from ..ragflow_client import RAGFlowClient
from ..typing_utils import CommandArgs


class BaseCommand(ABC):
    """
    Abstract base class for all IMS CLI commands.
    
    Provides common functionality for authentication, timing, and error handling.
    Each command must implement the execute() method.
    """
    
    def __init__(self, client: RAGFlowClient, config: IMSConfig):
        """
        Initialize command with RAGFlow client and configuration.
        
        Args:
            client: RAGFlow client instance
            config: IMS configuration
        """
        self.client = client
        self.config = config
        self._start_time: float | None = None
    
    @abstractmethod
    def execute(self, args: CommandArgs) -> int:
        """
        Execute the command with given arguments.
        
        Args:
            args: Parsed command-line arguments (argparse.Namespace)
        
        Returns:
            Exit code (0 for success, non-zero for failure)
        """
        raise NotImplementedError
    
    def _start_timing(self) -> None:
        """Start timing measurement for command execution."""
        self._start_time = time.time()
    
    def _get_elapsed_time(self) -> float:
        """
        Get elapsed time since timing started.
        
        Returns:
            Elapsed time in seconds
        """
        if self._start_time is None:
            return 0.0
        return time.time() - self._start_time
    
    def _print_timing(self, label: str = "Total time") -> None:
        """
        Print timing information.
        
        Args:
            label: Label for the timing output
        """
        elapsed = self._get_elapsed_time()
        print(f"⏱️  {label}: {elapsed:.2f}s")
    
    def _print_header(self, title: str) -> None:
        """
        Print command header with configuration info.
        
        Args:
            title: Command title/description
        """
        print(title)
        print(f"Environment: {self.config.environment}")
        print(f"RAGFlow Instance: {self.config.base_url}")
