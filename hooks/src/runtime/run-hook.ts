import path from 'path';
import { readStdin, detectIDE, normalize, formatOutput, dedupKey } from '../adapter';
import { acquireOnce } from './throttle';
import { debugLog } from './debug-log';
import { toRelative, walkUp } from './path-utils';
import type { HookDefinition, HookContext, HookResult, FilePathPredicate, ToolInputPredicate } from './types';
import type { NormalizedInput, CanonicalOutput } from '../types';

export const runAsCli = (def: HookDefinition, mod: NodeModule): void => {
  if (require.main !== mod) return;
  runHook(def).then(
    () => process.exit(0),
    (err: Error) => {
      process.stderr.write(`${def.name} hook error: ${err.message}\n`);
      process.exit(1);
    },
  );
};

const toHookContext = (norm: NormalizedInput): HookContext => ({
  ide:          norm.ide,
  event:        norm.event,
  toolKind:     norm.toolKind,
  toolName:     (norm.tool_name as string) ?? '',
  filePath:     norm.file_path ?? '',
  cwd:          (norm.cwd as string) ?? '',
  sessionId:    (norm.session_id as string) ?? null,
  toolInput:    norm.tool_input,
  toolResponse: norm.tool_response,
});

const toCanonical = (result: NonNullable<HookResult>, ctx: HookContext): CanonicalOutput => {
  if (result.kind === 'advise')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow', additionalContext: result.message } };
  if (result.kind === 'deny')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'deny', permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === 'allow')
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow' } };
  return {};
};

const makeDedupKey = (
  dedupBy: readonly ('session' | 'filePath' | 'ide' | 'toolName' | 'toolInput')[],
  ctx: HookContext,
  name: string,
): string => [
  name,
  ...(dedupBy.includes('session')   ? [ctx.sessionId ?? 'no-session'] : []),
  ...(dedupBy.includes('filePath')  ? [ctx.filePath]                  : []),
  ...(dedupBy.includes('ide')       ? [ctx.ide]                       : []),
  ...(dedupBy.includes('toolName')  ? [ctx.toolName]                  : []),
  ...(dedupBy.includes('toolInput') ? [JSON.stringify(ctx.toolInput)] : []),
].join(':');

const evalFilePath = (fp: FilePathPredicate, filePath: string): boolean => {
  const p  = filePath;
  const pl = p.toLowerCase();
  const rel = toRelative(p);
  if (fp.extOneOf        && !fp.extOneOf.some(e => p.endsWith(e)))                  return false;
  if (fp.extOneOfCi      && !fp.extOneOfCi.some(e => pl.endsWith(e.toLowerCase()))) return false;
  if (fp.notContainsAny  &&  fp.notContainsAny.some(s => p.includes(s)))            return false;
  if (fp.notTokenSegmentAny) {
    const segs = pl.split('/');
    const blocked = segs.some(seg =>
      seg.split(/[-_.]/).some(tok => fp.notTokenSegmentAny!.includes(tok)),
    );
    if (blocked) return false;
  }
  if (fp.notStartsWithAny && fp.notStartsWithAny.some(s => rel.startsWith(s) || p.includes('/' + s))) return false;
  if (fp.notBasenameOneOf && fp.notBasenameOneOf.includes(path.basename(p)))    return false;
  return true;
};

const evalToolInput = (ti: ToolInputPredicate, ctx: HookContext): boolean => {
  if (ti.commandMatchWhen) {
    const { tools, re } = ti.commandMatchWhen;
    if (tools.includes(ctx.toolName)) {
      const command = (ctx.toolInput.command as string) ?? '';
      if (!re.test(command)) return false;
    }
  }
  return true;
};

export const runHook = async (
  def: HookDefinition,
  opts: { stdin?: NodeJS.ReadableStream; stdout?: NodeJS.WritableStream } = {},
): Promise<void> => {
  const { stdin = process.stdin, stdout = process.stdout } = opts;
  try {
    const raw   = await readStdin(stdin);
    const ide   = detectIDE(raw);
    const norm  = normalize(raw);

    debugLog(`[runHook:${def.name}]`, { ide, event: norm.event, toolKind: norm.toolKind });

    if (norm.event !== def.on.event) return;
    if (!def.on.toolKinds.includes(norm.toolKind as never)) return;

    const ctx0 = toHookContext(norm);

    if (def.on.filePath  && !evalFilePath(def.on.filePath, ctx0.filePath)) return;
    if (def.on.toolInput && !evalToolInput(def.on.toolInput, ctx0))        return;

    let markerRoot: string | undefined;
    if (def.on.fs?.nearestMarker) {
      const found = walkUp(ctx0.cwd || process.cwd(), def.on.fs.nearestMarker);
      if (!found) return;
      markerRoot = found;
    }

    const ctx = markerRoot !== undefined ? { ...ctx0, markerRoot } : ctx0;

    // Platform-level dedup: collapses duplicate events from IDEs that fire multiple times per call.
    const platformKey = dedupKey(raw, def.name);
    if (platformKey !== null && !acquireOnce(platformKey)) return;

    if (def.throttle && 'dedupBy' in def.throttle) {
      if (!acquireOnce(makeDedupKey(def.throttle.dedupBy, ctx, def.name))) return;
    }

    const result = await def.run(ctx);

    if (!result || result.kind === 'side-effect') return;

    stdout.write(JSON.stringify(formatOutput(toCanonical(result, ctx), ide)));
  } catch (err) {
    debugLog(`[runHook:${def.name}] error`, { err: (err as Error).message });
  }
};
