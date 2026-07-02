import { agentRegistry } from './registry';
import { MockAdapter } from './mock/adapter';
import { ClaudeCodeAdapter } from './claude-code/adapter';

/**
 * Agent layer entry (§5.1/§10). Registering a built-in = one line here (D5). The
 * mock is first-class (D10); `claude-code` is a real v1 adapter (§10.1). Codex is a
 * future milestone behind the same interface (D11).
 */
if (!agentRegistry.has('mock')) {
  agentRegistry.register(new MockAdapter());
}
if (!agentRegistry.has('claude-code')) {
  agentRegistry.register(new ClaudeCodeAdapter());
}

export { agentRegistry };
export * from './types';
export * from './launch';
export { MockAdapter } from './mock/adapter';
export { ClaudeCodeAdapter } from './claude-code/adapter';
export { CLAUDE_CODE_DEFAULT_PROFILE } from './claude-code/profile';
export { computeTranscriptPath, encodeCwd } from './claude-code/transcript-path';
