# Rosetta Performance & Time-to-Value Recommendations

**Perspective:** RLM (Recursive Language Model), CodeAct, Memory-by-Pointers  
**Date:** 2026-04-01  
**Scope:** Bootstrap latency, context efficiency, instruction serving, agent interaction patterns

---

## Executive Summary

Rosetta's current architecture pays a **fixed 8,300–12,500 token bootstrap tax** across 2 MCP round-trips + filesystem reads before any coding agent can begin work. While the progressive skill loading and threshold-based bundling are well-designed, the system misses opportunities from three emerging paradigms:

| Paradigm | Core Idea | Rosetta Gap |
|----------|-----------|-------------|
| **RLM** | Recursive decomposition — sub-LLM calls on chunks | Instructions served monolithically; no recursive refinement |
| **CodeAct** | Tool-integrated reasoning — act/observe loops | Bootstrap is a rigid 3-step gate; no adaptive loading |
| **Memory-by-Pointers** | Lazy materialization — references over content | Full content bundled eagerly; no pointer/summary layer |

**If all recommendations were implemented**, estimated improvement:
- Bootstrap token cost: **12,000 → 4,000 tokens** (67% reduction)
- Bootstrap round-trips: **2 MCP + 2 FS reads → 1 MCP + 0 FS reads**
- Time-to-first-action: **~8s → ~2s** (estimated)
- Context window utilization: **58% → 35%** for typical coding tasks

---

## 1. Memory-by-Pointers: Replace Eager Bundling with Lazy Materialization

### Problem

Current `get_context_instructions()` bundles all bootstrap rules (~2,600 tokens) + workflow listing (~1,500 tokens) into a single response. Prep Step 2 forces full reads of `ARCHITECTURE.md` (~4,000 tokens) and `CONTEXT.md` (~3,000 tokens). The agent receives ~12,000 tokens before writing a single line of code.

Most of this content is **reference material** the agent may never actively reason over.

### Recommendation 1.1: Instruction Pointers with On-Demand Expansion

Instead of bundling full instruction content, serve **structured pointers** — metadata summaries with expansion capability.

**Current behavior:**
```xml
<rosetta:file path="rules/bootstrap-guardrails.md">
  [110 lines of full guardrail content — ~440 tokens]
</rosetta:file>
```

**Proposed behavior:**
```xml
<rosetta:pointer path="rules/bootstrap-guardrails.md" 
  tokens="440" 
  summary="Safety gates: file deletion requires confirmation, no force-push, 
           credential detection, blast radius assessment"
  expand="ACQUIRE bootstrap-guardrails FROM KB" />
```

**Impact:** Agent receives ~30 tokens per pointer instead of ~440 tokens of content. For 6 bootstrap rules: **2,600 → 180 tokens** (93% reduction). Agent expands only when it encounters a relevant situation (e.g., user asks to delete files → expand guardrails).

**Implementation:**
- Add `summary` field to instruction frontmatter (one-line, <150 chars)
- New bundler mode: `bundle_mode="pointers"` returns `<rosetta:pointer>` elements
- `get_context_instructions()` uses pointer mode for non-critical rules
- Keep `bootstrap-core-policy.md` fully expanded (routing logic must be immediate)

### Recommendation 1.2: Tiered Context Loading

Replace the binary "full content vs. listing" threshold with a 3-tier system:

| Tier | Token Budget | Content | When |
|------|-------------|---------|------|
| **Immediate** | Full content | Core routing, classification, active workflow | Always loaded |
| **Summary** | Pointer + 1-line summary | Guardrails, policies, available skills | Loaded as pointers; expanded on demand |
| **Deferred** | Name + tag only | Reference skills, templates, org overlays | Listed only; fetched when workflow phase requires |

**Annotation in frontmatter:**
```yaml
---
name: bootstrap-guardrails
tier: summary  # immediate | summary | deferred
summary: "Safety gates for file ops, force-push, credentials, blast radius"
---
```

**Impact:** Prep Step 1 drops from ~4,000 tokens to ~1,500 tokens. Prep Step 2 (ARCHITECTURE.md, CONTEXT.md) becomes a summary-only read with expand-on-demand.

### Recommendation 1.3: Architecture Digest Instead of Full Read

`bootstrap-core-policy.md` mandates reading full `ARCHITECTURE.md` content. For a 30KB file, this is ~8,000 tokens.

