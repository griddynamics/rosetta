import { readStdin, detectIDE, normalize, formatOutput } from '../adapter';
import { acquireOnce } from './throttle';
import { debugLog } from '../debug-log';
import type { HookDefinition, HookContext, HookResult } from './types';
import type { NormalizedInput, CanonicalOutput } from '../types';

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
    return { hookSpecificOutput: { hookEventName: ctx.event ?? '', additionalContext: result.message } };
  if (result.kind === 'deny')
    return { hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: result.reason }, continue: false };
  if (result.kind === 'allow')
    return { hookSpecificOutput: { permissionDecision: 'allow' } };
  return {};
};

const makeDedupKey = (
  dedupBy: readonly ('session' | 'filePath' | 'ide')[],
  ctx: HookContext,
  name: string,
): string => [
  name,
  ...(dedupBy.includes('session') ? [ctx.sessionId ?? 'no-session'] : []),
  ...(dedupBy.includes('filePath') ? [ctx.filePath] : []),
  ...(dedupBy.includes('ide') ? [ctx.ide] : []),
].join(':');

export const runHook = async (
  def: HookDefinition,
  opts: { stdin?: NodeJS.ReadableStream; stdout?: NodeJS.WriteStream } = {},
): Promise<void> => {
  const { stdin = process.stdin, stdout = process.stdout } = opts;
  try {
    const raw   = await readStdin(stdin);
    const ide   = detectIDE(raw);
    const norm  = normalize(raw);

    debugLog(`[runHook:${def.name}]`, { ide, event: norm.event, toolKind: norm.toolKind });

    if (norm.event !== def.on.event) return;
    if (!def.on.toolKinds.includes(norm.toolKind as never)) return;

    if (def.throttle && 'dedupBy' in def.throttle) {
      const ctx0 = toHookContext(norm);
      if (!acquireOnce(makeDedupKey(def.throttle.dedupBy, ctx0, def.name))) return;
    }

    const ctx    = toHookContext(norm);
    const result = await def.run(ctx);

    if (!result || result.kind === 'side-effect') return;

    stdout.write(JSON.stringify(formatOutput(toCanonical(result, ctx), ide)));
  } catch (err) {
    debugLog(`[runHook:${def.name}] error`, { err: (err as Error).message });
  }
};
