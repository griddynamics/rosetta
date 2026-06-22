"""
Authentication Service

Handles API key verification and authentication-related operations.
Eliminates code duplication across commands.
"""

import time
from typing import Any, Dict, Optional

from ..ims_auth import IMSAuthManager
from ..ims_config import IMSConfig
from ..ragflow_client import RAGFlowClient


class AuthService:
    """Service for handling authentication operations"""
    
    def __init__(self, client: RAGFlowClient, config: IMSConfig):
        """
        Initialize AuthService.
        
        Args:
            client: RAGFlow client instance
            config: IMS configuration
        """
        self.client = client
        self.config = config
        self.auth_manager = IMSAuthManager(client, config)
    
    def verify_api_key(self) -> tuple[bool, float]:
        """
        Verify API key with timing and display results.
        
        Returns:
            Tuple of (success: bool, duration: float)
        """
        start_time = time.time()
        
        if not self.config.api_key:
            print("✗ API key not configured")
            return False, time.time() - start_time
        
        print(f"→ Verifying API key for {self.config.base_url}")
        
        success, error_msg = self.auth_manager.verify_api_key()
        duration = time.time() - start_time
        
        if success:
            print(f"✓ API key is valid")
            print(f"  Authentication: {duration:.2f}s")
        else:
            print(f"\n✗ {error_msg}")
        
        return success, duration
    
    def verify_connection(self) -> bool:
        """
        Verify full connection including server health and display results.
        
        Returns:
            True if connection successful, False otherwise
        """
        success, error_msg = self.auth_manager.verify_connection()
        
        if success:
            print(f"✓ Connected to RAGFlow at {self.config.base_url}")
            server_info = self.auth_manager.get_server_info()
            if server_info:
                self._display_server_info(server_info)
        else:
            print(f"\n✗ {error_msg}")
        
        return success
    
    @staticmethod
    def verify_or_exit(client: RAGFlowClient, config: IMSConfig) -> None:
        """
        Verify API key and exit if verification fails.
        
        Args:
            client: RAGFlow client instance
            config: IMS configuration
            
        Raises:
            SystemExit: If verification fails
        """
        auth_service = AuthService(client, config)
        success, _ = auth_service.verify_api_key()
        
        if not success:
            print("\n✗ Authentication failed. Please check your API key.")
            import sys
            sys.exit(1)
    
    def _display_server_info(self, server_info: Dict[str, Any]) -> None:
        """Display server information"""
        print(f"\nServer Information:")
        print(f"  Environment: {server_info['environment']}")
        print(f"  Dataset default: {server_info['dataset_default']}")
        print(f"  Dataset template: {server_info['dataset_template']}")
        
        if 'health_status' in server_info:
            health_status = server_info.get('health_status', 'unknown')
            if health_status == 'ok':
                print(f"\n✓ System Health: All dependencies healthy")
            elif health_status == 'nok':
                print(f"\n⚠️  System Health: Some dependencies unhealthy")
                services = server_info.get('services', {})
                for service, status in services.items():
                    symbol = "✓" if status == "ok" else "✗"
                    print(f"    {symbol} {service}: {status}")
            elif health_status == 'unavailable':
                print(f"\n⏸️  System Health: Check unavailable")
