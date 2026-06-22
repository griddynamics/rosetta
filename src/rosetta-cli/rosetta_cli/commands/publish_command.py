"""
Publish Command - Upload knowledge base content to RAGFlow
"""

from pathlib import Path

from ..ims_publisher import ContentPublisher
from ..services.auth_service import AuthService
from ..ims_utils import resolve_workspace_root

from .base_command import BaseCommand
from ..typing_utils import CommandArgs



class PublishCommand(BaseCommand):
    """
    Publish knowledge base content (files or folders) to RAGFlow.
    
    Handles single file or recursive folder publishing with optional dry-run mode.
    """
    
    def execute(self, args: CommandArgs) -> int:
        """
        Execute publish command.
        
        Args:
            args: Command arguments with path, dry_run, force, no_parse flags
        
        Returns:
            0 if successful, 1 if failed
        """
        self._start_timing()
        
        # Print header
        print(f"Publishing knowledge base content from: {args.path}")
        self._print_header_with_api_key()
        print()
        
        # Verify authentication
        AuthService.verify_or_exit(self.client, self.config)
        
        path = Path(args.path.strip()).resolve()
        workspace_root = resolve_workspace_root(path)
        
        publisher = ContentPublisher(
            self.client,
            str(workspace_root),
            dataset_default=self.config.dataset_default,
            dataset_template=self.config.dataset_template
        )
        
        # Publish
        exit_code = self._publish_path(publisher, path, args)
        
        # Print timing
        print()
        self._print_timing()
        
        return exit_code
    
    def _publish_path(self, publisher: ContentPublisher, path: Path, args: CommandArgs) -> int:
        """
        Publish a file or directory.
        
        Args:
            publisher: ContentPublisher instance
            path: Path to publish
            args: Command arguments
        
        Returns:
            Exit code
        """
        if path.is_file():
            return self._publish_file(publisher, path, args)
        elif path.is_dir():
            return self._publish_folder(publisher, path, args)
        else:
            print(f"✗ Path not found: {path}")
            return 1
    
    def _publish_file(self, publisher: ContentPublisher, path: Path, args: CommandArgs) -> int:
        """Publish single file."""
        result = publisher.publish_file(
            str(path),
            dry_run=args.dry_run,
            force=args.force,
            parse_documents=not args.no_parse,
            wait_for_parsing=True
        )
        print(f"\n{result}")
        return 0 if result.success else 1
    
    def _publish_folder(self, publisher: ContentPublisher, path: Path, args: CommandArgs) -> int:
        """Publish folder recursively."""
        results = publisher.publish_folder(
            str(path),
            dry_run=args.dry_run,
            recursive=True,
            force=args.force,
            parse_documents=not args.no_parse,
            wait_for_parsing=True
        )
        
        # Return success if no failures
        failed = [r for r in results if not r.success]
        return 0 if len(failed) == 0 else 1
    
    def _print_header_with_api_key(self) -> None:
        """Print header including API key status."""
        print(f"Environment: {self.config.environment}")
        print(f"RAGFlow Instance: {self.config.base_url}")
        print(f"RAGFlow API Key: {'SET' if self.config.api_key else 'NOT SET'}")
