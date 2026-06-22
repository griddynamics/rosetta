"""Auto-invite service for newly created project datasets."""

from __future__ import annotations

import asyncio
from typing import Any

from ims_mcp.config import RosettaConfig
from ims_mcp.services._ragflow_team_api import RAGFlowTeamAPI, RAGFlowTeamAPIError


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def _invite_targets(user_email: str, invite_emails: list[str]) -> list[str]:
    targets: list[str] = []
    seen: set[str] = set()

    for raw_email in [user_email, *invite_emails]:
        email = raw_email.strip()
        if not email:
            continue
        normalized = _normalize_email(email)
        if normalized in seen:
            continue
        seen.add(normalized)
        targets.append(email)

    return targets


def _member_emails(members: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_email: dict[str, dict[str, Any]] = {}
    for member in members:
        email = _normalize_email(member.get("email"))
        if email:
            by_email[email] = member
    return by_email


def _select_tenant_id(dataset: Any, teams: list[dict[str, Any]]) -> str:
    dataset_tenant_id = getattr(dataset, "tenant_id", None)
    if isinstance(dataset_tenant_id, str) and dataset_tenant_id.strip():
        return dataset_tenant_id.strip()

    for team in teams:
        if str(team.get("role", "")).strip().lower() == "owner":
            tenant_id = team.get("tenant_id")
            if isinstance(tenant_id, str) and tenant_id.strip():
                return tenant_id.strip()

    if len(teams) == 1:
        tenant_id = teams[0].get("tenant_id")
        if isinstance(tenant_id, str) and tenant_id.strip():
            return tenant_id.strip()

    raise RAGFlowTeamAPIError("Could not resolve an owner team for auto-invite")


def _is_existing_membership_error(message: str) -> bool:
    lowered = message.lower()
    return (
        "already in the team" in lowered
        or "already invited" in lowered
        or "owner of the team" in lowered
    )


def _extract_user_id(invited_user: dict[str, Any]) -> str | None:
    user_id = invited_user.get("id")
    if isinstance(user_id, str) and user_id.strip():
        return user_id.strip()
    return None


async def auto_invite(
    ragflow: Any,
    dataset: Any,
    config: RosettaConfig,
    user_email: str,
    invite_emails: list[str],
) -> None:
    """Invite the dataset creator and configured teammates into the owner team."""

    targets = _invite_targets(user_email=user_email, invite_emails=invite_emails)
    if not targets:
        return

    _ = ragflow
    client = RAGFlowTeamAPI.from_config(config)
    teams = await asyncio.to_thread(client.list_teams)
    tenant_id = _select_tenant_id(dataset=dataset, teams=teams)
    existing_members = _member_emails(await asyncio.to_thread(client.list_team_members, tenant_id))

    created_user_ids: list[str] = []
    try:
        for email in targets:
            if _normalize_email(email) in existing_members:
                continue

            try:
                invited_user = await asyncio.to_thread(client.invite_team_member, tenant_id, email)
            except RAGFlowTeamAPIError as exc:
                if _is_existing_membership_error(str(exc)):
                    continue
                raise

            existing_members[_normalize_email(email)] = invited_user
            user_id = _extract_user_id(invited_user)
            if user_id:
                created_user_ids.append(user_id)
    except Exception:
        for user_id in reversed(created_user_ids):
            try:
                await asyncio.to_thread(client.remove_team_member_or_invite, tenant_id, user_id)
            except Exception:
                pass
        raise
