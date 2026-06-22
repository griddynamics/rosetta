"""Build list/retrieve query parameters."""

from __future__ import annotations

import json

from ims_mcp.typing_utils import JsonObject


class QueryBuilder:
    @staticmethod
    def _normalize_tags(tags: list[str] | None) -> list[str]:
        return [tag.strip() for tag in (tags or []) if tag and tag.strip()]

    @staticmethod
    def _build_metadata_condition(tags: list[str]) -> JsonObject:
        return {
            "logic": "or",
            "conditions": [
                {
                    "name": "tags",
                    "comparison_operator": "contains",
                    "value": tag,
                }
                for tag in tags
            ],
        }

    def build_list_params(self, tags: list[str] | None = None, query: str | None = None) -> dict[str, object]:
        params: dict[str, object] = {}
        normalized = self._normalize_tags(tags)
        if normalized:
            params["metadata_condition"] = json.dumps(self._build_metadata_condition(normalized))
        if query and query.strip():
            params["keywords"] = query.strip()
        return params

    def build_retrieve_params(
        self,
        dataset_ids: list[str],
        query: str | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, object]:
        params: dict[str, object] = {"dataset_ids": dataset_ids}
        if query and query.strip():
            params["question"] = query.strip()
        normalized = self._normalize_tags(tags)
        if normalized:
            params["metadata_condition"] = self._build_metadata_condition(normalized)
        return params
