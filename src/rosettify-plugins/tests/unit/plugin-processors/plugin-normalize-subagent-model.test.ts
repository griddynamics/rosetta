// FR-COPY-0083.AC1-AC6, FR-COPY-0084.AC3 — subagent_required_model list normalization: the four
// per-IDE token mappers (claude/cursor/copilot/codex) and the composed
// pluginNormalizeSubagentRequiredModel processor, exercised against real measured
// subagent_required_model values (SPECS §10) through the built-in vocabularies, plus the exhaustive
// profile-block path (FR-PROF-0011/FR-COPY-0083.AC4) and one required synthetic de-dup fixture.
import { describe, it, expect } from 'vitest';
import {
  pluginNormalizeSubagentRequiredModel,
  claudeSubagentModelTokenMapper,
  cursorSubagentModelTokenMapper,
  copilotSubagentModelTokenMapper,
  codexSubagentModelTokenMapper,
} from '../../../src/plugin-processors/plugin-normalize-subagent-model.js';
import type { SubagentModelTokenMapper } from '../../../src/plugin-processors/plugin-normalize-subagent-model.js';
import {
  CLAUDE_VOCABULARY,
  CURSOR_VOCABULARY,
  COPILOT_VOCABULARY,
  CODEX_VOCABULARY,
} from '../../../src/spec/model-maps.js';
import type {
  FileProcessingFrame,
  ModelVocabulary,
  PluginProcessingFrame,
  PluginSpec,
} from '../../../src/types.js';

function makeFrame(
  target: string,
  content: string,
  extra: Partial<FileProcessingFrame> = {},
): FileProcessingFrame {
  return {
    sourcePath: target,
    target,
    isBinary: false,
    target_contents: content,
    source: [],
    ...extra,
  };
}

function makePluginFrame(
  frames: FileProcessingFrame[],
  modelVocabulary: ModelVocabulary,
): PluginProcessingFrame {
  return {
    spec: { modelVocabulary } as unknown as PluginSpec,
    vfs: [] as never,
    frames,
    templateContext: {},
    errors: [],
  };
}

/** Runs one attribute string through the processor built from `mapper` and returns the rewritten
 *  attribute line for that single frame. */
function normalize(
  content: string,
  vocabulary: ModelVocabulary,
  mapper: SubagentModelTokenMapper,
): string {
  const processor = pluginNormalizeSubagentRequiredModel(mapper);
  const p = makePluginFrame([makeFrame('agents/x.md', content)], vocabulary);
  const result = processor(p);
  return result.frames[0].target_contents as string;
}

// Real measured subagent_required_model values (SPECS §10 / orchestrator measurement).
const FIXTURE_A = 'claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol';
const FIXTURE_B = 'claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra';
const FIXTURE_C = 'claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra';
const FIXTURE_D = 'gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5, grok-4.5, gpt-5.6-terra';
const FIXTURE_E = 'claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna';

describe('claudeSubagentModelTokenMapper — exact-token tier (claudeLookup, FR-COPY-0083)', () => {
  it('resolves an exact-token entry: claude-5-opus-high -> claude-opus-5', () => {
    expect(claudeSubagentModelTokenMapper('claude-5-opus-high', CLAUDE_VOCABULARY.map)).toBe('claude-opus-5');
  });

  it('still drops a non-Claude token: gpt-5.6-sol-high -> null', () => {
    expect(claudeSubagentModelTokenMapper('gpt-5.6-sol-high', CLAUDE_VOCABULARY.map)).toBeNull();
  });
});

describe('pluginNormalizeSubagentRequiredModel — end-to-end with the new vocabulary entries', () => {
  const content = 'subagent_required_model="gpt-5.6-sol-high, claude-5-opus-high, grok-4.6-high, gemini-3.7-flash-high"';

  it('Claude vocabulary: only the Claude token survives, resolved through the exact-token tier', () => {
    expect(normalize(content, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper)).toBe(
      'subagent_required_model="claude-opus-5"',
    );
  });

  it('Cursor vocabulary: every token the merged map contains survives, in source order, de-duplicated', () => {
    expect(normalize(content, CURSOR_VOCABULARY, cursorSubagentModelTokenMapper)).toBe(
      'subagent_required_model="gpt-5.6-sol, claude-opus-5, grok-4.6, gemini-3.7-flash"',
    );
  });
});

