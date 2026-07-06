/**
 * Judge: deterministic checks + LLM rubric derived from the case's evaluation file.
 *
 * Generic — no task-specific knowledge hardcoded here.
 * Rubric comes from test-library/coding/prompt-validation.md at runtime.
 *
 * Judge inputs (4):
 *   1. Validation file verbatim (dynamic rubric — never interpreted/hardcoded here)
 *   2. Distilled trajectory (ordered tool_use events + trimmed results + assistant text)
 *   3. Produced artifacts (workspace output files, read at runtime)
 *   4. Q&A log (question→answer exchanges the harness handled)
 *
 * Score: 0–100. Deterministic checks provide a hard gate; LLM judge adds
 * qualitative assessment against the case criteria.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { askLlm } from './llm-client.js';
import type { Trajectory, TrajectoryEvent } from './transcript.js';
import type { QnaEntry } from './pty-runner.js';

export interface DeterministicResult {
  specsFileExists: boolean;
  planFileExists: boolean;
}

export interface LlmJudgeResult {
  score: number;        // 0–100
  rationale: string;
  verdict: 'pass' | 'fail';
}

export interface JudgeResult {
  deterministic: DeterministicResult;
  llmJudge: LlmJudgeResult;
  finalScore: number;
  finalVerdict: 'pass' | 'fail';
}

// ── Distilled trajectory types ──────────────────────────────────────────────

interface DistilledStep {
  stepIndex: number;
  toolName: string;
  /** Salient arg: file path, command, query, skill name, etc. */
  arg: string;
  /** Tool result trimmed to 300 chars */
  resultSnippet: string;
}

interface DistilledTrajectory {
  totalEvents: number;
  turnCount: number;
  steps: DistilledStep[];
  assistantSummary: string;
  filesModified: string[];
}

/**
 * Run deterministic checks on the workspace after the Claude Code session.
 * Checks are case-agnostic: only file existence per known artifact paths.
 */
export async function runDeterministicChecks(workspaceDir: string): Promise<DeterministicResult> {
  const specsPath = path.join(workspaceDir, 'plans', 'healthcheck', 'healthcheck-SPECS.md');
  const planPath = path.join(workspaceDir, 'plans', 'healthcheck', 'healthcheck-PLAN.md');

  const [specsExists, planExists] = await Promise.all([
    fileExists(specsPath),
    fileExists(planPath),
  ]);

  return {
    specsFileExists: specsExists,
    planFileExists: planExists,
  };
}

/**
 * LLM judge: score the trajectory against the case's own evaluation criteria.
 * Reads rubric from the case's prompt-validation.md file at runtime.
 *
 * Uses 4 inputs:
 *   1. validationFilePath — rubric (read verbatim, not interpreted)
 *   2. trajectory         — distilled (tool steps + assistant summary)
 *   3. workspaceDir       — to read produced artifacts
 *   4. qaLog              — Q&A exchanges from the session
 */
export async function runLlmJudge(
  trajectory: Trajectory,
  workspaceDir: string,
  apiKey: string,
  validationFilePath: string,
  qaLog: QnaEntry[] = [],
): Promise<LlmJudgeResult> {
  // ── Input 1: validation file (verbatim) ────────────────────────────────────
  let rubric: string;
  try {
    rubric = await fs.readFile(validationFilePath, 'utf8');
  } catch {
    rubric = '(evaluation criteria file not found — score based on trajectory completeness)';
  }

  // ── Input 2: distilled trajectory ─────────────────────────────────────────
  const distilled = distillTrajectory(trajectory);
  const distilledText = formatDistilledTrajectory(distilled);

  // ── Input 3: produced artifacts ───────────────────────────────────────────
  const artifacts = await collectArtifacts(workspaceDir);

  // ── Input 4: Q&A log ──────────────────────────────────────────────────────
  const qaText = formatQaLog(qaLog);

  const result = await askLlm({
    apiKey,
    maxTokens: 1024,
    model: 'claude-sonnet-4-6',
    system: `You are a code quality judge evaluating an AI coding agent's run.

EVALUATION CRITERIA (from the case's validation file — treat this as the ground-truth rubric):
${rubric}

SCORING RULES:
- Score 0–100 scale; pass threshold: score >= 60
- Base your score on:
  (1) whether the distilled trajectory shows discovery, planning, and implementation steps
  (2) whether expected artifacts were produced (check both content and structure)
  (3) quality of tool calls relative to the task requirements in the rubric
  (4) whether Q&A exchanges (if any) show the agent handled clarifications correctly

Respond with valid JSON only: {"score": <0-100>, "rationale": "<2-3 sentences>", "verdict": "pass"|"fail"}`,
    prompt: `=== INPUT 2: DISTILLED TRAJECTORY ===
${distilledText}

=== INPUT 3: PRODUCED ARTIFACTS ===
${artifacts || '(no expected artifacts found in workspace)'}

=== INPUT 4: Q&A INTERACTION LOG ===
${qaText || '(no Q&A exchanges — agent ran fully autonomously)'}

Score this run against the evaluation criteria in the system prompt.`,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in judge response');
    const parsed = JSON.parse(jsonMatch[0]) as { score: number; rationale: string; verdict: string };
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      rationale: String(parsed.rationale ?? ''),
      verdict: parsed.verdict === 'pass' ? 'pass' : 'fail',
    };
  } catch {
    return {
      score: 0,
      rationale: 'Failed to parse judge response: ' + result.text.slice(0, 200),
      verdict: 'fail',
    };
  }
}

