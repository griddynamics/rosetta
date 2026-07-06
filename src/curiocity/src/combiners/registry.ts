import { Registry } from '../shared/registry';
import type { Combiner } from './types';

/** Static registry of combiners (§5.1, D5/D6). Built-ins registered in `index.ts`. */
export const combinerRegistry = new Registry<Combiner>('combiner');
