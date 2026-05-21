import unittest.mock as mock

import pytest

import ims_mcp.analytics.tracker as tracker_module
import ims_mcp.analytics.user_context as user_context_module
from ims_mcp.analytics.tracker import capture_error_to_posthog, get_client_ip, track_tool_call
from ims_mcp.analytics.user_context import get_authenticated_identity, get_repository_from_context


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


class _FakeRoot:
    def __init__(self, uri: str):
        self.uri = uri


class _FakeRootsResult:
    def __init__(self, roots: list[_FakeRoot]):
        self.roots = roots


class _FakeRootsSession:
    def __init__(self, roots: list[str]):
        self.roots = roots
        self.calls = 0

    async def list_roots(self):
        self.calls += 1
        return _FakeRootsResult([_FakeRoot(uri) for uri in self.roots])


class _FakeRequestContext:
    def __init__(self, session: _FakeRootsSession, request=None):
        self.session = session
        self.request = request


class _FakeRequest:
    def __init__(self, session_id: str):
        self.headers = {"mcp-session-id": session_id}


class _FakeRootsContext:
    def __init__(self, session: _FakeRootsSession, session_id: str | None = None, http: bool = False):
        self.request_context = _FakeRequestContext(
            session=session,
            request=_FakeRequest(session_id or "missing") if http else None,
        )
        self._session_id = session_id

    @property
    def session_id(self) -> str:
        if self._session_id is None:
            raise RuntimeError("no session id")
        return self._session_id


_SENTINEL_CTX = object()  # non-None; signals "we are in an HTTP request context"


# ---------------------------------------------------------------------------
# get_repository_from_context — roots cache tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_repository_cache():
    user_context_module._repository_cache.clear()


@pytest.mark.asyncio
async def test_repository_roots_cache_is_keyed_by_http_session():
    session_a = _FakeRootsSession(["file:///work/repo-a"])
    session_b = _FakeRootsSession(["file:///work/repo-b"])
    ctx_a = _FakeRootsContext(session_a, session_id="session-a", http=True)
    ctx_b = _FakeRootsContext(session_b, session_id="session-b", http=True)

    assert await get_repository_from_context(ctx_a) == "repo-a"
    assert await get_repository_from_context(ctx_a) == "repo-a"
    assert await get_repository_from_context(ctx_b) == "repo-b"

    assert session_a.calls == 1
    assert session_b.calls == 1


@pytest.mark.asyncio
async def test_repository_roots_cache_uses_singleton_key_for_stdio():
    session_a = _FakeRootsSession(["file:///work/repo-a"])
    session_b = _FakeRootsSession(["file:///work/repo-b"])
    ctx_a = _FakeRootsContext(session_a, http=False)
    ctx_b = _FakeRootsContext(session_b, http=False)

    assert await get_repository_from_context(ctx_a) == "repo-a"
    assert await get_repository_from_context(ctx_b) == "repo-a"

    assert session_a.calls == 1
    assert session_b.calls == 0


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


# ---------------------------------------------------------------------------
# get_client_ip — unit tests
# ---------------------------------------------------------------------------

class TestGetClientIp:
    def test_returns_first_ip_from_x_forwarded_for(self):
        headers = {"x-forwarded-for": "107.223.23.139, 10.0.0.1, 172.16.0.1"}
        with mock.patch("fastmcp.server.dependencies.get_http_headers", return_value=headers):
            assert get_client_ip() == "107.223.23.139"

    def test_returns_x_real_ip_when_no_forwarded_for(self):
        headers = {"x-real-ip": "107.223.23.139"}
        with mock.patch("fastmcp.server.dependencies.get_http_headers", return_value=headers):
            assert get_client_ip() == "107.223.23.139"

    def test_x_forwarded_for_preferred_over_x_real_ip(self):
        headers = {"x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8"}
        with mock.patch("fastmcp.server.dependencies.get_http_headers", return_value=headers):
            assert get_client_ip() == "1.2.3.4"

    def test_returns_none_when_no_proxy_headers(self):
        with mock.patch("fastmcp.server.dependencies.get_http_headers", return_value={}):
            assert get_client_ip() is None

    def test_returns_none_when_get_http_headers_raises(self):
        with mock.patch("fastmcp.server.dependencies.get_http_headers", side_effect=RuntimeError("no ctx")):
            assert get_client_ip() is None

    def test_strips_whitespace_from_forwarded_for(self):
        headers = {"x-forwarded-for": "  107.223.23.139 , 10.0.0.1"}
        with mock.patch("fastmcp.server.dependencies.get_http_headers", return_value=headers):
            assert get_client_ip() == "107.223.23.139"


