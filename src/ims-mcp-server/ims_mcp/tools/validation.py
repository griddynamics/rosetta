"""Shared validation helpers for Rosetta MCP tool inputs."""

from __future__ import annotations

import json

from ims_mcp.constants import (
    MAX_CONTENT_LENGTH,
    MAX_DISCOVER_QUERY_LENGTH,
    MAX_FEEDBACK_FIELD_LENGTH,
    MAX_PATH_LENGTH,
    MAX_PROJECT_NAME_LENGTH,
    MAX_QUERY_LENGTH,
    MAX_REQUEST_MODE_LENGTH,
    MAX_TAG_LENGTH,
    MAX_TAGS,
)


def normalize_optional_text(value: str | None, *, field: str, max_length: int) -> tuple[str | None, str | None]:
    """Trim an optional string and enforce a max length."""
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, f"Error: {field} must be a string"
    normalized = value.strip()
    if not normalized:
        return None, None
    if len(normalized) > max_length:
        return None, f"Error: {field} must be at most {max_length} characters"
    return normalized, None


def require_text(value: str, *, field: str, max_length: int) -> tuple[str | None, str | None]:
    """Trim a required string and enforce non-empty + max length."""
    if not isinstance(value, str):
        return None, f"Error: {field} must be a string"
    normalized = value.strip()
    if not normalized:
        return None, f"Error: {field} must not be empty"
    if len(normalized) > max_length:
        return None, f"Error: {field} must be at most {max_length} characters"
    return normalized, None


def normalize_tags(
    tags: list[str] | None,
    *,
    field: str = "tags",
    required: bool = False,
) -> tuple[list[str] | None, str | None]:
    """Trim, validate, and deduplicate tags while preserving order."""
    if tags is None:
        if required:
            return None, f"Error: {field} must contain at least one tag"
        return None, None
    
    # Auto-decode JSON-encoded arrays (e.g., "[\"tag1\", \"tag2\"]" -> ["tag1", "tag2"])
    if isinstance(tags, str):
        stripped = tags.strip()
        if stripped.startswith("[") or stripped.startswith('"'):
            try:
                decoded = json.loads(stripped)
                if isinstance(decoded, list):
                    tags = decoded
                else:
                    return None, f"Error: {field} must be a list of strings, got JSON-encoded {type(decoded).__name__}"
            except (json.JSONDecodeError, ValueError):
                return None, f"Error: {field} must be a valid JSON array or a list of strings"
        else:
            return None, f"Error: {field} must be a list of strings, not a plain string"
    
    if not isinstance(tags, list):
        return None, f"Error: {field} must be a list of strings"
    if len(tags) > MAX_TAGS:
        return None, f"Error: {field} must contain at most {MAX_TAGS} tags"

    result: list[str] = []
    seen: set[str] = set()
    for idx, tag in enumerate(tags):
        if not isinstance(tag, str):
            return None, f"Error: {field}[{idx}] must be a string"
        normalized = tag.strip()
        if not normalized:
            return None, f"Error: {field}[{idx}] must not be empty"
        if len(normalized) > MAX_TAG_LENGTH:
            return None, f"Error: {field}[{idx}] must be at most {MAX_TAG_LENGTH} characters"
        lowered = normalized.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(normalized)

    if required and not result:
        return None, f"Error: {field} must contain at least one tag"
    return result or None, None


def normalize_relative_path(value: str, *, field: str) -> tuple[str | None, str | None]:
    """Normalize a virtual relative path and reject traversal/absolute forms."""
    normalized, err = require_text(value, field=field, max_length=MAX_PATH_LENGTH)
    if err:
        return None, err

    assert normalized is not None
    normalized = normalized.replace("\\", "/")
    # Silently strip leading and trailing slashes to handle both "skills" and "/skills/" gracefully.
    # AI agents often interpret "relative path" ambiguously, so we normalize instead of rejecting.
    normalized = normalized.strip("/")
    if "//" in normalized:
        return None, f"Error: {field} must not contain empty, '.' or '..' path segments"

    parts = normalized.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return None, f"Error: {field} must not contain empty, '.' or '..' path segments"
    if any(ord(ch) < 32 for ch in normalized):
        return None, f"Error: {field} must not contain control characters"
    return normalized, None


def normalize_query(value: str | None, *, field: str = "query") -> tuple[str | None, str | None]:
    return normalize_optional_text(value, field=field, max_length=MAX_QUERY_LENGTH)


def normalize_discover_query(value: str | None) -> tuple[str | None, str | None]:
    return normalize_optional_text(value, field="query", max_length=MAX_DISCOVER_QUERY_LENGTH)


def normalize_project_name(value: str) -> tuple[str | None, str | None]:
    normalized, err = require_text(value, field="repository_name", max_length=MAX_PROJECT_NAME_LENGTH)
    if err:
        return None, err

    assert normalized is not None
    if normalized in {".", ".."}:
        return None, "Error: repository_name must not be '.' or '..'"
    if "/" in normalized or "\\" in normalized:
        return None, "Error: repository_name must not contain '/' or '\\' characters"
    if any(ord(ch) < 32 for ch in normalized):
        return None, "Error: repository_name must not contain control characters"

    return normalized, None


def normalize_content(value: str) -> tuple[str | None, str | None]:
    normalized, err = require_text(value, field="content", max_length=MAX_CONTENT_LENGTH)
    if err:
        return None, err
    return normalized, None


def normalize_request_mode(value: str) -> tuple[str | None, str | None]:
    return require_text(value, field="request_mode", max_length=MAX_REQUEST_MODE_LENGTH)


def normalize_feedback_text(value: object, *, field: str) -> tuple[str | None, str | None]:
    if not isinstance(value, str):
        return None, f"Error: feedback.{field} must be a string"
    normalized = value.strip()
    if not normalized:
        return None, f"Error: feedback.{field} must not be empty"
    if len(normalized) > MAX_FEEDBACK_FIELD_LENGTH:
        return None, f"Error: feedback.{field} must be at most {MAX_FEEDBACK_FIELD_LENGTH} characters"
    return normalized, None


def normalize_format(value: str | None, *, field: str = "format") -> tuple[str | None, str | None]:
    """Normalize and validate format parameter (XML or flat, case-insensitive)."""
    if value is None:
        return "XML", None
    if not isinstance(value, str):
        return None, f"Error: {field} must be a string"
    normalized = value.strip()
    if not normalized:
        return "XML", None
    lowered = normalized.lower()
    if lowered == "xml":
        return "XML", None
    if lowered == "flat":
        return "flat", None
    return None, f"Error: {field} must be 'XML' or 'flat' (case-insensitive)"
