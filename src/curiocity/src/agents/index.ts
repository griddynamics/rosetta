import { agentRegistry } from './registry';
import { MockAdapter } from './mock/adapter';
import { ClaudeCodeAdapter } from './claude-code/adapter';
import { CodexAdapter } from './codex/adapter';

/**
 * Agent layer entry (§5.1/§10). Registering a built-in = one line here (D5). The
 * mock is first-class (D10); `claude-code` (§10.1) and `codex` (§10.2) are the v1
 * real adapters (D11), both renderers of the same canonical specs.
 */
if (!agentRegistry.has('mock')) {
  agentRegistry.register(new MockAdapter());
}
if (!agentRegistry.has('claude-code')) {
  agentRegistry.register(new ClaudeCodeAdapter());
}
if (!agentRegistry.has('codex')) {
  agentRegistry.register(new CodexAdapter());
}

export { agentRegistry };
export * from './types';
export * from './launch';
export { MockAdapter } from './mock/adapter';
export { ClaudeCodeAdapter } from './claude-code/adapter';
export { CLAUDE_CODE_DEFAULT_PROFILE } from './claude-code/profile';
export { computeTranscriptPath, encodeCwd } from './claude-code/transcript-path';
export { CodexAdapter } from './codex/adapter';
export { CODEX_DEFAULT_PROFILE } from './codex/profile';
export { findFallbackRollout } from './codex/transcript';
export { assertCodexFlags, readCodexHelp } from './codex/preflight';
