"""F5 — Unit tests for the in-flight OS-thread watchdog (REQ-OBS-6, A8).

Covers:
- Watchdog WARN emitted once for an over-threshold in-flight entry
- faulthandler.dump_traceback called exactly once per stuck trace (not per tick)
- faulthandler NOT called for a fresh (under-threshold) entry
- Registry manipulation (register/unregister) is thread-safe
- Watchdog thread started by _start_inflight_watchdog is a daemon, deduped by name
- Completed request removed from registry (no ghost warns)

Design: all per-tick logic is exercised via the PRODUCTION _watchdog_tick
directly — no real sleeps in tick tests, no reimplemented _IsolatedWatchdog.
faulthandler.dump_traceback is monkeypatched via unittest.mock.patch.
"""

from __future__ import annotations

import faulthandler
import logging
import threading
import time
from unittest.mock import MagicMock, patch

import pytest

import ims_mcp.server as server_module
from ims_mcp.server import (
    _INFLIGHT_LOCK,
    _INFLIGHT_REGISTRY,
    _register_inflight,
    _unregister_inflight,
    _watchdog_tick,
    _start_inflight_watchdog,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _cleanup_trace(trace_id: str) -> None:
    """Ensure the trace is removed from the global registry after test."""
    _unregister_inflight(trace_id)


def _insert_backdated(trace_id: str, path: str, age_s: float) -> None:
    """Insert a registry entry with a back-dated start time."""
    with _INFLIGHT_LOCK:
        _INFLIGHT_REGISTRY[trace_id] = (path, time.monotonic() - age_s)


# ── F5-1: _watchdog_tick emits WARN for over-threshold entry ─────────────────

def test_watchdog_tick_warns_for_slow_request(caplog):
    """_watchdog_tick emits a WARNING for a request over the threshold."""
    trace_id = "test-tick-warn-1"
    _cleanup_trace(trace_id)

    try:
        _insert_backdated(trace_id, "/mcp/test", age_s=60.0)
        already_dumped: set[str] = set()

        with (
            patch.object(faulthandler, "dump_traceback", MagicMock()),
            caplog.at_level(logging.WARNING, logger="ims_mcp"),
        ):
            _watchdog_tick(time.monotonic(), threshold=30.0, already_dumped=already_dumped)

        msgs = [r.message for r in caplog.records]
        warn_msgs = [m for m in msgs if "slow" in m.lower() and trace_id in m]
        assert warn_msgs, (
            f"Expected a WARN log containing trace {trace_id!r}. Got: {msgs}"
        )
    finally:
        _cleanup_trace(trace_id)


# ── F5-2: faulthandler.dump_traceback called exactly once per stuck trace ─────

def test_watchdog_tick_calls_faulthandler_exactly_once_per_stuck_trace():
    """dump_traceback is called once per stuck trace ID across multiple tick calls."""
    trace_id = "test-tick-fault-2"
    _cleanup_trace(trace_id)

    try:
        _insert_backdated(trace_id, "/mcp/slow", age_s=60.0)
        already_dumped: set[str] = set()
        mock_dump = MagicMock()

        with patch.object(faulthandler, "dump_traceback", mock_dump):
            # Simulate 3 ticks — dump must only fire on the first
            now = time.monotonic()
            _watchdog_tick(now, threshold=30.0, already_dumped=already_dumped)
            _watchdog_tick(now + 1.0, threshold=30.0, already_dumped=already_dumped)
            _watchdog_tick(now + 2.0, threshold=30.0, already_dumped=already_dumped)

        assert mock_dump.call_count == 1, (
            f"dump_traceback called {mock_dump.call_count} times, expected exactly 1"
        )
    finally:
        _cleanup_trace(trace_id)


# ── F5-3: faulthandler NOT called for fresh (under-threshold) entry ───────────

def test_watchdog_tick_no_faulthandler_for_fresh_request():
    """A fresh entry (0s elapsed) does not trigger dump_traceback."""
    trace_id = "test-tick-fresh-3"
    _cleanup_trace(trace_id)

    try:
        _register_inflight(trace_id, "/mcp/fresh")
        already_dumped: set[str] = set()
        mock_dump = MagicMock()

        with patch.object(faulthandler, "dump_traceback", mock_dump):
            # Use the actual current time — elapsed will be ~0s, well under 30s
            _watchdog_tick(time.monotonic(), threshold=30.0, already_dumped=already_dumped)

        assert mock_dump.call_count == 0, (
            f"dump_traceback unexpectedly called for a fresh trace"
        )
    finally:
        _cleanup_trace(trace_id)


# ── F5-4: register/unregister is thread-safe ─────────────────────────────────

def test_register_unregister_thread_safety():
    """Concurrent register/unregister from multiple threads does not raise."""
    errors: list[Exception] = []

    def _worker(i: int) -> None:
        tid = f"thread-safety-trace-{i}"
        try:
            _register_inflight(tid, f"/mcp/path-{i}")
            time.sleep(0.01)
            _unregister_inflight(tid)
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=_worker, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=2.0)

    assert not errors, f"Thread-safety errors: {errors}"

    # Ensure no leaked entries
    with _INFLIGHT_LOCK:
        leaked = [k for k in _INFLIGHT_REGISTRY if k.startswith("thread-safety-trace-")]
    assert not leaked, f"Leaked registry entries: {leaked}"


# ── F5-5: _start_inflight_watchdog starts a daemon thread, deduped by name ───

def test_start_inflight_watchdog_starts_daemon_and_deduplicates():
    """_start_inflight_watchdog starts a daemon thread and is deduped by name."""
    # Ensure at least one start call; collect count before
    before = [t for t in threading.enumerate() if t.name == "inflight-watchdog"]

    _start_inflight_watchdog()
    _start_inflight_watchdog()  # second call must not start a duplicate

    after = [t for t in threading.enumerate() if t.name == "inflight-watchdog"]

    # Exactly one watchdog thread exists
    assert len(after) == 1, (
        f"Expected exactly 1 inflight-watchdog thread, found {len(after)}"
    )
    assert after[0].daemon, "inflight-watchdog thread must be a daemon thread"


# ── F5-6: completed request removed — no ghost warns ─────────────────────────

def test_watchdog_tick_completed_request_not_warned(caplog):
    """After unregistering, _watchdog_tick does NOT warn for the completed trace."""
    trace_id = "test-tick-completed-6"
    _cleanup_trace(trace_id)

    try:
        _insert_backdated(trace_id, "/mcp/done", age_s=60.0)
        _unregister_inflight(trace_id)  # mark completed before tick

        already_dumped: set[str] = set()
        mock_dump = MagicMock()

        with (
            patch.object(faulthandler, "dump_traceback", mock_dump),
            caplog.at_level(logging.WARNING, logger="ims_mcp"),
        ):
            _watchdog_tick(time.monotonic(), threshold=30.0, already_dumped=already_dumped)

        msgs = [r.message for r in caplog.records]
        ghost_warns = [m for m in msgs if trace_id in m and "slow" in m.lower()]
        assert not ghost_warns, f"Watchdog warned about a completed request: {ghost_warns}"
        assert mock_dump.call_count == 0
    finally:
        _cleanup_trace(trace_id)