describe('pluginNormalizeSubagentRequiredModel — Claude mapper, real fixtures', () => {
  it('A: filters to the opus family and maps through the built-in Claude vocabulary', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_A}"`, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper),
    ).toBe('subagent_required_model="claude-opus-4-8"');
  });

  it('B: filters to the sonnet family', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_B}"`, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper),
    ).toBe('subagent_required_model="claude-sonnet-5"');
  });

  it('E: maps via the haiku family key — proves family lookup, not raw string equality', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_E}"`, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper),
    ).toBe('subagent_required_model="claude-haiku-4-5"');
  });

  it('no claude-family token survives -> "inherit"', () => {
    const noClaudeValue = 'gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra';
    expect(
      normalize(`subagent_required_model="${noClaudeValue}"`, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper),
    ).toBe('subagent_required_model="inherit"');
  });

  it('an input already "inherit" round-trips to "inherit" and does not become garbage', () => {
    expect(
      normalize('subagent_required_model="inherit"', CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper),
    ).toBe('subagent_required_model="inherit"');
  });
});

// The expected values below grew when the Cursor and Copilot vocabularies learned the GPT-5.6 family
// (bare and effort-qualified), grok and composer: those tokens used to have no key and were dropped
// from the list, so the earlier expectations recorded models silently going missing. Nothing about
// the filtering rule changed — only which tokens the maps can now name.
describe('pluginNormalizeSubagentRequiredModel — Cursor mapper, real fixtures', () => {
  it('A: filters to tokens present in the merged Cursor map, source order preserved', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_A}"`, CURSOR_VOCABULARY, cursorSubagentModelTokenMapper),
    ).toBe('subagent_required_model="claude-opus-4-8, gpt-5.5, gpt-5.6-sol"');
  });

  it('D: same filtering with the gpt- token appearing FIRST in source order (not IDE priority order)', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_D}"`, CURSOR_VOCABULARY, cursorSubagentModelTokenMapper),
    ).toBe('subagent_required_model="gpt-5.4, gemini-3.1-pro, claude-sonnet-5, grok-4.5, gpt-5.6-terra"');
  });
});

describe('pluginNormalizeSubagentRequiredModel — Copilot mapper, real fixtures', () => {
  it('C: filters to tokens present in the merged Copilot map, mapped to IDE-native display names', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_C}"`, COPILOT_VOCABULARY, copilotSubagentModelTokenMapper),
    ).toBe('subagent_required_model="Claude Sonnet 5, GPT-5.4, Gemini 3.1 Pro (Preview), GPT-5.6 Terra"');
  });

  it('C: grok-4.5 is still absent from the Copilot list — no Copilot identifier for it is established here', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_D}"`, COPILOT_VOCABULARY, copilotSubagentModelTokenMapper),
    ).not.toContain('grok');
  });
});

describe('pluginNormalizeSubagentRequiredModel — Codex mapper, real fixtures (effort retained, whole token)', () => {
  it('A: gpt- tokens survive whole; reasoning-effort suffix is authored guidance and is retained as-is (gpt-5.5-high stays gpt-5.5-high)', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_A}"`, CODEX_VOCABULARY, codexSubagentModelTokenMapper),
    ).toBe('subagent_required_model="gpt-5.5-high, gpt-5.6-sol"');
  });

  it('B: same whole-token behavior, source order preserved', () => {
    expect(
      normalize(`subagent_required_model="${FIXTURE_B}"`, CODEX_VOCABULARY, codexSubagentModelTokenMapper),
    ).toBe('subagent_required_model="gpt-5.4-medium, gpt-5.6-terra"');
  });
});

describe('codexSubagentModelTokenMapper — exhaustive vs non-exhaustive (R4 ruling)', () => {
  it('non-exhaustive (built-in Codex map is {}): an unmapped gpt- token passes through whole, effort suffix intact', () => {
    expect(codexSubagentModelTokenMapper('gpt-5.6-high', {}, false)).toBe('gpt-5.6-high');
    expect(codexSubagentModelTokenMapper('gpt-5.6-high', {}, undefined)).toBe('gpt-5.6-high');
  });

  it('exhaustive: the SAME unmapped gpt- token is DROPPED — the block is the whole allowed vocabulary', () => {
    expect(codexSubagentModelTokenMapper('gpt-5.6-high', {}, true)).toBeNull();
  });

  it('exhaustive: a token present in the block still resolves, emitted whole (no effort split)', () => {
    const map = { 'gpt-5.5-high': 'gpt-5.4-medium' };
    expect(codexSubagentModelTokenMapper('gpt-5.5-high', map, true)).toBe('gpt-5.4-medium');
  });
});

