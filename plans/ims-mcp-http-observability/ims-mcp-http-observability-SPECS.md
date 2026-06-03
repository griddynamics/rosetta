<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Tech Specs — ims-mcp HTTP Observability + /healthz + RC1 Hang Fix

## TLDR

ims-mcp (Streamable HTTP + OAuth) intermittently never replies → gateway 502 after tens of
minutes. Root cause (RC1, verified): hot-path tools `await fn()` where `fn` runs a **sync,
no-timeout RAGFlow `requests` call inline on the asyncio event loop**; one half-open socket
freezes the whole single-worker loop — no other request served, nothing logged. This spec
defines the **target state** for: (A) offloading all sync RAGFlow work off-loop with finite
timeouts; (B) earliest-possible request + SSE + response-lifecycle logging; (C) exception
surfacing with preserved cause chains; (D) an unauthenticated `/healthz` that probes RAGFlow
off-loop with a bounded timeout + short cache; (E) Docker `HEALTHCHECK`. Existing helper
`tracing.run_traced` (`tracing.py:147-160`) already does `to_thread` inside tracing — the fix
reuses it at the leaf sync calls. Verified against installed **FastMCP 3.3.1** (Starlette/uvicorn
asyncio ASGI app — this is NOT a FastMCP limitation; the loop-offload fix is fully compatible).
The PRIMARY requirement (NFR-0) is total request/response/SSE logging. Scope is `ims-mcp-server/`
code + `Dockerfile` (+ optional CI smoke). Deploy/Helm
items are findings-only (Appendix A). Companion: `…-PLAN.md` (the HOW).

## 1. Scope

In scope (ims-mcp-server/ + Dockerfile + optional CI):
- RC1 fix: off-loop offload + finite timeouts for RAGFlow, Redis; confirm/standardize OAuth
  introspection + OIDC config-fetch timeouts.
- Observability: earliest ASGI request log, SSE event tracing, response lifecycle + disconnect,
  in-flight watchdog, exception surfacing, transport-logger wiring.
- `/healthz` unauthenticated health check exercising RAGFlow off-loop.
- Dockerfile `HEALTHCHECK`; optional CI container smoke.
- Correct the partial uncommitted edits (keep scaffolding, fix two defects).

Out of scope (forbidden — see Appendix A for findings): sensitive-data/redaction logic;
disabling/replacing uvicorn access logs; ingress/Helm/values (probes, nginx timeout, strategy,
sessionAffinity, SIGTERM/graceful-shutdown H1); OAuth/security behavior changes beyond adding
timeouts + block logging.

## 2. NFRs / Architecture-Significant Requirements

- **NFR-0 (PRIMARY — total request/response/SSE visibility):** the system SHALL log EVERY incoming
  HTTP request and EVERY outgoing response at the outermost app layer, and SHALL log EVERY outgoing
  SSE message/chunk where feasible. This is the headline requirement: for any traffic, the pod logs
  must show it arrived and whether/when we replied (including auth-rejected, origin-blocked, and
  hung requests). Verified against FastMCP 3.3.1: the transport writes SSE events through the ASGI
  `send`, so an outer ASGI wrapper observes requests, responses, AND every SSE chunk — no
  transport-internal hook needed.
- **NFR-SURGICAL (minimal diff):** all changes MUST be surgical — smallest possible diff, reuse
  existing helpers/patterns (the `ims_mcp` logger `server.py:98`, `tracing._log_prefix` convention
  `tracing.py:63`, env-name + default constants in `ims_mcp/constants.py`, parsing in
  `ims_mcp/config.py`). No refactors, no new logging frameworks, no new deps, no format churn.
- **NFR-1 Loop liveness:** no `await` in a request path may execute a blocking sync I/O call on
  the event loop thread. All sync RAGFlow calls run via `asyncio.to_thread`.
- **NFR-2 Bounded latency:** every outbound I/O (RAGFlow HTTP, Redis socket, OAuth introspection,
  OIDC config fetch) has a finite timeout; a hung dependency converts to a logged, bounded error,
  not an infinite freeze.
- **NFR-3 Observability completeness:** for any request the logs answer "received? / replied? /
  exception?" — earliest receive line, response.start status, body completion, disconnect, and
  any exception with full traceback + preserved `__cause__`.
