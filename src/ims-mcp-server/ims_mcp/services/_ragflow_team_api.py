"""Shared RAGFlow team-management REST helpers."""

from __future__ import annotations

from typing import Any

import requests

from ims_mcp.config import RosettaConfig


class RAGFlowTeamAPIError(RuntimeError):
    """Raised when a team-management request fails."""


def _normalize_base_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized:
        raise RAGFlowTeamAPIError("RosettaConfig.server_url is required")
    return normalized


def _extract_authorization(config: RosettaConfig) -> str:
    api_key = config.api_key.strip()
    if not api_key:
        raise RAGFlowTeamAPIError("RosettaConfig.api_key is required")
    return f"Bearer {api_key}"


def _require_list(body: Any, *, action: str) -> list[dict[str, Any]]:
    data = body.get("data") if isinstance(body, dict) else None
    if not isinstance(data, list):
        raise RAGFlowTeamAPIError(f"{action} failed: unexpected response payload")
    return [item for item in data if isinstance(item, dict)]


def _require_dict(body: Any, *, action: str) -> dict[str, Any]:
    data = body.get("data") if isinstance(body, dict) else None
    if not isinstance(data, dict):
        raise RAGFlowTeamAPIError(f"{action} failed: unexpected response payload")
    return data


class RAGFlowTeamAPI:
    """Thin bearer-token-only wrapper around RAGFlow team endpoints."""

    def __init__(self, *, base_url: str, authorization: str, timeout: int = 30) -> None:
        self._base_url = _normalize_base_url(base_url)
        self._authorization = authorization.strip()
        self._timeout = timeout

    @classmethod
    def from_config(cls, config: RosettaConfig) -> "RAGFlowTeamAPI":
        return cls(
            base_url=_normalize_base_url(config.server_url),
            authorization=_extract_authorization(config),
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        response = requests.request(
            method=method,
            url=f"{self._base_url}{path}",
            headers={"Authorization": self._authorization},
            params=params,
            json=json_body,
            timeout=self._timeout,
        )
        try:
            body = response.json()
        except Exception as exc:
            excerpt = response.text[:500].strip()
            raise RAGFlowTeamAPIError(
                f"{method} {path} returned non-JSON status={response.status_code}: {excerpt}"
            ) from exc

        if response.ok and isinstance(body, dict) and body.get("code") == 0:
            return body

        message = "unexpected response"
        if isinstance(body, dict):
            raw_message = body.get("message") or body.get("error")
            if isinstance(raw_message, str) and raw_message.strip():
                message = raw_message.strip()

        raise RAGFlowTeamAPIError(f"{method} {path} failed: HTTP {response.status_code}: {message}")

    def list_teams(self) -> list[dict[str, Any]]:
        body = self._request("GET", "/v1/tenant/list")
        return _require_list(body, action="GET /v1/tenant/list")

    def list_team_members(self, tenant_id: str) -> list[dict[str, Any]]:
        body = self._request("GET", f"/v1/tenant/{tenant_id}/user/list")
        return _require_list(body, action=f"GET /v1/tenant/{tenant_id}/user/list")

    def invite_team_member(self, tenant_id: str, email: str) -> dict[str, Any]:
        body = self._request(
            "POST",
            f"/v1/tenant/{tenant_id}/user",
            json_body={"email": email},
        )
        return _require_dict(body, action=f"POST /v1/tenant/{tenant_id}/user")

    def remove_team_member_or_invite(self, tenant_id: str, user_id: str) -> Any:
        return self._request("DELETE", f"/v1/tenant/{tenant_id}/user/{user_id}")
