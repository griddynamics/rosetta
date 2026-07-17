import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';
import {
  hookTranscriptCheck,
  eventToSubtype,
  signaturesForCommands,
  additionalContextSignatures,
} from '../../src/evaluators/hook-transcript-check';
import type { EvalContext } from '../../src/evaluators/types';
import { FakeModelRouter } from '../../src/shared/model-router';
import { ConfigError } from '../../src/shared/errors';

/**
 * `hook-transcript-check` (§11): proves a plugin's OWN hooks fired — as opposed to
 * Curiocity's always-present capture hooks — by cross-referencing the plugin's
 * generated `hooks/hooks.json` against the run's raw native transcript.
 */

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/hook-transcript/', import.meta.url));
const HOOKS_JSON = join(FIXTURES_DIR, 'hooks.json');

function ctx(over: Partial<EvalContext> = {}): EvalContext {
  return {
    workspace: over.workspace ?? mkdtempSync(join(tmpdir(), 'curio-hook-ws-')),
    workspaceDiff: over.workspaceDiff ?? '',
    events: over.events ?? [],
    qnaLog: over.qnaLog ?? [],
    caseFiles: over.caseFiles ?? { promptMd: 'do it' },
    agentId: over.agentId ?? 'mock',
    models: over.models ?? new FakeModelRouter({ entries: [] }),
    exec: execa,
    ...(over.rawTranscriptPath !== undefined ? { rawTranscriptPath: over.rawTranscriptPath } : {}),
    ...(over.caseDir !== undefined ? { caseDir: over.caseDir } : {}),
  };
}

describe('eventToSubtype', () => {
  it('maps PascalCase hook events to the transcript subtype (single choke point)', () => {
    expect(eventToSubtype('Stop')).toBe('stop_hook_summary'); // empirically confirmed
    expect(eventToSubtype('SessionStart')).toBe('session_start_hook_summary'); // assumed
    expect(eventToSubtype('PreToolUse')).toBe('pre_tool_use_hook_summary'); // assumed
    expect(eventToSubtype('PostToolUse')).toBe('post_tool_use_hook_summary'); // assumed
    expect(eventToSubtype('PostCompact')).toBe('post_compact_hook_summary'); // assumed
  });
});

describe('signaturesForCommands', () => {
  it('extracts .js basenames and does NOT phantom-match .js inside .json', () => {
    expect(signaturesForCommands(['node "${CLAUDE_PLUGIN_ROOT}/hooks/read-once.js"'])).toEqual([
      'read-once.js',
    ]);
    // A command referencing a .json path must yield NO `.js` signature (negative lookahead).
    expect(signaturesForCommands(["cat > '/tmp/ctrl/session-start.json'"])).toEqual([]);
  });

  it('falls back to the distinctive hookSpecificOutput token for printf-style hooks', () => {
    expect(
      signaturesForCommands([
        'printf \'%s\' \'{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"x"}}\'',
      ]),
    ).toEqual(['hookSpecificOutput']);
    // Curiocity's `cat >` capture contains neither .js nor hookSpecificOutput → no signature.
    expect(signaturesForCommands(["cat > '/tmp/ctrl/session-start.json'"])).toEqual([]);
  });
});

describe('additionalContextSignatures', () => {
  it('extracts distinctive, underscore-preferring tokens from a printf additionalContext payload', () => {
    const cmd =
      'printf \'%s\' \'{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Rosetta injected_context_fingerprint loaded via plugin_bootstrap_signature"}}\'';
    const tokens = additionalContextSignatures([cmd]);
    expect(tokens).toContain('injected_context_fingerprint');
    expect(tokens).toContain('plugin_bootstrap_signature');
    // Structural JSON-protocol vocabulary must never be treated as a distinctive token.
    expect(tokens).not.toContain('hookSpecificOutput');
    expect(tokens).not.toContain('additionalContext');
    expect(tokens).not.toContain('SessionStart');
  });

  it('falls back to a permissive scan when the payload defeats strict JSON.parse (embedded shell-quote idiom)', () => {
    // The classic bash `'\''` idiom for embedding a literal apostrophe inside a
    // single-quoted string breaks JSON's escape grammar (`\'` is not a valid escape).
    const cmd = `printf '%s' '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"user'\\''s distinctive_token_value here"}}'`;
    const tokens = additionalContextSignatures([cmd]);
    expect(tokens).toContain('distinctive_token_value');
  });

  it('returns no tokens when there is nothing distinctive (all words too short)', () => {
    const cmd =
      'printf \'%s\' \'{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"hi ok"}}\'';
    expect(additionalContextSignatures([cmd])).toEqual([]);
  });

  it('returns no tokens for a command with no additionalContext at all', () => {
    expect(additionalContextSignatures(["cat > '/tmp/ctrl/session-start.json'"])).toEqual([]);
  });
});

