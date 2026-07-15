/**
 * Minimal LLM helper — calls Anthropic's OpenAI-compatibility endpoint
 * via the official openai Node SDK.
 *
 * No custom interface, no adapter class.  Provider (baseURL) and model are
 * configuration (env), so swapping to litellm / OpenRouter later needs no
 * code change — only env vars.
 *
 * Verified working:
 *   baseURL   : https://api.anthropic.com/v1   (Anthropic OpenAI-compat endpoint)
 *   QNA model : claude-haiku-4-5   (fast, cheap)
 *   Judge model: claude-sonnet-4-6 (workhorse)
 */

import OpenAI from 'openai';

export interface AskLlmOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  apiKey: string;
  /** Defaults to claude-haiku-4-5. Pass claude-sonnet-4-6 for judge calls. */
  model?: string;
}

export interface AskLlmResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

const BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.anthropic.com/v1';

/**
 * Send a single prompt (with optional system message) to the configured model
 * via the OpenAI-compat endpoint.
 */
export async function askLlm(opts: AskLlmOptions): Promise<AskLlmResult> {
  const { system, prompt, maxTokens = 1024, apiKey, model = 'claude-haiku-4-5' } = opts;

  const client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    defaultHeaders: {
      'anthropic-version': '2023-06-01',
    },
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  return {
    text: resp.choices[0]?.message?.content ?? '',
    inputTokens: resp.usage?.prompt_tokens,
    outputTokens: resp.usage?.completion_tokens,
  };
}