- **NFR-4 Bounded log volume:** SSE per-event logging is one compact INFO line; full payloads are
  DEBUG-gated only.
- **NFR-5 Health-probe safety:** `/healthz` must never itself freeze the loop or flap on a
  transient blip — probe runs off-loop, bounded, with a short result cache.
- **NFR-6 No new runtime deps:** Docker `HEALTHCHECK` uses Python stdlib only.
- **NFR-7 Backward compatibility:** stdio transport, existing tool contracts, OAuth flow, and the
  `/mcp/` transport mount path are unchanged. New env knobs are optional with safe defaults.
- **NFR-8 Coverage:** ≥80% on changed modules (per `testing` skill); tests isolated, idempotent,
  external-only mocking.

## 3. Architecture & Component Design

ASGI layering (target). `*` marks where the fix changes wiring:

```
client → ingress → uvicorn
  → RequestLoggingMiddleware  *OUTERMOST wrapper of mcp.http_app(...) return value
    → FastMCP RequestContextMiddleware → Auth (OAuthProxy) → OriginValidationMiddleware
      → FastMCP routes:  /mcp/ (transport, SSE)  |  /healthz (custom_route, unauthenticated)
        → tool/resource handlers → _retry_once / _read_resource
          → run_traced(to_thread) → sync RAGFlow client (instrumented) → requests(timeout)
```

Key design decisions (DD):
- **DD-1 (RC1 offload — at the LEAF sync I/O calls, NOT at `_retry_once`):** the event loop is
  frozen by **synchronous** RAGFlow `requests` calls invoked from inside `async def` tool bodies.
  The offload MUST wrap each leaf sync call with `asyncio.to_thread` (the existing
  `tracing.run_traced` at `tracing.py:147-160` does exactly `await asyncio.to_thread(partial(fn,…))`
  and is the correct helper — but only for a **sync** `fn`). **Do NOT offload at `_retry_once`**
  (`server.py:427`): its parameter is `AsyncStringFactory = Callable[[], Awaitable[str]]`
  (`server.py:90`) and the tool wrappers pass coroutine factories (`query_instructions` etc. are
  `async def`, `tools/instructions.py:132,163,254`); handing a coroutine to `to_thread` never
  awaits it (silent corruption). `_retry_once` stays an async retry/cause wrapper. The concrete
  leaf sites to offload (all sync, all on the loop today):
  - `tools/instructions.py:204-213` `list_docs_with_keyword_fallback(...)` (→ `keyword_search.py:28`
    `document_client.list_docs`)
  - `tools/instructions.py:220` `call_ctx.ragflow.retrieve(...)` (direct sync `requests`; topic path)
  - `list_instructions` / `_read_resource` doc-cache path `doc_cache.get_all_docs()` →
    `doc_cache.py:31-33` `document_client.list_docs` (offload inside `read_instruction_resource`,
    `resources.py:18`, which is async but calls sync I/O)
  - `document.py:95` `dataset.get(...)` (metadata_condition path)
  Rationale: fixes RC1 at the actual blocking granularity; reuses the verified `run_traced` helper
  correctly (sync leaf), no new concurrency model.
- **DD-2 (per-call ceiling):** wrap each offloaded leaf call in `asyncio.wait_for(asyncio.to_thread(
  fn,…), timeout=ROSETTA_TOOL_TIMEOUT)` so even a thread that never returns yields a bounded
  `TimeoutError` the loop can log (defence-in-depth above the RAGFlow `requests` timeout; the
  orphaned thread is a bounded, logged leak, acceptable vs. a frozen loop). A small `_offload(fn,…)`
  helper centralizes the `to_thread` + `wait_for` + tracing.
- **DD-3 (RAGFlow timeout):** inject `timeout=` at the `instrument_ragflow_client` monkey-patch
  (`tracing.py:175-253`) — the single wrapper already intercepting every RAGFlow HTTP method.
  Rationale: one injection point, no SDK fork, applies to get/post/put/delete/patch uniformly.
