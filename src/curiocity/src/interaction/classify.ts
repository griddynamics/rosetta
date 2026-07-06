import { z } from 'zod';
import type { ModelRouter } from '../shared/model-router';
import type { StructuredQuestion } from '../agents/types';

/**
 * The four LLM calls the interaction engine makes (§6). Deterministic detection
 * always gates these (P4) — they run only when the trigger table says so, never on
 * ordinary tool activity (P3). `fast` classifies; `workhorse` composes replies.
 */

export const stopClassificationSchema = z.object({
  classification: z.enum(['question', 'done', 'working']),
});

export const screenClassificationSchema = z.object({
  kind: z.enum(['input-prompt', 'finished', 'thinking']),
});

const STOP_CLASSIFIER_SYSTEM =
  'You are classifying the FINAL assistant message of a coding-agent turn. Reply with ' +
  '"question" only if it is a genuine question to the user, "done" if the task is delivered ' +
  'or nothing is pending, or "working" if it is a mid-task continuation.';

const SCREEN_CLASSIFIER_SYSTEM =
  'You are reading a terminal screen of a coding-agent TUI. Reply "input-prompt" if it is ' +
  'waiting for user input, "finished" if the task is complete, or "thinking" if it is still working.';

export async function classifyStopMessage(
  router: ModelRouter,
  message: string | null,
): Promise<'question' | 'done' | 'working'> {
  const { object } = await router.generateObject(
    'fast',
    { system: STOP_CLASSIFIER_SYSTEM, prompt: message ?? '' },
    stopClassificationSchema,
  );
  return object.classification;
}

export async function classifyScreen(
  router: ModelRouter,
  snapshot: string,
): Promise<'input-prompt' | 'finished' | 'thinking'> {
  const { object } = await router.generateObject(
    'fast',
    { system: SCREEN_CLASSIFIER_SYSTEM, prompt: snapshot },
    screenClassificationSchema,
  );
  return object.kind;
}

export async function composeFreeTextAnswer(
  router: ModelRouter,
  qnaPolicy: string,
  question: string,
  snapshot: string,
): Promise<string> {
  const { text } = await router.generateText('workhorse', {
    system: qnaPolicy,
    prompt: `The coding agent asked:\n${question}\n\nCurrent screen:\n${snapshot}\n\nCompose a concise reply per the policy above.`,
  });
  return text;
}

export async function composeStructuredAnswer(
  router: ModelRouter,
  qnaPolicy: string,
  question: StructuredQuestion,
): Promise<string> {
  const options = question.options && question.options.length > 0 ? `\nOptions: ${question.options.join(', ')}` : '';
  const { text } = await router.generateText('workhorse', {
    system: qnaPolicy,
    prompt: `The coding agent asked a structured question:\n${question.question}${options}\n\nReply with the single best answer per the policy above.`,
  });
  return text;
}
