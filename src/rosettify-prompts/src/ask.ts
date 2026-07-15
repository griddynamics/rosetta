import { createInterface } from 'node:readline/promises';
import type { Readable, Writable } from 'node:stream';
import { colorsEnabled, createPalette } from './colors.js';
import type { OptimizeQuestionAsker } from './optimize.js';

/** Terminal asker for `--enable-questions`: prints a batch of questions and reads one answer each.
 * Within a batch the cursor can move with `<` (previous) and `>` (next); a final summary confirms
 * before answers are returned. An empty answer skips its question. Because `<`/`>` are navigation
 * commands they cannot be entered as literal answers. Streams are injectable so tests can drive it
 * without a TTY. */
export function createTerminalAsker(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): OptimizeQuestionAsker {
  // Color keyed off the output stream: a real TTY gets ANSI, injected PassThrough streams (tests)
  // get plain text so assertions stay stable.
  const c = createPalette(colorsEnabled(output as { isTTY?: boolean }));
  return async (questions, context) => {
    const rl = createInterface({ input, output });
    try {
      const n = questions.length;
      output.write(c.boldMagenta(`\nOptimizer asked ${n} question(s) after ${context.stepLabel}:`) + '\n');
      const answers: string[] = questions.map(() => '');
      let i = 0;
      for (;;) {
        if (i < n) {
          const question = questions[i]!;
          output.write(`\n${c.cyan(`[${i + 1}/${n}]`)} ${c.bold(question.question)}\n`);
          if (question.why) output.write(c.dim(`  why: ${question.why}`) + '\n');
          if (answers[i]) output.write(c.cyan(`  current: ${answers[i]}`) + '\n');
          const raw = await rl.question(c.dim('answer (Enter to keep/skip, < prev, > next): '));
          const trimmed = raw.trim();
          if (trimmed === '<') {
            i = Math.max(0, i - 1);
          } else if (trimmed === '>' || trimmed === '') {
            i += 1;
          } else {
            answers[i] = trimmed;
            i += 1;
          }
        } else {
          output.write('\n' + c.bold('Summary:') + '\n');
          for (let q = 0; q < n; q += 1) {
            const value = answers[q] ? c.green(answers[q]!) : c.yellow('(skipped)');
            output.write(`  ${q + 1}. ${questions[q]!.question} -> ${value}\n`);
          }
          const raw = await rl.question(c.dim('Enter to send, number to edit, < back: '));
          const trimmed = raw.trim();
          if (trimmed === '') {
            // Trailing newline separates the submitted summary from the next step's logs.
            // Written unconditionally (independent of color enablement).
            output.write('\n');
            return answers;
          }
          if (trimmed === '<') {
            i = n - 1;
          } else if (/^\d+$/.test(trimmed) && Number(trimmed) >= 1 && Number(trimmed) <= n) {
            i = Number(trimmed) - 1;
          }
          // anything else: stay in summary and re-prompt on the next loop iteration.
        }
      }
    } finally {
      rl.close();
    }
  };
}
