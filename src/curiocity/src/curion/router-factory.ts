import { z } from 'zod';
import { CuriocityError } from '../shared/errors';
import { FakeModelRouter, type GenerateTextRequest, type ModelRouter } from '../shared/model-router';
import type { Role } from '../shared/models';
import type { Usage } from '../shared/trajectory';
import type { TrialSpec } from '../shared/ipc';
import { MeteredRouter, RealModelRouter } from '../llm/router';
import type { CostMeter } from '../llm/cost-meter';

/**
 * Build the ModelRouter for a trial (runs in the child, §4/§12). Selection:
 *
 *   - `spec.fakeRouter` present  → scripted `FakeModelRouter` (token-free tests).
 *   - `models.fast` + `models.workhorse` present → real AI-SDK `RealModelRouter`.
 *     Models config is REQUIRED whenever a real router is constructed (§12).
 *   - otherwise → `UnavailableRouter`: throws ONLY when actually invoked, so a
 *     mock-only run that completes deterministically (no LLM call) stays exempt.
 *
 * The result is always wrapped in a `MeteredRouter` so every call is cost-metered.
 */
class UnavailableRouter implements ModelRouter {
  private fail(role: Role): never {
    throw new CuriocityError(
      `LLM call (role "${role}") required but no ModelRouter is available: configure ` +
        '`models` (fast + workhorse) and provider keys, or use a scene/case that ' +
        'completes without an LLM call.',
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

export function buildRouter(spec: TrialSpec, meter: CostMeter): ModelRouter {
  const models = spec.models;
  let inner: ModelRouter;
  if (spec.fakeRouter) {
    inner = new FakeModelRouter(spec.fakeRouter);
  } else if (models.fast && models.workhorse) {
    inner = new RealModelRouter({ models, keys: spec.keys });
  } else {
    inner = new UnavailableRouter();
  }
  return new MeteredRouter(inner, meter, models);
}
