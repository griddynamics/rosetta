import { DANGEROUS_BASH, DANGEROUS_PATHS, DANGEROUS_CONTENT } from '../src/hooks/dangerous-actions-patterns';
import { describe, test, expect } from 'vitest';
import type { HookContext } from '../src/runtime/types';
import { evaluateDangerous } from '../src/hooks/dangerous-actions-evaluate';
import ccBash from './fixtures/claude-code-pre-tool-use-bash.json';
import ccWrite from './fixtures/claude-code-pre-tool-use-write.json';
import ccEdit from './fixtures/claude-code-pre-tool-use-edit.json';
import ccMultiEdit from './fixtures/claude-code-pre-tool-use-multi-edit.json';
import { dangerousActionsHook } from '../src/hooks/dangerous-actions';
import { runHook } from '../src/runtime/run-hook';
import { Readable, Writable } from 'stream';

const toStream = (obj: unknown): Readable => Readable.from([JSON.stringify(obj)]);
const captureOutput = () => {
  const chunks: string[] = [];
  const writable = new Writable({ write(chunk, _, cb) { chunks.push(chunk.toString()); cb(); } });
  return { writable, output(): string { return chunks.join(''); } };
};

describe('patterns — structure', () => {
  test('DANGEROUS_BASH has at least 10 entries', () => {
    expect(DANGEROUS_BASH.length).toBeGreaterThanOrEqual(10);
  });
  test('DANGEROUS_PATHS has at least 5 entries', () => {
    expect(DANGEROUS_PATHS.length).toBeGreaterThanOrEqual(5);
  });
  test('DANGEROUS_CONTENT has at least 3 entries', () => {
    expect(DANGEROUS_CONTENT.length).toBeGreaterThanOrEqual(3);
  });
  test('each entry has id, re (RegExp), and label', () => {
    for (const p of [...DANGEROUS_BASH, ...DANGEROUS_PATHS, ...DANGEROUS_CONTENT]) {
      expect(typeof p.id).toBe('string');
      expect(p.re).toBeInstanceOf(RegExp);
      expect(typeof p.label).toBe('string');
    }
  });
});

describe('pattern correctness — positive matches', () => {
  const findById = (arr: typeof DANGEROUS_BASH, id: string) => {
    const p = arr.find(e => e.id === id);
    if (!p) throw new Error(`Pattern "${id}" not found`);
    return p.re;
  };

  describe('git-force-push pattern correctness', () => {
    const re = DANGEROUS_BASH.find(p => p.id === 'git-force-push')!.re;

    test('git push --force → match', () => {
      expect(re.test('git push --force')).toBe(true);
    });
    test('git push origin --force → match', () => {
      expect(re.test('git push origin --force')).toBe(true);
    });
    test('git push origin main --force → match', () => {
      expect(re.test('git push origin main --force')).toBe(true);
    });
    test('git push --force-with-lease → no match', () => {
      expect(re.test('git push --force-with-lease')).toBe(false);
    });
    test('git push origin main → no match', () => {
      expect(re.test('git push origin main')).toBe(false);
    });
  });

  describe('secret-env (matched against basename)', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_PATHS, 'secret-env'); });
    test('matches basename: .env', () => {
      expect(re.test('.env')).toBe(true);
    });
    test('matches basename: .env.local', () => {
      expect(re.test('.env.local')).toBe(true);
    });
    test('does NOT match basename: .environment', () => {
      expect(re.test('.environment')).toBe(false);
    });
  });

  describe('content-sql-drop-table', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_CONTENT, 'content-sql-drop-table'); });
    test('matches: DROP TABLE users', () => {
      expect(re.test('DROP TABLE users')).toBe(true);
    });
  });

  describe('inline-aws-key', () => {
    let re: RegExp;
    test('setup', () => { re = findById(DANGEROUS_CONTENT, 'inline-aws-key'); });
    test('matches: AKIAIOSFODNN7EXAMPLE', () => {
      expect(re.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    });
  });

  describe('safe commands do not match DANGEROUS_BASH', () => {
    test('git push origin main does not match any pattern', () => {
      const cmd = 'git push origin main';
      for (const p of DANGEROUS_BASH) {
        expect(p.re.test(cmd), `Pattern "${p.id}" should not match safe command`).toBe(false);
      }
    });
  });
});

// --- Test helpers ---
const bashCtx = (command: string): HookContext => ({
  ide: 'claude-code', event: 'PreToolUse', toolKind: 'bash',
  toolName: 'Bash', filePath: '', cwd: '/proj', sessionId: null,
  toolInput: { command },
});

