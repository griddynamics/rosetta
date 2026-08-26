import { performance } from 'node:perf_hooks';
import { describe, expect, test } from 'vitest';
import { DANGEROUS_BASH, DANGEROUS_PATHS } from '../src/hooks/dangerous-actions/patterns';
import { evaluateDangerous } from '../src/hooks/dangerous-actions/evaluate';
import type { HookContext } from '../src/runtime/types';

/**
 * Scaling-fix characterization suite for the dangerous-action matchers that shared the
 * unbounded-rescan defect fixed for `git-branch-delete` in #320 (see that pattern's own
 * suite in git-branch-delete.test.ts).
 *
 * EVERY expectation here was derived from the PRE-CHANGE matcher and is pinned so the
 * refactor cannot widen or narrow detection. Note the separator sets DIFFER per family
 * and are deliberately preserved:
 *   - rm / aws / kubectl / dd / curl: the window is bounded by LINE TERMINATORS only,
 *     so `;`, `&&` and `|` do NOT isolate and must keep not isolating.
 *   - dropdb: the window is bounded by QUOTES only.
 *   - sql-*: the window is bounded by `;` only; CR/LF do NOT isolate.
 *   - git-force-push: NOTHING isolates — the window is the whole input.
 */

const patternById = (id: string): RegExp =>
  DANGEROUS_BASH.find((pattern) => pattern.id === id)!.re;

const bashCtx = (command: string): HookContext => ({
  ide: 'claude-code',
  event: 'PreToolUse',
  toolKind: 'bash',
  toolName: 'Bash',
  filePath: '',
  cwd: '/proj',
  sessionId: null,
  toolInput: { command },
});

// PreToolUse runs before every Bash tool call, so a pathological matcher delays every
// command. Budget matches the one #320 introduced for git-branch-delete.
const writeCtx = (filePath: string): HookContext => ({
  ide: 'claude-code',
  event: 'PreToolUse',
  toolKind: 'write',
  toolName: 'Write',
  filePath,
  cwd: '/proj',
  sessionId: null,
  toolInput: { file_path: filePath, content: 'x' },
});

const LATENCY_BUDGET_MS = 250;
const ADVERSARIAL_REPEATS = 16000;