describe('hook-transcript-check (§11)', () => {
  it('passes when every checked declared event fired with a matching plugin command', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'pass-transcript.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(true);
    expect(res.metrics).toEqual([
      { name: 'hook_events_declared', value: 4 },
      { name: 'hook_events_checked', value: 3 }, // PostCompact ignored by default
      { name: 'hook_events_fired', value: 3 },
      { name: 'hook_events_plugin_matched', value: 3 },
    ]);
  });

  it('fails when a declared, non-ignored event never fired', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'fail-missing-pretooluse.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(false);
    expect(res.details).toContain('PreToolUse: did not fire');
  });

  it('fails when only Curiocity\'s own capture command ran for the event (requireCommands:true)', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'fail-curiocity-only-pretooluse.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(false);
    expect(res.details).toContain('PreToolUse: FIRED but no plugin command matched');
  });

  it('passes with requireCommands:false — the event firing is enough, regardless of which command ran', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'fail-curiocity-only-pretooluse.jsonl') }),
      { pluginManifest: HOOKS_JSON, requireCommands: false },
    );
    expect(res.pass).toBe(true);
  });

  it('ignoreEvents default excludes PostCompact — declared but not required to fire', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'pass-transcript.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(true);
    expect(res.details).not.toContain('PostCompact');
  });

  it('resolves a relative pluginManifest against ctx.caseDir', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({
        rawTranscriptPath: join(FIXTURES_DIR, 'pass-transcript.jsonl'),
        caseDir: FIXTURES_DIR,
      }),
      { pluginManifest: 'hooks.json' },
    );
    expect(res.pass).toBe(true);
  });

  it('fails without throwing when rawTranscriptPath is absent', async () => {
    const res = await hookTranscriptCheck.evaluate(ctx({}), { pluginManifest: HOOKS_JSON });
    expect(res.pass).toBe(false);
    expect(res.details).toBe('no raw transcript available');
  });

  it('fails without throwing when rawTranscriptPath points at a nonexistent file', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'does-not-exist.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(false);
    expect(res.details).toBe('no raw transcript available');
  });

  it('LOUD GUARD: system lines present but none recognized as *_hook_summary → loud fail', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'fail-format-drift.jsonl') }),
      { pluginManifest: HOOKS_JSON },
    );
    expect(res.pass).toBe(false);
    expect(res.details).toContain('no *_hook_summary entries recognized in transcript');
    // Reports the system-line count so "no system lines" vs "system lines, none matched" differ.
    expect(res.details).toContain('saw 2 system-type line(s)');
    expect(res.details).toContain('SessionStart');
  });

  it('empty-signature event (arbitrary command) passes on firing alone, with a note', async () => {
    const res = await hookTranscriptCheck.evaluate(
      ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'no-signature-transcript.jsonl') }),
      { pluginManifest: join(FIXTURES_DIR, 'no-signature-hooks.json') },
    );
    expect(res.pass).toBe(true); // requireCommands:true default, but no signature to verify
    expect(res.details).toContain(
      'PreToolUse: fired (no extractable plugin signature to verify command)',
    );
    expect(res.metrics).toEqual([
      { name: 'hook_events_declared', value: 1 },
      { name: 'hook_events_checked', value: 1 },
      { name: 'hook_events_fired', value: 1 },
      { name: 'hook_events_plugin_matched', value: 1 },
    ]);
  });

  describe('context-injection mode (SessionStart-shaped: additionalContext, no .js, no _hook_summary)', () => {
    const SESSION_START_ONLY_HOOKS = join(FIXTURES_DIR, 'session-start-only-hooks.json');

    it('passes via a distinctive additionalContext token matched in an attachment entry — NOT a _hook_summary', async () => {
      const res = await hookTranscriptCheck.evaluate(
        ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'session-start-only-pass-transcript.jsonl') }),
        { pluginManifest: SESSION_START_ONLY_HOOKS },
      );
      expect(res.pass).toBe(true);
      expect(res.details).toContain('SessionStart: fired+matched');
      expect(res.metrics).toEqual([
        { name: 'hook_events_declared', value: 1 },
        { name: 'hook_events_checked', value: 1 },
        { name: 'hook_events_fired', value: 1 },
        { name: 'hook_events_plugin_matched', value: 1 },
      ]);
    });

    it('fails when the transcript has neither the plugin token nor any matching hook_summary', async () => {
      const res = await hookTranscriptCheck.evaluate(
        ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'session-start-only-fail-transcript.jsonl') }),
        { pluginManifest: SESSION_START_ONLY_HOOKS },
      );
      expect(res.pass).toBe(false);
      expect(res.details).toContain('SessionStart: did not fire');
      expect(res.metrics).toEqual([
        { name: 'hook_events_declared', value: 1 },
        { name: 'hook_events_checked', value: 1 },
        { name: 'hook_events_fired', value: 0 },
        { name: 'hook_events_plugin_matched', value: 0 },
      ]);
    });

    it('does NOT trip the loud guard even though zero *_hook_summary entries exist for a context-injection-only check', async () => {
      const res = await hookTranscriptCheck.evaluate(
        ctx({ rawTranscriptPath: join(FIXTURES_DIR, 'session-start-only-fail-transcript.jsonl') }),
        { pluginManifest: SESSION_START_ONLY_HOOKS },
      );
      // Fails because the token genuinely isn't present — NOT the loud-guard "format drift" path.
      expect(res.details).not.toContain('no *_hook_summary entries recognized in transcript');
    });
  });

  it('throws ConfigError when the plugin manifest cannot be read/parsed', async () => {
    await expect(
      hookTranscriptCheck.evaluate(ctx({}), {
        pluginManifest: join(FIXTURES_DIR, 'does-not-exist.json'),
      }),
    ).rejects.toThrow(ConfigError);
  });
});
