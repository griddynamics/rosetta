import type { AgentProfile } from '../../config/schema';

/**
 * Built-in default `AgentProfile` for `codingagents["claude-code"]` (§5.2, §10.1).
 * The lowest-precedence layer (D13): a config `codingagents` entry overrides any of
 * these fields. Values are the validated live-experiment mechanics (§10.1):
 *
 * - **command/args**: `claude "<prompt>" --permission-mode auto --session-id <uuid>
 *   --settings <ctrlDir>/settings.json` (P1 interactive; P2 auto-permission; P9 fresh
 *   session id). **`auto` is the default** (USER RULING, P2/§10.1 — do not flip). Model
 *   caveat, live-observed: Haiku-class models don't support auto mode and raise recurring
 *   un-clearable "create file?" prompts → session hang; a config pinning such a model must
 *   override this field to `acceptEdits` per case/profile. The cheap tier avoids that
 *   entirely by using Sonnet 5 at low reasoning effort, which supports auto. The prompt is
 *   the launch argument (D15). The settings-file content is rendered by the adapter's
 *   `renderHooks`; this profile only names the flag/path.
 * - **envRemove**: strip `CLAUDECODE` + `CLAUDE_CODE*` (else claude runs as a nested
 *   child session and never persists a transcript) and `ANTHROPIC_AUTH_TOKEN` /
 *   `ANTHROPIC_BASE_URL` (harness-internal endpoint/auth overrides that must not leak
 *   into the agent). `CLAUDE_CONFIG_DIR` is intentionally NOT listed — it must remain
 *   unset so transcripts land in `~/.claude` and the agent's own stored auth is used
 *   (P9); the computed-fallback path assumes `~/.claude`. `ANTHROPIC_API_KEY` is
 *   deliberately NOT in this list: API-key forwarding is governed solely by the global
 *   `AGENT_API_KEY_ALLOWLIST` (in `orchestrator/env.ts`, applied by `filterAgentEnv`),
 *   which unconditionally keeps it. In CI — where there is no interactive OAuth session
 *   — the agent authenticates via that forwarded key instead of stored OAuth.
 * - **strategy `json-only`**: the on-disk trajectory + `Stop` hook drive the turn loop
 *   (P4); the screen is only fallback evidence, so no LLM screen-reads are made.
 * - **dialogPatterns**: deterministic clears for the known startup dialogs (trust
 *   folder / theme / MCP consent), sent as Enter-on-default (§6). These are NOT P3
 *   input injection — they are fixed keystrokes for noise dialogs.
 */
export const CLAUDE_CODE_DEFAULT_PROFILE: AgentProfile = {
  adapter: 'claude-code',
  command: 'claude',
  args: ['{prompt}', '--permission-mode', 'auto', '--session-id', '{sessionId}', '--settings', '{ctrlDir}/settings.json'],
  envRemove: ['CLAUDECODE', 'CLAUDE_CODE*', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'],
  strategy: 'json-only',
  readiness: { quietMs: 800 },
  // Bracketed paste is the single production submit path (§5.3 ruling): text is wrapped
  // in paste markers and Enter is a discrete follow-up write, so a typed answer is a
  // genuine submit (never a literal newline inside the composer). `enter` is the plain
  // fallback only, unused by v1 profiles.
  submit: 'paste+enter',
  stall: { quietMs: 2000 },
  freeze: { windowMs: 10_000 },
  dialogPatterns: [
    // Trust-folder safety check on first entry to a fresh workspace (observed live,
    // claude 2.1.198): "Quick safety check: Is this a project you created or one you
    // trust?" ... "1. Yes, I trust this folder" highlighted — Enter confirms.
    // `dialogPatterns` is re-checked on EVERY screen redraw for the whole session
    // (not just at startup, §6), so a bare "trust this folder" substring risks a
    // false positive if the agent's own assistant text ever discusses folder trust
    // in a sentence shaped like the option label. Anchor on BOTH the dialog's fixed
    // header AND the option text (in that order) — a combination real assistant
    // prose is exceedingly unlikely to reproduce verbatim.
    { pattern: 'Quick safety check[\\s\\S]*trust this folder', send: '\r' },
    // First-run theme picker (present only if a theme was never chosen); Enter accepts.
    { pattern: 'Choose (the|your)[^\\n]*theme', send: '\r' },
    // New-MCP-server consent (only when a workspace `.mcp.json` introduces a server).
    { pattern: 'trust the MCP server', send: '\r' },
  ],
};
