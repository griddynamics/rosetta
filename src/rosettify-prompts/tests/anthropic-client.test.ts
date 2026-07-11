import { describe, expect, it } from 'vitest';
import { createOptimizeClient, resolveAnthropicBaseURL } from '../src/anthropic-client.js';

describe('resolveAnthropicBaseURL', () => {
  it('uses the rosettify-specific base URL before generic Anthropic variables', () => {
    expect(
      resolveAnthropicBaseURL({
        ROSETTIFY_PROMPTS_BASE_URL: 'https://rosettify.example',
        ROSETTIFY_PROMPTS_ANTHROPIC_BASE_URL: 'https://legacy-rosettify.example',
        ANTHROPIC_BASE_URL: 'https://anthropic.example',
      }),
    ).toBe('https://rosettify.example');
  });

  it('falls back through the documented env precedence', () => {
    expect(
      resolveAnthropicBaseURL({
        ROSETTIFY_PROMPTS_ANTHROPIC_BASE_URL: 'https://legacy-rosettify.example',
        ANTHROPIC_BASE_URL: 'https://anthropic.example',
      }),
    ).toBe('https://legacy-rosettify.example');
    expect(resolveAnthropicBaseURL({ ANTHROPIC_BASE_URL: 'https://anthropic.example' })).toBe(
      'https://anthropic.example',
    );
    expect(resolveAnthropicBaseURL({})).toBeUndefined();
  });
});

describe('createOptimizeClient', () => {
  it('routes create() calls through stream().finalMessage() so large max_tokens values are safe', async () => {
    const streamCalls: unknown[] = [];
    const finalMessage = { content: [{ type: 'text', text: 'streamed result' }], stop_reason: 'end_turn' };
    const client = createOptimizeClient({
      messages: {
        stream(params) {
          streamCalls.push(params);
          return { finalMessage: async () => finalMessage };
        },
      },
    });

    const params = {
      model: 'claude-test',
      max_tokens: 32000,
      system: 'system prompt',
      messages: [{ role: 'user' as const, content: 'hello' }],
    };
    const result = await client.messages.create(params);

    expect(streamCalls).toEqual([params]);
    expect(result).toBe(finalMessage);
  });

  it('routes beta requests through beta.messages.stream()', async () => {
    const normalCalls: unknown[] = [];
    const betaCalls: unknown[] = [];
    const finalMessage = { content: [{ type: 'text', text: 'beta streamed result' }], stop_reason: 'end_turn' };
    const client = createOptimizeClient({
      messages: {
        stream(params) {
          normalCalls.push(params);
          return { finalMessage: async () => ({ content: [{ type: 'text', text: 'wrong route' }] }) };
        },
      },
      beta: {
        messages: {
          stream(params) {
            betaCalls.push(params);
            return { finalMessage: async () => finalMessage };
          },
        },
      },
    });

    const params = {
      model: 'claude-test',
      max_tokens: 32000,
      betas: ['thinking-token-count-2026-05-13'],
      system: 'system prompt',
      messages: [{ role: 'user' as const, content: 'hello' }],
    };
    const result = await client.messages.create(params);

    expect(normalCalls).toEqual([]);
    expect(betaCalls).toEqual([params]);
    expect(result).toBe(finalMessage);
  });
});
