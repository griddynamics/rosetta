from types import SimpleNamespace

import ims_mcp.services.feedback as feedback_module
from ims_mcp.config import RosettaConfig
from ims_mcp.context import CallContext
from ims_mcp.services.authorizer import Authorizer
from ims_mcp.services.feedback import FeedbackService


def _call_ctx() -> CallContext:
    config = RosettaConfig.from_env()
    return CallContext(
        config=config,
        ragflow=SimpleNamespace(),
        dataset_lookup=SimpleNamespace(),
        ctx=None,
        username="tester",
        repository="RulesOfPower",
        tool_name="submit_feedback",
        params={},
        user_email="tester@example.com",
        authorizer=Authorizer("all", "all", config=config),
    )


def test_feedback_service_returns_disabled_when_analytics_missing(monkeypatch):
    monkeypatch.setattr(feedback_module, "get_posthog_client", lambda config: None)

    result = FeedbackService().submit(
        request_mode="coding.md",
        feedback={"summary": "s"},
        call_ctx=_call_ctx(),
    )

    assert result == "Feedback accepted (analytics disabled)."


def test_feedback_service_degrades_gracefully_on_capture_failure(monkeypatch):
    class _FailingPosthog:
        def capture(self, **kwargs):
            raise RuntimeError("network down")

    monkeypatch.setattr(feedback_module, "get_posthog_client", lambda config: _FailingPosthog())

    result = FeedbackService().submit(
        request_mode="coding.md",
        feedback={"summary": "s"},
        call_ctx=_call_ctx(),
    )

    assert result == "Feedback accepted (analytics unavailable)."


def test_feedback_service_distinct_id_is_username_only(monkeypatch):
    captured = []

    class _CapturingPosthog:
        def capture(self, distinct_id, event, properties):
            captured.append({"distinct_id": distinct_id, "event": event})

    monkeypatch.setattr(feedback_module, "get_posthog_client", lambda config: _CapturingPosthog())

    FeedbackService().submit(
        request_mode="coding.md",
        feedback={"summary": "s"},
        call_ctx=_call_ctx(),
    )

    assert captured[0]["distinct_id"] == "tester"
    assert "@" not in captured[0]["distinct_id"]