describe('rm-rf-recursive matcher shape', () => {
  test.each([
    ["later candidate in same segment", "rm a pad pad pad pad pad pad rm -rf b", true],
    ["flag on next line via trailing \\s (LF)", "rm -r a\n-f b", true],
    ["flag on next line via trailing \\s (CRLF)", "rm -r a\r\n-f b", false],
    ["flag on next line via trailing \\s (CR)", "rm -r a\r-f b", true],
    ["flag two tokens past LF", "rm -r a\nx -f b", false],
    ["flag two tokens past CRLF", "rm -r a\r\nx -f b", false],
    ["flag past U+2028", "rm -r a\u2028x -f b", false],
    ["flag past U+2029", "rm -r a\u2029x -f b", false],
    ["flags combine across ;", "rm -r a; -f b", true],
    ["flags combine across &&", "rm -r a && -f b", true],
    ["flags combine across |", "rm -r a | -f b", true],
    ["far apart flags", "rm -r a pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad -f", true],
    ["second line dangerous", "rm a\nrm -rf b", true],
    ["second line dangerous after U+2028", "rm a\u2028rm -rf b", true],
    ["safe", "rm a b", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('rm-rf-recursive').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("rm a pad pad pad pad pad pad rm -rf b"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[rm-rf-recursive]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1732 ms through this same path; post-change 3.0 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("rm a"));
    }

    const command = "rm a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('rm-rf-root matcher shape', () => {
  test.each([
    ["later candidate", "rm a pad pad pad pad pad pad rm -rf /", true],
    ["second line dangerous", "rm a\nrm -rf /", true],
    ["second line dangerous after U+2028", "rm a\u2028rm -rf /", true],
    ["flags combine across ;", "rm -r a; -f /", true],
    ["root target on next line", "rm -rf a\n/ x", true],
    ["safe", "rm -rf ./a", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('rm-rf-root').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("rm a pad pad pad pad pad pad rm -rf /"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[rm-rf-root]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1738 ms through this same path; post-change 2.6 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("rm a"));
    }

    const command = "rm a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('rm-rf-home matcher shape', () => {
  test.each([
    ["later candidate", "rm a pad pad pad pad pad pad rm -rf ~", true],
    ["second line dangerous", "rm a\nrm -rf $HOME", true],
    ["second line dangerous after U+2028", "rm a\u2028rm -rf $HOME", true],
    ["flags combine across ;", "rm -r a; -f ~", true],
    ["safe", "rm -rf ./a", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('rm-rf-home').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("rm a pad pad pad pad pad pad rm -rf ~"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[rm-rf-home]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1727 ms through this same path; post-change 2.5 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("rm a"));
    }

    const command = "rm a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('aws-s3-rm-recursive matcher shape', () => {
  test.each([
    ["later candidate in same segment", "aws s3 rm a aws s3 rm b --recursive", true],
    ["LF between aws and s3", "aws\ns3 rm b --recursive", true],
    ["CRLF between aws and s3", "aws\r\ns3 rm b --recursive", true],
    ["CR between aws and s3", "aws\rs3 rm b --recursive", true],
    ["LF between s3 and rm", "aws s3\nrm b --recursive", true],
    ["CRLF between s3 and rm", "aws s3\r\nrm b --recursive", true],
    ["CR between s3 and rm", "aws s3\rrm b --recursive", true],
    ["spaced LF in both gaps", "aws \n s3 \n rm b --recursive", true],
    ["U+2028 between aws and s3", "aws\u2028s3 rm b --recursive", true],
    ["flag combines across ;", "aws s3 rm a; --recursive", true],
    ["flag combines across &&", "aws s3 rm a && --recursive", true],
    ["flag combines across |", "aws s3 rm a | --recursive", true],
    ["flag isolated by LF", "aws s3 rm a\n--recursive", false],
    ["flag isolated by CRLF", "aws s3 rm a\r\n--recursive", false],
    ["flag isolated by CR", "aws s3 rm a\r--recursive", false],
    ["flag isolated by U+2028", "aws s3 rm a\u2028--recursive", false],
    ["second line dangerous", "aws s3 rm a\naws s3 rm --recursive", true],
    ["second line dangerous after U+2028", "aws s3 rm a\u2028aws s3 rm --recursive", true],
    ["far apart flag", "aws s3 rm pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad --recursive", true],
    ["safe", "aws s3 rm a", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('aws-s3-rm-recursive').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("aws s3 rm a aws s3 rm b --recursive"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[aws-s3-rm-recursive]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 5708 ms through this same path; post-change 6.4 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("aws s3 rm a"));
    }

    const command = "aws s3 rm a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('kubectl-delete-prod matcher shape', () => {
  test.each([
    ["later candidate in same segment", "kubectl delete pod kubectl delete --all", true],
    ["LF between kubectl and delete", "kubectl\ndelete pod --all", true],
    ["CRLF between kubectl and delete", "kubectl\r\ndelete pod --all", true],
    ["CR between kubectl and delete", "kubectl\rdelete pod --all", true],
    ["spaced LF", "kubectl \n delete pod --all", true],
    ["U+2028 between kubectl and delete", "kubectl\u2028delete pod --all", true],
    ["flag combines across ;", "kubectl delete pod; --all", true],
    ["flag combines across &&", "kubectl delete pod && --all", true],
    ["flag combines across |", "kubectl delete pod | --all", true],
    ["flag isolated by LF", "kubectl delete pod\n--all", false],
    ["flag isolated by CRLF", "kubectl delete pod\r\n--all", false],
    ["flag isolated by CR", "kubectl delete pod\r--all", false],
    ["second line dangerous", "kubectl delete a\nkubectl delete --all", true],
    ["second line dangerous after U+2028", "kubectl delete a\u2028kubectl delete --all", true],
    ["far apart flag", "kubectl delete pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad --all", true],
    ["safe", "kubectl delete pod x", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('kubectl-delete-prod').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("kubectl delete pod kubectl delete --all"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[kubectl-delete-prod]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1953 ms through this same path; post-change 9.6 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("kubectl delete a"));
    }

    const command = "kubectl delete a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('dd-of-dev matcher shape', () => {
  test.each([
    ["later candidate in same segment", "dd if=a dd of=/dev/sda", true],
    ["target combines across ;", "dd a; of=/dev/sda", true],
    ["target combines across &&", "dd a && of=/dev/sda", true],
    ["target isolated by LF", "dd a\nof=/dev/sda", false],
    ["target isolated by CRLF", "dd a\r\nof=/dev/sda", false],
    ["target isolated by CR", "dd a\rof=/dev/sda", false],
    ["target isolated by U+2028", "dd a\u2028of=/dev/sda", false],
    ["second line dangerous", "dd a\ndd of=/dev/sda", true],
    ["second line dangerous after U+2028", "dd a\u2028dd of=/dev/sda", true],
    ["far apart target", "dd pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad of=/dev/sda", true],
    ["safe", "dd if=a of=./b", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('dd-of-dev').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("dd if=a dd of=/dev/sda"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[dd-of-dev]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 590 ms through this same path; post-change 2.8 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("dd a"));
    }

    const command = "dd a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('curl-pipe-shell matcher shape', () => {
  test.each([
    ["later candidate in same segment", "curl a pad pad pad pad pad pad curl b | sh", true],
    ["LF right after curl", "curl\na | sh", true],
    ["CRLF right after curl", "curl\r\na | sh", false],
    ["CR right after curl", "curl\ra | sh", true],
    ["U+2028 right after curl", "curl\u2028a | sh", true],
    ["pipe on next line", "curl a\n| sh", true],
    ["shell on next line", "curl a |\nsh", true],
    ["pipe combines across ;", "curl a; | sh", true],
    ["pipe two tokens past LF", "curl a\nx | sh", false],
    ["second line dangerous", "curl a\ncurl b | sh", true],
    ["second line dangerous after U+2028", "curl a\u2028curl b | sh", true],
    ["far apart pipe", "curl pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad | sh", true],
    ["safe", "curl a | shx", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('curl-pipe-shell').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("curl a pad pad pad pad pad pad curl b | sh"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[curl-pipe-shell]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 858 ms through this same path; post-change 3.8 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("curl a"));
    }

    const command = "curl a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('dropdb matcher shape', () => {
  test.each([
    ["later candidate in same quote-free run", "psql a psql b drop table t", true],
    ["drop isolated by single quote", "psql a' drop table t", false],
    ["drop isolated by double quote", "psql a\" drop table t", false],
    ["second run dangerous", "psql a' psql drop table t", true],
    ["drop combines across LF", "psql a\ndrop table t", true],
    ["drop combines across ;", "psql a; drop table t", true],
    ["far apart drop", "psql pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad drop table t", true],
    ["plain dropdb", "dropdb x", true],
    ["safe", "psql a select 1", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('dropdb').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("dropdb x"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[dropdb]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1593 ms through this same path; post-change 4.1 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("psql a"));
    }

    const command = "psql a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('sql-alter-drop-col matcher shape', () => {
  test.each([
    ["later candidate in same statement", "alter table a add x alter table b drop column c", true],
    ["drop isolated by ;", "alter table a; drop column c", false],
    ["second statement dangerous", "alter table a;alter table b drop column c", true],
    ["drop combines across LF", "alter table a\ndrop column c", true],
    ["drop combines across CRLF", "alter table a\r\ndrop column c", true],
    ["drop combines across &&", "alter table a && drop column c", true],
    ["drop combines across |", "alter table a | drop column c", true],
    ["LF between alter and table", "alter\ntable a drop column c", true],
    ["far apart drop", "alter table pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad drop column c", true],
    ["safe", "alter table a add column c", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('sql-alter-drop-col').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("alter table a add x alter table b drop column c"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[sql-alter-drop-col]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 3184 ms through this same path; post-change 8.3 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("alter table t"));
    }

    const command = "alter table t ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('sql-delete-no-where matcher shape', () => {
  test.each([
    ["later candidate is the guarded one", "delete from a where x delete from b", true],
    ["later candidate is guarded, earlier is not", "delete from a delete from b where x", false],
    ["isolated by ;", "delete from a where x; delete from b", true],
    ["where crosses LF", "delete from a\nwhere x", false],
    ["where crosses &&", "delete from a && where x", false],
    ["LF between delete and from", "delete\nfrom a", true],
    ["far apart where", "delete from a pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad where x", false],
    ["guarded", "delete from a where x", false],
    ["unguarded", "delete from a", true],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('sql-delete-no-where').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("delete from a where x delete from b"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[sql-delete-no-where]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1077 ms through this same path; post-change 9.4 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("delete from a"));
    }

    const command = "delete from a ".repeat(ADVERSARIAL_REPEATS) + "where x";
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('sql-update-no-where matcher shape', () => {
  test.each([
    ["later candidate is the guarded one", "update a set x where q update b set y", true],
    ["later candidate is guarded, earlier is not", "update a set x update b set y where q", false],
    ["straddling ; operand", "update a set x update b;c set y where z", true],
    ["isolated by ;", "update a set x where q; update b set y", true],
    ["where crosses LF", "update a set x\nwhere q", false],
    ["LF between update and set", "update\na\nset x", true],
    ["far apart where", "update a set pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad where x", false],
    ["guarded", "update a set x where q", false],
    ["unguarded", "update a set x", true],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('sql-update-no-where').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("update a set x where q update b set y"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[sql-update-no-where]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 1126 ms through this same path; post-change 9.6 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("update a set b"));
    }

    const command = "update a set b ".repeat(ADVERSARIAL_REPEATS) + "where x";
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('git-force-push matcher shape', () => {
  test.each([
    ["later candidate in same segment", "git push a git push --force origin main", true],
    ["refspec viable only at later candidate", "git push +foo git push origin +main", true],
    ["non-whitespace-followed first candidate", "git push;git push --force", true],
    ["flag combines across ;", "git push a; echo --force", true],
    ["flag combines across &&", "git push a && echo -f", true],
    ["flag combines across |", "git push a | echo -f", true],
    ["flag on next line", "git push origin\n--force", true],
    ["flag on next line CRLF", "git push origin\r\n--force", true],
    ["LF between git and push", "git\npush --force", true],
    ["CRLF between git and push", "git\r\npush --force", true],
    ["CR between git and push", "git\rpush --force", true],
    ["refspec across LF", "git push origin\n+main", true],
    ["chained blocked candidates", "git push +a git push +b git push origin +main", true],
    ["far apart flag", "git push pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad pad --force", true],
    ["force-with-lease is safe", "git push --force-with-lease origin main", false],
    ["bare +repo is safe", "git push +main", false],
    ["bare +repo with a later refspec is safe", "git push +main +other", false],
    ["bare +repo with operands is safe", "git push +main origin x", false],
    ["safe", "git push origin main", false],
  ] as const)('%s', (_name, command, expected) => {
    expect(patternById('git-force-push').test(command)).toBe(expected);
  });

  test('is reconsidered through the production evaluate path', () => {
    const result = evaluateDangerous(bashCtx("git push a git push --force origin main"));
    expect(result?.kind).toBe('deny');
    expect((result as { kind: 'deny'; reason: string }).reason).toContain('[git-force-push]');
  });

  // Separator-free near miss: 16000 candidates, none of which qualifies. Pre-change this
  // cost 8965 ms through this same path; post-change 6.9 ms.
  test('separator-free near matches stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(bashCtx("git push a"));
    }

    const command = "git push a ".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(bashCtx(command));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});

describe('gpg-private matcher shape', () => {
  const gpgPrivate = DANGEROUS_PATHS.find((pattern) => pattern.id === 'gpg-private')!.re;

  test.each([
    ["later candidate on the same line", "/.gnupg/a/pad/pad/pad/pad/pad/pad/.gnupg/b.key", true],
    ["later candidate segment on the same line", "/.gnupg/a/.gnupg/b.key", true],
    ["second line dangerous", "/.gnupg/a\n/.gnupg/b.key", true],
    ["second line dangerous CRLF", "/.gnupg/a\r\n/.gnupg/b.key", true],
    ["second line dangerous CR", "/.gnupg/a\r/.gnupg/b.key", true],
    ["second segment dangerous after U+2028", "/.gnupg/a\u2028/.gnupg/b.key", true],
    ["second segment dangerous after U+2029", "/.gnupg/a\u2029/.gnupg/b.key", true],
    ["key isolated by LF", "/.gnupg/a\n.key", false],
    ["key isolated by CRLF", "/.gnupg/a\r\n.key", false],
    ["key isolated by U+2028", "/.gnupg/a\u2028.key", false],
    ["key combines across ;", "/.gnupg/a; b.key", true],
    ["key combines across |", "/.gnupg/a | b.key", true],
    ["far apart key", "/.gnupg/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/pad/a.key", true],
    ["literal private-keys dir", "/.gnupg/private-keys-v1.d/", true],
    ["deeply nested key", "/home/u/.gnupg/x/y/z/secring.key", true],
    ["safe", "/.gnupg/nokey", false],
  ] as const)('%s', (_name, filePath, expected) => {
    expect(gpgPrivate.test(filePath)).toBe(expected);
  });

  test('is advised through the production evaluate path', () => {
    const result = evaluateDangerous(writeCtx('/home/u/.gnupg/x/y/secring.key'));
    expect(result?.kind).toBe('advise');
    expect((result as { kind: 'advise'; message: string }).message).toContain('[gpg-private]');
  });

  // Deeply repeated near miss: 16000 candidates, no `.key` anywhere. Pre-change this
  // cost 2046 ms; post-change 0.3 ms.
  test('repeated .gnupg segments stay within the PreToolUse latency budget', () => {
    for (let i = 0; i < 100; i += 1) {
      evaluateDangerous(writeCtx('/tmp/x'));
    }

    const filePath = "/.gnupg/a".repeat(ADVERSARIAL_REPEATS);
    const start = performance.now();
    const result = evaluateDangerous(writeCtx(filePath));
    const elapsedMs = performance.now() - start;

    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(LATENCY_BUDGET_MS);
  });
});