**Proposal:** Auto-generate an `ARCHITECTURE_DIGEST.md` (~500 tokens) during publishing that contains:
- Component list with 1-line descriptions
- Key file paths
- Data flow summary (3-line version)
- Pointer to full doc for deep dives

Agent reads the digest by default; expands to full doc only for architecture-heavy tasks (init-workspace-flow, large refactors).

---

## 2. CodeAct: Adaptive Bootstrap Instead of Rigid Gate

### Problem

The current 3-step prep is **invariant** — a one-line typo fix and a 50-file refactor both pay the same 12,000-token bootstrap cost. The bootstrap-core-policy enforces this explicitly: "MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE."

CodeAct's insight: agents should **interleave reasoning and action**, loading context as needed based on what they observe — not front-loading everything.

### Recommendation 2.1: Request-Adaptive Bootstrap

Classify the request **before** loading full context, then load proportionally:

```
Step 0: Classify request (from user message alone)
  ├─ TRIVIAL (typo, rename, config change) → Skip Prep 2, minimal Prep 1
  ├─ SMALL (1-2 files, clear scope) → Pointer-mode Prep 1, skip ARCHITECTURE.md
  ├─ MEDIUM (multi-file, single area) → Standard prep (current behavior)
  └─ LARGE (cross-cutting, multi-area) → Full prep + eager skill loading
```

**Implementation:** Move classification to `get_context_instructions()` server-side. Accept an optional `request_summary` parameter:

```python
@mcp.tool()
async def get_context_instructions(
    request_summary: str = "",  # Brief description of what agent will do
    complexity_hint: str = "auto",  # trivial|small|medium|large|auto
) -> str:
    complexity = classify_request(request_summary) if complexity_hint == "auto" else complexity_hint
    if complexity == "trivial":
        return bundle_minimal(routing_only=True)
    elif complexity == "small":
        return bundle_pointers(include_workflow_list=True)
    else:
        return bundle_full(current_behavior=True)
```

**Impact:** Trivial/small requests (estimated 40-60% of agent interactions) skip 70% of bootstrap overhead.

### Recommendation 2.2: Observation-Driven Skill Loading

Current workflow phases specify skills upfront. CodeAct pattern: let the agent **observe** what it needs.

**Current:**
```markdown
## Phase 5: Implementation
USE SKILL coding
USE SKILL testing
```

**Proposed:**
```markdown
## Phase 5: Implementation
AVAILABLE SKILLS: coding, testing, debugging, refactoring
LOAD ON: first code edit → coding; first test run → testing
```

The agent starts Phase 5 with zero skill tokens loaded. On first code edit action, the `coding` skill auto-loads. If the agent never runs tests (e.g., trivial fix), `testing` skill never loads.

**Implementation:** MCP-side middleware that intercepts tool calls and injects relevant skill content into the response when a skill's trigger condition is met. This is a **push model** vs. the current pull model.

### Recommendation 2.3: Streaming Context Injection

Instead of returning all bootstrap content in one response, stream it as the agent progresses:

```
Agent: get_context_instructions()
Server: [Core routing rules only — 800 tokens]
        [Hint: workflow selection available via ACQUIRE]

Agent: ACQUIRE coding-flow FROM KB
Server: [Workflow phases + Phase 1 skill — 600 tokens]
        [Hint: Phase 2 skills available when Phase 1 completes]

Agent: [completes Phase 1 discovery]
Agent: ACQUIRE phase-2-skills FROM KB
Server: [tech-specs + planning — 700 tokens]
```

**Impact:** Agent never holds more than ~2,000 tokens of instruction content at any point. Total tokens consumed is the same, but **peak context utilization drops by 60%**.

---

## 3. RLM: Recursive Instruction Refinement

### Problem

Instructions are authored at one level of detail and served verbatim. A 484-line requirements-authoring skill is served identically whether the agent needs the full process or just the output format spec. There's no recursive decomposition.

### Recommendation 3.1: Hierarchical Instruction Chunks

Structure each instruction as a recursive tree:

