# Discovery Notes — ims-mcp HTTP 502 / No-Response

Phase 1 (coding-flow). Synthesis of three parallel discovery sweeps. Full evidence:
`agents/TEMP/ims-mcp-http-observability/{d1-pipeline,d2-docker-runtime,d3-gke}.md`.
Orchestrator independently re-verified all load-bearing code claims (see "Verified" tags).

## The Symptom, Precisely

IDE → ims-mcp over HTTP (stateful Streamable HTTP + OAuth). Request reaches ingress
(confirmed), but no response returns; client eventually fails with **HTTP 502**.

Key distinction the analysis hinges on:
- **502 Bad Gateway** = upstream (our pod) **closed/reset the connection or returned an
  invalid response**.
- **504 Gateway Timeout** = upstream was reachable but **didn't answer in time**.

The user reports **502**, which points at connection-sever / crash / pod-not-ready —
**not** a clean slow-response timeout. This reorders the hypotheses below (it de-emphasizes
the nginx 60s read-timeout, which would normally surface as 504).

The deeper problem: **we currently cannot answer "did the request reach the app, did we
send a response, was there an exception"** — because of concrete logging gaps. So the
primary deliverable is observability that makes those three questions answerable, plus
fixing the one clearly self-inflicted connection-severing defect.

## RECALIBRATED ROOT CAUSE (after user clarification + D4 deep-dive) — supersedes H1/H2 below

User facts that changed everything: container is **stable, 7–9 days uptime, no restarts**;
normal latency **1ms (cache hit) / 2–3s (miss)**; intermittently a request **never gets a
reply** (ims-mcp does nothing); **no RAGFlow failure logged**; gateway 502s after tens of
minutes. So this is NOT a restart/graceful-shutdown bug — it is a **per-request infinite
hang that freezes the process**.

**RC1 — Synchronous, no-timeout RAGFlow call on the asyncio event loop (CONFIRMED, orchestrator-verified).**
- Hot path `query_instructions` (`tools/instructions.py:204-213`) calls the **sync** def
  `list_docs_with_keyword_fallback(...)` with **no `asyncio.to_thread`**; line `220` calls
  `call_ctx.ragflow.retrieve(...)` the same way.
- `_retry_once` does `await fn()` (`server.py:434`) but `fn` runs that sync RAGFlow call
  inline → it executes **on the event loop thread**.
- RAGFlow SDK uses `requests` with **NO timeout** (`ragflow_sdk/ragflow.py:37-53`, `:223`;
  `modules/dataset.py:99`). Redis async client also has **no `socket_timeout`/
  `health_check_interval`**.
- Mechanism: a half-open/dead socket (network blip, RAGFlow/Redis pod event — likely over
  7–9 days) makes that call block **forever**. Single uvicorn worker → **entire event loop
  freezes**: no other request served, no `asyncio` watchdog can fire, nothing logged, gateway
  eventually 502s. Matches "no RAGFlow failure logged" (it hangs, never raises) and
  "1ms/2–3s normal" (only cache *misses* hit RAGFlow). Counter-example proving the gap:
  `services/invite.py:92,94,103,116` correctly uses `to_thread`; the hot path does not.

**Fix direction for RC1:** offload all sync RAGFlow calls off the loop (`asyncio.to_thread`)
AND give every outbound I/O a finite timeout (RAGFlow `requests` timeout; Redis
`socket_timeout` + `health_check_interval`). This converts an infinite freeze into a bounded,
logged error — and is the SAME mechanism a RAGFlow-touching health check needs.

## User-Confirmed Requirements (this round)
- Log **as early as possible** (outermost ASGI wrapper) + propagate request/trace id.
- **Trace SSE data** — log each SSE event/chunk as it flows out, to see exactly where a
  request stalls.
- Log response completion + client disconnect ("did we reply?").
- **Health endpoint = YES**, and it must **exercise the RAGFlow API (list datasets)** so it
  detects the hang condition — served at the **default GKE/K8s path so no infra change is
  needed**. MUST run the RAGFlow probe off-loop with a bounded timeout (else the health check
  itself can freeze the loop).

## Earlier Hypotheses (DEMOTED — not this bug, but latent correctness issues)
H1/H2 below assumed restarts; the container does not restart, so they are NOT the cause of
the reported 502. H1 (SIGTERM→sys.exit + `timeout_graceful_shutdown=0`) remains a real
latent defect worth noting. H4 (nginx timeout) would surface as 504, not 502.

## Root-Cause Hypotheses (original, restart-based — DEMOTED, kept for record)

### H1 — SIGTERM bypasses graceful shutdown; in-flight requests severed (IN SCOPE: ims-mcp). VERIFIED
- `register_signal_handlers()` runs at **import** (`server.py:96`) and installs
  `SIGTERM/SIGINT → cleanup_and_exit` (`tracker.py:292-294`).
- `cleanup_and_exit` calls **`sys.exit(0)`** (`tracker.py:289`), so on any pod
  termination (rolling deploy, scale, eviction) the process exits **immediately**,
  bypassing uvicorn's drain of active requests/SSE streams.
- Compounded by **`timeout_graceful_shutdown=0`** (`server.py:958`) — even without the
  signal handler, uvicorn is configured to give in-flight requests **zero** drain time.
