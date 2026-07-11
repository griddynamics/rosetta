import path from 'path';
import { adapter } from '../adapter';
import { acquireOnce } from './throttle';
import { collectEnvironment, debugLogBranch, debugLogHook } from './debug-log';
import { toRelative, walkUp } from './path-utils';
import type { HookDefinition, HookContext, HookResult, FilePathPredicate, ToolInputPredicate } from './types';
import type { NormalizedInput, CanonicalOutput } from '../types';

export interface HookExecutionReport {
  exitCode: number;
  wroteOutput: boolean;
  status: 'completed' | 'skipped' | 'error';
  reason?: string;
  stderrMessage?: string;
}

const HOOK_ENV_NAMES = [
  'ROSETTA_DEBUG',
  'CLAUDE_PLUGIN_ROOT',
  'TMPDIR',
  'TMP',
  'TEMP',
  'HOME',
  'PWD',
  'USERPROFILE',
] as const;

type Env = Record<string, string | undefined>;

// Some IDEs (Windsurf) deliver a hook's deny reason to the model only via stderr. The CLI
// entrypoint and the in-process test seam must surface it identically — one helper, one behavior.
const writeStderrMessage = (
  report: HookExecutionReport,
  stderr: NodeJS.WritableStream = process.stderr,
): void => {
  if (report.stderrMessage) stderr.write(report.stderrMessage);
};

export const runAsCli = (def: HookDefinition, mod: NodeModule): void => {
  if (require.main !== mod) return;
  let exitReport: HookExecutionReport | null = null;
  process.once('exit', (actualExitCode) => {
    debugLogHook(def.name, 'process-exit', {
      actualExitCode,
      intendedExitCode: exitReport?.exitCode ?? null,
      status: exitReport?.status ?? null,
      wroteOutput: exitReport?.wroteOutput ?? null,
      reason: exitReport?.reason ?? null,
    });
  });
  executeHook(def, { env: process.env }).then((report) => {
    exitReport = report;
    writeStderrMessage(report);
    debugLogHook(def.name, 'cli-exit', report);
    process.exit(report.exitCode);
  });
};

const toHookContext = (norm: NormalizedInput): HookContext => ({
  ide:          norm.ide,
  event:        norm.event,
  toolKind:     norm.toolKind,
  toolName:     (norm.tool_name as string) ?? '',
  filePath:     norm.file_path ?? '',
  cwd:          (norm.cwd as string) ?? '',
  sessionId:    (norm.session_id as string) ?? null,
  agentId:      ((norm.agent_id as string) ?? (norm.subagent_id as string)) ?? null,
  turnId:       ((norm.turn_id as string) ?? (norm.generation_id as string) ?? (norm.execution_id as string)) ?? null,
  transcriptPath: (norm.transcript_path as string) ?? null,
  source:       (norm.source as string) ?? null,
  reason:       (norm.reason as string) ?? null,
  trigger:      (norm.trigger as string) ?? null,
  toolInput:    norm.tool_input ?? {},
  toolResponse: norm.tool_response,
});

// Exported for tests: lets the Codex strict-schema suites drive the REAL canonical shape through each
// adapter's formatOutput (rather than a fabricated object). Behavior unchanged — this is the same
// builder used by executeHook below.
export const toCanonical = (result: NonNullable<HookResult>, ctx: HookContext): CanonicalOutput => {
  if (result.kind === 'advise')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow', additionalContext: result.message } };
  if (result.kind === 'deny')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'deny', permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === 'allow')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow' } };
  return {};
};

// `_exitCode` on the HookResult overrides everything else — emergency escape hatch, not for
// normal use (see runtime/types.ts). Otherwise: deny -> the IDE adapter's exit code (0 unless the
// adapter overrides it); everything else -> 0. A failure resolving the code itself -> 1000.
export const resolveExitCode = (result: NonNullable<HookResult>, canonical: CanonicalOutput, ide: string): number => {
  try {
    if (result._exitCode != null) return result._exitCode;
    if (canonical.hookSpecificOutput?.permissionDecision === 'deny') return adapter.exitCodeFor(canonical, ide);
    return 0;
  } catch {
    return 1000;
  }
};

