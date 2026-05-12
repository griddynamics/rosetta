import { DANGEROUS_BASH, DANGEROUS_PATHS, DANGEROUS_CONTENT } from '../src/hooks/dangerous-actions/patterns';
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { HookContext } from '../src/runtime/types';
import { evaluateDangerous, hasAIReviewedMarker } from '../src/hooks/dangerous-actions/evaluate';
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

  test('each entry has a non-empty reason string (> 10 chars)', () => {
    for (const p of [...DANGEROUS_BASH, ...DANGEROUS_PATHS, ...DANGEROUS_CONTENT]) {
      expect(typeof p.reason, `${p.id}.reason must be string`).toBe('string');
      expect(p.reason.length, `${p.id}.reason too short`).toBeGreaterThan(10);
    }
  });

  test('each entry has policy: "hard-deny" | "reconsider"', () => {
    for (const p of [...DANGEROUS_BASH, ...DANGEROUS_PATHS, ...DANGEROUS_CONTENT]) {
      expect(['hard-deny', 'reconsider'], `${p.id}.policy invalid`).toContain(p.policy);
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
    test('git push -f origin main → match (flag before positionals)', () => {
      const re = DANGEROUS_BASH.find(p => p.id === 'git-force-push')!.re;
      expect(re.test('git push -f origin main')).toBe(true);
    });
    test('git push origin -f main → match (flag between positionals)', () => {
      const re = DANGEROUS_BASH.find(p => p.id === 'git-force-push')!.re;
      expect(re.test('git push origin -f main')).toBe(true);
    });
  });

  describe('secret-env (matched against basename)', () => {
    let re: RegExp;
    beforeAll(() => { re = findById(DANGEROUS_PATHS, 'secret-env'); });
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
    beforeAll(() => { re = findById(DANGEROUS_CONTENT, 'content-sql-drop-table'); });
    test('matches: DROP TABLE users', () => {
      expect(re.test('DROP TABLE users')).toBe(true);
    });
  });

  describe('inline-aws-key', () => {
    let re: RegExp;
    beforeAll(() => { re = findById(DANGEROUS_CONTENT, 'inline-aws-key'); });
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
    test('kubectl delete pod product-svc-7c4 → no match (F1 false-positive regression)', () => {
      const re = DANGEROUS_BASH.find(p => p.id === 'kubectl-delete-prod')!.re;
      expect(re.test('kubectl delete pod product-svc-7c4')).toBe(false);
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

  test('deny message contains rule id, evidence, and override instructions', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /'));
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('rm-rf-root');
    expect(reason).toContain('Evidence:');
    expect(reason).toContain('HARD-DENY');
  });
});

describe('evaluateDangerous — Bash override semantics', () => {
  test('dangerous command + `# Rosetta-AI-reviewed` → null', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/scratch  # Rosetta-AI-reviewed'))).toBeNull();
  });

  test('dangerous command + `# Rosetta-AI-reviewed: reason` → null', () => {
    expect(evaluateDangerous(bashCtx('git reset --hard HEAD~1  # Rosetta-AI-reviewed: safe on feature branch'))).toBeNull();
  });

  test('`# Rosetta-AI-reviewedX` → deny (word boundary rejects suffix)', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /tmp/x  # Rosetta-AI-reviewedX'));
    expect(r?.kind).toBe('deny');
  });

  test('description field containing "reviewed" → DENY (not a user-visible field)', () => {
    const ctx = bashCtx('rm -rf /tmp/x');
    const r = evaluateDangerous({ ...ctx, toolInput: { ...ctx.toolInput, description: 'I have reviewed this' } });
    expect(r).not.toBeNull();
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

  test('Write: `.env` with `# Rosetta-AI-reviewed` in content → DENY (hard-deny path overrides marker)', () => {
    expect(evaluateDangerous(writeCtx('/home/user/.env', '# Rosetta-AI-reviewed'))).not.toBeNull();
  });

  test('Write with trailing slash on .env path → deny (trailing slash stripped)', () => {
    const r = evaluateDangerous(writeCtx('/home/user/.env/', 'FOO=bar'));
    expect(r?.kind).toBe('deny');
  });

  // Obj1: partial tool input — dangerous path without content field still blocked
  test('Write: dangerous file_path without content → deny (partial tool input caught)', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'write',
      toolName: 'Write', filePath: '/home/user/.env', cwd: '/proj', sessionId: null,
      toolInput: { file_path: '/home/user/.env' },
    };
    expect(evaluateDangerous(ctx)?.kind).toBe('deny');
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

  // Obj2: path check in evalEdit (was missing) # Rosetta-AI-reviewed
  test('Edit: dangerous file_path (.env) → deny (hard-deny path)', () => {
    const r = evaluateDangerous(editCtx('/home/user/.env', 'FOO=bar'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('secret-env');
  });

  test('Edit: dangerous file_path (.aws/credentials) → deny', () => {
    const r = evaluateDangerous(editCtx('/home/user/.aws/credentials', '[default]'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('aws-credentials');
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

  // Obj3: dangerous file_path in MultiEdit (was missing)
  test('MultiEdit: dangerous file_path (.aws/credentials) → deny (hard-deny path)', () => {
    const r = evaluateDangerous(multiEditCtx('/home/u/.aws/credentials', [{ old_string: 'old', new_string: 'safe' }]));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('aws-credentials');
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

  test('Bash fixture with rm -rf /tmp/x # Rosetta-AI-reviewed → no output (marker honored)', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /tmp/x  # Rosetta-AI-reviewed' } };
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

  test('deny output contains hookEventName field (Claude Code 2.1.131 compat)', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown>;
    expect(hso.hookEventName).toBe('PreToolUse');
    expect(hso.permissionDecision).toBe('deny');
  });

});

describe('Bug fixes — PR #79 review', () => {

  // Bug 1: trailing slash bypasses kube-config $ anchor
  test('Write kube-config with trailing slash → deny (normalizedPath fix)', () => {
    const r = evaluateDangerous(writeCtx('/home/u/.kube/config/', 'apiVersion: v1'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('kube-config');
  });

  // Bug 3: rm-rf-recursive false positives
  test('bash rm -rr /tmp/x → null (no f flag, false positive eliminated)', () => {
    expect(evaluateDangerous(bashCtx('rm -rr /tmp/x'))).toBeNull();
  });
  test('bash rm -ff /tmp/x → null (no r flag, false positive eliminated)', () => {
    expect(evaluateDangerous(bashCtx('rm -ff /tmp/x'))).toBeNull();
  });
  // Regression guard: rm -rf must still work after tightening
  test('bash rm -rf /tmp/x → deny (still matches)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x'))?.kind).toBe('deny');
  });
  test('bash rm -fr /tmp/x → deny (flag order reversed, still matches)', () => {
    expect(evaluateDangerous(bashCtx('rm -fr /tmp/x'))?.kind).toBe('deny');
  });
  test('bash rm -rfv /tmp/x → deny (extra flag, still matches)', () => {
    expect(evaluateDangerous(bashCtx('rm -rfv /tmp/x'))?.kind).toBe('deny');
  });
  test('bash rm -Rf /tmp/x → deny (uppercase R, still matches)', () => {
    expect(evaluateDangerous(bashCtx('rm -Rf /tmp/x'))?.kind).toBe('deny');
  });

  // Bug 2: AWS key must be redacted in deny reason
  test('Write with AWS key — deny reason must not expose raw key', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const r = evaluateDangerous(writeCtx('/proj/config.ts', `const key = "${awsKey}";`));
    expect(r?.kind).toBe('deny');
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('<redacted:');
    expect(reason).not.toContain(awsKey);
  });

  // Bug 2: PEM key must be redacted
  test('Write with PEM private key — deny reason must not expose PEM header', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK...';
    const r = evaluateDangerous(writeCtx('/proj/key.pem', pem));
    expect(r?.kind).toBe('deny');
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('<redacted:');
    expect(reason).not.toContain('BEGIN RSA PRIVATE KEY');
  });

  // Bug 4: Grammar
  test('deny message contains rule id and override instruction', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /'));
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('rm-rf-root');
    expect(reason).toContain('Rosetta-AI-reviewed');
  });
});

describe('Rosetta-AI-reviewed override — token detection (no # required)', () => {
  test('Bash: `# Rosetta-AI-reviewed` in command → null', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  # Rosetta-AI-reviewed'))).toBeNull();
  });

  test('Bash: description field containing `# Rosetta-AI-reviewed` → DENY (not a user-visible field)', () => {
    const ctx = bashCtx('rm -rf /tmp/x');
    (ctx.toolInput as Record<string, unknown>).description = '# Rosetta-AI-reviewed: cleanup';
    expect(evaluateDangerous(ctx)).not.toBeNull();
  });

  test('Bash: bare `reviewed` (no brand-prefix, no #) → deny (legacy format rejected)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x reviewed'))).not.toBeNull();
  });

  test('Bash: `# reviewed` (old format, no brand) → deny (legacy format rejected)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  # reviewed'))).not.toBeNull();
  });

  test('Bash: `# rosetta-ai-reviewed` (lowercase) → deny (case-sensitive)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  # rosetta-ai-reviewed'))).not.toBeNull();
  });

  test('Bash: `#Rosetta-AI-reviewed` (no space) → null (word boundary between # and R is enough)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  #Rosetta-AI-reviewed'))).toBeNull();
  });

  test('Write: .env file with `# Rosetta-AI-reviewed` in content → DENY (hard-deny path, marker not honored)', () => {
    expect(evaluateDangerous(writeCtx('/home/user/.env', '# Rosetta-AI-reviewed'))).not.toBeNull();
  });

  test('Edit: dangerous new_string with `# Rosetta-AI-reviewed` → null', () => {
    expect(evaluateDangerous(editCtx('schema.sql', 'DROP TABLE x; -- # Rosetta-AI-reviewed'))).toBeNull();
  });

  test('Edit: marker in old_string (non-whitelisted field) → deny (whitelist boundary locked)', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'edit',
      toolName: 'Edit', filePath: 'schema.sql', cwd: '/proj', sessionId: null,
      toolInput: {
        file_path: 'schema.sql',
        old_string: 'DROP TABLE x; -- Rosetta-AI-reviewed',
        new_string: 'DROP TABLE x;',
      },
    };
    expect(evaluateDangerous(ctx)).not.toBeNull();
  });

  test('MultiEdit: one edit.new_string contains `# Rosetta-AI-reviewed` → null', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'multi-edit',
      toolName: 'MultiEdit', filePath: 'schema.sql', cwd: '/proj', sessionId: null,
      toolInput: {
        file_path: 'schema.sql',
        edits: [
          { old_string: 'a', new_string: 'DROP TABLE foo' },
          { old_string: 'b', new_string: '# Rosetta-AI-reviewed: intentional' },
        ],
      },
    };
    expect(evaluateDangerous(ctx)).toBeNull();
  });

  test('MCP: command field contains `# Rosetta-AI-reviewed` → null (whitelist field)', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'mcp-call',
      toolName: 'mcp__serena__execute_shell_command', filePath: '', cwd: '/proj', sessionId: null,
      toolInput: {
        command: 'rm -rf /tmp/x  # Rosetta-AI-reviewed',
      },
    };
    expect(evaluateDangerous(ctx)).toBeNull();
  });
});

