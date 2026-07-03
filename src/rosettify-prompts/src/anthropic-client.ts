import { config as loadDotenv } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import path from 'node:path';

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
  return new Anthropic({ apiKey });
}
