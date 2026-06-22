"""Policy-based authorization for dataset access."""

from __future__ import annotations

from ims_mcp.config import RosettaConfig
from ims_mcp.constants import POLICY_ALL, POLICY_NONE, POLICY_TEAM
from ims_mcp.services._ragflow_team_api import RAGFlowTeamAPI


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


class Authorizer:
    """Enforces read/write/create policies on datasets.

    Rules:
        - ``aia-*`` datasets: read always allowed, write always denied.
        - ``project-*`` datasets: governed by *read_policy* / *write_policy*.
        - Policy ``all``  → everybody.
        - Policy ``team`` → team members or pending invites in owner teams.
        - Policy ``none`` → nobody.
    """

    def __init__(
        self,
        read_policy: str,
        write_policy: str,
        *,
        config: RosettaConfig,
        team_api: RAGFlowTeamAPI | None = None,
    ) -> None:
        self._read_policy = read_policy
        self._write_policy = write_policy
        self._config = config
        self._team_api = team_api

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def can_read(self, dataset_name: str, user_email: str) -> bool:
        if _is_aia(dataset_name):
            return True
        return self._evaluate(self._read_policy, dataset_name, user_email)

    def can_write(self, dataset_name: str, user_email: str) -> bool:
        if _is_aia(dataset_name):
            return False
        return self._evaluate(self._write_policy, dataset_name, user_email)

    def can_create(self, user_email: str) -> bool:
        """Dataset creation follows write policy."""
        if self._write_policy == POLICY_ALL:
            return True
        if self._write_policy == POLICY_TEAM:
            return True  # everybody can create; current user auto-invited
        return False  # POLICY_NONE

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _evaluate(self, policy: str, dataset_name: str, user_email: str) -> bool:
        if policy == POLICY_ALL:
            return True
        if policy == POLICY_NONE:
            return False
        if policy == POLICY_TEAM:
            return _check_team_membership(dataset_name, user_email, team_api=self._get_team_api())
        return False

    def _get_team_api(self) -> RAGFlowTeamAPI:
        if self._team_api is None:
            self._team_api = RAGFlowTeamAPI.from_config(self._config)
        return self._team_api


def _is_aia(dataset_name: str) -> bool:
    return dataset_name.startswith("aia-")


def _check_team_membership(
    dataset_name: str,
    user_email: str,
    *,
    team_api: RAGFlowTeamAPI,
) -> bool:
    """Check whether *user_email* is in any owner team visible to the API token."""

    _ = dataset_name
    normalized_email = _normalize_email(user_email)
    if not normalized_email:
        return False

    teams = team_api.list_teams()
    owner_teams = [team for team in teams if str(team.get("role", "")).strip().lower() == "owner"]
    teams_to_check = owner_teams or teams

    for team in teams_to_check:
        tenant_id = team.get("tenant_id")
        if not isinstance(tenant_id, str) or not tenant_id.strip():
            continue
        members = team_api.list_team_members(tenant_id.strip())
        for member in members:
            if _normalize_email(member.get("email")) == normalized_email:
                return True

    return False