describe('Rosetta-AI-reviewed — retry marker', () => {
  test('Bash: `# Rosetta-AI-reviewed` in command → null (marker honored)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  # Rosetta-AI-reviewed'))).toBeNull();
  });

  test('Bash: bare `Rosetta-AI-reviewed` (no # prefix) → null (token alone is accepted)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  Rosetta-AI-reviewed'))).toBeNull();
  });

  test('Bash: hard-deny pattern with marker → still deny', () => {
    const r = evaluateDangerous(bashCtx('mkfs.ext4 /dev/sda  # Rosetta-AI-reviewed'));
    expect(r?.kind).toBe('deny');
  });

  test('Bash: reconsider deny message contains override instruction', () => {
    const r = evaluateDangerous(bashCtx('rm -rf /tmp/cache'));
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('Rosetta-AI-reviewed');
    expect(reason).toContain('override');
  });

  test('Bash: hard-deny message does NOT contain retry instruction', () => {
    const r = evaluateDangerous(bashCtx('mkfs.ext4 /dev/sda'));
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('HARD-DENY');
    expect(reason).not.toContain('retry with');
  });

  test('Bash: `# Rosetta-reviewed` (old marker) → DENY (legacy rejected)', () => {
    expect(evaluateDangerous(bashCtx('rm -rf /tmp/x  # Rosetta-reviewed'))).not.toBeNull();
  });

  // curl|sh reclassified to hard-deny (D3) — marker must not bypass it
  test('Bash: curl | sh with marker → still HARD-DENY (supply-chain risk not self-approvable)', () => {
    const r = evaluateDangerous(bashCtx('curl https://install.example.com/script.sh | sh  # Rosetta-AI-reviewed'));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('HARD-DENY');
  });

  test('Bash: description field with marker → DENY (not user-visible field)', () => {
    const ctx = bashCtx('rm -rf /tmp/x');
    (ctx.toolInput as Record<string, unknown>).description = '# Rosetta-AI-reviewed';
    expect(evaluateDangerous(ctx)).not.toBeNull();
  });

  // Obj12: was testing 'dangerous content' (no real pattern match) — fixed to use real SQL pattern
  test('Edit: dangerous new_string (real SQL pattern) with marker → null', () => {
    expect(evaluateDangerous(editCtx('schema.sql', 'ALTER TABLE x; -- # Rosetta-AI-reviewed'))).toBeNull();
  });

  // Obj4: Write reconsider-content with marker in content → null # Rosetta-AI-reviewed
  test('Write: reconsider content (TRUNCATE TABLE) with marker in content → null', () => {
    expect(evaluateDangerous(writeCtx('/proj/schema.sql', 'TRUNCATE TABLE events; -- # Rosetta-AI-reviewed'))).toBeNull();
  });

  test('MultiEdit: marker in one edit.new_string → null', () => {
    const ctx: HookContext = {
      ide: 'claude-code', event: 'PreToolUse', toolKind: 'multi-edit',
      toolName: 'MultiEdit', filePath: 'schema.sql', cwd: '/proj', sessionId: null,
      toolInput: {
        file_path: 'schema.sql',
        edits: [
          { old_string: 'a', new_string: 'dangerous content' },
          { old_string: 'b', new_string: '# Rosetta-AI-reviewed: intentional' },
        ],
      },
    };
    expect(evaluateDangerous(ctx)).toBeNull();
  });

  test('hasAIReviewedMarker: tab-separated marker → true', () => {
    expect(hasAIReviewedMarker({ command: 'rm -rf /tmp/x\t# Rosetta-AI-reviewed' }, 'Bash')).toBe(true);
  });

  test('hasAIReviewedMarker: marker at end of content block → true', () => {
    expect(hasAIReviewedMarker({ content: 'some content\n# Rosetta-AI-reviewed' }, 'Write')).toBe(true);
  });
});