```
SKILL.md (Level 0 — 50 tokens)
├── Overview: what this skill does, when to use it
├── Interface: inputs, outputs, triggers
└── EXPAND for details

SKILL_DETAIL.md (Level 1 — 200 tokens)
├── Step-by-step process
├── Key constraints
└── EXPAND for examples/edge cases

SKILL_EXAMPLES.md (Level 2 — 400 tokens)
├── Concrete examples
├── Edge case handling
└── Anti-patterns
```

Agent receives Level 0 by default. If it needs more detail (uncertain, complex case), it recursively expands. Most interactions stop at Level 0 or 1.

**Implementation:**
- Split large skills into `SKILL.md` (overview), `DETAIL.md` (process), `EXAMPLES.md` (reference)
- Bundler returns Level 0 by default with expansion hints
- New tool: `expand_instruction(path, level)` returns next level

### Recommendation 3.2: Sub-Query Decomposition for Complex Workflows

For large tasks, the agent currently loads the full workflow and all phase skills. RLM pattern: decompose the workflow into sub-queries.

**Current:** Agent loads `coding-flow` (all 11 phases) + queries skills for each phase = 11+ MCP calls.

**Proposed:** Agent queries `coding-flow` with its specific task context. Server-side sub-LLM identifies relevant phases and returns only those:

```python
@mcp.tool()
async def get_workflow_plan(
    workflow: str,
    task_description: str,
    affected_files: list[str] = [],
) -> str:
    """Returns only the relevant phases for this specific task."""
    full_workflow = load_workflow(workflow)
    relevant_phases = await rlm_filter(
        content=full_workflow,
        query=f"Which phases are needed for: {task_description} affecting {affected_files}?"
    )
    return bundle_phases(relevant_phases)
```

**Impact:** A simple bug fix in `coding-flow` might skip Discovery (Phase 1), Tech Plan (Phase 2), and Review (Phase 3), going directly to Implementation. Saves ~2,000 tokens and 3 unnecessary round-trips.

### Recommendation 3.3: Instruction Compilation

Pre-process instruction trees into **compiled bundles** optimized for common request patterns:

| Pattern | Compiled Bundle | Tokens |
|---------|----------------|--------|
| `quick-fix` | routing + coding-skill-L0 + guardrails-summary | ~800 |
| `feature-impl` | routing + coding-flow-phases-1-5 + skills-L1 | ~3,000 |
| `init-project` | routing + init-workspace-flow-full + all-skills-L0 | ~2,500 |
| `debug` | routing + self-help-flow + debugging-skill-L2 | ~1,500 |

These are pre-computed during `rosetta-cli publish` and cached server-side. The agent receives one optimized bundle instead of assembling from multiple queries.

---

## 4. Server-Side Performance Optimizations

### Recommendation 4.1: Parallel Document Downloads in Bundler

**Current:** `Bundler.bundle()` downloads documents sequentially.

```python
# Current: O(n) sequential
for doc in documents:
    content = await download_content(doc)  # 50-200ms each
```

**Proposed:**
```python
# Parallel: O(1) with concurrency limit
contents = await asyncio.gather(
    *[download_content(doc) for doc in documents],
    return_exceptions=True
)
```

**Impact:** 10 documents: 500-2000ms → 50-200ms.

### Recommendation 4.2: RAGFlow SDK Async Wrapper

RAGFlow SDK calls are synchronous, blocking the event loop in the async MCP server.

```python
# Current: blocks event loop
docs = dataset.list_documents(page=1, page_size=1000)

# Proposed: run in thread pool
docs = await asyncio.to_thread(
    dataset.list_documents, page=1, page_size=1000
)
```

**Impact:** Unblocks event loop for concurrent MCP tool calls. Critical for multi-agent scenarios where multiple agents query simultaneously.

### Recommendation 4.3: Proactive Cache Warming

**Current:** Cache refreshes lazily on TTL expiry (300s). First request after expiry pays full latency.

**Proposed:** Background refresh at 80% TTL (240s). Cache serves stale data while refresh runs.

```python
async def get_cached(self, key):
    entry = self._cache.get(key)
    if entry and entry.age > self.ttl * 0.8:
        asyncio.create_task(self._refresh(key))  # Background refresh
    if entry and entry.age < self.ttl:
        return entry.value  # Serve (possibly stale) cached value
    return await self._refresh(key)  # Hard miss
```

**Impact:** Eliminates cold-cache latency spikes. Particularly important for `get_context_instructions()` which is called at session start.

