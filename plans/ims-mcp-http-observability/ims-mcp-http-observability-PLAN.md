<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Execution Plan — ims-mcp HTTP Observability + /healthz + RC1 Hang Fix

Companion to `…-SPECS.md` (the WHAT). This file is the HOW: sequenced WBS, file:line anchors,
ordering, tests, validation, rollback, HITL gate. Do NOT duplicate spec contracts here — cross-
reference by REQ/DD/NFR id. Scope and forbidden areas are defined in SPECS §1.

## Intent (restated)

Make "did we receive / reply / except?" answerable in logs, fix the verified RC1 event-loop
freeze (sync no-timeout RAGFlow call on the loop), add an off-loop `/healthz`, and Dockerize the
health check — within `ims-mcp-server/` + `Dockerfile` only. Keep + correct the partial edits.

## Sub-phase ordering & dependency rationale

A → B → C → D → E → F, each independently buildable/testable:
- **A first** (RC1 + timeouts): unfreezes the loop; REQ-OBS-6 watchdog and `/healthz` off-loop
  probe are only meaningful once the loop can run (a frozen loop runs neither). Highest value,
  lowest observability dependency.
- **B** (earliest/SSE/response/disconnect): pure observability on a now-live loop.
- **C** (exception surfacing + cause + transport loggers): completes "was there an exception".
- **D** (`/healthz`): depends on A's off-loop timeout pattern (DD-1/DD-2) for its RAGFlow probe.
- **E** (Docker HEALTHCHECK + optional CI): depends on D's endpoint existing.
- **F** (tests): can be authored incrementally per sub-phase; consolidated last for coverage.

## HITL GATE (mandatory, before ANY code change)

**STOP after this plan + SPECS are produced. Do NOT implement.** Orchestrator presents SPECS +
PLAN to the user. Implementation begins only on explicit approval. Items to raise at the gate:
(1) confirm the 9 default values (SPECS §4.1); (2) confirm `/healthz` path + unauthenticated +
RAGFlow-probe behavior; (3) confirm Appendix-A deploy items stay findings-only; (4) confirm
keep-and-correct of partial edits; (5) Assumptions A-1..A-5 — accept verify-during-A or require
pre-answers. Per-sub-phase HITL checkpoints below mark where a mid-flight decision needs the user.

---

## Sub-phase A — RC1 hang fix + finite timeouts  (NFR-1, NFR-2; REQ-OBS-9 cause partially)

A0. **Verify assumptions (no code).** Confirm A-1/A-2 (`run_traced` fits all three tools +
   `_read_resource`; `read_instruction_resource` is sync-wrappable — inspect its def in
   `ims_mcp/resources/`), A-3 (redis URL query-param timeouts honored), A-4 (`/mcp/` vs
   `/healthz`). AC: each assumption confirmed or fallback chosen. Watch-for: if A-1 false (tool
   body touches loop state), escalate (HITL) — do not improvise.
A1. **Add env knobs + defaults.** `ims_mcp/constants.py`: add `ENV_*` + `DEFAULT_*` for the 9
   knobs (SPECS §4.1) following existing pattern (`constants.py:125-128,170-171`).
   `ims_mcp/config.py`: add dataclass fields + `os.getenv` parsing mirroring `:317,370`
   (`_parse_int`/`_parse_port` style). AC: config loads with defaults when unset; types correct.
A2. **RAGFlow `requests` timeout (DD-3).** In `instrument_ragflow_client` /
   `_traced_http_method` (`ims_mcp/tracing.py:175-253,256-271`) inject
   `kwargs.setdefault("timeout", _CONFIG.ragflow_http_timeout)` before `original_method(...)`
   (`tracing.py:215`). AC: every get/post/put/delete/patch carries the timeout; existing
   `document.py:178` explicit 30s untouched. Watch-for: do not break `functools.wraps` signature.
