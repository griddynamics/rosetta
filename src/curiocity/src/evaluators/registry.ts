import { Registry } from '../shared/registry';
import type { Evaluator } from './types';

/** Static registry of evaluators (§5.1, D5). Built-ins registered in `index.ts`. */
export const evaluatorRegistry = new Registry<Evaluator>('evaluator');
