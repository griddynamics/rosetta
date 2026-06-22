This file contains grep compatible list of very concise improvements, suggestions, large TODOs, etc. Do not create TOC, it should come from grep.

## REVIEW: Build dockerimage using UVX

**Status:** Proposed

**What**: src/ims-mcp-server/Dockerfile to use `uvx ims-mcp@<specific-version>` instead of `Python -m`. 

## REVIEW: Consent screen disabled in production (security evaluation needed)

**Status:** Postponed — evaluate per deployment context.

**What:** `auth/oauth.py` passes `require_authorization_consent=False` to `OAuthProxy`. FastMCP warns this removes confused deputy protection. For internal enterprise users behind Keycloak's own login screen, risk is low. For any public-facing or multi-tenant deployment, re-enable (`True`).

**Action:** Confirm the expected user audience. If only internal Grid Dynamics employees on private SSO, keep `False`. Otherwise enable.

## REVIEW: Split plugins from marketplace

**What:** Have plugins.json extracted from marketplace and marketplace just references the file/folder. To make it reusable.

## TODO: Hooks — lint-format-advisory deferred

**Status:** Deferred — moved from `docs/plans/2026-05-05-lint-format-advisory.md`

- **Strict plan-step dedup** — read `plans/<name>/plan.json` and skip the advisory if a syntax/type/lint/format step is already present; currently only time-based throttle prevents double-nudge.
- **Actual linter invocation** — replace the advisory with on-demand execution of language-appropriate tooling (per-extension map: `ruff` for `.py`, `eslint`/`tsc` for `.ts`/`.js`, `prettier` for `.css`/`.html`, etc.).
- **Session-long throttle TTL** — extend `src/hooks/src/runtime/throttle.ts` with a per-hook `ttlMs` option so `lint-format-advisory` can dedupe per `(session, filePath)` for the entire session lifetime, not just 5 seconds.


## TODO: Hooks adapter gaps (from QA 2026-05-23)

- **Gemini CLI hook validation** — https://github.com/griddynamics/rosetta/issues/93
- **Antigravity support docs update** — https://github.com/griddynamics/rosetta/issues/94 — AC: update ARCHITECTURE.md:28-29 and CONTEXT.md:107 within 1 sprint
- **Unknown-tool fallback live test** — https://github.com/griddynamics/rosetta/issues/95
- **Adapter as public consumable module** — https://github.com/griddynamics/rosetta/issues/96
- **OpenCode + JetBrains/Junie validation** — https://github.com/griddynamics/rosetta/issues/97
- **VS Code hook support** — https://github.com/griddynamics/rosetta/issues/98
