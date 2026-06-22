"""Shared path utilities for Rosetta CLI."""

import random
import time
from pathlib import Path
from typing import Callable, TypeVar

_T = TypeVar("_T")

_TRANSIENT_RAGFLOW = (
    "The dataset doesn't own the document",
    "Documents not found",
    "mapper_parsing_exception",
    "Failed to update metadata",
    "timed out", "timeout",
    "Connection aborted", "Connection refused", "Connection reset",
    "status 5",
)
_PERMANENT_RAGFLOW = (
    "The type is not supported",
    "format_invalid",
    "Invalid API key",
    "Insufficient permissions",
    "lacks permission",
    "You don't own",
    "meta_fields must be a dictionary",
)


def is_transient_ragflow(exc: BaseException) -> bool:
    """Classify a RAGFlow error as transient (retry) or permanent (do not retry).

    Permanent substrings win — a message containing both never retries.
    """
    msg = str(exc)
    if any(s in msg for s in _PERMANENT_RAGFLOW):
        return False
    return any(s in msg for s in _TRANSIENT_RAGFLOW)


def retry_call(
    fn: Callable[[], _T],
    *,
    attempts: int = 3,
    jitter_ms_range: tuple[int, int] = (150, 250),
    retry_on: Callable[[BaseException], bool] = is_transient_ragflow,
    label: str = "",
) -> _T:
    """Call ``fn`` up to ``attempts`` times; sleep flat-random ms between attempts on retry_on(exc).

    Re-raises the last exception when attempts are exhausted or ``retry_on`` returns False.
    """
    if attempts < 1:
        raise ValueError("attempts must be >= 1")
    last: BaseException | None = None
    for n in range(1, attempts + 1):
        try:
            return fn()
        except BaseException as exc:
            last = exc
            if n >= attempts or not retry_on(exc):
                raise
            jitter = random.randint(jitter_ms_range[0], jitter_ms_range[1])
            print(f"  ↻ retry {n}/{attempts - 1} for {label} after {jitter}ms: {str(exc)[:120]}")
            time.sleep(jitter / 1000.0)
    assert last is not None
    raise last


def resolve_workspace_root(path: Path) -> Path:
    """Resolve the workspace root for a publish target.

    Preference order:
    1. Parent of the topmost `instructions/` directory in the target path.
    2. Nearest ancestor containing `.git`.
    3. The target directory itself, or the parent for a file target.
    """
    resolved = path.resolve()
    container = resolved if resolved.is_dir() else resolved.parent

    parts = container.parts
    for index, part in enumerate(parts):
        if part == "instructions" and index > 0:
            return Path(*parts[:index])

    current = container
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent

    return container
