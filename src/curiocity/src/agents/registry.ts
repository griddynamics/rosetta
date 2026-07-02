import { Registry } from '../shared/registry';
import type { AgentAdapter } from './types';

/** Static agent-adapter registry (§5.1, D5). Built-ins registered in `index.ts`. */
export const agentRegistry = new Registry<AgentAdapter>('agent');
