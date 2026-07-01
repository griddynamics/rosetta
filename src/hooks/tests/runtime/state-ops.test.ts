import { describe, expect, test } from 'vitest';

import {
  normalizeAgentSessionKey,
  normalizeNamespaceKey,
  normalizeSessionKey,
} from '../../src/runtime/state-ops';

describe('state-ops session keys', () => {
  test('normalizeNamespaceKey joins non-empty trimmed parts', () => {
    expect(normalizeNamespaceKey(' session ', '', 'codex', 'abc ')).toBe('session:codex:abc');
  });

  test('normalizeSessionKey uses the session namespace', () => {
    expect(normalizeSessionKey('codex', 'sess-1')).toBe('session:codex:sess-1');
  });

  test('normalizeAgentSessionKey uses the agent-session namespace when agent id exists', () => {
    expect(normalizeAgentSessionKey('codex', 'sess-1', 'agent-7')).toBe(
      'agent-session:codex:sess-1:agent-7',
    );
  });

  test('normalizeAgentSessionKey downgrades to normalizeSessionKey when agent id is missing', () => {
    expect(normalizeAgentSessionKey('codex', 'sess-1', null)).toBe(
      normalizeSessionKey('codex', 'sess-1'),
    );
  });
});