const makeDedupKey = (
  dedupBy: readonly ('session' | 'filePath' | 'ide' | 'toolName' | 'toolInput')[],
  ctx: HookContext,
  name: string,
): string => {
  const key = [
    name,
    ...(dedupBy.includes('session')   ? [ctx.sessionId ?? 'no-session'] : []),
    ...(dedupBy.includes('filePath')  ? [ctx.filePath]                  : []),
    ...(dedupBy.includes('ide')       ? [ctx.ide]                       : []),
    ...(dedupBy.includes('toolName')  ? [ctx.toolName]                  : []),
    ...(dedupBy.includes('toolInput') ? [JSON.stringify(ctx.toolInput)] : []),
  ].join(':');
  debugLogBranch('run-hook', 'make-dedup-key', {
    hookName: name,
    dedupBy,
    key,
    sessionId: ctx.sessionId,
    filePath: ctx.filePath,
    ide: ctx.ide,
    toolName: ctx.toolName,
  });
  return key;
};

const evalFilePath = (fp: FilePathPredicate, filePath: string): boolean => {
  const p  = filePath;
  const pl = p.toLowerCase();
  const rel = toRelative(p);
  debugLogBranch('run-hook', 'eval-file-path-start', {
    filePath,
    predicate: fp,
    relativePath: rel,
  });
  if (fp.extOneOf && !fp.extOneOf.some(e => p.endsWith(e))) {
    debugLogBranch('run-hook', 'eval-file-path-result', {
      filePath,
      result: false,
      reason: 'extOneOf-mismatch',
      extOneOf: fp.extOneOf,
    });
    return false;
  }
  if (fp.extOneOfCi && !fp.extOneOfCi.some(e => pl.endsWith(e.toLowerCase()))) {
    debugLogBranch('run-hook', 'eval-file-path-result', {
      filePath,
      result: false,
      reason: 'extOneOfCi-mismatch',
      extOneOfCi: fp.extOneOfCi,
    });
    return false;
  }
  if (fp.notContainsAny && fp.notContainsAny.some(s => p.includes(s))) {
    const matched = fp.notContainsAny.filter((s) => p.includes(s));
    debugLogBranch('run-hook', 'eval-file-path-result', {
      filePath,
      result: false,
      reason: 'notContainsAny-blocked',
      matched,
    });
    return false;
  }
  if (fp.notTokenSegmentAny) {
    const segs = pl.split('/');
    const blocked = segs.some(seg =>
      seg.split(/[-_.]/).some(tok => fp.notTokenSegmentAny!.includes(tok)),
    );
    if (blocked) {
      debugLogBranch('run-hook', 'eval-file-path-result', {
        filePath,
        result: false,
        reason: 'notTokenSegmentAny-blocked',
        segments: segs,
        notTokenSegmentAny: fp.notTokenSegmentAny,
      });
      return false;
    }
  }
  if (fp.notStartsWithAny && fp.notStartsWithAny.some(s => rel.startsWith(s) || p.includes('/' + s))) {
    const matched = fp.notStartsWithAny.filter((s) => rel.startsWith(s) || p.includes('/' + s));
    debugLogBranch('run-hook', 'eval-file-path-result', {
      filePath,
      result: false,
      reason: 'notStartsWithAny-blocked',
      matched,
      relativePath: rel,
    });
    return false;
  }
  if (fp.notBasenameOneOf && fp.notBasenameOneOf.includes(path.basename(p))) {
    debugLogBranch('run-hook', 'eval-file-path-result', {
      filePath,
      result: false,
      reason: 'notBasenameOneOf-blocked',
      basename: path.basename(p),
      notBasenameOneOf: fp.notBasenameOneOf,
    });
    return false;
  }
  debugLogBranch('run-hook', 'eval-file-path-result', {
    filePath,
    result: true,
    reason: 'passed',
  });
  return true;
};

const evalToolInput = (ti: ToolInputPredicate, ctx: HookContext): boolean => {
  debugLogBranch('run-hook', 'eval-tool-input-start', {
    predicate: ti,
    toolName: ctx.toolName,
    toolInput: ctx.toolInput,
  });
  if (ti.commandMatchWhen) {
    const { tools, re } = ti.commandMatchWhen;
    if (tools.includes(ctx.toolName)) {
      const command = (ctx.toolInput.command as string) ?? '';
      const matched = re.test(command);
      debugLogBranch('run-hook', 'eval-tool-input-command-match-when', {
        toolName: ctx.toolName,
        tools,
        command,
        matched,
        pattern: re.source,
        flags: re.flags,
      });
      if (!matched) {
        debugLogBranch('run-hook', 'eval-tool-input-result', {
          result: false,
          reason: 'commandMatchWhen-mismatch',
          toolName: ctx.toolName,
        });
        return false;
      }
    } else {
      debugLogBranch('run-hook', 'eval-tool-input-command-match-when-skipped', {
        toolName: ctx.toolName,
        tools,
        reason: 'tool-not-targeted',
      });
    }
  }
  debugLogBranch('run-hook', 'eval-tool-input-result', {
    result: true,
    reason: 'passed',
    toolName: ctx.toolName,
  });
  return true;
};

