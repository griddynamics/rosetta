import { combinerRegistry } from './registry';
import { gatedMean } from './gated-mean';

/** Combiner layer entry (§5.1/§5.4). Default + only built-in for v1: `gated-mean`. */
if (!combinerRegistry.has('gated-mean')) combinerRegistry.register(gatedMean);

export { combinerRegistry };
export * from './types';
export * from './gated-mean';
