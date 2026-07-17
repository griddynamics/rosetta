import { evaluatorRegistry } from './registry';
import { fileExists } from './file-exists';
import { command } from './command';
import { trajectoryCheck } from './trajectory-check';
import { llmJudge } from './llm-judge';
import { external } from './external';
import { hookTranscriptCheck } from './hook-transcript-check';
import { manualQaCheck } from './manual-qa-check';

/**
 * Evaluator layer entry (§5.1/§11). Registering a built-in = one line here (D5).
 * The §11 built-ins: file-exists, command, trajectory-check, llm-judge, external,
 * hook-transcript-check, manual-qa-check.
 */
if (!evaluatorRegistry.has('file-exists')) evaluatorRegistry.register(fileExists);
if (!evaluatorRegistry.has('command')) evaluatorRegistry.register(command);
if (!evaluatorRegistry.has('trajectory-check')) evaluatorRegistry.register(trajectoryCheck);
if (!evaluatorRegistry.has('llm-judge')) evaluatorRegistry.register(llmJudge);
if (!evaluatorRegistry.has('external')) evaluatorRegistry.register(external);
if (!evaluatorRegistry.has('hook-transcript-check'))
  evaluatorRegistry.register(hookTranscriptCheck);
if (!evaluatorRegistry.has('manual-qa-check')) evaluatorRegistry.register(manualQaCheck);

export { evaluatorRegistry };
export * from './types';
export * from './file-exists';
export * from './command';
export * from './trajectory-check';
export * from './llm-judge';
export * from './external';
export * from './hook-transcript-check';
export * from './manual-qa-check';
