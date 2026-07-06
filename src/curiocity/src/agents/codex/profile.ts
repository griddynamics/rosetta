import type { AgentProfile } from '../../config/schema';

/**
 * Built-in default `AgentProfile` for `codingagents["codex"]` (§5.2, §10.2). The
 * D13 defaults layer (Part A): a top-level `codingagents` entry overrides it per-field.
 * Flags + behavior verified LIVE on codex-cli 0.142.2 (2026-07-02), which corrected
 * two points of the documented §10.2 launch (see the adapter header + the run report):
 *   1. `-c 'projects."<ws>".trust_level="trusted"'` does NOT suppress the folder-trust
 *      dialog on 0.142.2 AND it PERSISTS a `[projects.…]` entry to config.toml — so it
 *      is DROPPED here; the trust dialog is cleared by a `dialogPatterns` Enter instead.
 *   2. To honor P11 non-mutation the adapter isolates `CODEX_HOME` per trial (set in
 *      `buildLaunch`), so every codex write (trust state, rollout, config) lands in the
 *      throwaway home and the user's real `~/.codex` is never touched.
 *
 * - **command/args**: `codex "<prompt>" -a never --sandbox workspace-write
 *   --dangerously-bypass-hook-trust -c features.hooks=true`, PTY cwd = workspace.
 *     - `-a never` + `--sandbox workspace-write` = the auto-permission analog (P2).
 *     - `features.hooks=true` enables hooks so our injected `.codex/hooks.json` is
 *       honored; `--dangerously-bypass-hook-trust` lets it run without the interactive
 *       `/hooks` content-hash trust step (verified: SessionStart + Stop both fire).
 *   The prompt is the launch argument (D15). There is NO `--session-id` flag — the id
 *   comes from the SessionStart payload / rollout `session_meta` (§10.2).
 * - **envRemove**: empty — `OPENAI_API_KEY` is a legitimate, documented auth path
 *   (below) so it must NOT be stripped unconditionally (that would break auth for a
 *   user who has no `auth.json`). Codex authenticates via its own `auth.json`
 *   (symlinked into the isolated home) or `OPENAI_API_KEY` (P9 — the harness never
 *   manages agent auth). (m5-review R1) `buildLaunch` DOES conditionally strip an
 *   ambient `OPENAI_API_KEY`/`OPENAI_BASE_URL` from the launched env, but ONLY when
 *   `auth.json` exists and is being symlinked in — in that case a leftover key in the
 *   invoking shell (the common case for `contract:codex` / ad-hoc runs, which read the
 *   CURRENT process env and bypass §4's Curion-fork allow-list entirely) could
 *   otherwise silently redirect billing away from the ChatGPT-plan credits without
 *   ever breaking the API-key-only auth path (no `auth.json` → nothing is stripped).
 * - **strategy `hybrid`**: the on-disk rollout + `Stop` hook drive the turn loop (P4);
 *   the freeze watchdog + screen-read fallback are the backstop for the strict
 *   hook-validation "no Stop signal ever" case (§10.2, §18).
 * - **dialogPatterns**: clear the folder-trust dialog on Enter. (m5-review R1) The
 *   engine re-checks `dialogPatterns` against every screen redraw for the WHOLE
 *   session, not just at startup (same fact the M4 review hardened claude-code's
 *   trust-folder pattern against) — codex's own conversational reply text is
 *   rendered onto that same visible pane while the pattern stays armed, so a
 *   bare-header substring risks matching ordinary assistant prose that happens to
 *   discuss directory trust. Anchored on BOTH the dialog's fixed header AND its
 *   highlighted option text (captured verbatim via a live probe on 0.142.2, in that
 *   order), the same combination standard as claude-code's fix.
 * - **readiness/stall/freeze**: startup runs a trust dialog + MCP boot (~5-8s observed);
 *   the spinner animates continuously while working, so a settled/zero-change screen is
 *   a real signal (§6).
 */
export const CODEX_DEFAULT_PROFILE: AgentProfile = {
  adapter: 'codex',
  command: 'codex',
  args: [
    '{prompt}',
    '-a',
    'never',
    '--sandbox',
    'workspace-write',
    '--dangerously-bypass-hook-trust',
    '-c',
    'features.hooks=true',
  ],
  envRemove: [],
  strategy: 'hybrid',
  readiness: { quietMs: 1200 },
  // Bracketed paste is the single production submit path (§5.3 ruling): the codex-cli
  // composer reads a rapid `text\r` burst as a paste and inserts a newline instead of
  // submitting (verified live during the m6.5 qna-probe: the answer sat unsent in `›`
  // until the freeze watchdog fired). Wrapping the text in bracketed-paste markers and
  // sending Enter as a discrete follow-up write makes it a genuine submit.
  submit: 'paste+enter',
  stall: { quietMs: 2500 },
  freeze: { windowMs: 12_000 },
  dialogPatterns: [
    // Folder-trust dialog, captured verbatim live (codex 0.142.2, m5-review R1
    // probe): "Do you trust the contents of this directory? Working with untrusted
    // contents comes with higher risk of prompt injection. Trusting the directory
    // allows project-local config, hooks, and exec policies to load. › 1. Yes,
    // continue  2. No, quit  Press enter to continue". Enter accepts the highlighted
    // "Yes, continue". Anchored on BOTH the fixed header AND the option text (in
    // that order) — a combination ordinary assistant prose is exceedingly unlikely
    // to reproduce verbatim (same standard as claude-code's `dialogPatterns` fix).
    { pattern: 'Do you trust the contents of this directory[\\s\\S]*Yes, continue', send: '\r' },
  ],
};
