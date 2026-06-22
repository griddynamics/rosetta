"""
IMS Authentication Module

Handles API key verification and connection management for RAGFlow.

Features:
- API key authentication
- Connection verification
- System health checks
"""

from .ims_config import IMSConfig
from .ragflow_client import AuthenticationError, RAGFlowClient
from .typing_utils import JsonDict


class IMSAuthManager:
    """Manages RAGFlow API key authentication and connection verification."""
    
    def __init__(self, client: RAGFlowClient, config: IMSConfig):
        """
        Initialize the authentication manager.
        
        Args:
            client: RAGFlow client instance
            config: RAGFlow configuration
        """
        self.client = client
        self.config = config
    
    def verify_api_key(self) -> tuple[bool, str | None]:
        """
        Verify API key is valid by attempting to list datasets.
        
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Try a simple operation to verify API key
            self.client.list_datasets(page_size=1)
            return True, None
        except AuthenticationError as e:
            return False, f"Authentication failed: {e}"
        except Exception as e:
            return False, f"Verification error: {e}"
    
    def verify_connection(self) -> tuple[bool, str | None]:
        """
        Verify connection to RAGFlow server.
        
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            if self.client.verify_connection():
                return True, None
            else:
                return False, f"Connection failed to {self.config.base_url}"
        except Exception as e:
            return False, f"Connection error: {e}"
    
    def get_server_info(self) -> JsonDict | None:
        """
        Get RAGFlow server information including basic health status.
        
        Returns:
            Server information dict or None if not available
        """
        try:
            # Get basic server info
            info: JsonDict = {
                'base_url': self.config.base_url,
                'environment': self.config.environment,
                'dataset_default': self.config.dataset_default,
                'dataset_template': self.config.dataset_template,
            }
            
            # Try to get health status (non-blocking)
            try:
                health = self.get_system_health()
                if health:
                    info['health_status'] = health.get('status', 'unknown')
                    info['services'] = {
                        'database': health.get('db', 'unknown'),
                        'redis': health.get('redis', 'unknown'),
                        'doc_engine': health.get('doc_engine', 'unknown'),
                        'storage': health.get('storage', 'unknown'),
                    }
            except Exception:
                # Health check failed, but don't fail server info
                info['health_status'] = 'unavailable'
            
            return info
        except Exception:
            return None
    
    def get_system_health(self) -> JsonDict | None:
        """
        Check the health status of RAGFlow's dependencies.
        
        This endpoint checks:
        - Database (MySQL/PostgreSQL)
        - Redis
        - Document Engine (Elasticsearch/Infinity/OpenSearch)
        - Object Storage (MinIO/S3/GCS)
        
        Returns:
            Health status dict with format:
            {
                'status': 'ok' or 'nok',
                'db': 'ok' or 'nok',
                'redis': 'ok' or 'nok',
                'doc_engine': 'ok' or 'nok',
                'storage': 'ok' or 'nok',
                }
            }
            Returns None if health check is not available
        """
        try:
            # Call the healthz endpoint (no authentication required)
            health_data = self.client.get_system_health()
            return health_data
        except Exception:
            return None
