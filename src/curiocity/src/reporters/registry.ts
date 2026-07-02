import { Registry } from '../shared/registry';
import type { Reporter } from './types';

/** Static registry of reporters (§5.1, D5). Built-ins registered in `index.ts`. */
export const reporterRegistry = new Registry<Reporter>('reporter');