- Effect: any request in flight during a pod restart gets its TCP connection cut →
  ingress sees a reset/invalid upstream → **502**. With single replica (below) every
  restart is a guaranteed hit.

### H2 — No readiness probe → traffic routed to not-ready / terminating pod (app+deploy). VERIFIED
- No `/health`-style route exists anywhere in the app (no FastMCP custom route, no Docker
  `HEALTHCHECK` — `Dockerfile` has none).
- Probes are **commented out** in all values files ("no /health endpoint yet"), and the
  evergreen chart template does not render liveness/readiness/startup probes at all.
- `replicaCount: 1`; the chart renders **no `strategy:` block**, so `maxUnavailable: 0`
  from values is silently ignored (K8s default 25% applies).
- Effect: during startup or termination the single pod still receives traffic before
  uvicorn/lifespan (Redis/OAuth/migrations) are ready, or while it is exiting →
  connection refused/reset → **502**. App-side fix (health endpoint) unblocks the
  deploy-side fix (probes).

### H3 — Crash inside the request/SSE pipeline, currently invisible (IN SCOPE: ims-mcp). VERIFIED (mechanism); UNCONFIRMED (occurrence)
- Stateful Streamable HTTP can run the MCP session in a **background task**; if it raises
  mid-stream the SSE closes with no MCP response (`mcp/server/streamable_http_manager.py`
  session task). Transport/session logs use the `mcp.server.streamable_http*` logger
  namespaces, which are **not** wired into ims-mcp log config and are likely suppressed.
- Lifespan/startup failures (OAuth/Redis config) abort the process → no backend → 502.
- We cannot currently see these because of the logging gaps in the next section.

### H4 — nginx ingress read-timeout (DEPLOY/INGRESS: findings-only). VERIFIED gap; lower rank for a 502
- No `proxy-read-timeout` annotation on ims-mcp values; nginx default 60s; peer services
  on the cluster set 300–3600s. A >60s tool call would be cut.
- BUT a read-timeout normally yields **504**, not 502 — so this is more likely a *separate*
  latent issue than the reported symptom. Reported as a finding; not the prime suspect.

## Logging / Observability Gaps (the actual ask)

| ID | Gap | Evidence | Consequence |
|----|-----|----------|-------------|
| G1 | Request-logging middleware at **wrong ASGI layer** — passed via `mcp.http_app(middleware=[...])` so it sits *inside* FastMCP `RequestContextMiddleware` + auth | `server.py:920,943-951` | Pre-auth rejects (401/403), origin blocks, and early failures never logged; not truly "earliest" |
| G2 | `OriginValidationMiddleware` blocks requests **silently** | `auth/` middleware | Blocked requests invisible in pod logs |
| G3 | `tools/instructions.py`, `resources/` return `"Error: ..."` strings with **no logger** | tool/resource modules | Real request-processing failures invisible |
| G4 | `_retry_once` raises `RuntimeError(str(last_exc))` **without `from`** | retry helper | Exception type/chain/traceback lost |
| G5 | `traced_execution` + RAGFlow instrumentation log exception via `%s`, **no `exc_info`** | `tracing.py` | Tracebacks lost |
| G6 | MCP SDK transport/session crash loggers (`mcp.server.streamable_http*`) **not configured** | log setup | Transport-level crashes suppressed |
| G7 | No reliable **response-completion** log (final body `more_body=False`); no client-disconnect log | middleware | Can't confirm "did we send a response" |

## Partial Uncommitted Edits — Assessment (user said "up to you")

`git diff --stat`: `server.py` (+181), `analytics/tracker.py` (+7), `tests/test_origin_middleware.py` (+114).

- `tracker.py` `logger.exception` in `track_tool_call` — **CORRECT**, keep.
- `server.py` process/thread `excepthook` + asyncio loop exception handler + `_serve_http`
  wrapper — **CORRECT**, keep.
- `server.py` `RequestLoggingMiddleware` class — **PARTIALLY CORRECT**, two defects:
  1. **Wrong position** (G1): passed into `mcp.http_app(middleware=...)` instead of
     wrapping the returned app. `server.py:920,943`.
  2. **`response_started=True` set before `await send(...)`** (`server.py:831/834` vs
     send at `:838`) — if the send itself raises, the flag is wrongly set, so the
     fallback-500 branch is skipped. Must set flag *after* a successful send.
- Tests (`test_origin_middleware.py`) — logically sound but would mask defect #2 in
  uncovered failure scenarios; not yet run.

**Recommendation:** keep and *correct* the edits (reposition the middleware as an outer
wrapper; fix the flag ordering; complete response-completion + disconnect logging) rather
than discard — the scaffolding is ~80% right.

## Scope Confirmation Needed (Discovery HITL gate)

1. Observability-only, or also fix H1 (SIGTERM/graceful-shutdown connection-sever) — the
   prime *fixable* 502 suspect and in-scope (ims-mcp)?
2. Health endpoint + Docker `HEALTHCHECK` (enables readiness probe; addresses H2) — include?
3. Can the user share real pod logs / `kubectl` events for a failing request (confirm root
   cause now vs. instrument-and-wait)?

Deploy/ingress items (H2 probes, H4 nginx timeout, chart strategy/sessionAffinity) remain
**findings-only** per stated scope unless the user opts in.
