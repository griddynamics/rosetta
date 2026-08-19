// FR-ARCH-0001/0002/0003/0030/0036/0039 — all PascalCase domain types, camelCase processor factories

import type { Writable } from 'stream';

export type DirectiveToken = string;

export interface SourceFile {
  origin: string; // absolute path to source file
  frontmatter?: Frontmatter;
  order: string; // for stable sort (from VFS build)
  conditions: Set<DirectiveToken>;
  /** Populated by fileRead: raw content (LF-normalized, frontmatter included for source 0,
   *  body only for sources 1+). Consumed by fileBundle to avoid re-reading from disk.
   *  FR-ARCH-0033/NFR-0007 (F-E fix). */
  _readContent?: string;
}

export interface VirtualFile {
  path: string; // relative path from instruction root (e.g. "rules/bootstrap-core-policy.md")
  sourceFiles: SourceFile[];
}

export type Vfs = readonly VirtualFile[]; // immutable, sorted (FR-ARCH-0012/0013)

// FR-ARCH-0030
export interface FileProcessingFrame {
  sourcePath: string; // original VirtualFile.path
  target: string;     // current (possibly renamed) plugin-relative path
  isBinary: boolean;
  target_contents: string | Buffer | null; // null=drop, ''=empty, else content (FR-ARCH-0036)
  source: SourceFile[];                    // structurally-shared working copy
  errors?: GenError[];                     // file-level errors (e.g. binary+>1 source); propagated to PluginProcessingFrame
  verbatim?: boolean;                      // when true, pluginRewriteReferences skips this frame (TODO-2)
}

// FR-ARCH-0039
export interface PluginProcessingFrame {
  spec: PluginSpec;
  vfs: Vfs;
  frames: FileProcessingFrame[];
  templateContext: Record<string, unknown>; // release vars + bootstrap placeholders
  errors: GenError[];                        // accumulated (FR-CLI-0041)
}

export type FileProcessor = (f: FileProcessingFrame, ctx: TargetContext) => FileProcessingFrame;
export type PluginProcessor = (p: PluginProcessingFrame) => PluginProcessingFrame;

// FR-ARCH-0002
export interface SpecEntry {
  source: string;
  target: string;
  exclude: string[];
  processors: FileProcessor[];
  verbatim?: boolean; // when true, frames produced from this entry skip pluginRewriteReferences (TODO-2)
}

export interface IndexDecl {
  folder: string;          // source folder to scan (e.g. "rules", "workflows")
  targetFolder: string;    // target folder name (may differ after rename)
  requiredTag?: string;    // if set, only files with this tag are included (FR-GEN-0003)
  heading: 'rules' | 'workflows'; // determines heading text (FR-GEN-0004)
}

export interface InjectionDecl {
  hostFramePath: string;   // plugin-relative path of the host frame (after renames)
  anchor: string;          // exact anchor string in the file (line prefix match)
  sections: InjectionSection[];
}

export interface InjectionSection {
  kind: 'literal' | 'index' | 'plugin-root';
  text?: string;           // for literal sections
  indexFolder?: string;    // for index sections — which index to inject
}

// DATA-CFG-0001
export interface ReleaseDescriptor {
  name: string;            // e.g. "r2"
  deterministicHooks: boolean;
  displayName: string;     // e.g. "R2.0"
}

// DATA-CFG-0004
export interface ModelVocabulary {
  map: Record<string, string>; // logical key → IDE-specific value
  /**
   * Behavior flag — NOT an identity discriminant (FR-ARCH-0005). Its value set is
   * {profiled, unprofiled}; any target may carry either value, the same species as the
   * permitted `ReleaseDescriptor.deterministicHooks` flag. The deleted `ModelVocabulary.kind`
   * was forbidden because it switched dispatch on IDE identity — this does not: every
   * normalize*() function runs the identical single-loop scan regardless of target, and
   * `exhaustive` only selects which OUTCOME terminates that scan. Its ONLY permitted use is
   * selecting the no-survivor outcome: `true` ⇒ an exhausted scan ends in `MODEL_DROP`
   * (profiled exhaustive replacement); `false`/omitted ⇒ the scan ends in today's per-vocabulary
   * fallback (byte-identical built-in behavior). Omitted (=false) on every built-in vocabulary.
   * No processor may branch on target/IDE identity off this or any other field (FR-ARCH-0059).
   */
  exhaustive?: boolean;
}

/**
 * Sentinel returned by normalize{Claude,Cursor,Copilot,Codex}() (spec/model-maps.ts) to mean
 * "remove the model: line" — the profiled exhaustive-replacement no-survivor outcome — distinct
 * from `null` ("no qualifying token found → leave field unchanged", today's non-exhaustive
 * behavior). FR-ARCH-0059, DATA-CFG-0004. Declared here rather than in spec/model-maps.ts: it is
 * a cross-module contract value shared by the 4 normalize*() functions and the FileProcessors
 * that call them (file-normalize-*-models.ts, file-codex-agent.ts) — import it from
 * '../types.js' rather than redeclaring it.
 */
