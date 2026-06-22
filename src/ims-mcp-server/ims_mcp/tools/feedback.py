"""Feedback tool."""

from __future__ import annotations

from ims_mcp.context import CallContext
from ims_mcp.services.feedback import FeedbackService
from typing import cast

from ims_mcp.typing_utils import JsonArray, JsonObject
from ims_mcp.tools.validation import normalize_feedback_text, normalize_request_mode


async def submit_feedback(
    call_ctx: CallContext,
    feedback_service: FeedbackService,
    request_mode: str,
    feedback: JsonObject,
) -> str:
    normalized_request_mode, request_mode_err = normalize_request_mode(request_mode)
    if request_mode_err:
        return request_mode_err

    required = {"summary", "root_cause", "prompt_suggestions", "context"}
    missing = [key for key in required if key not in feedback]
    if missing:
        return f"Error: feedback is missing required keys: {', '.join(sorted(missing))}"

    normalized_feedback = dict(feedback)
    for key in ("summary", "root_cause", "context"):
        normalized_value, value_err = normalize_feedback_text(feedback.get(key), field=key)
        if value_err:
            return value_err
        normalized_feedback[key] = normalized_value

    prompt_suggestions = feedback.get("prompt_suggestions")
    if isinstance(prompt_suggestions, list):
        normalized_items: list[str] = []
        for idx, item in enumerate(prompt_suggestions):
            normalized_item, item_err = normalize_feedback_text(item, field=f"prompt_suggestions[{idx}]")
            if item_err:
                return item_err
            assert normalized_item is not None
            normalized_items.append(normalized_item)
        if not normalized_items:
            return "Error: feedback.prompt_suggestions must not be empty"
        normalized_feedback["prompt_suggestions"] = cast(JsonArray, normalized_items)
    else:
        normalized_prompt_suggestions, prompt_err = normalize_feedback_text(
            prompt_suggestions,
            field="prompt_suggestions",
        )
        if prompt_err:
            return prompt_err
        normalized_feedback["prompt_suggestions"] = normalized_prompt_suggestions

    assert normalized_request_mode is not None
    return feedback_service.submit(
        request_mode=normalized_request_mode,
        feedback=normalized_feedback,
        call_ctx=call_ctx,
    )
