import type { AgentProfile } from '../../config/schema';

/**
 * Built-in default `AgentProfile` for `codingagents["claude-code"]` (§5.2, §10.1).
 * The lowest-precedence layer (D13): a config `codingagents` entry overrides any of
 * these fields. Values are the validated live-experiment mechanics (§10.1):
 *
 * - **command/args**: `claude "<prompt>" --permission-mode acceptEdits --session-id <uuid>
 *   --settings <ctrlDir>/settings.json` (P1 interactive; P2 auto-permission; P9 fresh
 *   session id). `acceptEdits`, not `auto`: live-observed with cheap agent models that
 *   `auto` still raises recurring un-clearable "create file?" permission prompts that
 *   hang the session — `acceptEdits` clears them (§10.1). The prompt is the launch
 *   argument (D15). The settings-file content is rendered by the adapter's
 *   `renderHooks`; this profile only names the flag/path.
 * - **envRemove**: strip `CLAUDECODE` + `CLAUDE_CODE*` (else claude runs as a nested
 *   child session and never persists a transcript) and the `ANTHROPIC_*` key vars
 *   (else the agent bills the harness key). `CLAUDE_CONFIG_DIR` is intentionally NOT
 *   listed — it must remain unset so transcripts land in `~/.claude` and the agent's
 *   own stored auth is used (P9); the computed-fallback path assumes `~/.claude`.
 * - **strategy `json-only`**: the on-disk trajectory + `Stop` hook drive the turn loop
 *   (P4); the screen is only fallback evidence, so no LLM screen-reads are made.
 * - **dialogPatterns**: deterministic clears for the known startup dialogs (trust
 *   folder / theme / MCP consent), sent as Enter-on-default (§6). These are NOT P3
 *   input injection — they are fixed keystrokes for noise dialogs.
 */
export const CLAUDE_CODE_DEFAULT_PROFILE: AgentProfile = {
  adapter: 'claude-code',
  command: 'claude',
  args: ['{prompt}', '--permission-mode', 'acceptEdits', '--session-id', '{sessionId}', '--settings', '{ctrlDir}/settings.json'],
  envRemove: ['CLAUDECODE', 'CLAUDE_CODE*', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'],
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
