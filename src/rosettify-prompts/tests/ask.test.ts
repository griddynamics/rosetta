import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createTerminalAsker } from '../src/ask.js';
import type { OptimizeQuestion } from '../src/optimize.js';

const QUESTION_PROMPT = 'answer (Enter to keep/skip, < prev, > next): ';
const SUMMARY_PROMPT = 'Enter to send, number to edit, < back: ';

const TWO_QUESTIONS: OptimizeQuestion[] = [
  { id: 'q1', question: 'First question?', why: 'because' },
  { id: 'q2', question: 'Second question?' },
];

/** Drive the asker reactively: feed the next queued line only once a prompt (question or summary)
 * appears, so each response answers exactly the prompt that solicited it. A single up-front write
 * would race the reader subscribing to the next prompt. */
async function run(questions: OptimizeQuestion[], responses: string[]) {
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks: string[] = [];
  const queue = [...responses];
  output.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    chunks.push(text);
    if (text.includes(QUESTION_PROMPT) || text.includes(SUMMARY_PROMPT)) {
      input.write(`${queue.shift() ?? ''}\n`);
    }
  });
  const asker = createTerminalAsker(input, output);
  const answers = await asker(questions, { step: 'compression', stepLabel: 'Compression' });
  return { answers, printed: chunks.join('') };
}

describe('createTerminalAsker', () => {
  it('answers every question then Enter at the summary returns them (with header + why)', async () => {
    const { answers, printed } = await run(TWO_QUESTIONS, ['my answer', 'second answer', '']);
    expect(answers).toEqual(['my answer', 'second answer']);
    expect(printed).toContain('Optimizer asked 2 question(s) after Compression:');
    expect(printed).toContain('First question?');
    expect(printed).toContain('why: because');
    expect(printed).toContain('Second question?');
    expect(printed).toContain(QUESTION_PROMPT);
    expect(printed).toContain(SUMMARY_PROMPT);
    // An extra blank line is written after the summary is confirmed, so the next step's logs
    // are visually separated from the summary.
    expect(printed.endsWith(`${SUMMARY_PROMPT}\n`)).toBe(true);
  });

  it('produces no ANSI escape sequences on a non-TTY output stream', async () => {
    const { printed } = await run(TWO_QUESTIONS, ['my answer', 'second answer', '']);
    // Literal `[` from the [i/N] counters is expected; only ANSI escapes (ESC [) must be absent.
    expect(printed).not.toContain('\x1b[');
  });

  it('< goes back to a previous question and the revised answer wins', async () => {
    // q1='first', then '<' returns to q1, revise to 'revised', then answer q2='second', send.
    const { answers, printed } = await run(TWO_QUESTIONS, ['first', '<', 'revised', 'second', '']);
    expect(answers).toEqual(['revised', 'second']);
    // Revisiting shows the prior answer as the current value.
    expect(printed).toContain('current: first');
  });

  it('> skips forward keeping the answer empty (skipped)', async () => {
    const { answers } = await run(TWO_QUESTIONS, ['>', 'answer2', '']);
    expect(answers).toEqual(['', 'answer2']);
  });

  it('at the summary a question number re-opens that question and the edit appears in the result', async () => {
    // Answer both, then pick "1" at the summary to edit q1, revise it, '>' to keep q2, then send.
    const { answers } = await run(TWO_QUESTIONS, ['a1', 'a2', '1', 'edited', '>', '']);
    expect(answers).toEqual(['edited', 'a2']);
  });

  it('< at the first question stays put without underflowing', async () => {
    const { answers } = await run(TWO_QUESTIONS, ['<', 'a1', 'a2', '']);
    expect(answers).toEqual(['a1', 'a2']);
  });

  it('invalid summary input re-prompts, then Enter sends', async () => {
    const { answers, printed } = await run(TWO_QUESTIONS, ['a1', 'a2', 'nope', '']);
    expect(answers).toEqual(['a1', 'a2']);
    // The summary prompt is shown again after the invalid entry.
    const summaryPrompts = printed.split(SUMMARY_PROMPT).length - 1;
    expect(summaryPrompts).toBeGreaterThanOrEqual(2);
  });

  it('the summary shows (skipped) for skipped questions and the text for answered ones', async () => {
    const { printed } = await run(TWO_QUESTIONS, ['answered1', '', '']);
    expect(printed).toContain('1. First question? -> answered1');
    expect(printed).toContain('2. Second question? -> (skipped)');
  });
});
