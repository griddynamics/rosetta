import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trialSpecSchema, type TrialSpec } from '../../src/shared/ipc';
import type { FakeRouterScript } from '../../src/shared/model-router';

/** src/curiocity root. */
export const REPO = fileURLToPath(new URL('../..', import.meta.url));
export const MOCK_INDEX = join(REPO, 'test/fixtures/mock-agent/index.mjs');

export function scenePath(name: string): string {
  return join(REPO, 'test/fixtures/mock-agent/scenes', name);
}

export function tmpRunDir(): string {
  return mkdtempSync(join(tmpdir(), 'curio-test-run-'));
}

/**
 * Temp-dir hygiene (Part 3.3). Trials that end in a retained status keep their
 * workspace (`curiocity-ws-*`) and ctrl dir (`curiocity-ctrl-*`) per §7 (production
 * rule — unchanged). Integration tests that intentionally produce such trials must
 * sweep their own retained dirs so a full vitest run shows no growth.
 */
export function listTmpAgentDirs(): string[] {
  const t = tmpdir();
  return readdirSync(t)
    .filter((n) => n.startsWith('curiocity-ws-') || n.startsWith('curiocity-ctrl-'))
    .map((n) => join(t, n));
}

/** Remove every `curiocity-ws-*`/`curiocity-ctrl-*` dir not present in the baseline. */
export function sweepNewTmpAgentDirs(baseline: Set<string>): void {
  for (const d of listTmpAgentDirs()) {
    if (!baseline.has(d)) rmSync(d, { recursive: true, force: true });
  }
}

export interface MockProfileOverrides {
  strategy?: 'json-only' | 'screen-reader' | 'hybrid';
  bannerPattern?: string;
  quietMs?: number;
  stallMs?: number;
  freezeMs?: number;
  submit?: 'enter' | 'paste+enter';
  dialogPatterns?: { pattern: string; send: string }[];
  /** Override the launch command (e.g. a nonexistent binary to force launch-error). */
  command?: string;
}

export function mockProfile(scene: string, o: MockProfileOverrides = {}): Record<string, unknown> {
  return {
    adapter: 'mock',
    command: o.command ?? process.execPath,
    args: [MOCK_INDEX, '{prompt}'],
    envRemove: [],
    envSet: { MOCK_SCENE: scenePath(scene) },
    strategy: o.strategy ?? 'json-only',
    readiness: { bannerPattern: o.bannerPattern ?? 'MOCK READY', quietMs: o.quietMs ?? 50 },
    // Default to the production submit path (bracketed paste, §5.3) so integration tests
    // exercise the real four-write sequence; the mock TUI strips the paste markers.
    submit: o.submit ?? 'paste+enter',
    stall: { quietMs: o.stallMs ?? 100 },
    freeze: { windowMs: o.freezeMs ?? 200 },
    ...(o.dialogPatterns ? { dialogPatterns: o.dialogPatterns } : {}),
  };
}

export interface MockSpecArgs {
  scene: string;
  runDir?: string;
  timeoutSec?: number;
  evaluate?: boolean;
  keepWorkspace?: boolean;
  mirror?: boolean;
  qna?: string;
  fakeRouter?: FakeRouterScript;
  profileOverrides?: MockProfileOverrides;
  caseName?: string;
  repeat?: number;
  srcZipPath?: string;
}

export function mockSpec(args: MockSpecArgs): TrialSpec {
  return trialSpecSchema.parse({
    agentId: 'mock',
    caseName: args.caseName ?? 'mock-case',
    repeat: args.repeat ?? 1,
    timeoutSec: args.timeoutSec ?? 20,
    prompt: 'Create out.txt containing hello world.',
    qna: args.qna ?? 'Answer helpfully and concisely. If unsure, abort.',
    models: {},
    keys: {},
    provision: {},
    setup: [],
    teardown: [],
    evaluators: [],
    profile: mockProfile(args.scene, args.profileOverrides),
    adapter: 'mock',
    runDir: args.runDir ?? tmpRunDir(),
    keepWorkspace: args.keepWorkspace ?? false,
    mirror: args.mirror ?? false,
    evaluate: args.evaluate ?? false,
    ...(args.srcZipPath ? { srcZipPath: args.srcZipPath } : {}),
    ...(args.fakeRouter ? { fakeRouter: args.fakeRouter } : {}),
  });
}