### Recommendation 4.4: Content-Addressed Caching (ETag Pattern)

**Current:** Documents are re-fetched and re-bundled every 300s regardless of whether they changed.

**Proposed:** Hash document content during publishing. MCP server stores hash alongside cached content. On refresh, compare hashes before re-downloading content.

```python
# During publish: store content hash in document metadata
metadata = {"content_hash": hashlib.sha256(content).hexdigest()}

# During serve: skip re-download if hash matches
if cached_hash == current_hash:
    return cached_bundle  # No content download needed
```

**Impact:** After initial load, 95%+ of cache refreshes become hash-only checks (~10ms vs. ~500ms).

---

## 5. Publishing Pipeline Optimizations

### Recommendation 5.1: Parallel File Uploads

**Current:** Sequential `publish_file()` in loop. 10 files × 10-15s = 100-150s.

**Proposed:** Parallel uploads with concurrency limit:

```python
semaphore = asyncio.Semaphore(4)  # Max 4 concurrent uploads
async def upload_with_limit(file):
    async with semaphore:
        return await publish_file(file)

results = await asyncio.gather(*[upload_with_limit(f) for f in files])
```

**Impact:** 10 files: 150s → ~40s (4x speedup with concurrency=4).

### Recommendation 5.2: Incremental Publishing with Manifest

**Current:** Change detection queries RAGFlow per-file (keyword search + fallback scan). Expensive for large instruction sets.

**Proposed:** Maintain a local manifest file (`.rosetta-manifest.json`) with content hashes:

```json
{
  "instructions/r2/core/skills/coding/SKILL.md": {
    "hash": "a1b2c3d4...",
    "last_published": "2026-03-28T10:00:00Z",
    "ragflow_doc_id": "doc-123"
  }
}
```

Only files with changed hashes get uploaded. No RAGFlow queries for unchanged files.

**Impact:** Republishing 2 changed files out of 77: 77 API calls → 2 API calls.

### Recommendation 5.3: Compiled Bundle Pre-Generation

During `rosetta-cli publish`, pre-generate the compiled bundles from Recommendation 3.3:

```bash
rosetta publish --compile-bundles
```

This creates optimized bundles stored as special documents in RAGFlow, ready for instant serving without runtime assembly.

---

## 6. Context Window Efficiency

### Recommendation 6.1: Delta-Based Instruction Updates

When an agent re-fetches instructions (e.g., after context window compression), serve only the delta from last fetch:

```python
@mcp.tool()
async def get_instructions_delta(
    last_fetch_hash: str,  # Hash of last received bundle
    tags: list[str] = [],
) -> str:
    current = bundle(tags)
    if hash(current) == last_fetch_hash:
        return "<rosetta:unchanged />"
    return diff(last_bundle, current)  # Only changed portions
```

