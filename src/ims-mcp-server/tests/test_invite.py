"""Unit tests for the auto-invite service."""

from types import SimpleNamespace

import pytest

from ims_mcp.config import RosettaConfig
from ims_mcp.services import invite as invite_module
from ims_mcp.services._ragflow_team_api import RAGFlowTeamAPIError


class _FakeTeamAPI:
    def __init__(self, teams, members_by_tenant, invite_outcomes=None):
        self.teams = teams
        self.members_by_tenant = {
            tenant_id: [dict(member) for member in members]
            for tenant_id, members in members_by_tenant.items()
        }
        self.invite_outcomes = invite_outcomes or {}
        self.invite_calls = []
        self.remove_calls = []

    def list_teams(self):
        return list(self.teams)

    def list_team_members(self, tenant_id: str):
        return [dict(member) for member in self.members_by_tenant.get(tenant_id, [])]

    def invite_team_member(self, tenant_id: str, email: str):
        self.invite_calls.append((tenant_id, email))
        outcome = self.invite_outcomes.get(email)
        if isinstance(outcome, Exception):
            raise outcome
        invited_user = outcome or {"id": f"user-{len(self.invite_calls)}", "email": email}
        self.members_by_tenant.setdefault(tenant_id, []).append(dict(invited_user))
        return dict(invited_user)

    def remove_team_member_or_invite(self, tenant_id: str, user_id: str):
        self.remove_calls.append((tenant_id, user_id))


def _patch_team_api(monkeypatch, fake_api: _FakeTeamAPI) -> None:
    monkeypatch.setattr(
        invite_module.RAGFlowTeamAPI,
        "from_config",
        classmethod(lambda cls, config: fake_api),
    )


def _make_config() -> RosettaConfig:
    return RosettaConfig(
        server_url="https://example.test",
        version="r2",
        api_key="test-key",
        posthog_api_key="",
        posthog_host="https://eu.i.posthog.com",
        debug=False,
        root_filter=[],
        transport="stdio",
        http_host="0.0.0.0",
        http_port=8000,
        redis_url=None,
        fernet_key=None,
        allowed_origins=[],
        oauth_authorization_endpoint="",
        oauth_token_endpoint="",
        oauth_introspection_endpoint="",
        oauth_client_id="",
        oauth_client_secret="",
        oauth_base_url="",
        oauth_callback_path="/auth/callback",
        oauth_valid_scopes="",
        oauth_extra_scopes="",
        oauth_revocation_endpoint="",
        oauth_jwt_signing_key=None,
        oauth_mode="oauth",
        oauth_oidc_config_url="",
        oauth_required_scopes=None,
        read_policy="all",
        write_policy="all",
        user_email="rosetta@example.com",
        invite_emails=[],
        plan_ttl_days=5,
    )


@pytest.mark.asyncio
async def test_auto_invite_successful_invite_path(monkeypatch):
    fake_api = _FakeTeamAPI(
        teams=[{"tenant_id": "tenant-1", "role": "owner"}],
        members_by_tenant={
            "tenant-1": [
                {"email": "existing@example.com", "role": "normal"},
            ]
        },
    )
    _patch_team_api(monkeypatch, fake_api)

    await invite_module.auto_invite(
        ragflow=object(),
        dataset=SimpleNamespace(tenant_id="tenant-1"),
        config=_make_config(),
        user_email="creator@example.com",
        invite_emails=["existing@example.com", "teammate@example.com", "creator@example.com"],
    )

    assert fake_api.invite_calls == [
        ("tenant-1", "creator@example.com"),
        ("tenant-1", "teammate@example.com"),
    ]
    assert fake_api.remove_calls == []


@pytest.mark.asyncio
async def test_auto_invite_skips_existing_members_and_pending_invites(monkeypatch):
    fake_api = _FakeTeamAPI(
        teams=[{"tenant_id": "tenant-1", "role": "owner"}],
        members_by_tenant={
            "tenant-1": [
                {"email": "member@example.com", "role": "normal"},
                {"email": "pending@example.com", "role": "invite"},
            ]
        },
    )
    _patch_team_api(monkeypatch, fake_api)

    await invite_module.auto_invite(
        ragflow=object(),
        dataset=SimpleNamespace(tenant_id="tenant-1"),
        config=_make_config(),
        user_email="member@example.com",
        invite_emails=["pending@example.com"],
    )

    assert fake_api.invite_calls == []


@pytest.mark.asyncio
async def test_auto_invite_rolls_back_created_invites_on_api_error(monkeypatch):
    fake_api = _FakeTeamAPI(
        teams=[{"tenant_id": "tenant-1", "role": "owner"}],
        members_by_tenant={"tenant-1": []},
        invite_outcomes={
            "creator@example.com": {"id": "created-user", "email": "creator@example.com"},
            "teammate@example.com": RAGFlowTeamAPIError("POST /v1/tenant/tenant-1/user failed: HTTP 500: boom"),
        },
    )
    _patch_team_api(monkeypatch, fake_api)

    with pytest.raises(RAGFlowTeamAPIError, match="HTTP 500: boom"):
        await invite_module.auto_invite(
            ragflow=object(),
            dataset=SimpleNamespace(tenant_id="tenant-1"),
            config=_make_config(),
            user_email="creator@example.com",
            invite_emails=["teammate@example.com"],
        )

    assert fake_api.invite_calls == [
        ("tenant-1", "creator@example.com"),
        ("tenant-1", "teammate@example.com"),
    ]
    assert fake_api.remove_calls == [("tenant-1", "created-user")]
