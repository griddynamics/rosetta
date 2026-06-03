"""F2 — Unit tests for loop-liveness (NFR-1) via ims_mcp.tracing.offload.

Covers:
- NFR-1: a stubbed sync RAGFlow callable that blocks ~0.6s does NOT freeze
  the event loop — a concurrent asyncio coroutine sets an Event BEFORE the
  blocking call returns, proving the loop progressed concurrently.
- A hung stub beyond the per-call ceiling raises asyncio.TimeoutError (bounded).
"""

from __future__ import annotations

import asyncio
import threading
import time
from unittest.mock import patch

import pytest

from ims_mcp.tracing import offload


# ── F2-1: loop stays live while a sync call blocks ───────────────────────────

@pytest.mark.asyncio
async def test_concurrent_coroutine_progresses_while_sync_call_blocks():
    """Prove NFR-1: event loop is NOT frozen while a blocking sync call runs.

    Strategy (Event-ordering, immune to scheduler jitter):
      - Launch offload of a sync stub that blocks ~0.6 s.
      - A concurrent fast coroutine sets an asyncio.Event after a tiny sleep.
      - Record whether the Event was set BEFORE the blocking offload returned.
      - If the loop was frozen the Event could not have been set concurrently.
    """
    fast_completed_event = asyncio.Event()
    # Tracks the exact order of completion events for assertions.
    order: list[str] = []

    # threading.Event used to signal the blocking stub from the main thread
    # once we know the fast coroutine has had a chance to run.
    blocking_gate = threading.Event()

    def _blocking_ragflow_stub() -> str:
        # Blocks for ~0.6 s simulating a sync RAGFlow HTTP call.
        # Uses time.sleep which releases the GIL, allowing the loop thread
        # to process other coroutines.
        time.sleep(0.6)
        order.append("blocking_done")
        return "result"

    async def _fast_task() -> None:
        # A very short sleep — just enough to yield to the event loop.
        await asyncio.sleep(0.05)
        fast_completed_event.set()
        order.append("fast_done")

    # Run both concurrently
    results = await asyncio.gather(
        offload(_blocking_ragflow_stub),
        _fast_task(),
        return_exceptions=True,
    )

    # The offload result should be the string "result"
    assert results[0] == "result", f"Unexpected offload result: {results[0]}"

    # Event-ordering proof: fast_done must appear BEFORE blocking_done.
    # If the event loop was frozen, fast_done could not have been appended
    # while the blocking stub was sleeping.
    assert fast_completed_event.is_set(), "Fast coroutine never completed"
    assert order.index("fast_done") < order.index("blocking_done"), (
        f"Loop was frozen: fast_done did not precede blocking_done. order={order}"
    )


# ── F2-2: stub hangs beyond timeout ceiling → bounded TimeoutError ────────────

@pytest.mark.asyncio
async def test_offload_raises_timeout_when_stub_hangs():
    """A sync stub that never returns triggers asyncio.TimeoutError from offload().

    Uses a small injected timeout via the env-backed _get_tool_timeout() helper.
    We patch it to return 0.2s so the test is fast.
    """
    import ims_mcp.tracing as tracing_module

    event = asyncio.Event()

    def _hanging_stub() -> str:
        # Block until the asyncio.wait_for cancels the thread.
        # In a real scenario, the RAGFlow requests.get would never return.
        # We use a threading.Event so the thread can be signalled.
        import threading as _threading
        done = _threading.Event()
        done.wait(timeout=10)  # wait up to 10s (test will timeout long before)
        return "should not reach here"

    with patch.object(tracing_module, "_get_tool_timeout", return_value=0.2):
        with pytest.raises(asyncio.TimeoutError):
            await offload(_hanging_stub)


# ── F2-3: offload returns correct value from sync callable ───────────────────

@pytest.mark.asyncio
async def test_offload_returns_callable_result():
    """offload() correctly returns the return value of the sync function."""

    def _add(a: int, b: int) -> int:
        return a + b

    result = await offload(_add, 3, 4)
    assert result == 7


# ── F2-4: offload propagates exceptions from the sync callable ───────────────

@pytest.mark.asyncio
async def test_offload_propagates_sync_exception():
    """Exceptions raised inside the sync callable propagate through offload()."""

    def _bad() -> None:
        raise ValueError("ragflow exploded")

    with pytest.raises(ValueError, match="ragflow exploded"):
        await offload(_bad)
