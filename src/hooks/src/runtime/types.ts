import type { IdeName, SemanticEvent, SemanticKind } from './ide-registry';

export interface HookContext {
  ide: IdeName;
  event: SemanticEvent | null;
  toolKind: SemanticKind | null;
  toolName: string;
  filePath: string;
  cwd: string;
  sessionId: string | null;
  agentId?: string | null;
  turnId?: string | null;
  transcriptPath?: string | null;
  source?: string | null;
  reason?: string | null;
  trigger?: string | null;
  toolInput: Readonly<Record<string, unknown>>;
  toolResponse?: unknown;
  markerRoot?: string;
}

// `_exitCode`: emergency override of the process exit code, bypassing both the deny-based
// decision and the adapter default. DO NOT use unless EXTREMELY necessary — normal hooks
// should rely on `kind` (deny → the IDE's documented exit code; everything else → 0).
export type HookResult =
  | { kind: 'advise'; message: string; _exitCode?: number }
  | { kind: 'allow'; _exitCode?: number }
  | { kind: 'deny'; reason: string; _exitCode?: number }
  | { kind: 'side-effect'; _exitCode?: number }
  | null;

export type FilePathPredicate = {
  extOneOf?:           readonly string[];
  extOneOfCi?:         readonly string[];
  notContainsAny?:     readonly string[];
  notTokenSegmentAny?: readonly string[];
  notStartsWithAny?:   readonly string[];
  notBasenameOneOf?:   readonly string[];
};

export type ToolInputPredicate = {
  commandMatchWhen?: { tools: readonly string[]; re: RegExp };
};

export type FsPredicate = {
  nearestMarker?: string;
};

export type HookActivation = {
  event:      SemanticEvent | readonly SemanticEvent[];
  toolKinds?: readonly SemanticKind[];
  filePath?:  FilePathPredicate;
  toolInput?: ToolInputPredicate;
  fs?:        FsPredicate;
};

export type HookThrottle =
  | { debounceMs: number }
  | { dedupBy: readonly ('session' | 'filePath' | 'ide' | 'toolName' | 'toolInput')[] };

export interface HookDefinition {
  name:      string;
  on:        HookActivation;
  throttle?: HookThrottle;
  run: (ctx: HookContext) => HookResult | Promise<HookResult>;
}
