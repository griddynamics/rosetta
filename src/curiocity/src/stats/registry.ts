import { Registry } from '../shared/registry';
import type { Stat } from './types';

/** Static registry of stats (§5.1, D5). Built-ins registered in `index.ts`. */
export const statRegistry = new Registry<Stat>('stat');
