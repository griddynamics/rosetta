import { describe, it, expect } from 'vitest';
import {
  QA_RE,
  SKILL_RE,
  renderConversation,
  renderSkills,
  renderTools,
  type ToolCall,
  type Turn,
  type ViewContext,
} from '../../src/agents/transcript-views';

/**
 * Shared, agent-agnostic transcript-view renderers (§14 addendum). These take the
 * common `Turn[]`/`ToolCall[]` intermediates any adapter can reduce its own native
 * transcript into — no agent-specific shape is assumed here.
 */

describe('QA_RE / SKILL_RE — name-agnostic detection', () => {
  it('QA_RE matches question/answer tool names, case-insensitively', () => {
    expect(QA_RE.test('AskUserQuestion')).toBe(true);
    expect(QA_RE.test('answer_user')).toBe(true);
    expect(QA_RE.test('Bash')).toBe(false);
  });

  it('SKILL_RE matches skill-load tool names, case-insensitively', () => {
    expect(SKILL_RE.test('Skill')).toBe(true);
    expect(SKILL_RE.test('load_skill')).toBe(true);
    expect(SKILL_RE.test('Bash')).toBe(false);
  });
});

describe('renderConversation', () => {
  const ctx: ViewContext = {
    prompt: 'Build the widget.',
    qnaLog: [{ question: 'Which color?', answer: 'blue' }],
  };
  const turns: Turn[] = [
    { role: 'assistant', text: 'Working on it now.' },
    { role: 'user', text: 'ignored (not rendered)' },
    { role: 'assistant', text: 'Done.' },
  ];
  const toolCalls: ToolCall[] = [
    { name: 'AskUserQuestion', input: { questions: [{ question: 'Which color?' }] } },
    { name: 'Bash', input: { command: 'ls -la' } },
  ];

  const md = renderConversation(ctx, turns, toolCalls);

  it('includes the task prompt as IN (task)', () => {
    expect(md).toContain('# Conversation');
    expect(md).toContain('**IN (task):**');
    expect(md).toContain('Build the widget.');
  });

  it('includes every assistant OUT turn', () => {
    expect(md).toContain('Working on it now.');
    expect(md).toContain('Done.');
  });

  it('keeps a QA-named tool call (AskUserQuestion) but drops a non-QA one (Bash)', () => {
    expect(md).toContain('OUT (agent → AskUserQuestion)');
    expect(md).not.toContain('Bash');
    expect(md).not.toContain('ls -la');
  });

  it('appends the qnaLog as agent-asks / reviewer-answers pairs', () => {
    expect(md).toContain('**OUT (agent asks):** Which color?');
    expect(md).toContain('**IN (reviewer):** blue');
  });
});

describe('renderTools', () => {
  it('lists every tool call, numbered, with a salient input preview', () => {
    const toolCalls: ToolCall[] = [
      { name: 'Bash', input: { command: 'npm test' } },
      { name: 'AskUserQuestion', input: { questions: [] } },
    ];
    const md = renderTools(toolCalls);
    expect(md).toContain('# Tool calls');
    expect(md).toContain('1. **Bash**');
    expect(md).toContain('npm test');
    expect(md).toContain('2. **AskUserQuestion**');
  });

  it('reports (no tool calls) when empty', () => {
    expect(renderTools([])).toContain('(no tool calls)');
  });
});

describe('renderSkills', () => {
  it('keeps a Skill-named tool call and lists it', () => {
    const toolCalls: ToolCall[] = [
      { name: 'Skill', input: { skill: 'rosetta:load-project-context' } },
      { name: 'Bash', input: { command: 'ls' } },
    ];
    const md = renderSkills(toolCalls);
    expect(md).toContain('# Skill loads');
    expect(md).toContain('**Skill**');
    expect(md).toContain('rosetta:load-project-context');
    expect(md).not.toContain('Bash');
  });

  it('reports (no skill loads detected) when none match', () => {
    expect(renderSkills([{ name: 'Bash', input: {} }])).toContain('(no skill loads detected)');
  });
});