**Impact:** Context recovery after compression: ~4,000 tokens → ~200 tokens (if instructions haven't changed).

### Recommendation 6.2: Instruction Compression Hints

Add `compressible` and `compress_to` metadata to instructions:

```yaml
---
name: coding
compressible: true
compress_to: "Write clean, tested code. Follow existing patterns. Run tests before committing."
---
```

When the host LLM compresses context, it can use `compress_to` as the compressed representation instead of losing the instruction entirely or keeping it at full size.

### Recommendation 6.3: Workspace State Snapshots

For large tasks spanning multiple sessions, persist a compact workspace state:

```json
{
  "session_id": "abc-123",
  "workflow": "coding-flow",
  "current_phase": 5,
  "loaded_skills": ["coding", "testing"],
  "skill_hashes": {"coding": "x1y2z3", "testing": "a4b5c6"},
  "discovery_summary": "Modifying auth middleware in 3 files...",
  "plan_ref": "plans/AUTH-REFACTOR/PLAN.md"
}
```

Next session: load snapshot → verify hashes → resume at Phase 5 with zero redundant instruction fetching.

---

## 7. Agent Interaction Pattern Improvements

### Recommendation 7.1: Speculative Prefetch

When the agent selects a workflow, the MCP server can **speculatively prefetch** Phase 1 skills:

```python
async def query_instructions(tags=["coding-flow"]):
    workflow = await bundle(tags)
    # Speculatively cache Phase 1 skills
    asyncio.create_task(prefetch_skills(["load-context", "discovery"]))
    return workflow
```

When the agent requests Phase 1 skills, they're already cached. Zero latency.

### Recommendation 7.2: Batch Tool Calls

**Current:** Agent makes separate MCP calls for each instruction fetch.

**Proposed:** Support batch queries:

```python
@mcp.tool()
async def batch_acquire(
    tags_list: list[list[str]],  # Multiple tag queries
) -> str:
    results = await asyncio.gather(*[bundle(tags) for tags in tags_list])
    return combine_bundles(results)
```

**Impact:** Phase transitions requiring 2-3 skill loads: 3 round-trips → 1 round-trip.

### Recommendation 7.3: Context Budget Negotiation

Let the agent declare its remaining context budget, and have the server optimize accordingly:

```python
@mcp.tool()
async def get_context_instructions(
    available_tokens: int = 40000,  # Agent's remaining budget
    request_summary: str = "",
) -> str:
    if available_tokens < 5000:
        return bundle_minimal()  # Pointers only
    elif available_tokens < 15000:
        return bundle_compact()  # L0 summaries
    else:
        return bundle_full()    # Current behavior
```

---

## 8. Priority Matrix

| # | Recommendation | Effort | Impact | Priority |
|---|---------------|--------|--------|----------|
| 4.1 | Parallel document downloads | S | High | **P0** |
| 4.2 | RAGFlow async wrapper | S | High | **P0** |
| 1.1 | Instruction pointers | M | Very High | **P0** |
| 2.1 | Request-adaptive bootstrap | M | Very High | **P0** |
| 1.3 | Architecture digest | S | High | **P1** |
| 4.3 | Proactive cache warming | S | Medium | **P1** |
| 5.2 | Incremental publish manifest | M | High | **P1** |
| 3.1 | Hierarchical instruction chunks | L | Very High | **P1** |
| 7.2 | Batch tool calls | S | Medium | **P1** |
| 5.1 | Parallel file uploads | M | Medium | **P2** |
| 1.2 | Tiered context loading | M | High | **P2** |
| 2.2 | Observation-driven skill loading | L | High | **P2** |
| 4.4 | Content-addressed caching | M | Medium | **P2** |
| 6.1 | Delta-based updates | M | Medium | **P2** |
| 3.2 | Sub-query decomposition | L | High | **P3** |
| 3.3 | Instruction compilation | L | Very High | **P3** |
| 2.3 | Streaming context injection | L | High | **P3** |
| 6.2 | Compression hints | S | Low | **P3** |
| 6.3 | Workspace state snapshots | M | Medium | **P3** |
| 7.1 | Speculative prefetch | M | Medium | **P3** |
| 7.3 | Context budget negotiation | M | Medium | **P3** |

**Effort:** S = days, M = 1-2 weeks, L = 3+ weeks

---

## 9. Measurement Plan

To validate these recommendations, instrument:

| Metric | Current Baseline | Target | How to Measure |
|--------|-----------------|--------|----------------|
| Bootstrap tokens | ~12,000 | ~4,000 | Count tokens in `get_context_instructions()` response |
| Bootstrap latency | ~8s (est.) | ~2s | Server-side timing on prep step tools |
| Tokens per coding task | ~23,000 | ~12,000 | PostHog event: sum instruction tokens per session |
| MCP round-trips per task | ~8-12 | ~3-5 | PostHog event: count tool calls per session |
| Cache hit rate | Unknown | >90% | Redis/memory cache stats |
| Publish time (10 files) | ~150s | ~40s | CLI timing output |
| Time-to-first-code-edit | Unknown | <30s | PostHog: time from session start to first file write |

---

## Appendix: Paradigm Reference

### RLM (Recursive Language Model)
Pattern where a coordinating LLM decomposes large contexts into chunks, processes each with sub-LLM calls, and synthesizes results. Applied to Rosetta: instructions themselves can be recursively decomposed and served at the right granularity.

### CodeAct
Pattern where agents interleave code actions with observations, loading tools and context adaptively based on what they encounter. Applied to Rosetta: bootstrap should be adaptive, not a fixed gate — load context proportional to task complexity.

### Memory-by-Pointers
Pattern where instead of materializing full content into the context window, the system stores lightweight pointers (summaries, references) that can be dereferenced on demand. Applied to Rosetta: instructions served as pointers with on-demand expansion, not eager full-content bundles.
