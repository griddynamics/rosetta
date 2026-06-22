"""RAGFlow client wrapper."""

from __future__ import annotations

from ragflow_sdk import RAGFlow

from ims_mcp.config import RosettaConfig


class RagflowClient:
    """Thin wrapper around ragflow_sdk.RAGFlow."""

    def __init__(self, config: RosettaConfig):
        if not config.api_key:
            raise ValueError("ROSETTA_API_KEY is required")
        self.client = RAGFlow(api_key=config.api_key, base_url=config.server_url)