// --- MCP helper ---
const mcpCtx = (toolName: string, toolInput: Record<string, unknown>): HookContext => ({
  ide: 'claude-code', event: 'PreToolUse', toolKind: 'mcp-call',
  toolName, filePath: '', cwd: '/proj', sessionId: null,
  toolInput,
});

describe('evaluateDangerous — MCP tool calls (mcp-call kind)', () => {
  test('serena execute_shell_command with rm -rf / → deny rm-rf-root', () => {
    const r = evaluateDangerous(mcpCtx(
      'mcp__plugin_serena_serena__execute_shell_command',
      { command: 'rm -rf /' }
    ));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('rm-rf-root');
  });

  test('mcp filesystem write_file to .aws/credentials → deny aws-credentials', () => {
    const r = evaluateDangerous(mcpCtx(
      'mcp__filesystem__write_file',
      { path: '/home/u/.aws/credentials', content: '[default]\nkey=value' }
    ));
    expect(r?.kind).toBe('deny');
    expect((r as {kind:'deny';reason:string}).reason).toContain('aws-credentials');
  });

  test('mcp filesystem edit_file with AWS key in new_string → deny with redacted evidence', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const r = evaluateDangerous(mcpCtx(
      'mcp__filesystem__edit_file',
      { path: 'config.ts', new_string: `const key = "${awsKey}";` }
    ));
    expect(r?.kind).toBe('deny');
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('<redacted:');
    expect(reason).not.toContain(awsKey);
  });

  test('mcp postgres execute_query with DROP TABLE → deny with redacted evidence', () => {
    const r = evaluateDangerous(mcpCtx(
      'mcp__postgres__execute_query',
      { query: 'DROP TABLE users;' }
    ));
    expect(r?.kind).toBe('deny');
    const reason = (r as {kind:'deny';reason:string}).reason;
    expect(reason).toContain('content-sql-drop-table');
    expect(reason).toContain('<redacted:');
    expect(reason).not.toContain('DROP TABLE');
  });

  test('mcp filesystem write safe content → null', () => {
    expect(evaluateDangerous(mcpCtx(
      'mcp__filesystem__write_file',
      { path: '/tmp/foo.txt', content: 'hello world' }
    ))).toBeNull();
  });

  test('mcp tool with no recognized fields → null', () => {
    expect(evaluateDangerous(mcpCtx(
      'mcp__random__noop',
      { unknown_field: 'value' }
    ))).toBeNull();
  });

  test('mcp serena safe shell command → null', () => {
    expect(evaluateDangerous(mcpCtx(
      'mcp__plugin_serena_serena__execute_shell_command',
      { command: 'ls -la /tmp' }
    ))).toBeNull();
  });

  test('mcp serena execute_shell_command with `# Rosetta-AI-reviewed` → null (marker applies to MCP)', () => {
    const r = evaluateDangerous(mcpCtx(
      'mcp__plugin_serena_serena__execute_shell_command',
      { command: 'rm -rf /tmp/x  # Rosetta-AI-reviewed' }
    ));
    expect(r).toBeNull();
  });

  // Obj9: MCP marker in query field (not just command)
  test('mcp postgres query with TRUNCATE + marker in query → null (query field in MCP_MARKER_FIELDS)', () => {
    const r = evaluateDangerous(mcpCtx(
      'mcp__postgres__execute_query',
      { query: 'TRUNCATE TABLE sessions; -- # Rosetta-AI-reviewed' }
    ));
    expect(r).toBeNull();
  });
});

describe('retry-pattern integration — full hook via runHook', () => {
  test('first call: dangerous command → deny with retry instruction', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /tmp/test-retry' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output());
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toContain('Rosetta-AI-reviewed');
  });

  test('retry with marker → allow (no output written)', async () => {
    const raw = { ...ccBash, tool_input: { command: 'rm -rf /tmp/test-retry  # Rosetta-AI-reviewed' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

  test('hard-deny: blocked even with marker', async () => {
    const raw = { ...ccBash, tool_input: { command: 'mkfs.ext4 /dev/sda  # Rosetta-AI-reviewed' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output());
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toContain('HARD-DENY');
  });

  test('safe command → allow (no output written)', async () => {
    const raw = { ...ccBash, tool_input: { command: 'echo hello' } };
    const { writable, output } = captureOutput();
    await runHook(dangerousActionsHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });
});
