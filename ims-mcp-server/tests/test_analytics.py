import unittest.mock as mock

import pytest

import ims_mcp.analytics.tracker as tracker_module
import ims_mcp.analytics.user_context as user_context_module
from ims_mcp.analytics.tracker import track_tool_call
from ims_mcp.analytics.user_context import get_authenticated_identity


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeToken:
    def __init__(self, claims: dict):
        self.claims = claims


class _FakePosthog:
    def __init__(self):
        self.captured: list[dict] = []

    def capture(self, distinct_id, event, properties):
        self.captured.append({"distinct_id": distinct_id, "event": event, "properties": properties})


_SENTINEL_CTX = object()  # non-None; signals "we are in an HTTP request context"


# ---------------------------------------------------------------------------
# get_authenticated_identity — unit tests
# ---------------------------------------------------------------------------

class TestGetAuthenticatedIdentity:
    def test_email_claim_returned(self):
        token = _FakeToken({"email": "user@example.com"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "user@example.com"

    def test_preferred_username_when_no_email(self):
        token = _FakeToken({"preferred_username": "jdoe"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "jdoe"

    def test_sub_when_no_email_or_preferred_username(self):
        token = _FakeToken({"sub": "abc-123-uuid"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "abc-123-uuid"

    def test_email_preferred_over_preferred_username(self):
        token = _FakeToken({"email": "user@example.com", "preferred_username": "jdoe"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "user@example.com"

    def test_call_ctx_user_email_wins_over_token(self):
        class _Ctx:
            user_email = "ctx@example.com"

        token = _FakeToken({"email": "token@example.com"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(call_ctx=_Ctx(), ctx=_SENTINEL_CTX) == "ctx@example.com"

    def test_falls_back_to_os_user_when_ctx_is_none(self, monkeypatch):
        monkeypatch.setattr(user_context_module, "_cached_username", None)
        monkeypatch.setenv("USER", "osuser")
        assert get_authenticated_identity(ctx=None) == "osuser"

    def test_falls_back_when_token_has_no_relevant_claims(self, monkeypatch):
        monkeypatch.setattr(user_context_module, "_cached_username", None)
        monkeypatch.setenv("USER", "osuser")
        token = _FakeToken({"other_claim": "value"})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "osuser"

    def test_falls_back_when_token_is_none(self, monkeypatch):
        monkeypatch.setattr(user_context_module, "_cached_username", None)
        monkeypatch.setenv("USER", "osuser")
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=None):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "osuser"

    def test_falls_back_when_get_access_token_raises(self, monkeypatch):
        monkeypatch.setattr(user_context_module, "_cached_username", None)
        monkeypatch.setenv("USER", "osuser")
        with mock.patch("fastmcp.server.dependencies.get_access_token", side_effect=RuntimeError("no ctx")):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "osuser"

    def test_ignores_blank_claim_values(self, monkeypatch):
        monkeypatch.setattr(user_context_module, "_cached_username", None)
        monkeypatch.setenv("USER", "osuser")
        token = _FakeToken({"email": "  ", "preferred_username": ""})
        with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
            assert get_authenticated_identity(ctx=_SENTINEL_CTX) == "osuser"


# ---------------------------------------------------------------------------
# track_tool_call — distinct_id regression tests
# ---------------------------------------------------------------------------

def _make_tracker_mocks(monkeypatch, posthog: _FakePosthog):
    """Patch away all tracker side-effects that require a real FastMCP context."""
    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: posthog)
    monkeypatch.setattr(
        tracker_module,
        "get_repository_from_context",
        mock.AsyncMock(return_value="repo"),
    )
    monkeypatch.setattr(
        tracker_module,
        "get_agent_info_from_context",
        lambda ctx: ("claude-code", "1.0"),
    )


@pytest.mark.asyncio
async def test_track_tool_call_distinct_id_from_email_claim(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    assert posthog.captured[0]["distinct_id"] == "user@example.com"


@pytest.mark.asyncio
async def test_track_tool_call_distinct_id_falls_back_to_preferred_username(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"preferred_username": "jdoe"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    assert posthog.captured[0]["distinct_id"] == "jdoe"


@pytest.mark.asyncio
async def test_track_tool_call_distinct_id_falls_back_to_os_user_without_token(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)
    monkeypatch.setattr(user_context_module, "_cached_username", None)
    monkeypatch.setenv("USER", "osuser")

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    # ctx=None → no HTTP request context → OS user fallback
    await my_tool(ctx=None)

    assert posthog.captured[0]["distinct_id"] == "osuser"


@pytest.mark.asyncio
async def test_track_tool_call_wraps_unexpected_exception_as_error(monkeypatch):
    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: None)
    monkeypatch.setattr(tracker_module, "capture_error_to_posthog", lambda *args, **kwargs: None)

    @track_tool_call
    async def boom(ctx=None):
        raise RuntimeError("boom")

    result = await boom(ctx=None)

    assert result == "Error: boom call failed: boom"