/** Combine deterministic + LLM results into a final verdict. */
export function combineResults(
  det: DeterministicResult,
  llm: LlmJudgeResult,
): JudgeResult {
  const deterministicGate = det.specsFileExists && det.planFileExists;
  const finalScore = deterministicGate ? llm.score : Math.min(llm.score, 40);
  const finalVerdict: 'pass' | 'fail' = deterministicGate && llm.verdict === 'pass' ? 'pass' : 'fail';
  return { deterministic: det, llmJudge: llm, finalScore, finalVerdict };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Distill trajectory into an ordered list of tool_use steps with trimmed results.
 * Does NOT dump raw JSONL — keeps context manageable for the judge.
 */
function distillTrajectory(trajectory: Trajectory): DistilledTrajectory {
  const steps: DistilledStep[] = [];
  const filesModified: string[] = [];
  let stepIndex = 0;

  // Map tool_use id → result snippet for pairing
  const resultMap = new Map<string, string>();

  for (const event of trajectory.events) {
    const content = getEventContent(event);
    if (!Array.isArray(content)) continue;

    for (const block of content as ContentBlock[]) {
      // Collect tool_use events
      if (block.type === 'tool_use' && block.name && block.id) {
        const arg = extractSalientArg(block.name, block.input);

        // Track file writes/creates for filesModified list
        if (/write|create|edit|str_replace/i.test(block.name)) {
          const filePath = extractFilePath(block.input);
          if (filePath && !filesModified.includes(filePath)) {
            filesModified.push(filePath);
          }
        }

        steps.push({
          stepIndex: stepIndex++,
          toolName: block.name,
          arg,
          resultSnippet: resultMap.get(block.id) ?? '',
        });
      }

      // Collect tool_result events (may come as blocks in user events)
      if (block.type === 'tool_result') {
        const resultBlock = block as { tool_use_id?: string; content?: unknown };
        if (resultBlock.tool_use_id) {
          const snippet = extractResultSnippet(resultBlock.content);
          resultMap.set(resultBlock.tool_use_id, snippet);
          // Back-fill the result into the matching step
          const matchingStep = steps.find(s =>
            s.toolName && resultBlock.tool_use_id &&
            steps[s.stepIndex]?.arg !== undefined
          );
          if (matchingStep && !matchingStep.resultSnippet) {
            matchingStep.resultSnippet = snippet;
          }
        }
      }
    }
  }

  // Also check for top-level tool result events
  for (const event of trajectory.events) {
    if (event.type === 'tool') {
      const toolUseId = (event as { tool_use_id?: string }).tool_use_id;
      if (toolUseId) {
        const snippet = extractResultSnippet(event.content);
        // Back-fill matching steps
        for (const step of steps) {
          // We stored the id in the step during creation; find by position matching
          if (!step.resultSnippet) {
            const matchEvent = trajectory.events.find(e => {
              const c = getEventContent(e);
              if (!Array.isArray(c)) return false;
              return (c as ContentBlock[]).some(b => b.type === 'tool_use' && b.id === toolUseId && b.name === step.toolName);
            });
            if (matchEvent) {
              step.resultSnippet = snippet;
              break;
            }
          }
        }
      }
    }
  }

  const assistantSummary = trajectory.assistantText
    .slice(0, 3)
    .map((t, i) => `[Turn ${i + 1}] ${t.slice(0, 400)}`)
    .join('\n\n');

  return {
    totalEvents: trajectory.events.length,
    turnCount: trajectory.turnCount,
    steps,
    assistantSummary,
    filesModified,
  };
}

function formatDistilledTrajectory(d: DistilledTrajectory): string {
  const lines: string[] = [
    `Total events: ${d.totalEvents} | Turns: ${d.turnCount} | Tool calls: ${d.steps.length}`,
    '',
    '--- Tool call sequence ---',
  ];

  for (const step of d.steps) {
    const result = step.resultSnippet ? ` → ${step.resultSnippet}` : '';
    lines.push(`  [${step.stepIndex}] ${step.toolName}(${step.arg})${result}`);
  }

  if (d.filesModified.length > 0) {
    lines.push('', '--- Files created/modified ---');
    for (const f of d.filesModified) lines.push(`  ${f}`);
  }

  if (d.assistantSummary) {
    lines.push('', '--- Assistant output (first 3 turns) ---', d.assistantSummary);
  }

  return lines.join('\n');
}

function formatQaLog(qaLog: QnaEntry[]): string {
  if (qaLog.length === 0) return '';
  return qaLog.map((entry, i) =>
    `[Q&A ${i + 1}] type=${entry.type} ts=${entry.timestamp}\n  Q: ${entry.question.slice(0, 300)}\n  A: ${entry.answer.slice(0, 200)}`
  ).join('\n\n');
}

/**
 * Collect output artifacts from the workspace.
 * Reads the expected artifact paths; returns their content (trimmed).
 */
async function collectArtifacts(workspaceDir: string): Promise<string> {
  const artifactPaths = [
    path.join(workspaceDir, 'plans', 'healthcheck', 'healthcheck-SPECS.md'),
    path.join(workspaceDir, 'plans', 'healthcheck', 'healthcheck-PLAN.md'),
  ];
  const parts: string[] = [];
  for (const p of artifactPaths) {
    try {
      const content = await fs.readFile(p, 'utf8');
      parts.push(`### ${path.basename(p)}\n${content.slice(0, 2000)}`);
    } catch { /* artifact not yet created */ }
  }
  return parts.join('\n\n');
}

// ── Trajectory helpers ───────────────────────────────────────────────────────

interface ContentBlock {
  type?: string;
  id?: string;
  name?: string;
  input?: unknown;
  text?: string;
  tool_use_id?: string;
  content?: unknown;
}

function getEventContent(event: TrajectoryEvent): unknown {
  return event.content ?? (event.message as { content?: unknown } | undefined)?.content;
}

function extractSalientArg(toolName: string, input: unknown): string {
  if (typeof input !== 'object' || input === null) return '';
  const inp = input as Record<string, unknown>;

  // File path tools
  if (typeof inp.path === 'string') return inp.path;
  if (typeof inp.file_path === 'string') return inp.file_path;

  // Bash command
  if (typeof inp.command === 'string') return inp.command.slice(0, 120);

  // Grep/search
  if (typeof inp.pattern === 'string') return inp.pattern.slice(0, 80);
  if (typeof inp.query === 'string') return inp.query.slice(0, 80);

  // Skill/subagent invocations
  if (typeof inp.skill === 'string') return inp.skill;
  if (typeof inp.subagent === 'string') return inp.subagent;

  // Generic: first string value found
  for (const v of Object.values(inp)) {
    if (typeof v === 'string' && v.length < 150) return v;
  }

  return toolName;
}

function extractFilePath(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null;
  const inp = input as Record<string, unknown>;
  return (typeof inp.path === 'string' ? inp.path : null) ??
    (typeof inp.file_path === 'string' ? inp.file_path : null);
}

function extractResultSnippet(content: unknown): string {
  if (typeof content === 'string') return content.slice(0, 300);
  if (Array.isArray(content)) {
    const textBlocks = (content as ContentBlock[]).filter(b => b.type === 'text' && b.text);
    return textBlocks.map(b => b.text ?? '').join(' ').slice(0, 300);
  }
  return '';
}