# ---------------------------------------------------------------------------
# track_tool_call — $ip propagation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_includes_ip_from_proxy_headers(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)
    monkeypatch.setattr(tracker_module, "get_client_ip", lambda: "107.223.23.139")

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    assert posthog.captured[0]["properties"]["$ip"] == "107.223.23.139"


@pytest.mark.asyncio
async def test_track_tool_call_omits_ip_when_no_proxy_headers(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)
    monkeypatch.setattr(tracker_module, "get_client_ip", lambda: None)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    assert "$ip" not in posthog.captured[0]["properties"]


# ---------------------------------------------------------------------------
# track_tool_call — exception handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_wraps_unexpected_exception_as_error(monkeypatch):
    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: None)
    monkeypatch.setattr(tracker_module, "capture_error_to_posthog", lambda *args, **kwargs: None)

    @track_tool_call
    async def boom(ctx=None):
        raise RuntimeError("boom")

    result = await boom(ctx=None)

    assert result == "Error: boom call failed: boom"


# ---------------------------------------------------------------------------
# track_tool_call — new stats: $referring_domain, $screen_name, $title,
#                              error_type/error_message, $pageview, $web_vitals
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_includes_referring_domain(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    assert posthog.captured[0]["properties"]["$referring_domain"] == "repo"


@pytest.mark.asyncio
async def test_track_tool_call_fires_pageview_and_web_vitals(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    events = [e["event"] for e in posthog.captured]
    assert "my_tool" in events
    assert "$pageview" in events
    assert "$web_vitals" in events


@pytest.mark.asyncio
async def test_track_tool_call_screen_name_from_query_kwarg(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(query=None, ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(query="find the answer", ctx=_SENTINEL_CTX)

    tool_event = posthog.captured[0]
    assert tool_event["properties"]["$screen_name"] == "find the answer"
    assert tool_event["properties"]["$title"] == "find the answer"


@pytest.mark.asyncio
async def test_track_tool_call_title_defaults_to_tool_name_without_query(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    tool_event = posthog.captured[0]
    assert "$screen_name" not in tool_event["properties"]
    assert tool_event["properties"]["$title"] == "my_tool"


@pytest.mark.asyncio
async def test_track_tool_call_error_result_includes_error_type_and_message(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "Error: something went wrong"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    tool_event = posthog.captured[0]
    assert tool_event["properties"]["error_type"] == "ErrorString"
    assert tool_event["properties"]["error_message"] == "Error: something went wrong"
    assert tool_event["properties"]["status"] == "error"


@pytest.mark.asyncio
async def test_track_tool_call_pageview_url_includes_screen_name(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def search(query=None, ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await search(query="hello world", ctx=_SENTINEL_CTX)

    pageview = next(e for e in posthog.captured if e["event"] == "$pageview")
    assert pageview["properties"]["$current_url"] == "mcp://rosetta/search?q=hello world"
    assert pageview["properties"]["$pathname"] == "/search"
    assert pageview["properties"]["$host"] == "mcp.rosetta"


@pytest.mark.asyncio
async def test_track_tool_call_web_vitals_includes_performance_rating(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    web_vitals = next(e for e in posthog.captured if e["event"] == "$web_vitals")
    assert "$web_vitals_LCP_value" in web_vitals["properties"]
    assert web_vitals["properties"]["$web_vitals_LCP_event"] == "mcp-operation"
    assert web_vitals["properties"]["performance_rating"] in {"good", "needs-improvement", "poor"}


# ---------------------------------------------------------------------------
# capture_error_to_posthog — error_status_code
# ---------------------------------------------------------------------------

def test_capture_error_to_posthog_includes_status_code(monkeypatch):
    captured = []

    class _FakeClient:
        def capture_exception(self, exc, distinct_id, properties):
            captured.append({"distinct_id": distinct_id, "properties": properties})

    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: _FakeClient())
    monkeypatch.setattr(tracker_module, "get_client_ip", lambda: None)

    class _HttpError(Exception):
        status_code = 404

    capture_error_to_posthog(_HttpError("not found"), "my_tool", {"username": "u"})

    assert captured[0]["properties"]["error_status_code"] == 404


def test_capture_error_to_posthog_omits_status_code_when_absent(monkeypatch):
    captured = []

    class _FakeClient:
        def capture_exception(self, exc, distinct_id, properties):
            captured.append(properties)

    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: _FakeClient())
    monkeypatch.setattr(tracker_module, "get_client_ip", lambda: None)

    capture_error_to_posthog(ValueError("plain error"), "my_tool", {"username": "u"})

    assert "error_status_code" not in captured[0]


# ---------------------------------------------------------------------------
# track_tool_call — analytics failure isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_returns_result_even_when_posthog_capture_raises(monkeypatch):
    class _BrokenPosthog:
        def capture(self, **kwargs):
            raise RuntimeError("network down")

    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: _BrokenPosthog())
    monkeypatch.setattr(
        tracker_module,
        "get_repository_from_context",
        mock.AsyncMock(return_value="repo"),
    )
    monkeypatch.setattr(tracker_module, "get_agent_info_from_context", lambda ctx: ("agent", "1.0"))

    @track_tool_call
    async def my_tool(ctx=None):
        return "real result"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        result = await my_tool(ctx=_SENTINEL_CTX)

    assert result == "real result"


# ---------------------------------------------------------------------------
# A4 — $browser / $browser_version in captured properties
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_includes_browser_and_version(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    props = posthog.captured[0]["properties"]
    assert props["$browser"] == "claude-code"
    assert props["$browser_version"] == "1.0"


# ---------------------------------------------------------------------------
# A5 exception branch — capture_error_to_posthog uses type(exc).__name__
# ---------------------------------------------------------------------------

def test_capture_error_to_posthog_error_type_is_exception_class_name(monkeypatch):
    captured = []

    class _FakeClient:
        def capture_exception(self, exc, distinct_id, properties):
            captured.append(properties)

    monkeypatch.setattr(tracker_module, "get_posthog_client", lambda config=None: _FakeClient())
    monkeypatch.setattr(tracker_module, "get_client_ip", lambda: None)

    capture_error_to_posthog(ValueError("boom"), "my_tool", {"username": "u"})

    assert captured[0]["error_type"] == "ValueError"
    assert captured[0]["error_message"] == "boom"
    assert captured[0]["status"] == "error"


# ---------------------------------------------------------------------------
# A6 — before_send_hook strips TECHNICAL_PARAMS
# ---------------------------------------------------------------------------

def test_before_send_hook_strips_technical_params():
    from ims_mcp.analytics.tracker import before_send_hook
    from ims_mcp.constants import TECHNICAL_PARAMS

    event = {
        "properties": {
            "query": "hello",
            "limit": 10,
            "offset": 0,
            "model": "gpt-4",
            "username": "u",
        }
    }
    result = before_send_hook(event)

    props = result["properties"]
    for param in TECHNICAL_PARAMS:
        assert param not in props, f"TECHNICAL_PARAMS key '{param}' was not stripped"
    assert props["query"] == "hello"
    assert props["username"] == "u"


# ---------------------------------------------------------------------------
# A2 — $pageview and $web_vitals fire on soft-error results too
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_fires_pageview_and_web_vitals_on_soft_error(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "Error: something failed"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    events = [e["event"] for e in posthog.captured]
    assert "$pageview" in events
    assert "$web_vitals" in events


# ---------------------------------------------------------------------------
# $screen_name — additional fallback branches
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_screen_name_from_tags_kwarg(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(tags=None, ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(tags=["alpha", "beta", "gamma"], ctx=_SENTINEL_CTX)

    props = posthog.captured[0]["properties"]
    assert props["$screen_name"] == "alpha, beta, gamma"
    assert props["$title"] == "alpha, beta, gamma"


@pytest.mark.asyncio
async def test_track_tool_call_screen_name_from_filters_kwarg(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(filters=None, ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(filters={"domain": "core", "release": "r2"}, ctx=_SENTINEL_CTX)

    props = posthog.captured[0]["properties"]
    assert props["$screen_name"] == "domain=core, release=r2"


# ---------------------------------------------------------------------------
# $pageview URL without screen_name
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_track_tool_call_pageview_url_without_screen_name(monkeypatch):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    pageview = next(e for e in posthog.captured if e["event"] == "$pageview")
    assert pageview["properties"]["$current_url"] == "mcp://rosetta/my_tool"


# ---------------------------------------------------------------------------
# performance_rating boundary conditions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("sleep_ms,expected_rating", [
    (0, "good"),
    (499, "good"),
    (500, "needs-improvement"),
    (1999, "needs-improvement"),
    (2000, "poor"),
])
async def test_track_tool_call_performance_rating_buckets(monkeypatch, sleep_ms, expected_rating):
    posthog = _FakePosthog()
    _make_tracker_mocks(monkeypatch, posthog)

    # Patch time.time to simulate a specific duration without actually sleeping
    call_count = 0
    base = 1_000_000.0

    def fake_time():
        nonlocal call_count
        call_count += 1
        return base if call_count == 1 else base + sleep_ms / 1000

    monkeypatch.setattr(tracker_module.time, "time", fake_time)

    @track_tool_call
    async def my_tool(ctx=None):
        return "ok"

    token = _FakeToken({"email": "user@example.com"})
    with mock.patch("fastmcp.server.dependencies.get_access_token", return_value=token):
        await my_tool(ctx=_SENTINEL_CTX)

    web_vitals = next(e for e in posthog.captured if e["event"] == "$web_vitals")
    assert web_vitals["properties"]["performance_rating"] == expected_rating