- **DD-4 (Redis timeout):** the redis client is built inside `RedisStore(url=...)`
  (`server.py:165`); the URL form gives no kwargs hook. Pass socket timeouts via URL query
  params (`?socket_timeout=…&socket_connect_timeout=…&health_check_interval=…`) appended in
  `_build_redis_store` (`server.py:159-168`) when not already present. Rationale: no dependency
  on `key_value` internals; works with `redis.asyncio` URL parsing. Assumption A-3.
- **DD-5 (earliest log):** wire `RequestLoggingMiddleware` as an **outer wrapper of the object
  returned by `mcp.http_app(...)`** — `app = RequestLoggingMiddleware(mcp.http_app(...))` — not
  via `mcp.http_app(middleware=[...])` (current bug `server.py:920,943-946`, which sits inside
  auth). Origin validation stays inside via the existing `middleware` list.
- **DD-6 (health route):** FastMCP `@mcp.custom_route("/healthz", methods=["GET"])` (verified 3.3.1:
  appends a plain Starlette `Route` with NO `RequireAuthMiddleware`; that guard is only on the
  `/mcp` route → `/healthz` is genuinely unauthenticated). `/mcp` default transport path
  (`settings.py:264 streamable_http_path="/mcp"`) does not collide.
- **DD-7 (external/runtime logging — survives a frozen loop):** three app/image-level mechanisms
  that do NOT depend on the (possibly frozen) asyncio loop:
  1. **uvicorn access log stays ON** (`uvicorn.Config` does not set `access_log` → default True,
     `server.py:953`) — an independent per-request line. NOT disabled (out of scope to disable).
  2. **OS-thread watchdog** (REQ-OBS-6) logs in-flight/heartbeat even while the loop is frozen
     (GIL released during blocking socket I/O).
  3. **`PYTHONFAULTHANDLER=1`** in the Dockerfile (stdlib) + watchdog-triggered
     `faulthandler.dump_traceback()` → all-thread stack dump capturing the frozen call site, and
     automatic traceback on fatal crashes — visible on stderr → pod logs, independent of app code.

## 4. Contracts

### 4.1 Env knobs (new) — surgical: env-NAME consts (`ENV_*`) + `DEFAULT_*` live in `ims_mcp/constants.py` (existing pattern, `constants.py:5-26`); dataclass field + `os.getenv` parsing in `ims_mcp/config.py`

| Env var | Default | Unit | Rationale |
|---|---|---|---|
| `ROSETTA_RAGFLOW_HTTP_TIMEOUT` | `60` | s | normal miss is 2-3s; 60s = 20-30× headroom (user-set), well below gateway tens-of-min |
| `ROSETTA_TOOL_TIMEOUT` | `120` | s | per-call ceiling (2 min, user-set) > RAGFlow timeout incl. retry-once (~2×60s) |
| `ROSETTA_REDIS_SOCKET_TIMEOUT` | `5` | s | Redis ops are sub-ms; 5s tolerates blips, kills half-open |
| `ROSETTA_REDIS_SOCKET_CONNECT_TIMEOUT` | `2` | s | connect is fast; fail closed quickly |
| `ROSETTA_REDIS_HEALTH_CHECK_INTERVAL` | `30` | s | proactively detects dead conns over long uptime |
| `ROSETTA_INFLIGHT_WARN_THRESHOLD` | `30` | s | watchdog warns on requests slower than worst normal (2-3s) ×10 |
| `ROSETTA_HEALTHZ_RAGFLOW_TIMEOUT` | `5` | s | probe must be snappy; bounded so probe can't freeze loop |
| `ROSETTA_HEALTHZ_CACHE_TTL` | `10` | s | dampens flap; a transient blip ≤10s won't toggle availability |
| `ROSETTA_OAUTH_HTTP_TIMEOUT` | `10` | s | matches FastMCP introspection default; make explicit + apply to OIDC fetch |

All optional; absent ⇒ default. No behavior change when unset beyond the safe defaults.

### 4.2 `/healthz` response contract

- Method `GET`, path `/healthz`, **no auth**, no body required.
- Probe: RAGFlow `list datasets` run via `asyncio.to_thread` under
  `asyncio.wait_for(timeout=ROSETTA_HEALTHZ_RAGFLOW_TIMEOUT)`; result cached `ROSETTA_HEALTHZ_CACHE_TTL`.
- Healthy → **HTTP 200**, `application/json`:
  `{"status":"ok","ragflow":"ok","cached":<bool>,"checked_at":<unix>}`
