import { config as loadDotenv } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import path from 'node:path';
import type { OptimizeClient, OptimizeContent, OptimizeResponse } from './optimize.js';
import type { ThinkingEffort } from './types.js';

export interface StreamingAnthropicClient {
  messages: {
    stream(params: {
      model: string;
      max_tokens: number;
      betas?: string[];
      output_config?: { effort?: ThinkingEffort };
      system?: OptimizeContent;
      messages: Array<{ role: 'user' | 'assistant'; content: OptimizeContent }>;
    }): { finalMessage(): Promise<OptimizeResponse> };
    /** Used only to derive reasoning-token counts; see optimize.ts's deriveReasoningTokens. */
    countTokens?(params: {
      model: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    }): Promise<{ input_tokens: number }>;
  };
  beta?: {
    messages: {
      stream(params: {
        model: string;
        max_tokens: number;
        betas?: string[];
        output_config?: { effort?: ThinkingEffort };
        system?: OptimizeContent;
        messages: Array<{ role: 'user' | 'assistant'; content: OptimizeContent }>;
      }): { finalMessage(): Promise<OptimizeResponse> };
    };
  };
}

// The Anthropic SDK refuses non-streaming calls whose max_tokens implies more
// than 10 minutes of generation (see calculateNonstreamingTimeout in the SDK
// client), which optimize's mandatory stage+reviewer passes can exceed on
// larger prompts. Route optimize calls through .stream().finalMessage()
// instead of .create() so any max-output-tokens value is safe to request.
export function createOptimizeClient(client: StreamingAnthropicClient): OptimizeClient {
  return {
    messages: {
      create(params) {
        if (params.betas?.length && client.beta?.messages) {
          return client.beta.messages.stream(params).finalMessage();
        }
        return client.messages.stream(params).finalMessage();
      },
      countTokens: client.messages.countTokens?.bind(client.messages),
    },
  };
}

export function resolveAnthropicBaseURL(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    env.ROSETTIFY_PROMPTS_BASE_URL ||
    env.ROSETTIFY_PROMPTS_ANTHROPIC_BASE_URL ||
    env.ANTHROPIC_BASE_URL ||
    undefined
  );
}

export function createAnthropicClient(): Anthropic {
  // Resolved from the current working directory, like `--evals` and `--out`,
  // so this works the same whether you're running from an npx install or a
  // checkout of this repo: `.env` lives next to wherever you run the command.
  loadDotenv({ path: path.join(process.cwd(), '.env') });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Put it in a .env file in the current directory ' +
        '(see env.template), or export ANTHROPIC_API_KEY in your shell.',
    );
  }
  const baseURL = resolveAnthropicBaseURL();
  return new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
}
