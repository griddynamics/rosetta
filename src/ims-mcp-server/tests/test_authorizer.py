"""Unit tests for the Authorizer service."""

import pytest

from ims_mcp.config import RosettaConfig
from ims_mcp.services.authorizer import Authorizer


class _FakeTeamAPI:
    def __init__(self, teams=None, members_by_tenant=None, list_teams_error=None):
        self.teams = teams or []
        self.members_by_tenant = members_by_tenant or {}
        self.list_teams_error = list_teams_error
        self.list_member_calls = []

    def list_teams(self):
        if self.list_teams_error is not None:
            raise self.list_teams_error
        return list(self.teams)

    def list_team_members(self, tenant_id: str):
        self.list_member_calls.append(tenant_id)
        return list(self.members_by_tenant.get(tenant_id, []))


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


class TestAiaDatasets:
    """aia-* datasets: always read, never write."""

    @pytest.mark.parametrize("policy", ["all", "team", "none"])
    def test_aia_read_always_allowed(self, policy):
        auth = Authorizer(read_policy=policy, write_policy=policy, config=_make_config())
        assert auth.can_read("aia-r1", "user@example.com") is True

    @pytest.mark.parametrize("policy", ["all", "team", "none"])
    def test_aia_write_always_denied(self, policy):
        auth = Authorizer(read_policy=policy, write_policy=policy, config=_make_config())
        assert auth.can_write("aia-r1", "user@example.com") is False

    def test_aia_r2(self):
        auth = Authorizer(read_policy="none", write_policy="all", config=_make_config())
        assert auth.can_read("aia-r2", "user@example.com") is True
        assert auth.can_write("aia-r2", "user@example.com") is False


class TestProjectDatasetsAllPolicy:
    """project-* with policy=all."""

    def test_read_all(self):
        auth = Authorizer(read_policy="all", write_policy="none", config=_make_config())
        assert auth.can_read("project-myapp", "anyone@example.com") is True

    def test_write_all(self):
        auth = Authorizer(read_policy="none", write_policy="all", config=_make_config())
        assert auth.can_write("project-myapp", "anyone@example.com") is True

    def test_create_all(self):
        auth = Authorizer(read_policy="none", write_policy="all", config=_make_config())
        assert auth.can_create("anyone@example.com") is True


class TestProjectDatasetsNonePolicy:
    """project-* with policy=none."""

    def test_read_none(self):
        auth = Authorizer(read_policy="none", write_policy="all", config=_make_config())
        assert auth.can_read("project-myapp", "user@example.com") is False

    def test_write_none(self):
        auth = Authorizer(read_policy="all", write_policy="none", config=_make_config())
        assert auth.can_write("project-myapp", "user@example.com") is False

    def test_create_none(self):
        auth = Authorizer(read_policy="all", write_policy="none", config=_make_config())
        assert auth.can_create("user@example.com") is False


class TestProjectDatasetsTeamPolicy:
    """project-* with policy=team."""

    def test_read_team_member(self):
        team_api = _FakeTeamAPI(
            teams=[{"tenant_id": "tenant-1", "role": "owner"}],
            members_by_tenant={
                "tenant-1": [
                    {"email": "member@example.com", "role": "normal"},
                ]
            },
        )
        auth = Authorizer(read_policy="team", write_policy="none", config=_make_config(), team_api=team_api)
        assert auth.can_read("project-myapp", "member@example.com") is True

    def test_write_team_pending_invite_is_authorized(self):
        team_api = _FakeTeamAPI(
            teams=[{"tenant_id": "tenant-1", "role": "owner"}],
            members_by_tenant={
                "tenant-1": [
                    {"email": "invitee@example.com", "role": "invite"},
                ]
            },
        )
        auth = Authorizer(read_policy="none", write_policy="team", config=_make_config(), team_api=team_api)
        assert auth.can_write("project-myapp", "invitee@example.com") is True

    def test_team_policy_denies_non_member(self):
        team_api = _FakeTeamAPI(
            teams=[{"tenant_id": "tenant-1", "role": "owner"}],
            members_by_tenant={"tenant-1": [{"email": "other@example.com", "role": "normal"}]},
        )
        auth = Authorizer(read_policy="team", write_policy="team", config=_make_config(), team_api=team_api)
        assert auth.can_read("project-myapp", "missing@example.com") is False
        assert auth.can_write("project-myapp", "missing@example.com") is False

    def test_team_policy_propagates_api_errors(self):
        auth = Authorizer(
            read_policy="team",
            write_policy="none",
            config=_make_config(),
            team_api=_FakeTeamAPI(list_teams_error=RuntimeError("tenant lookup failed")),
        )
        with pytest.raises(RuntimeError, match="tenant lookup failed"):
            auth.can_read("project-myapp", "member@example.com")

    def test_create_team(self):
        auth = Authorizer(read_policy="none", write_policy="team", config=_make_config())
        assert auth.can_create("member@example.com") is True