A3. **Off-loop offload at the LEAF sync I/O calls (DD-1/DD-2). NOT at `_retry_once`.**
   CRITICAL: `_retry_once` (`server.py:427`) takes `AsyncStringFactory` (`server.py:90`) and the
   tool lambdas (`server.py:497-508,539-550,577-586`) return COROUTINES (`async def` tools at
   `tools/instructions.py:132,163,254`) — passing a coroutine to `asyncio.to_thread` never awaits
   it (silent corruption). Leave `_retry_once` async (retry + cause wrapper, A7). Add a small
   `_offload(fn, *a, **k)` helper = `await asyncio.wait_for(asyncio.to_thread(fn, *a, **k),
   timeout=_CONFIG.tool_timeout)` (or reuse `tracing.run_traced` which already does the `to_thread`
   for a SYNC `fn`). Wrap each leaf sync call:
   - `tools/instructions.py:204-213` `list_docs_with_keyword_fallback(...)` → `await _offload(list_docs_with_keyword_fallback, …)`
   - `tools/instructions.py:220` `call_ctx.ragflow.retrieve(...)` → `await _offload(call_ctx.ragflow.retrieve, …)` (topic path; also fix the swallowing `except: pass` at `:231` per C1)
   - `document.py:95` `dataset.get(...)` (metadata_condition path)
   AC: each sync RAGFlow call runs on a worker thread; a concurrent request progresses while one
   is blocked (proves NFR-1, F2). Watch-for: `asyncio.to_thread` copies contextvars (trace id
   propagates) — verify trace id still logged from the thread.
A4. **Off-loop resource read / list path.** `_read_resource` (`server.py:448-469`) and
   `list_instructions` call `read_instruction_resource` / `doc_cache.get_all_docs` which are async
   but call the SYNC `document_client.list_docs` (`doc_cache.py:31-33`). Offload that inner sync
   call via `_offload` inside `read_instruction_resource`/`get_all_docs` (NOT the outer async fn).
   AC: resource read + list_instructions do not block the loop. Watch-for: keep `_TOOL_CACHE`/
   `_DOC_CACHE` writes in the async wrapper (SPECS A-1), not in the offloaded thread.
A5. **Redis socket timeouts (DD-4).** `_build_redis_store` (`server.py:159-168`): append
   `socket_timeout`/`socket_connect_timeout`/`health_check_interval` query params to the URL when
   absent, from the new knobs. AC: store builds with timeouts; works WITH and WITHOUT `REDIS_URL`.
   Fallback (A-3 false): set on raw client via `_get_raw_redis_client` (`server.py:175-181`).
A6. **OAuth/OIDC timeouts.** `ims_mcp/auth/oauth.py`: pass explicit `timeout_seconds=
   _CONFIG.oauth_http_timeout` to `IntrospectionTokenVerifier` (`:113-119`) and to the OIDC
   proxy/config fetch (`:68` per D4 table) so the OIDC startup `httpx.get` is bounded. AC: no
   unbounded auth HTTP call remains. Watch-for: security behavior otherwise unchanged.
A7. **Cause preservation (REQ-OBS-9 part).** `_retry_once` `:439`: `raise RuntimeError(...) from
   last_exc`. AC: `__cause__` preserved (tested in F).
A8. **In-flight watchdog — OS THREAD, not asyncio (REQ-OBS-6, NFR-0/NFR-3, DD-7).** Create the
   in-flight registry (SPECS §5: `dict[trace_id → (path, start_monotonic)]`) guarded by a
   `threading.Lock`, and a daemon `threading.Thread` started in `main()` (before `asyncio.run`,
   `server.py:961`) that every few seconds WARN-logs (via `_log_prefix("slow","asgi",trace)`) any
   entry older than `ROSETTA_INFLIGHT_WARN_THRESHOLD` and calls `faulthandler.dump_traceback()` on a
   stuck entry. MUST be a thread, NOT an asyncio task — a frozen loop would freeze an asyncio
   watchdog, but a thread keeps running (blocking socket I/O releases the GIL). The
   populate-on-receive / remove-on-complete-or-disconnect hooks live in the middleware (B3) —
   **cross-sub-phase dependency**: land the registry + thread here in A8; the add/remove hooks in B3.
   Until B3 lands, the thread runs harmlessly over an empty registry. AC: thread starts; over-
   threshold entry → single WARN + one traceback dump (F5). Does NOT depend on a live loop (that is
   the point).

**A validation:** `cp .env.dev .env && VERSION=r2 venv/bin/python ims-mcp-server/validation/verify_mcp.py`;
repeat WITH `REDIS_URL="redis://localhost:6379/0"` and WITHOUT (Redis-affecting A5);
`bash validate-types.sh` (or repo equivalent). **A rollback:** revert `tracing.py`, `_retry_once`,
`_read_resource`, `_build_redis_store`, `oauth.py`, `config.py`, `constants.py` hunks; knobs are
additive so reverting restores prior behavior with no migration.

---

## Sub-phase B — Earliest request + SSE + response/disconnect observability  (NFR-0; REQ-OBS-1..5)

