// GT-6, PARITY-3 — codex TOML emitter field order and triple-quote
// NFR-0005 — the emitted document must parse as TOML for ANY body content
import { describe, it, expect } from 'vitest';
import { parse as parseToml } from 'smol-toml';
import { emitCodexToml, tomlMultilineBodyEscape } from '../../../src/serialize/toml.js';

// Round-trip helper: emit, parse with a strict TOML 1.0.0 parser, hand back the parsed body.
// Asserting on the parsed VALUE (not just "it parsed") is what catches silent corruption — a raw
// `\n` in the body parses fine and comes back as a real newline, a different value than the input.
function roundTripBody(body: string): string {
  const toml = emitCodexToml({
    name: 'agent',
    description: 'desc',
    developerInstructions: body,
    sandboxMode: 'workspace-write',
  });
  const parsed = parseToml(toml) as Record<string, unknown>;
  // emitCodexToml lays the block out as `"""\n<body>\n"""`; the newline that precedes the closing
  // delimiter is part of the value, so strip that one trailing newline to recover the input body.
  return (parsed.developer_instructions as string).replace(/\n$/, '');
}

describe('emitCodexToml', () => {
  it('emits correct field order: name, description, developer_instructions, model, model_reasoning_effort, sandbox_mode', () => {
    const toml = emitCodexToml({
      name: 'architect',
      description: 'Test agent',
      developerInstructions: 'Do work.',
      model: 'gpt-5.5',
      modelReasoningEffort: 'high',
      sandboxMode: 'workspace-write',
    });
    const lines = toml.split('\n');
    const nameIdx = lines.findIndex((l) => l.startsWith('name ='));
    const descIdx = lines.findIndex((l) => l.startsWith('description ='));
    const instrIdx = lines.findIndex((l) => l.startsWith('developer_instructions ='));
    const modelIdx = lines.findIndex((l) => l.startsWith('model ='));
    const effortIdx = lines.findIndex((l) => l.startsWith('model_reasoning_effort ='));
    const sandboxIdx = lines.findIndex((l) => l.startsWith('sandbox_mode ='));
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(instrIdx);
    expect(instrIdx).toBeLessThan(modelIdx);
    expect(modelIdx).toBeLessThan(effortIdx);
    expect(effortIdx).toBeLessThan(sandboxIdx);
  });

  it('omits model and model_reasoning_effort when not provided', () => {
    const toml = emitCodexToml({
      name: 'test',
      description: 'no model',
      developerInstructions: '# Body',
      sandboxMode: 'workspace-write',
    });
    expect(toml).not.toContain('model =');
    expect(toml).not.toContain('model_reasoning_effort =');
  });

  it('uses triple-quote block for developer_instructions', () => {
    const toml = emitCodexToml({
      name: 'test',
      description: 'desc',
      developerInstructions: '# Body\nMore content.',
      sandboxMode: 'workspace-write',
    });
    expect(toml).toContain('developer_instructions = """');
    // Body content should appear between the delimiters
    expect(toml).toContain('# Body');
    expect(toml).toContain('More content.');
  });

  it('escapes double-quotes in name and description', () => {
    const toml = emitCodexToml({
      name: 'test "name"',
      description: 'desc with "quotes"',
      developerInstructions: 'body',
      sandboxMode: 'workspace-write',
    });
    expect(toml).toContain('name = "test \\"name\\""');
    expect(toml).toContain('description = "desc with \\"quotes\\""');
  });

  it('ends with trailing newline', () => {
    const toml = emitCodexToml({
      name: 'x',
      description: 'y',
      developerInstructions: 'body',
      sandboxMode: 'workspace-write',
    });
    expect(toml.endsWith('\n')).toBe(true);
  });

  it('sets sandbox_mode = read-only for readonly agents', () => {
    const toml = emitCodexToml({
      name: 'reviewer',
      description: 'reviews code',
      developerInstructions: '# Review',
      sandboxMode: 'read-only',
    });
    expect(toml).toContain('sandbox_mode = "read-only"');
  });
});

