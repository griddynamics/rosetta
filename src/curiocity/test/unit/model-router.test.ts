import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { FakeModelRouter, ScriptExhaustedError } from '../../src/shared/model-router';
import { makeUsage } from '../../src/shared/trajectory';

const schema = z.object({ classification: z.enum(['question', 'done', 'working']) });

describe('FakeModelRouter (test util)', () => {
  it('returns scripted entries in order and logs calls', async () => {
    const r = new FakeModelRouter({
      entries: [
        { text: 'answer one' },
        { object: { classification: 'done' } },
      ],
    });
    const a = await r.generateText('workhorse', { prompt: 'q1' });
    expect(a.text).toBe('answer one');
    const b = await r.generateObject('fast', { prompt: 'q2' }, schema);
    expect(b.object.classification).toBe('done');
    expect(r.isExhausted()).toBe(true);
    expect(r.calls.map((c) => c.kind)).toEqual(['text', 'object']);
    expect(r.calls.map((c) => c.role)).toEqual(['workhorse', 'fast']);
  });

  it('throws when the script is exhausted (unscripted / P3-violating call)', async () => {
    const r = new FakeModelRouter({ entries: [] });
    await expect(r.generateText('fast', { prompt: 'x' })).rejects.toBeInstanceOf(ScriptExhaustedError);
  });

  it('enforces role and kind expectations when set', async () => {
    const rRole = new FakeModelRouter({ entries: [{ role: 'workhorse', text: 'x' }] });
    await expect(rRole.generateText('fast', { prompt: 'x' })).rejects.toBeInstanceOf(ScriptExhaustedError);

    const rKind = new FakeModelRouter({ entries: [{ kind: 'object', object: { classification: 'done' } }] });
    await expect(rKind.generateText('fast', { prompt: 'x' })).rejects.toBeInstanceOf(ScriptExhaustedError);
  });

  it('validates generateObject output against the caller schema', async () => {
    const r = new FakeModelRouter({ entries: [{ object: { classification: 'nope' } }] });
    await expect(r.generateObject('fast', { prompt: 'x' }, schema)).rejects.toBeInstanceOf(ScriptExhaustedError);
  });

  it('reports usage (defaults to zero tokens)', async () => {
    const r = new FakeModelRouter({ entries: [{ text: 'x', usage: makeUsage({ input: 5, output: 7 }) }, { text: 'y' }] });
    expect((await r.generateText('fast', { prompt: '' })).usage).toMatchObject({ input: 5, output: 7 });
    expect((await r.generateText('fast', { prompt: '' })).usage).toMatchObject({ input: 0, output: 0 });
  });
});
