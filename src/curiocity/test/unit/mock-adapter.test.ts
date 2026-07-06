import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../../src/agents/mock/adapter';
import type { TrialContext } from '../../src/agents/types';

const adapter = new MockAdapter();

const transcript = [
  { ts: '1', type: 'user', text: 'do the task' },
  { ts: '2', type: 'assistant', text: 'working' },
  { ts: '3', type: 'tool_call', name: 'Bash', text: 'ls' },
  { ts: '4', type: 'usage', inputTokens: 10, outputTokens: 4 },
].map((l) => JSON.stringify(l)).join('\n');

describe('MockAdapter (§10.3) dialect + protocol', () => {
  it('parseEvents normalizes each line kind', () => {
    const events = adapter.parseEvents(transcript);
    expect(events.map((e) => e.kind)).toEqual(['user', 'assistant', 'tool_call', 'usage']);
    expect(events[2]!.name).toBe('Bash');
  });

  it('classifyTurn: empty/null message → working; present message → question', () => {
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: '' })).toBe('working');
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: null })).toBe('working');
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: 'done!' })).toBe('question');
  });

  it('detectStructuredQuestion: pending vs already-answered', () => {
    const pending = adapter.parseEvents(
      [
        { ts: '1', type: 'assistant', text: 'thinking' },
        { ts: '2', type: 'tool_call', name: 'AskUserQuestion', question: 'Which?', options: ['a', 'b'] },
      ].map((l) => JSON.stringify(l)).join('\n'),
    );
    expect(adapter.detectStructuredQuestion(pending)).toMatchObject({ question: 'Which?', options: ['a', 'b'] });

    const answered = adapter.parseEvents(
      [
        { ts: '2', type: 'tool_call', name: 'AskUserQuestion', question: 'Which?' },
        { ts: '3', type: 'user', text: 'a' },
      ].map((l) => JSON.stringify(l)).join('\n'),
    );
    expect(adapter.detectStructuredQuestion(answered)).toBeNull();
  });

  it('detectCompletion: true only with a task_complete marker after the last user turn', () => {
    const withMarker = adapter.parseEvents(
      [
        { ts: '1', type: 'user', text: 'go' },
        { ts: '2', type: 'lifecycle', name: 'task_complete' },
      ].map((l) => JSON.stringify(l)).join('\n'),
    );
    expect(adapter.detectCompletion(withMarker)).toBe(true);
    expect(adapter.detectCompletion(adapter.parseEvents(transcript))).toBe(false);
  });

  it('extractUsage sums usage events', () => {
    expect(adapter.extractUsage(adapter.parseEvents(transcript))).toMatchObject({ input: 10, output: 4, total: 14 });
  });

  it('parseStopSignal normalizes the native stop payload', () => {
    const sig = adapter.parseStopSignal(
      JSON.stringify({ session_id: 's1', transcript_path: '/t.jsonl', last_assistant_message: 'hi' }),
    );
    expect(sig).toMatchObject({ sessionId: 's1', transcriptPath: '/t.jsonl', lastAssistantMessage: 'hi' });
    expect(adapter.parseStopSignal('not json')).toBeNull();
  });

  it('locateTranscript prefers the authoritative session-start payload, else falls back', async () => {
    const ctrlDir = mkdtempSync(join(tmpdir(), 'ctrl-'));
    const ctx = { ctrlDir } as TrialContext;
    // Fallback when session-start.json is absent.
    expect((await adapter.locateTranscript(ctx)).kind).toBe('fallback');
    // Authoritative when present.
    writeFileSync(join(ctrlDir, 'session-start.json'), JSON.stringify({ transcript_path: '/real/t.jsonl' }));
    const located = await adapter.locateTranscript(ctx);
    expect(located).toEqual({ path: '/real/t.jsonl', kind: 'authoritative' });
  });
});
