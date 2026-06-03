"""
Grader for Solr skill evals.

Checks an LLM response against a set of assertions defined in a test case.
All assertions are AND-связаны: case passes iff ALL assertions pass.
Multiple instances of the same assertion key are NOT supported (JSON only
keeps the last one anyway) — within a single assertion the values are
ALL-связаны for must_*, ANY-связаны only for must_contain_any.

Returns a dict {"passed": bool, "failures": [str, ...]}.
"""
from __future__ import annotations

import re
from typing import Any


def _truncate(s: str, n: int = 80) -> str:
    return s if len(s) <= n else s[: n - 1] + "…"


def grade(response: str, asserts: dict[str, Any]) -> dict[str, Any]:
    failures: list[str] = []

    # must_contain — все строки должны быть в ответе (case-sensitive)
    for needle in asserts.get("must_contain", []):
        if needle not in response:
            failures.append(f"must_contain: missing {needle!r}")

    # must_contain_any — хотя бы одна из строк
    any_list = asserts.get("must_contain_any")
    if any_list is not None:
        if not any(s in response for s in any_list):
            failures.append(
                f"must_contain_any: none of {any_list!r} found"
            )

    # must_not_contain — ни одной строки
    for needle in asserts.get("must_not_contain", []):
        if needle in response:
            failures.append(f"must_not_contain: forbidden {needle!r} found")

    # must_match_regex — все паттерны должны находиться (re.search)
    for pattern in asserts.get("must_match_regex", []):
        try:
            if not re.search(pattern, response):
                failures.append(
                    f"must_match_regex: pattern {pattern!r} not matched"
                )
        except re.error as e:
            failures.append(f"must_match_regex: invalid regex {pattern!r}: {e}")

    # must_not_match_regex — ни один паттерн не должен находиться
    for pattern in asserts.get("must_not_match_regex", []):
        try:
            if re.search(pattern, response):
                failures.append(
                    f"must_not_match_regex: forbidden pattern {pattern!r} matched"
                )
        except re.error as e:
            failures.append(
                f"must_not_match_regex: invalid regex {pattern!r}: {e}"
            )

    # max_length_chars / min_length_chars
    if "max_length_chars" in asserts:
        cap = asserts["max_length_chars"]
        if len(response) > cap:
            failures.append(f"max_length_chars: {len(response)} > {cap}")

    if "min_length_chars" in asserts:
        floor = asserts["min_length_chars"]
        if len(response) < floor:
            failures.append(f"min_length_chars: {len(response)} < {floor}")

    return {"passed": len(failures) == 0, "failures": failures}


# Validate that an asserts dict only uses known keys — helps catch typos
KNOWN_ASSERT_KEYS = {
    "must_contain",
    "must_contain_any",
    "must_not_contain",
    "must_match_regex",
    "must_not_match_regex",
    "max_length_chars",
    "min_length_chars",
}


def lint_asserts(asserts: dict[str, Any]) -> list[str]:
    """Return a list of warnings about unknown / malformed assertion keys."""
    warnings = []
    for key in asserts:
        if key not in KNOWN_ASSERT_KEYS:
            warnings.append(f"unknown assertion key: {key!r}")
    for key in (
        "must_contain",
        "must_contain_any",
        "must_not_contain",
        "must_match_regex",
        "must_not_match_regex",
    ):
        if key in asserts and not isinstance(asserts[key], list):
            warnings.append(f"{key} must be a list, got {type(asserts[key]).__name__}")
    return warnings


if __name__ == "__main__":
    # Self-test
    r = grade(
        "Hello {!term f=sku_id}ABC-123/XL world",
        {
            "must_contain": ["{!term", "ABC-123/XL"],
            "must_not_contain": ["{!phrase"],
            "must_match_regex": [r"\{!term\s+f=sku_id\}ABC-123/XL"],
            "max_length_chars": 100,
        },
    )
    assert r["passed"], r
    print("grader.py self-test: OK")

    r = grade("foo bar", {"must_contain": ["baz"]})
    assert not r["passed"]
    assert "missing 'baz'" in r["failures"][0]
    print("grader.py negative test: OK")
