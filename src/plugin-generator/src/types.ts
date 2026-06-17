// FR-ARCH-0001/0002/0003/0030/0036/0039 — all PascalCase domain types, camelCase processor factories

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
}

// FR-ARCH-0001, DATA-CFG-0002
export interface PluginSpec {
  name: string;                // e.g. "core-claude"
  destination: string;         // output folder name == name
  baseSubfolder: string;       // "" | ".cursor" | ".github" | ".agents"-style root
  preservedSource: string;     // src/plugin-generator/plugins/<parent>/ (FR-SEED-0001/0002)
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
  isLead: boolean;    // whether this entry gets the bootstrap prefix
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
}

// FR-CLI-0020 — resolved source locations (derived from --source + per-source overrides)
export interface ResolvedSources {
  instructionsSource: string; // <source>/instructions (or --instructionsSource override)
  pluginsSource: string;      // <source>/src/plugin-generator/plugins (or --pluginsSource override)
  hooksSource: string;        // <source>/hooks (or --hooksSource override)
  outputDir: string;          // <source>/plugins (or --output override)
}

export interface GenerateOptions {
  sources: ResolvedSources;
  release: string;
  domain: string;
  dryRun: boolean;
  verbose: boolean;
}