// #271 — `"""` is the multi-line BASIC form, so escape sequences are processed inside it. Before
// this, the body went in raw: a literal triple-quote terminated the string early and any backslash
// was either a hard parse error or a silent value rewrite.
describe('emitCodexToml — developer_instructions body escaping (#271, NFR-0005)', () => {
  it('a body containing a literal """ still parses, and round-trips to the same value', () => {
    const body = 'Fence an example:\n"""\ntoml here\n"""\nDone.';
    expect(roundTripBody(body)).toBe(body);
  });

  it('a body containing a backslash still parses, and round-trips to the same value', () => {
    // `\d` is not a valid TOML escape sequence — unescaped, this is a hard parse error.
    const body = 'Match with regex \\d+ and a path C:\\Users\\dev';
    expect(roundTripBody(body)).toBe(body);
  });

  it('a body containing the two characters \\n round-trips as those two characters, not a newline', () => {
    // The silent variant of the same defect: unescaped, `\n` is a VALID escape sequence, so the
    // document parses and quietly yields a real newline — a different value than was written.
    const body = 'Write \\n to mean a newline.';
    const parsed = roundTripBody(body);
    expect(parsed).toBe(body);
    expect(parsed).not.toContain('\n');
  });

  it('preserves real newlines and tabs in the body', () => {
    const body = 'line one\n\tindented\nline three';
    expect(roundTripBody(body)).toBe(body);
  });

  it('a body that is nothing but quotes round-trips (long quote run)', () => {
    const body = '"'.repeat(15);
    expect(roundTripBody(body)).toBe(body);
  });

  it('a body ending in a quote round-trips (quote adjacent to the closing fence line)', () => {
    expect(roundTripBody('he said "hi"')).toBe('he said "hi"');
    expect(roundTripBody('trailing pair ""')).toBe('trailing pair ""');
  });

  it('escapes control characters that are illegal inside a multi-line basic string', () => {
    const body = 'bell:\u0007 bs:\b cr:\r vtab:\u000b ff:\u000c del:\u007f';
    expect(roundTripBody(body)).toBe(body);
  });
});

describe('tomlMultilineBodyEscape', () => {
  it('leaves prose with no backslash and no long quote run byte-identical', () => {
    // This is why the 10 committed plugins/core-codex/.codex/agents/*.toml stay unchanged:
    // runs of one or two quotes are legal unescaped, so ordinary prose is untouched.
    const body = 'Use the "reviewer" agent — it said ""double"" once.\nTabs\tsurvive.';
    expect(tomlMultilineBodyEscape(body)).toBe(body);
  });

  it('escapes every backslash', () => {
    expect(tomlMultilineBodyEscape('a\\b\\\\c')).toBe('a\\\\b\\\\\\\\c');
  });

  it('breaks a run of three quotes using the TOML 1.0.0 idiom ""\\"', () => {
    expect(tomlMultilineBodyEscape('"""')).toBe('""\\"');
  });

  it('escapes every third quote in a longer run, matching the TOML spec example', () => {
    // TOML 1.0.0: fifteen quotation marks are written ""\"""\"""\"""\"""\"
    expect(tomlMultilineBodyEscape('"'.repeat(15))).toBe('""\\"'.repeat(5));
  });

  it('a quote run of any length 1..20 survives emit + parse unchanged', () => {
    // The parser is the oracle here rather than a regex over the escaped text: an escaped quote
    // legitimately sits between two bare ones (a run of 4 emits as ""\""), so "no three quote
    // characters in a row" is the wrong property — "the document parses to the same value" is the
    // right one, and it is the property TOML actually requires.
    for (let n = 1; n <= 20; n += 1) {
      const body = `pre ${'"'.repeat(n)} post`;
      expect(roundTripBody(body), `run of ${n} inline`).toBe(body);
      expect(roundTripBody('"'.repeat(n)), `run of ${n} alone`).toBe('"'.repeat(n));
    }
  });
});