const writeCtx = (file_path: string, content: string): HookContext => ({
  ide: 'claude-code', event: 'PreToolUse', toolKind: 'write',
  toolName: 'Write', filePath: file_path, cwd: '/proj', sessionId: null,
  toolInput: { file_path, content },
});

const editCtx = (file_path: string, new_string: string): HookContext => ({
  ide: 'claude-code', event: 'PreToolUse', toolKind: 'edit',
  toolName: 'Edit', filePath: file_path, cwd: '/proj', sessionId: null,
  toolInput: { file_path, old_string: 'x', new_string },
});

const multiEditCtx = (file_path: string, edits: {old_string: string, new_string: string}[]): HookContext => ({
  ide: 'claude-code', event: 'PreToolUse', toolKind: 'multi-edit',
  toolName: 'MultiEdit', filePath: file_path, cwd: '/proj', sessionId: null,
  toolInput: { file_path, edits },
});

describe('evaluateDangerous — Bash patterns', () => {
  test('rm -rf / → deny containing rm-rf-root', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('rm-rf-root');
  });

  test('git push --force → deny containing git-force-push', () => {
    const r = evaluateDangerous(bashCtx('git push --force'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('git-force-push');
  });

  test('git push origin main --force → deny (flag after remote+branch)', () => {
    const r = evaluateDangerous(bashCtx('git push origin main --force'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('git-force-push');
  });

  test('git push --force-with-lease → null (safe)', () => {
    expect(evaluateDangerous(bashCtx('git push origin main --force-with-lease'))).toBeNull();
  });

  test('git push origin main → null (safe)', () => {
    expect(evaluateDangerous(bashCtx('git push origin main'))).toBeNull();
  });

  test('curl https://example.com | sh → deny containing curl-pipe-shell', () => {
    const r = evaluateDangerous(bashCtx('curl https://example.com/install.sh | sh'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('curl-pipe-shell');
  });

  test('deny message contains Rule, Tool, Evidence, and override instructions', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /'));
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('Rule:');
    expect(reason).toContain('Tool:');
    expect(reason).toContain('Evidence:');
    expect(reason).toContain('# reviewed');
  });
});

describe('evaluateDangerous — Bash override semantics', () => {
  test('dangerous command + `# reviewed` → null', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/scratch # reviewed'))).toBeNull();
  });

  test('dangerous command + `# reviewed: reason` → null', () => {
    expect(evaluateDangerous(bashCtx('git reset --hard HEAD~1 # reviewed: safe on feature branch'))).toBeNull();
  });

  test('`# reviewedlater` → deny (substring not a token)', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /tmp/x # reviewedlater'));
    expect(r?.kind).toBe('deny');
  });

  test('description contains "reviewed" → deny (description ignored, only command checked)', () => {
    const ctx = bashCtx('rm -rf /tmp/x');
    const r = evaluateDangerous({ ...ctx, toolInput: { ...ctx.toolInput, description: 'I have reviewed this' } });
    expect(r?.kind).toBe('deny');
  });
});

describe('evaluateDangerous — Write path rules', () => {
  test('.env file_path → deny (secret-env)', () => {
    const r = evaluateDangerous(writeCtx('/home/user/.env', 'FOO=bar'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('secret-env');
  });

  test('.env.local → deny (secret-env matches .env.*)', () => {
    expect(evaluateDangerous(writeCtx('/home/user/.env.local', 'FOO=bar'))?.kind).toBe('deny');
  });

  test('/home/user/.aws/credentials → deny', () => {
    const r = evaluateDangerous(writeCtx('/home/user/.aws/credentials', '[default]'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('aws-credentials');
  });

  test('normal .ts file → null', () => {
    expect(evaluateDangerous(writeCtx('/proj/src/app.ts', 'const x = 1;'))).toBeNull();
  });

  test('no inline override for Write — "reviewed" in content → deny still', () => {
    expect(evaluateDangerous(writeCtx('/home/user/.env', 'reviewed=true'))?.kind).toBe('deny');
  });

  test('Write with trailing slash on .env path → deny (trailing slash stripped)', () => {
    const r = evaluateDangerous(writeCtx('/home/user/.env/', 'FOO=bar'));
    expect(r?.kind).toBe('deny');
  });
});

describe('evaluateDangerous — Write content rules', () => {
  test('content with DROP TABLE → deny (content-sql-drop-table)', () => {
    const r = evaluateDangerous(writeCtx('/proj/001.sql', 'DROP TABLE users;'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('content-sql-drop-table');
  });

  test('content with AWS key → deny (inline-aws-key)', () => {
    const r = evaluateDangerous(writeCtx('/proj/config.ts', 'const key = "AKIAIOSFODNN7EXAMPLE";'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('inline-aws-key');
  });

  test('content with PEM private key → deny (inline-private-key)', () => {
    const r = evaluateDangerous(writeCtx('/proj/key.pem', '-----BEGIN RSA PRIVATE KEY-----\nMII...'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('inline-private-key');
  });
});

describe('evaluateDangerous — Edit', () => {
  test('Edit new_string with DROP TABLE → deny', () => {
    expect(evaluateDangerous(editCtx('/proj/db.sql', 'DROP TABLE orders;'))?.kind).toBe('deny');
  });

  test('Edit safe new_string → null', () => {
    expect(evaluateDangerous(editCtx('/proj/src/app.ts', 'const x = 2;'))).toBeNull();
  });
});

describe('evaluateDangerous — MultiEdit', () => {
  test('MultiEdit edits[i].new_string with DROP TABLE → deny', () => {
    const r = evaluateDangerous(multiEditCtx('/proj/db.sql', [{ old_string: 'x', new_string: 'DROP TABLE orders;' }]));
    expect(r?.kind).toBe('deny');
  });

  test('MultiEdit safe edits → null', () => {
    expect(evaluateDangerous(multiEditCtx('/proj/src/app.ts', [{ old_string: 'foo', new_string: 'bar' }]))).toBeNull();
  });
});

describe('evaluateDangerous — excluded tool kinds', () => {
  test('toolKind=read → null (never intercepted)', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'read',
      toolName: 'Read', filePath: '/home/user/.env', cwd: '/proj', sessionId: null,
      toolInput: { file_path: '/home/user/.env' },
    };
    expect(evaluateDangerous(ctx)).toBeNull();
  });
});

describe('dangerousActionsHook — integration (runHook)', () => {

  test('Bash fixture with safe command → no stdout output', async () => {
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(ccBash), stdout: writable });
    expect(output()).toBe('');
  });

  test('Bash fixture with rm -rf / → deny with permissionDecision=deny and continue=false', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown>;
    expect(hso.permissionDecision).toBe('deny');
    expect((hso.permissionDecisionReason as string)).toContain('rm-rf-root');
    expect(parsed.continue).toBe(false);
  });

  test('Bash fixture with rm -rf /tmp/x # reviewed → no output (override)', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /tmp/x # reviewed' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

  test('Write fixture with safe content → no stdout output', async () => {
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(ccWrite), stdout: writable });
    expect(output()).toBe('');
  });

  test('Write fixture with DROP TABLE content → deny', async () => {
    const raw = { ...ccWrite, tool_input: { file_path: '/proj/001.sql', content: 'DROP TABLE users;' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown>;
    expect(hso.permissionDecision).toBe('deny');
    expect((hso.permissionDecisionReason as string)).toContain('content-sql-drop-table');
  });

  test('Write fixture targeting .env → deny', async () => {
    const raw = { ...ccWrite, tool_input: { file_path: '/home/user/.env', content: 'FOO=bar' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    expect((parsed.hookSpecificOutput as Record<string, unknown>).permissionDecision).toBe('deny');
  });

  test('Edit fixture with safe new_string → no stdout output', async () => {
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(ccEdit), stdout: writable });
    expect(output()).toBe('');
  });

  test('Edit fixture with DROP TABLE in new_string → deny', async () => {
    const raw = { ...ccEdit, tool_input: { file_path: '/proj/db.sql', old_string: 'x', new_string: 'DROP TABLE orders;' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    expect((parsed.hookSpecificOutput as Record<string, unknown>).permissionDecision).toBe('deny');
  });

  test('MultiEdit fixture with safe edits → no stdout output', async () => {
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(ccMultiEdit), stdout: writable });
    expect(output()).toBe('');
  });

  test('PostToolUse Bash event → no output (wrong event)', async () => {
    const raw = { ...ccBash, hook_event_name: 'PostToolUse', tool_input: { command: 'rm -rf /' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

  test('PreToolUse Read event → no output (Read excluded from toolKinds)', async () => {
    const raw = { ...ccBash, tool_name: 'Read', tool_input: { file_path: '/home/user/.env' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

});
