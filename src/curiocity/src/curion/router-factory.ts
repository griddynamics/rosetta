import { z } from 'zod';
import { CuriocityError } from '../shared/errors';
import { FakeModelRouter, type GenerateTextRequest, type ModelRouter } from '../shared/model-router';
import type { Role } from '../shared/models';
import type { Usage } from '../shared/trajectory';
import type { TrialSpec } from '../shared/ipc';

/**
 * Build the ModelRouter for a trial (runs in the child, §4). M2: only the scripted
 * `FakeModelRouter` exists — the real AI-SDK router (`llm/`) is M3.
 *
 * When no `fakeRouter` is supplied we return an `UnavailableRouter` that throws
 * ONLY when a method is actually invoked. This lets a deterministic scene (one the
 * harness completes without any LLM call — e.g. via a `task_complete` marker) run
 * end-to-end from the CLI with zero tokens, while any run that truly needs a
 * classification/reply fails loudly instead of hanging.
 */
class UnavailableRouter implements ModelRouter {
  private fail(role: Role): never {
    throw new CuriocityError(
      `LLM call (role "${role}") required but no ModelRouter is available: the real LLM layer ` +
        'is M3. Provide a fakeRouter for M2, or use a scene that completes deterministically.',
      'NO_ROUTER',
    );
  }
  async generateText(role: Role, _req: GenerateTextRequest): Promise<{ text: string; usage: Usage }> {
    this.fail(role);
  }
  async generateObject<T>(
    role: Role,
    _req: GenerateTextRequest,
    _schema: z.ZodType<T>,
  ): Promise<{ object: T; usage: Usage }> {
    this.fail(role);
  }
}

export function buildRouter(spec: TrialSpec): ModelRouter {
  if (spec.fakeRouter) return new FakeModelRouter(spec.fakeRouter);
  return new UnavailableRouter();
}