- Unhealthy (probe error/timeout) → **HTTP 503**, `application/json`:
  `{"status":"unhealthy","ragflow":"<timeout|error>","detail":"<short>","checked_at":<unix>}`
- When `ROSETTA_API_KEY` unset (RAGFlow disabled) → 200 with `"ragflow":"disabled"` (liveness only).
- Cache semantics: within TTL, return last probe result with `"cached":true` (no new probe) —
  bounds RAGFlow load and prevents flap.
- **Probe-type caveat (readiness ONLY):** because `/healthz` exercises an external dependency
  (RAGFlow), it is suitable for a Kubernetes **readiness** probe, NOT a **liveness** probe. Wiring
  it to liveness would, during a RAGFlow outage longer than the cache TTL, fail the liveness check
  → pod restart loop → full outage at `replicaCount:1`. Liveness, if added, should use a shallow
  process-alive check. (Adding the probes themselves is a Helm/values change — out of scope,
  Appendix A.)

### 4.3 Log-line contracts (REUSE the existing `tracing._log_prefix` convention — surgical)

All new request/response/SSE lines MUST be emitted via the existing `ims_mcp` logger and use
`tracing._log_prefix(event, layer, trace_id)` (`tracing.py:63`) with a NEW layer **`asgi`**, so they
match the established `[request-tracing] [request-tracing-<event>] [<layer>] [trace=<id>]` format
already used by the `mcp` and `ragflow` layers. The `ragflow`-layer per-call logs
(`instrument_ragflow_client`) already exist and are kept. Do NOT introduce the ad-hoc
`"Incoming MCP … request started: …"` strings from the partial edits — migrate them to
`_log_prefix("received","asgi",trace)` etc. EARS-style behavioral requirements (the suffix
key=value fields follow the prefix):

- **REQ-OBS-1 (request received):** WHEN an http/websocket scope enters the outermost middleware,
  the system SHALL log INFO:
  `Incoming MCP <type> request started: trace=<id> method=<m> path=<p> query=<q> client=<host> user_agent=<ua>`
  (already present `server.py:816-825`; only re-positioned).
- **REQ-OBS-2 (response start):** WHEN `http.response.start` is forwarded **after** `await send`
  succeeds, the system SHALL record status; flag set post-send (fix `server.py:830-832/838`).
- **REQ-OBS-3 (completion):** WHEN the final body chunk (`more_body=False`) is sent, the system
  SHALL log INFO `…request completed: trace=<id> … status=<s> elapsed_ms=<ms>`.
- **REQ-OBS-4 (disconnect):** WHEN the receive side yields `http.disconnect` / `websocket.disconnect`,
  the system SHALL log INFO `Incoming MCP request client-disconnected: trace=<id> path=<p> elapsed_ms=<ms>`.
- **REQ-OBS-5 (SSE event):** WHEN an SSE chunk flows through `send`
  (`http.response.body` with non-empty body on the `/mcp/` stream), the system SHALL log one
  compact INFO `SSE chunk: trace=<id> seq=<n> bytes=<size>` and, only when DEBUG, the payload.