export const runHook = async (
  def: HookDefinition,
  opts: { stdin?: NodeJS.ReadableStream; stdout?: NodeJS.WritableStream; stderr?: NodeJS.WritableStream; env?: Env } = {},
): Promise<void> => {
  const report = await executeHook(def, opts);
  // Mirror runAsCli: an IDE whose deny reason travels on stderr (Windsurf) needs it written here too,
  // so non-CLI/test consumers of runHook observe the same behavior. Defaults to process.stderr.
  writeStderrMessage(report, opts.stderr);
};

// Exported so tests can assert the full HookExecutionReport (exit code, stderrMessage, wroteOutput)
// end-to-end. runHook/runAsCli are the production wrappers; keep their contracts (void / process
// side effects) stable and assert the report through this instead.
export const executeHook = async (
  def: HookDefinition,
  opts: { stdin?: NodeJS.ReadableStream; stdout?: NodeJS.WritableStream; env?: Env } = {},
): Promise<HookExecutionReport> => {
  // env defaults to {} (NOT process.env) so calling this from a test doesn't leak the host
  // shell's own IDE env vars (e.g. this repo's dev shell commonly has CLAUDECODE=1 set) into
  // detection — only runAsCli (the real CLI entrypoint) opts in with the real process.env.
  const { stdin = process.stdin, stdout = process.stdout, env = {} } = opts;
  try {
    debugLogHook(def.name, 'received', {
      activation: def.on,
      throttle: def.throttle ?? null,
      runtime: {
        processCwd: process.cwd(),
        argv: process.argv,
        execPath: process.execPath,
        nodeVersion: process.version,
        platform: process.platform,
        env: collectEnvironment(HOOK_ENV_NAMES),
      },
    });

    const raw = await adapter.readStdin(stdin);
    debugLogHook(def.name, 'raw-input', { rawInput: raw });

    const ide = adapter.detectIDE(raw, env);
    const norm = adapter.normalize(raw, env);

    debugLogHook(def.name, 'normalized', {
      ide,
      event: norm.event,
      toolKind: norm.toolKind,
      toolName: norm.tool_name ?? null,
      normalizedInput: norm,
    });

    const events = Array.isArray(def.on.event) ? def.on.event : [def.on.event];
    if (!events.includes(norm.event as never)) {
      debugLogHook(def.name, 'skipped', {
        reason: 'event-mismatch',
        allowedEvents: events,
        actualEvent: norm.event,
      });
      return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'event-mismatch' };
    }
    debugLogHook(def.name, 'event-gate', {
      matched: true,
      allowedEvents: events,
      actualEvent: norm.event,
    });
    if (def.on.toolKinds && !def.on.toolKinds.includes(norm.toolKind as never)) {
      debugLogHook(def.name, 'skipped', {
        reason: 'tool-kind-mismatch',
        allowedToolKinds: def.on.toolKinds,
        actualToolKind: norm.toolKind,
      });
      return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'tool-kind-mismatch' };
    }
    debugLogHook(def.name, 'tool-kind-gate', {
      matched: true,
      constrained: Boolean(def.on.toolKinds),
      allowedToolKinds: def.on.toolKinds ?? null,
      actualToolKind: norm.toolKind,
    });

    const ctx0 = toHookContext(norm);
    debugLogHook(def.name, 'context', { hookContext: ctx0 });

    if (def.on.filePath && !evalFilePath(def.on.filePath, ctx0.filePath)) {
      debugLogHook(def.name, 'skipped', {
        reason: 'file-path-predicate-failed',
        predicate: def.on.filePath,
        filePath: ctx0.filePath,
      });
      return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'file-path-predicate-failed' };
    }
    if (def.on.toolInput && !evalToolInput(def.on.toolInput, ctx0)) {
      debugLogHook(def.name, 'skipped', {
        reason: 'tool-input-predicate-failed',
        predicate: def.on.toolInput,
        toolName: ctx0.toolName,
        toolInput: ctx0.toolInput,
      });
      return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'tool-input-predicate-failed' };
    }

    let markerRoot: string | undefined;
    if (def.on.fs?.nearestMarker) {
      const found = walkUp(ctx0.cwd || process.cwd(), def.on.fs.nearestMarker);
      debugLogHook(def.name, 'fs-gate', {
        nearestMarker: def.on.fs.nearestMarker,
        cwd: ctx0.cwd || process.cwd(),
        found: found ?? null,
      });
      if (!found) {
        debugLogHook(def.name, 'skipped', {
          reason: 'nearest-marker-not-found',
          nearestMarker: def.on.fs.nearestMarker,
          cwd: ctx0.cwd || process.cwd(),
        });
        return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'nearest-marker-not-found' };
      }
      debugLogHook(def.name, 'fs-gate-passed', {
        nearestMarker: def.on.fs.nearestMarker,
        cwd: ctx0.cwd || process.cwd(),
        markerRoot: found,
      });
      markerRoot = found;
    }

    const ctx = markerRoot !== undefined ? { ...ctx0, markerRoot } : ctx0;
    debugLogHook(def.name, 'context-final', { hookContext: ctx });

    if (def.throttle && 'dedupBy' in def.throttle) {
      const dedupKeyValue = makeDedupKey(def.throttle.dedupBy, ctx, def.name);
      if (!acquireOnce(dedupKeyValue)) {
        debugLogHook(def.name, 'skipped', {
          reason: 'throttle-dedup',
          throttle: def.throttle,
          dedupKey: dedupKeyValue,
        });
        return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'throttle-dedup' };
      }
      debugLogHook(def.name, 'throttle-dedup', {
        throttle: def.throttle,
        dedupKey: dedupKeyValue,
      });
    }

    debugLogHook(def.name, 'all-gates-passed', {
      event: ctx.event,
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
      filePath: ctx.filePath,
      markerRoot: ctx.markerRoot ?? null,
    });

    const result = await def.run(ctx);
    debugLogHook(def.name, 'result', { hookResult: result });

    if (!result) {
      debugLogHook(def.name, 'completed', {
        exitCode: 0,
        wroteOutput: false,
        reason: 'null-result',
      });
      return { exitCode: 0, wroteOutput: false, status: 'completed', reason: 'null-result' };
    }
    if (result.kind === 'side-effect') {
      const sideEffectExitCode = result._exitCode ?? 0;
      debugLogHook(def.name, 'completed', {
        exitCode: sideEffectExitCode,
        wroteOutput: false,
        reason: 'side-effect',
      });
      return { exitCode: sideEffectExitCode, wroteOutput: false, status: 'completed', reason: 'side-effect' };
    }

    const canonicalOutput = toCanonical(result, ctx);
    const formattedOutput = adapter.formatOutput(canonicalOutput, ide);
    const outputText = JSON.stringify(formattedOutput);
    const exitCode = resolveExitCode(result, canonicalOutput, ide);
    // Some IDEs deliver the deny reason to the model via STDERR, not the stdout JSON body (Windsurf:
    // stdout is never parsed — see adapters/windsurf.ts). stderrMessageFor is unset for every other
    // IDE, so this is a no-op for them. Written by runAsCli/runHook, not here (executeHook is I/O-free
    // for stderr; it only owns stdout).
    const stderrMessage = adapter.stderrMessageFor(canonicalOutput, ide) || undefined;
    // TODO: json-cycle is only needed because this log entry carries both
    // canonicalOutputFull and finalOutputFull, which may be the same object
    // reference. Split these into two independent debugLogHook calls and remove
    // the json-cycle dependency if log consumers do not need same-entry refs.
    debugLogHook(def.name, 'output', {
      hookResultFull: result,
      canonicalOutputFull: canonicalOutput,
      finalOutputFull: formattedOutput,
      finalOutputText: outputText,
      finalOutputBytes: Buffer.byteLength(outputText, 'utf8'),
    });
    stdout.write(outputText);
    debugLogHook(def.name, 'completed', {
      exitCode,
      wroteOutput: true,
      finalOutputBytes: Buffer.byteLength(outputText, 'utf8'),
      stderrMessageBytes: stderrMessage ? Buffer.byteLength(stderrMessage, 'utf8') : 0,
    });
    return { exitCode, wroteOutput: true, status: 'completed', ...(stderrMessage ? { stderrMessage } : {}) };
  } catch (err) {
    const error = err as Error;
    debugLogHook(def.name, 'error', { error });
    return {
      exitCode: 1,
      wroteOutput: false,
      status: 'error',
      reason: error.message,
      stderrMessage: `${def.name} hook error: ${error.message}\n`,
    };
  }
};
