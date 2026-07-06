import { describe, it, expect } from 'vitest';
import { extractJsonObjectStrings, splitConcatenatedJsonObjects } from '../../src/interaction/stop-reader';

/**
 * R1 (orchestrator ruling — multi-turn `stop.jsonl` integrity): the reader must
 * tolerate (a) blank lines and (b) multiple JSON objects concatenated onto ONE
 * physical line with no separator — the failure mode a missing trailing newline
 * on a `Stop` hook's stdin would cause via `cat >>` appends (see
 * `agents/claude-code/adapter.ts` renderHooks, now defensively newline-guaranteed
 * regardless).
 */
describe('splitConcatenatedJsonObjects', () => {
  it('returns a single item for an already well-formed line', () => {
    const line = '{"session_id":"s1","last_assistant_message":"done"}';
    expect(splitConcatenatedJsonObjects(line)).toEqual([line]);
  });

  it('splits two JSON objects concatenated with no separator', () => {
    const a = '{"session_id":"s1","last_assistant_message":"turn1"}';
    const b = '{"session_id":"s1","last_assistant_message":"turn2"}';
    expect(splitConcatenatedJsonObjects(a + b)).toEqual([a, b]);
  });

  it('splits three concatenated objects', () => {
    const objs = ['{"a":1}', '{"b":2}', '{"c":3}'];
    expect(splitConcatenatedJsonObjects(objs.join(''))).toEqual(objs);
  });

  it('does not split on braces/brackets that live inside JSON string values', () => {
    const line = '{"last_assistant_message":"here is a { fake } object and a [fake] array"}';
    expect(splitConcatenatedJsonObjects(line)).toEqual([line]);
  });

  it('handles escaped quotes inside strings without losing track of string state', () => {
    const line = String.raw`{"last_assistant_message":"she said \"trust this folder\""}`;
    expect(splitConcatenatedJsonObjects(line)).toEqual([line]);
  });

  it('returns malformed/garbage input unsplit (so JSON.parse still fails on it downstream)', () => {
    expect(splitConcatenatedJsonObjects('not json at all')).toEqual(['not json at all']);
  });
});

describe('extractJsonObjectStrings', () => {
  it('drops blank lines', () => {
    const content = '{"a":1}\n\n\n{"b":2}\n';
    expect(extractJsonObjectStrings(content)).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('re-splits a line where two turns merged due to a missing trailing newline', () => {
    const turn1 = '{"session_id":"s","last_assistant_message":"turn1"}';
    const turn2 = '{"session_id":"s","last_assistant_message":"turn2"}';
    // Simulates: turn1 appended without a trailing \n, then turn2 appended right
    // after it on the SAME physical line (the exact bug R1 flagged).
    const content = `${turn1}${turn2}\n`;
    expect(extractJsonObjectStrings(content)).toEqual([turn1, turn2]);
  });

  it('handles a mix of normal lines and one merged line in the same file', () => {
    const t1 = '{"n":1}';
    const t2 = '{"n":2}';
    const t3 = '{"n":3}';
    const content = `${t1}\n${t2}${t3}\n`;
    expect(extractJsonObjectStrings(content)).toEqual([t1, t2, t3]);
  });

  it('empty content yields no items', () => {
    expect(extractJsonObjectStrings('')).toEqual([]);
    expect(extractJsonObjectStrings('\n\n')).toEqual([]);
  });
});
