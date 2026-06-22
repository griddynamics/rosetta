"""
Verify Command - RAGFlow connection verification
"""

from ..services.auth_service import AuthService

from .base_command import BaseCommand
from ..typing_utils import CommandArgs


class VerifyCommand(BaseCommand):
    """
    Verify RAGFlow API connection and authentication.
    
    Tests connectivity and API key validity.
    """
    
    def execute(self, args: CommandArgs) -> int:
        """
        Execute verify command.
        
        Args:
            args: Command arguments (unused for verify)
        
        Returns:
            0 if verification successful, 1 if failed
        """
        self._start_timing()
        
        # Print header
        self._print_header("RAGFlow Connection Verification")
        print()
        
        # Verify connection using AuthService
        auth_service = AuthService(self.client, self.config)
        success = auth_service.verify_connection()
        
        # Print result
        if success:
            print(f"\n✓ All systems operational")
            self._print_timing()
            return 0
        else:
            print(f"\n✗ Connection verification failed")
            self._print_timing()
            return 1
