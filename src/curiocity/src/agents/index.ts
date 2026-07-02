import { agentRegistry } from './registry';
import { MockAdapter } from './mock/adapter';

/**
 * Agent layer entry (§5.1/§10). Registering a built-in = one line here (D5). Real
 * adapters (`claude-code`, `codex`) land in M3; the mock is first-class (D10).
 */
if (!agentRegistry.has('mock')) {
  agentRegistry.register(new MockAdapter());
}

export { agentRegistry };
export * from './types';
export * from './launch';
export { MockAdapter } from './mock/adapter';