- **REQ-OBS-6 (in-flight watchdog — runs on a dedicated OS THREAD, not asyncio):** the system SHALL
  run a `threading.Thread` (daemon) that periodically WARN-logs any request in-flight longer than
  `ROSETTA_INFLIGHT_WARN_THRESHOLD` via `_log_prefix("slow","asgi",trace)`:
  `… elapsed_s=<s> path=<p>`. CRITICAL design point (answers "external/unreachable-from-app
  logging"): it MUST be an OS thread, NOT an asyncio task — when the event loop is frozen by a
  blocking sync call, an asyncio watchdog is frozen too, but a thread keeps running because blocking
  socket I/O releases the GIL. On detecting an over-threshold/stuck request it SHALL also call
  `faulthandler.dump_traceback()` (all-thread stack dump) so the frozen call site is captured. This
  makes the watchdog robust even if RC1 ever regresses. (Registry populated by the middleware,
  §5; thread reads it under a lock.)
- **REQ-OBS-7 (origin block):** WHEN `OriginValidationMiddleware` rejects a request, the system
  SHALL log WARN `Origin rejected: origin=<o> path=<p> client=<host>` before responding.
- **REQ-OBS-8 (tool/resource error):** WHEN a tool/resource path returns an `"Error: …"` string,
  the system SHALL `logger.exception`/`logger.error` with the operation + trace id before return.
- **REQ-OBS-9 (cause preservation):** `_retry_once` SHALL `raise RuntimeError(...) from last_exc`
  (`server.py:439`), and `traced_execution` + RAGFlow instrumentation SHALL log with
  `exc_info=True`.
- **REQ-OBS-10 (transport loggers):** the `mcp.server.streamable_http*` loggers SHALL be attached
  to the ims-mcp handler/level so transport/session crashes are visible.

## 5. Data Models

No persistent schema changes. New in-memory state:
- Health cache: `(result_dict, monotonic_ts)` guarded for single-flight within TTL.
- In-flight registry: `dict[trace_id → (path, start_monotonic)]`, add on receive, remove on
  completion/disconnect; read by the watchdog OS thread. Guarded by a `threading.Lock` (cross-thread
  access: loop writes, watchdog thread reads). Bounded by concurrency; entries always removed.

## 6. Error Handling Strategy

- Hung RAGFlow → RAGFlow `requests` timeout raises `requests.Timeout` in the worker thread →
  surfaces through `run_traced` → logged with traceback → `_retry_once` retries once → on second
  failure `raise RuntimeError(...) from last_exc`. Tool returns its `"Error: …"` string (logged).
- Per-call `asyncio.wait_for` `TimeoutError` → logged by loop/handler; request returns bounded error.
- Redis hang → socket timeout raises in the awaiting coroutine → logged; loop stays live (other
  coroutines unaffected).
- `/healthz` probe failure/timeout → caught → 503 contract (§4.2); never propagates to freeze loop.
- Middleware send failure → response-started flag set only post-send, so the fallback-500 branch
  is correctly reachable when the first send raises.

## 7. Testing Strategy (full plan in `…-PLAN.md` sub-phase F)

| Case | Type | Expectation |
|---|---|---|
| sync RAGFlow stub blocks 3s; concurrent 2nd request | unit/async | 2nd request progresses (loop not frozen) — proves NFR-1 |
| RAGFlow stub hangs > timeout | unit | bounded `Timeout`/`TimeoutError`, logged, no infinite wait |
| middleware: normal request | unit | started + response.start(after send) + completed lines |
| middleware: handler raises before send | unit | exception logged; fallback-500 sent |
| middleware: send raises on first send | unit (regression) | flag NOT pre-set; 500 path reachable |
| middleware: client disconnect | unit | disconnect line, no completion-as-success |
| SSE multi-chunk send | unit | one INFO per chunk w/ seq+bytes; payload only at DEBUG |
| `/healthz` RAGFlow ok | unit | 200 + `status:ok`; 2nd call within TTL → `cached:true`, no 2nd probe |
| `/healthz` RAGFlow timeout | unit | 503 + `ragflow:timeout`; loop not frozen |
| `/healthz` no API key | unit | 200 + `ragflow:disabled` |
| origin rejected | extend `tests/test_origin_middleware.py` | WARN logged + correct response |
| `_retry_once` failure | unit | `RuntimeError` `__cause__` is original exc |
| watchdog over threshold | unit (fake clock) | WARN emitted once per slow request |

Test data: happy (cache hit/miss), edge (timeout boundary, empty SSE body chunk, TTL expiry),
error (RAGFlow raise, Redis unreachable), no security-injection cases (no new untrusted input).
Mock external only (RAGFlow client, Redis, clock); never patch internal control flow.

## 8. Security Considerations

- `/healthz` is intentionally unauthenticated and MUST expose only `status` + dependency health —
  **no** version, config, secrets, stack traces, or internal hostnames in the body.
- No redaction logic added (out of scope); SSE payload logging is DEBUG-gated and operators
  control DEBUG — documented caveat, not a redaction feature.
- OAuth/security behavior unchanged except adding explicit timeouts (introspection + OIDC) and
  origin-block logging. No new auth surface.

## 9. Dependencies

- Internal: `tracing.run_traced`/`traced_execution`, `instrument_ragflow_client`,
  `RagflowClient`, `RedisStore`, `OriginValidationMiddleware`, `_retry_once`, `config.py` knobs,
  `constants.py` defaults.
- External (no new deps): `ragflow_sdk` (`requests`), `redis.asyncio` (via `key_value`),
  `httpx` (FastMCP auth), `fastmcp` custom_route, `uvicorn`, Python stdlib (`urllib`) for Docker.

## 10. Assumptions

- **A-1:** offloading the **leaf sync I/O calls** (`list_docs`, `ragflow.retrieve`,
  `get_all_docs`, `dataset.get`) via `asyncio.to_thread` is safe because those calls do not touch
  loop-only shared state. Shared mutable state — `_TOOL_CACHE` (`server.py:220-223`, explicitly
  "all access on the event loop thread"), `_DATASET_LOOKUP`, etc. — is read/written ONLY in the
  async `server.py` wrappers, NOT inside the offloaded leaf calls, so it stays on the loop thread.
  Implementer MUST keep cache reads/writes in the async wrappers (do not move them into the
  offloaded thread). Verify in sub-phase A.
- **A-2:** `read_instruction_resource` is effectively sync work wrappable via `run_traced`
  (currently `await`ed inside `traced_execution` at `server.py:459-466`). Verify its signature.
- **A-3:** appending socket-timeout query params to `REDIS_URL` is honored by the `redis.asyncio`
  URL parser used by `key_value`'s `RedisStore`. Verify in sub-phase A; fallback = wrap raw client
  obtained via `_get_raw_redis_client` (`server.py:175-181`).
- **A-4:** FastMCP default transport mount is `/mcp/`; `/healthz` does not collide. Verify by
  inspecting `mcp.http_app` route table at startup.
- **A-5:** the orphaned worker thread from a `wait_for` timeout is an acceptable bounded leak
  (it completes when the RAGFlow `requests` timeout fires ≤30s later). Documented, not mitigated.

## 11. Tech Summary — files & services affected

Code (ims-mcp-server/): `ims_mcp/server.py` (middleware wiring, `_retry_once`, `_read_resource`,
tool wrappers, redis build, health route, watchdog, transport-logger wiring),
`ims_mcp/tracing.py` (RAGFlow timeout injection; exc_info), `ims_mcp/config.py` +
`ims_mcp/constants.py` (env knobs/defaults), `ims_mcp/tools/instructions.py` +
`ims_mcp/resources/*` (error-path logging), `ims_mcp/auth/oauth.py` (explicit OAuth/OIDC
timeouts + origin-block log), `ims_mcp/analytics/tracker.py` (keep partial edit — verified).
Tests: `tests/test_origin_middleware.py` (+ new middleware/health/retry tests).
Image: `ims-mcp-server/Dockerfile` (add `HEALTHCHECK` + `ENV PYTHONFAULTHANDLER=1`; keep
`PYTHONUNBUFFERED=1`). Optional CI: `.github/workflows/rosetta-mcp-dockerhub.yaml`.
New runtime element: OS-thread in-flight watchdog (REQ-OBS-6). No services/infra changed.

## Appendix A — Findings / Recommended follow-ups (OUT OF SCOPE — deploy/infra)

Documented for the orchestrator/user; NOT plan tasks:
- H1 latent: `cleanup_and_exit` → `sys.exit(0)` at SIGTERM (`tracker.py:289-294`) +
  `timeout_graceful_shutdown=0` (`server.py:958`) sever in-flight requests on pod restart →
  502 on rolling deploy. Fix is graceful-shutdown + signal handling (deploy-adjacent).
- H2: no readiness/liveness probes (commented out in values; chart renders none); `/healthz`
  here UNBLOCKS adding them — but adding the probes is a Helm/values change (out of scope).
- H4: nginx `proxy-read-timeout` not set on ims-mcp ingress (default 60s) → would surface as 504
  for >60s tool calls. Ingress annotation change (out of scope).
- Chart `strategy:` block absent → `maxUnavailable:0` ignored; `replicaCount:1`; sessionAffinity —
  all Helm/values (out of scope).
- MCP `session_idle_timeout` not set → `_server_instances` dict grows over long uptime (latent
  leak). Touches FastMCP `http_app` params; flagged for a follow-up, excluded from approved scope.

</CRITICAL>
