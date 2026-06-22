"""Per-call context object for MCP tool execution."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, cast

from fastmcp import Context
from ragflow_sdk import RAGFlow

from ims_mcp.clients.dataset import DatasetLookup
from ims_mcp.config import RosettaConfig
from ims_mcp.services.authorizer import Authorizer


@dataclass
class CallContext:
    config: RosettaConfig
    ragflow: RAGFlow
    dataset_lookup: DatasetLookup
    ctx: Context
    username: str
    repository: str
    tool_name: str
    params: dict[str, Any]
    user_email: str = ""
    authorizer: Authorizer = field(default=cast(Authorizer, None))

    def __post_init__(self) -> None:
        if self.authorizer is None:
            self.authorizer = Authorizer(
                self.config.read_policy,
                self.config.write_policy,
                config=self.config,
            )
