import type { IdeName, SemanticEvent, SemanticKind } from './ide-registry';

export interface HookContext {
  ide: IdeName;
  event: SemanticEvent | null;
  toolKind: SemanticKind | null;
  toolName: string;
  filePath: string;
  cwd: string;
  sessionId: string | null;
  toolInput: Readonly<Record<string, unknown>>;
  toolResponse?: unknown;
}

export type HookResult =
  | { kind: 'advise'; message: string }
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'side-effect' }
  | null;

export type HookActivation = {
  event: SemanticEvent;
  toolKinds: readonly SemanticKind[];
};

export type HookThrottle =
  | { debounceMs: number }
  | { dedupBy: readonly ('session' | 'filePath' | 'ide')[] };

export interface HookDefinition {
  name: string;
  on: HookActivation;
  throttle?: HookThrottle;
  run: (ctx: HookContext) => HookResult | Promise<HookResult>;
}
