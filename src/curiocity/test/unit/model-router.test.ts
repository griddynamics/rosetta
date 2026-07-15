import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { FakeModelRouter, perplexityLevel, ScriptExhaustedError } from '../../src/shared/model-router';
import { makeUsage } from '../../src/shared/trajectory';

const schema = z.object({ classification: z.enum(['question', 'done', 'working']) });

describe('perplexityLevel helper (§5.4)', () => {
  it('near-certain tokens (logprob 0) → 0', () => {
    expect(perplexityLevel([0, 0, 0])).toBe(0);
  });

  it('mean logprob −ln2 → PPL 2 → 100×(1 − 1/2) = 50', () => {
    expect(perplexityLevel([-Math.log(2), -Math.log(2)])).toBe(50);
  });

  it('mean logprob −ln4 → PPL 4 → 100×(1 − 1/4) = 75', () => {
    expect(perplexityLevel([-Math.log(4)])).toBe(75);
  });

  it('averages the token logprobs (−ln2 and −ln8 → mean −ln4 → 75)', () => {
    expect(perplexityLevel([-Math.log(2), -Math.log(8)])).toBe(75);
  });

  it('empty input → 0 (no uncertainty signal)', () => {
    expect(perplexityLevel([])).toBe(0);
  });

  it('rounds a raw value with >2 decimals to exactly 2 decimals', () => {
    // mean −0.5 → PPL exp(0.5) → level 100×(1 − 1/PPL) = 39.346934… → rounds to 39.35.
    expect(perplexityLevel([-0.5])).toBe(39.35);
  });
});

describe('FakeModelRouter perplexity/model plumbing (§5.4)', () => {
  const objSchema = z.object({ ok: z.boolean() });

  it('computes perplexityLevel from scripted logprobs and returns the model id', async () => {
    const r = new FakeModelRouter({
      entries: [{ object: { ok: true }, logprobs: [-Math.log(2), -Math.log(2)], model: 'openai/x' }],
    });
    const res = await r.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBe(50);
    expect(res.model).toBe('openai/x');
  });

  it('returns a pre-computed perplexityLevel when logprobs are not supplied', async () => {
    const r = new FakeModelRouter({ entries: [{ object: { ok: true }, perplexityLevel: 33 }] });
    const res = await r.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBe(33);
  });

  it('omits perplexityLevel when neither logprobs nor perplexityLevel are scripted', async () => {
    const r = new FakeModelRouter({ entries: [{ object: { ok: true } }] });
    const res = await r.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBeUndefined();
    expect(res.model).toBeUndefined();
  });
});

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