describe('pluginNormalizeSubagentRequiredModel — exhaustive profile block (FR-COPY-0083.AC4)', () => {
  it('a Cursor override block maps one survivor and drops the token absent from the block', () => {
    const vocabulary: ModelVocabulary = { map: { 'claude-opus-4-8': 'gpt-5.4' }, exhaustive: true };
    expect(
      normalize(
        'subagent_required_model="claude-opus-4-8, claude-sonnet-5"',
        vocabulary,
        cursorSubagentModelTokenMapper,
      ),
    ).toBe('subagent_required_model="gpt-5.4"');
  });

  it('a Codex override block drops a gpt- token absent from it, unlike the non-exhaustive built-in path', () => {
    const vocabulary: ModelVocabulary = { map: { 'gpt-5.5-high': 'gpt-5.4-medium' }, exhaustive: true };
    expect(
      normalize(
        'subagent_required_model="gpt-5.5-high, gpt-5.6-uncovered"',
        vocabulary,
        codexSubagentModelTokenMapper,
      ),
    ).toBe('subagent_required_model="gpt-5.4-medium"');
  });
});

describe('pluginNormalizeSubagentRequiredModel — de-duplication (SYNTHETIC fixture, FR-COPY-0083.AC3)', () => {
  // No real measured subagent_required_model value exercises de-duplication (verified against all
  // 5 real fixtures through every built-in map — decisions.md R3). This case is deliberately
  // synthetic: with effort suffixes now retained, two effort variants of the same base id (e.g.
  // gpt-5.4-high / gpt-5.4-medium) are DISTINCT values and no longer collapse on their own. The
  // fixture that still demonstrates dedup is an exhaustive override block that sends two DIFFERENT
  // source tokens to the SAME mapped value.
  it('collapses two different tokens the exhaustive block maps to the same value, keeping the first occurrence, non-gpt token dropped', () => {
    const vocabulary: ModelVocabulary = {
      map: { 'gpt-5.4-high': 'gpt-5.4-medium', 'gpt-5.3': 'gpt-5.4-medium' },
      exhaustive: true,
    };
    const content = 'subagent_required_model="gpt-5.4-high, claude-opus-4-8, gpt-5.3"';
    expect(normalize(content, vocabulary, codexSubagentModelTokenMapper)).toBe(
      'subagent_required_model="gpt-5.4-medium"',
    );
  });
});

describe('pluginNormalizeSubagentRequiredModel — boundary safety', () => {
  it('does not corrupt an adjacent attribute on the same line', () => {
    const content = 'subagent_required_model="claude-opus-4-8" other="kept"';
    expect(normalize(content, CLAUDE_VOCABULARY, claudeSubagentModelTokenMapper)).toBe(
      'subagent_required_model="claude-opus-4-8" other="kept"',
    );
  });
});

describe('pluginNormalizeSubagentRequiredModel — pass-through frame kinds', () => {
  const processor = pluginNormalizeSubagentRequiredModel(claudeSubagentModelTokenMapper);

  it('skips binary frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/icon.png',
      target: 'agents/icon.png',
      isBinary: true,
      target_contents: Buffer.from([0x00]) as unknown as string,
      source: [],
    };
    const p = makePluginFrame([frame], CLAUDE_VOCABULARY);
    const result = processor(p);
    expect(result).toBe(p);
  });

  it('skips null-content (dropped) frames', () => {
    const frame: FileProcessingFrame = {
      sourcePath: 'agents/dropped.md',
      target: 'agents/dropped.md',
      isBinary: false,
      target_contents: null,
      source: [],
    };
    const p = makePluginFrame([frame], CLAUDE_VOCABULARY);
    const result = processor(p);
    expect(result).toBe(p);
  });

  it('skips verbatim frames even when they contain the attribute', () => {
    const frame = makeFrame('configure/guide.md', 'subagent_required_model="claude-opus-4-8"', {
      verbatim: true,
    });
    const p = makePluginFrame([frame], CLAUDE_VOCABULARY);
    const result = processor(p);
    expect(result).toBe(p);
    expect(result.frames[0].target_contents).toBe('subagent_required_model="claude-opus-4-8"');
  });
});
