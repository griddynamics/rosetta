// NFR-0001 — byte-exact JSON, standalone manifest
import { describe, it, expect } from 'vitest';
import { emitJson, emitStandaloneManifest } from '../../../src/serialize/json.js';

describe('emitJson', () => {
  it('produces 2-space indented JSON with trailing newline', () => {
    const result = emitJson({ name: 'test', version: '1.0.0' });
    expect(result).toBe('{\n  "name": "test",\n  "version": "1.0.0"\n}\n');
  });

  it('ends with exactly one newline', () => {
    const result = emitJson({ a: 1 });
    expect(result.endsWith('\n')).toBe(true);
    expect(result.endsWith('\n\n')).toBe(false);
  });

  it('handles nested objects', () => {
    const result = emitJson({ outer: { inner: 'value' } });
    expect(result).toContain('"outer": {');
    expect(result).toContain('"inner": "value"');
  });
});

describe('emitStandaloneManifest', () => {
  it('produces name→version key order with 2-space indent and trailing newline (GT-7)', () => {
    const result = emitStandaloneManifest('core-cursor-standalone', '2.0.40');
    expect(result).toBe('{\n  "name": "core-cursor-standalone",\n  "version": "2.0.40"\n}\n');
  });

  it('name appears before version (key order)', () => {
    const result = emitStandaloneManifest('test-plugin', '1.0.0');
    const nameIdx = result.indexOf('"name"');
    const versionIdx = result.indexOf('"version"');
    expect(nameIdx).toBeLessThan(versionIdx);
  });
});
