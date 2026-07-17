/**
 * Shared, agent-agnostic renderers for "transcript views" (human-readable markdown
 * derived from a trial's transcript). Each `AgentAdapter.buildTranscriptViews`
 * converts ITS OWN raw/native transcript + normalized events into the common
 * intermediates below (`Turn[]`, `ToolCall[]`) and calls these renderers — the
 * renderers themselves know nothing about any agent's native shape.
 *
 * Ported from the (now superseded) `tests/e2e-tests/extract-views.py` reference
 * script: same markdown shape, same name-agnostic detection regexes.
 */

/** viewName → rendered markdown. */
export type TranscriptViews = Record<string, string>;

/** Everything a view needs beyond the transcript-derived turns/tool calls. */
export interface ViewContext {
  /** The trial's task prompt (the "IN (task)" line). */
  prompt: string;
  /** The QnA audit log (harness question ↔ reviewer answer pairs), rendered at the tail. */
  qnaLog: { question?: string; answer?: string }[];
}

/** A single conversational turn, already reduced to plain text by the adapter. */
export interface Turn {
  role: 'assistant' | 'user';
  text: string;
}

/** A single tool invocation, already reduced to {name, input} by the adapter. */
export interface ToolCall {
  name: string;
  input: unknown;
}

/** Ask-user / answer tools (name-agnostic; matches whatever the agent calls its tool). */
export const QA_RE = /question|answer/i;
/** Skill-load tools (name-agnostic; not literally "Skill"). */
export const SKILL_RE = /skill/i;

/** Best-effort short preview of a tool call's input, for the tools/skills views. */
function salientInput(input: unknown): string {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return String(input).slice(0, 160);
  }
  const obj = input as Record<string, unknown>;
  for (const key of ['command', 'file_path', 'path', 'pattern', 'skill', 'prompt']) {
    const v = obj[key];
    if (v) return String(v).slice(0, 160);
  }
  return JSON.stringify(obj).slice(0, 160);
}

/**
 * `# Conversation` — the task prompt, each assistant turn's text, any tool calls
 * whose name looks like a question/answer tool (kept as a compact preview of their
 * input), then the QnA audit log rendered as agent-asks / reviewer-answers pairs.
 */
export function renderConversation(ctx: ViewContext, turns: Turn[], toolCalls: ToolCall[]): string {
  const lines: string[] = ['# Conversation', '', '**IN (task):**', '', `> ${ctx.prompt}`, ''];
  for (const turn of turns) {
    if (turn.role !== 'assistant') continue;
    const text = turn.text.trim();
    if (text === '') continue;
    lines.push('**OUT (agent):**', '', text, '');
  }
  for (const call of toolCalls) {
    if (!QA_RE.test(call.name)) continue;
    lines.push(`**OUT (agent → ${call.name}):** ${JSON.stringify(call.input).slice(0, 600)}`, '');
  }
  for (const qa of ctx.qnaLog) {
    lines.push(`**OUT (agent asks):** ${(qa.question ?? '').trim()}`, '');
    lines.push(`**IN (reviewer):** ${(qa.answer ?? '').trim()}`, '');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

/** `# Tool calls` — every tool call, numbered, with a short salient preview of its input. */
export function renderTools(toolCalls: ToolCall[]): string {
  const lines: string[] = ['# Tool calls', ''];
  if (toolCalls.length === 0) {
    lines.push('(no tool calls)');
    return lines.join('\n');
  }
  toolCalls.forEach((call, i) => {
    lines.push(`${i + 1}. **${call.name || '?'}** — \`${salientInput(call.input)}\``);
  });
  return lines.join('\n');
}

/** `# Skill loads` — tool calls whose name looks like a skill-load tool. */
export function renderSkills(toolCalls: ToolCall[]): string {
  const lines: string[] = ['# Skill loads', ''];
  const skillCalls = toolCalls.filter((c) => SKILL_RE.test(c.name));
  if (skillCalls.length === 0) {
    lines.push('(no skill loads detected)');
    return lines.join('\n');
  }
  skillCalls.forEach((call, i) => {
    lines.push(`${i + 1}. **${call.name}** — \`${JSON.stringify(call.input).slice(0, 200)}\``);
  });
  return lines.join('\n');
}