export const MODEL_DROP: unique symbol = Symbol('MODEL_DROP');

// FR-ARCH-0001, DATA-CFG-0002
export interface PluginSpec {
  name: string;                // e.g. "core-claude"
  destination: string;         // output folder name == name
  baseSubfolder: string;       // "" | ".cursor" | ".github" | ".agents"-style root
  preservedSource: string;     // src/rosettify-plugins/plugins/<parent>/ (FR-SEED-0001/0002)
  modelVocabulary: ModelVocabulary;
  bootstrapManifest: BootstrapEntryRef[]; // FR-HOOK-0009 ordered
  includeIndexEntries: boolean;   // FR-HOOK-0004
  pluginRootPath: string;         // reported to agent (FR-HOOK-0007)
  indexes: IndexDecl[];
  injections: InjectionDecl[];
  specEntries: SpecEntry[];
  pluginProcessors: PluginProcessor[];
  manifestOverride?: { name: string; version: 'parent' }; // standalones (FR-VAR-0060)
  /** For standalone targets: specific templates to register with remapped paths.
   *  Each [sourceRelPath, targetPath] where sourceRelPath is relative to preservedSource.
   *  Rendered to targetPath (minus .tmpl). GT-4 standalone hooks template routing. */
  standaloneTemplates?: Array<[sourceRelPath: string, targetPath: string]>;
  /**
   * Mirror declarations: after rendering, clone rendered frames to alternate-name target paths.
   * Each entry is {from: rendered-target-path, to: alternate-target-path}.
   * Used for codex .codex/hooks.json mirror and copilot root hooks.json copy.
   * DATA-CFG-0002, GT-4.
   */
  mirrors?: Array<{ from: string; to: string }>;
  /**
   * Bundle source target name for hook bundle sync.
   * Standalone targets reference their parent target's bundles (e.g. 'core-cursor').
   * Main targets use their own name (default: spec.name).
   * F-F-adjacent fix: eliminates spec.name branching in pluginSyncBundles. DATA-CFG-0002.
   */
  bundleSource?: string;
  /**
   * Hook folder path relative to the target output directory.
   * Replaces the hardcoded resolveHookFolder switch. DATA-CFG-0002.
   */
  hookFolder: string;
}

// FR-HOOK-0009 — one entry in the bootstrap manifest ordered list
export interface BootstrapEntryRef {
  basename: string;   // filename without extension (e.g. "plugin-files-mode")
}

export interface Frontmatter {
  name?: string;
  description?: string;
  model?: string;
  tags?: string[];
  readonly?: boolean;
  [key: string]: unknown;
}

export interface GenError {
  target: string;
  file?: string;
  message: string;
  kind: 'soft' | 'hard';
}

// Context passed to FileProcessors alongside the frame (FR-ARCH-0040)
export interface TargetContext {
  spec: PluginSpec;
  vfs: Vfs;
  release: ReleaseDescriptor;
  // FR-PROF-0030 — active --profile name for this run, or null when no profile is set; mirrors
  // the `release` axis. Read by matchesProfile()/fileApplyOverrides to resolve `profile-<name>-only`
  // filename directives. Threaded GenerateOptions.profile → SpecBuildContext →
  // pluginProcessSpecEntries → this literal.
  activeProfile: string | null;
}

// FR-CLI-0020 — resolved source locations (derived from --source + per-source overrides)
export interface ResolvedSources {
  instructionsSource: string; // <source>/instructions (or --instructionsSource override)
  pluginsSource: string;      // <source>/src/rosettify-plugins/plugins (or --pluginsSource override)
  hooksSource: string;        // <source>/src/hooks (or --hooksSource override)
  outputDir: string;          // <source>/plugins (or --output override)
  // FR-CLI-0033 — <source>/src/rosettify-plugins/profiles (or --profileSource override), resolved
  // from --source exactly as pluginsSource/hooksSource/instructionsSource above.
  profileSource: string;
}

export interface GenerateOptions {
  sources: ResolvedSources;
  release: string;
  domain: string;
  dryRun: boolean;
  verbose: boolean;
  deterministicHooks?: boolean; // FR-CLI-0012 — per-run override; undefined → false (fixed default, not the release descriptor value)
  out?: Writable;               // FR-ARCH-0045/FR-CLI-0050 — dry-run output sink; defaults to process.stdout
  // FR-CLI-0032 — active profile name, validated/loaded via loadProfile() at generate() pre-flight
  // (before buildVfs) so any violation aborts before output is written; undefined = no profile.
  profile?: string;
}

// FR-ARCH-0003, DATA-CFG-0003 — the canonical target-name list. SINGLE SOURCE OF TRUTH: both
// `spec/targets.ts` (which builds one PluginSpec per name) and `spec/profiles.ts` (which validates a
// profile's modelOverrides outer keys against it) MUST import from here rather than restate it.
// `types.ts` is the right home because it imports nothing from `spec/`, so neither direction cycles.
