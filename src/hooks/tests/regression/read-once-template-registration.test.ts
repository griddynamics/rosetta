import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const CASES = [
  {
    name: 'claude template',
    file: path.join(ROOT, 'plugins', 'core-claude', 'hooks', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
  {
    name: 'codex template',
    file: path.join(ROOT, 'plugins', 'core-codex', '.codex-plugin', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
  {
    name: 'cursor template',
    file: path.join(ROOT, 'plugins', 'core-cursor', 'hooks', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
  {
    name: 'cursor standalone template',
    file: path.join(ROOT, 'plugins', 'core-cursor', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
  {
    name: 'copilot template',
    file: path.join(ROOT, 'plugins', 'core-copilot', 'hooks', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
  {
    name: 'copilot standalone template',
    file: path.join(ROOT, 'plugins', 'core-copilot', '.github', 'plugin', 'hooks.json.tmpl'),
    expected: [
      'read-once.js',
      'read-once-reset.js',
    ],
  },
];

describe('read-once template registration', () => {
  for (const { name, file, expected } of CASES) {
    test(name, () => {
      const raw = readFileSync(file, 'utf-8');
      for (const bundleName of expected) {
        expect(raw).toContain(bundleName);
      }
    });
  }
});