NOTE (all B steps): emit every line via the existing `ims_mcp` logger using
`tracing._log_prefix(event, "asgi", trace)` (SPECS §4.3) — `received`/`response-start`/`completed`/
`disconnect`/`sse`. Migrate the partial-edit ad-hoc `"Incoming MCP …"` strings to this convention.
FastMCP 3.3.1 verified: wrapping the returned app is outermost AND lifespan-safe (DD-5).

B1. **Reposition middleware (DD-5, fixes G1).** In `main()` (`server.py:912-962`): build
   `app = mcp.http_app(transport="http", stateless_http=False, event_store=…, retry_interval=…)`
   WITHOUT `RequestLoggingMiddleware` in its `middleware=` list; then wrap:
   `app = RequestLoggingMiddleware(app)`. Keep `OriginValidationMiddleware` in the inner
   `middleware` list (`server.py:920-922`) so origin checks stay inside auth. AC: request-started
   line appears even for auth-rejected/origin-blocked requests.
B2. **Fix response-started flag ordering (fixes partial-edit defect #2).** In `_send`
   (`server.py:827-838`): set `response_started=True` / `status_code` **after** `await send(message)`
   returns, not before (`:830-832,838`). AC: if first `send` raises, flag stays false → fallback-500
   branch (`:854-872`) reachable.
B3. **Response completion (REQ-OBS-3) + disconnect (REQ-OBS-4).** In `_send`, emit the completion
   INFO on `http.response.body` with `more_body=False` (move/confirm vs current `:874-883` which
   logs after `_call_app`). Wrap `receive` to detect `http.disconnect`/`websocket.disconnect` and
   log the disconnect line. AC: completion logged at true final chunk; disconnect logged distinctly
   from success.
B4. **SSE chunk tracing (REQ-OBS-5, NFR-0, NFR-4).** Verified (FastMCP 3.3.1 / MCP SDK): the
   transport writes every SSE event through the ASGI `send` (`http.response.body` chunks), so the
   outer wrapper observes them — no transport hook needed. In `_send`, when scope path is the
   transport mount (`/mcp`) and message is `http.response.body` with non-empty body, log one compact
   INFO via `_log_prefix("sse","asgi",trace)` with `seq=<n> bytes=<size>` (per-request `seq`
   counter); DEBUG-gate the payload. AC: one INFO per chunk; payload only under DEBUG; volume bounded.

**B validation:** middleware unit tests (F) green; `verify_mcp.py` unchanged-pass; manual:
start HTTP server, issue a tool call, confirm started→(sse chunks)→response.start→completed lines
in order with one trace id. **B rollback:** revert `main()` wiring to prior `middleware=[…]` form
and `_send` to prior body — isolated to `server.py:787-903,912-962`.

---

## Sub-phase C — Exception surfacing + cause + transport loggers  (REQ-OBS-7,8,9,10; G2..G6)

C1. **Tool/resource error logging (REQ-OBS-8, G3).** Add `logger.exception`/`logger.error` at each
   `return "Error: …"` in `ims_mcp/tools/instructions.py` (e.g. `:194,215`, and the
   `:204-213`/`:220` except blocks) and `ims_mcp/resources/*`. AC: every error-string return is
   preceded by a log with operation + trace id. Watch-for: do not log at INFO for expected
   "No instructions found" (`:236`) — that is not an error.
C2. **tracker.py partial edit — verify+keep (G3).** Confirm the `logger.exception` already added in
   `analytics/tracker.py` `track_tool_call` is correct; no change if so. AC: exception in tool call
   logged with traceback.
C3. **tracing exc_info (REQ-OBS-9, G5).** `traced_execution` and `_traced_http_method`
   (`tracing.py:240-249`) must log failures with `exc_info=True` (currently `%s`). AC: traceback
   present in logs.
C4. **Transport loggers (REQ-OBS-10, G6).** In the log-setup block (`server.py:98-110`) attach the
   ims-mcp handler + level to `mcp.server.streamable_http` and `mcp.server.streamable_http_manager`
   loggers (propagate or add handler). AC: a forced transport/session error appears in pod logs.
C5. **Origin-block log (REQ-OBS-7, G2).** In `OriginValidationMiddleware` (auth middleware module)
   add a WARN before rejecting. AC: blocked request logged with origin/path/client.
C6. **Confirm kept hooks.** Verify process/thread `excepthook` (`server.py:113-139`) + loop handler
   (`:142-153`, installed via `_serve_http` `:906-909`) are intact — keep as-is. AC: unchanged.

**C validation:** `verify_mcp.py` pass; new exception/origin unit tests (F) green; `validate-types.sh`.
**C rollback:** revert per-file log additions; all are additive logging — no behavior change on revert.

---

## Sub-phase D — /healthz health check  (REQ §4.2, NFR-5; DD-6)

D1. **Register route.** Add `@mcp.custom_route("/healthz", methods=["GET"])` async handler in
   `server.py` (near route/tool registration), BEFORE `mcp.http_app(...)` in `main()`. AC: route
   served unauthenticated; confirm no collision with `/mcp/` (A-4).
D2. **Off-loop bounded probe + cache.** Handler: if `_RAGFLOW` is None → 200 `ragflow:disabled`;
   else within `ROSETTA_HEALTHZ_CACHE_TTL` return cached result; else run RAGFlow `list datasets`
   via `asyncio.to_thread` under `asyncio.wait_for(timeout=ROSETTA_HEALTHZ_RAGFLOW_TIMEOUT)` —
   reuse `_DATASET_LOOKUP`/`_RAGFLOW`. Cache `(result, monotonic)`. AC: probe never blocks loop;
   transient ≤TTL blip does not flip status. Watch-for: catch ALL exceptions → 503 contract.
D3. **Response contract.** Return JSON + status per SPECS §4.2 (200 ok / 503 unhealthy / disabled).
   AC: body contains only status + dependency health (no secrets/version/trace — Security §8).

**D validation:** unit tests (F); manual `curl -s localhost:8000/healthz` → 200 healthy, then with
RAGFlow unreachable → 503 within ~timeout, loop still serving other requests; `verify_mcp.py` pass.
**D rollback:** remove the route + handler + cache state — fully isolated, no other code depends on it.

---

## Sub-phase E — Dockerfile HEALTHCHECK + faulthandler + optional CI smoke  (NFR-6, DD-7)

E0. **`ENV PYTHONFAULTHANDLER=1`** in `ims-mcp-server/Dockerfile` near the existing `ENV` block
   (`Dockerfile:17-44`), keeping `PYTHONUNBUFFERED=1`. Enables automatic all-thread traceback on
   fatal faults and arms the watchdog's `faulthandler.dump_traceback()` (A8) — external diagnostic
   independent of app code. AC: `docker run … python -c "import faulthandler;print(faulthandler.is_enabled())"` → True.

E1. **HEALTHCHECK.** In `ims-mcp-server/Dockerfile` (repo-relative; the only Dockerfile — repo root
   has none) add after `EXPOSE 8000`:
   `HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["python","-c","import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz',timeout=4).status==200 else 1)"]`
   (stdlib only; keep `PYTHONUNBUFFERED=1`). AC: image builds; `docker inspect` shows healthcheck;
   container reports healthy. Rationale: interval/timeout align with `/healthz` cache TTL + probe.
E2. **(Optional) CI smoke.** `.github/workflows/rosetta-mcp-dockerhub.yaml` is typecheck + build only
   (jobs `typecheck` `:33`, `build-and-push` `:66`). Optionally add a post-build step: run the image,
   `curl`/urllib `/healthz`, assert 200. AC: smoke step passes. HITL CHECKPOINT: confirm whether to
   add CI smoke now (it changes CI runtime/secrets surface) — default = propose, implement only if
   user opts in.

**E validation:** `docker build` the image; run; observe `STATUS healthy`. **E rollback:** delete the
HEALTHCHECK line / CI step — no runtime dependency.

---

## Sub-phase F — Tests  (NFR-8; SPECS §7)

F1. Middleware tests: request-started, response.start-after-send, completion, disconnect, SSE
   per-chunk (seq/bytes, DEBUG payload), handler-raises-before-send (fallback 500), send-raises
   regression (flag not pre-set). New `tests/test_request_logging_middleware.py`.
F2. RC1 tests: stubbed sync RAGFlow blocks N s; assert a concurrent request proceeds (loop live);
   stub hangs > timeout → bounded `TimeoutError`. New `tests/test_loop_offload.py`.
F3. `/healthz` tests: ok→200, cached→no 2nd probe, timeout→503, disabled→200. New
   `tests/test_healthz.py`.
F4. Exception/cause/origin: `_retry_once` `__cause__`; extend `tests/test_origin_middleware.py`
   (+114 partial edit) to assert origin-block WARN; tool error-path logging asserted via caplog.
F5. Watchdog test (REQ-OBS-6): drive the registry directly + short interval; assert the OS-thread
   watchdog emits a single WARN for an over-threshold entry and invokes the faulthandler dump hook
   (patch `faulthandler.dump_traceback` to assert called once). Thread is joined/stopped in teardown
   (idempotent, isolated).
AC (all F): ≥80% coverage on changed modules; isolated, idempotent, external-only mocks; no
patching of internal control flow.

**F validation:** `cd ims-mcp-server && PYTHONPATH=. ../venv/bin/pytest tests/` green;
coverage report ≥80% on changed modules.

---

## Final validation (run after F, before done)

1. `cp .env.dev .env && VERSION=r2 venv/bin/python ims-mcp-server/validation/verify_mcp.py`
2. Re-run #1 WITH `REDIS_URL="redis://localhost:6379/0"` and WITHOUT (Redis change, A5).
3. `bash validate-types.sh` (repo type gate).
4. `cd ims-mcp-server && PYTHONPATH=. ../venv/bin/pytest tests/`
5. `venv/bin/python scripts/pre_commit.py` (full pre-commit).
6. `docker build` + run + confirm `/healthz` 200 and container `healthy`.
Do NOT read any `.env` files. Do NOT commit or change git state unless the user asks.

## Traceability — Spec item ↔ Plan task

| Spec id | Plan task(s) |
|---|---|
| NFR-0 total request/response/SSE logging | B1, B3, B4 ; A8 (thread watchdog) ; F1 |
| NFR-SURGICAL minimal diff | all (constants.py names, `_log_prefix` reuse, no new deps) |
| DD-7 external/runtime logging | A8 (thread watchdog + faulthandler) ; E0 (PYTHONFAULTHANDLER) ; uvicorn access log kept |
| NFR-1 loop liveness | A3, A4 ; F2 |
| NFR-2 bounded latency | A2, A5, A6 ; A3 wait_for |
| NFR-3 observability completeness | B1-B4, C1-C6 |
| NFR-4 bounded log volume | B4 |
| NFR-5 health-probe safety | D2 ; F3 |
| NFR-6 no new deps | E1 |
| NFR-7 backward compat | A1 (optional knobs), B1 (mount unchanged), A0/A-4 |
| NFR-8 coverage | F1-F5 |
| DD-1/DD-2 offload+ceiling | A3, A4 |
| DD-3 RAGFlow timeout | A2 |
| DD-4 Redis timeout | A5 |
| DD-5 earliest wrapper | B1 |
| DD-6 health route | D1 |
| REQ-OBS-1 received | B1 |
| REQ-OBS-2 response.start after send | B2 |
| REQ-OBS-3 completion | B3 |
| REQ-OBS-4 disconnect | B3 |
| REQ-OBS-5 SSE event | B4 |
| REQ-OBS-6 watchdog | A8 (registry+task) ; B3 (add/remove hooks) ; F5 |
| REQ-OBS-7 origin block | C5 ; F4 |
| REQ-OBS-8 tool/resource error | C1, C2 ; F4 |
| REQ-OBS-9 cause + exc_info | A7, C3 ; F4 |
| REQ-OBS-10 transport loggers | C4 |
| §4.1 env knobs | A1 |
| §4.2 /healthz contract | D2, D3 ; F3 |
| Appendix A (out of scope) | — (findings only, no task) |

**Coverage note:** REQ-OBS-6 (in-flight watchdog) is now numbered step **A8** (registry + periodic
task) with its add/remove hooks in **B3**; see A8 for the cross-sub-phase dependency. All
spec items map to at least one task.

## Scope / risk flags for the HITL gate

- **No scope breach detected.** Every required capability is designable within `ims-mcp-server/` +
  `Dockerfile` (+ optional CI). No forbidden area touched.
- **Risk R1 (A-3):** Redis URL-param timeout injection may not be honored by `key_value`'s
  `RedisStore` URL path → fallback to raw-client config (A5). Verify in A0.
- **Risk R2 (A-5/DD-2):** `asyncio.wait_for` timeout orphans the worker thread until the RAGFlow
  `requests` timeout fires (≤30s) — bounded, logged leak; accepted (SPECS A-5). Flag for user ack.
- **Risk R3 (A8↔B3 coupling):** watchdog needs the in-flight registry populated by the middleware;
  note the cross-sub-phase data dependency above so A and B aren't merged incorrectly.
- **Decision D-CI (E2):** CI container smoke is optional and changes CI surface — propose, implement
  only on opt-in.

</CRITICAL>
