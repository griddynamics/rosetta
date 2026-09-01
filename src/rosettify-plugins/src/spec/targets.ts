// DATA-CFG-0002/0003/0007 — PluginSpec construction: one spec per (set x variant x IDE target).
// FR-VAR-0010–0072, FR-SEED-0001/0002, FR-COPY-0011

import path from 'path';
import { fileURLToPath } from 'url';
import type { Writable } from 'stream';
import type { PluginSpec, SpecEntry, FileProcessor, PluginProcessor, ReleaseDescriptor } from '../types.js';
import { TARGET_NAMES } from './target-names.js';
import type { TargetName } from './target-names.js';
import { HOOK_LAYOUTS, HOOKS_PSEUDO_FOLDER } from './hook-layouts.js';
import type { HookLayout } from './hook-layouts.js';
import type { PluginSetDecl, SetVariant } from './plugin-sets.js';
import {
  CLAUDE_VOCABULARY,
  CURSOR_VOCABULARY,
  COPILOT_VOCABULARY,
  CODEX_VOCABULARY,
  ANTIGRAVITY_VOCABULARY,
} from './model-maps.js';
import type { ProfileDescriptor } from './profiles.js';
import { resolveEffectiveVocabulary } from './profiles.js';
import { BOOTSTRAP_MANIFEST_ORDER } from './bootstrap-manifest.js';
import { fileRead } from '../file-processors/file-read.js';
import { fileApplyOverrides } from '../file-processors/file-apply-overrides.js';
import { fileBundle } from '../file-processors/file-bundle.js';
import { fileNormalizeClaudeModels } from '../file-processors/file-normalize-claude-models.js';
import { fileNormalizeCursorModels } from '../file-processors/file-normalize-cursor-models.js';
import { fileNormalizeCopilotModels } from '../file-processors/file-normalize-copilot-models.js';
import { fileNormalizeCodexModels } from '../file-processors/file-normalize-codex-models.js';
import { fileRename } from '../file-processors/file-rename.js';
import { fileCodexAgentFormat } from '../file-processors/file-codex-agent.js';
import { fileWorkflowToSkill } from '../file-processors/file-workflow-to-skill.js';
import { pluginCleanup } from '../plugin-processors/plugin-cleanup.js';
import { pluginCopy } from '../plugin-processors/plugin-copy.js';
import { pluginProcessSpecEntries } from '../plugin-processors/plugin-process-spec-entries.js';
import { pluginRewriteReferences } from '../plugin-processors/plugin-rewrite-references.js';
import { pluginGenerateIndexes } from '../plugin-processors/plugin-generate-indexes.js';
import { pluginInjectSections } from '../plugin-processors/plugin-inject-sections.js';
import { pluginAssembleClaudeBootstrap } from '../plugin-processors/plugin-assemble-claude-bootstrap.js';
import { pluginAssembleCursorBootstrap } from '../plugin-processors/plugin-assemble-cursor-bootstrap.js';
import { pluginAssembleCopilotBootstrap } from '../plugin-processors/plugin-assemble-copilot-bootstrap.js';
import { pluginAssembleCodexBootstrap } from '../plugin-processors/plugin-assemble-codex-bootstrap.js';
import { pluginAssembleAntigravityBootstrap } from '../plugin-processors/plugin-assemble-antigravity-bootstrap.js';
import { pluginAntigravitySubagentModel } from '../plugin-processors/plugin-antigravity-subagent-model.js';
import {
  pluginNormalizeSubagentRequiredModel,
  claudeSubagentModelTokenMapper,
  cursorSubagentModelTokenMapper,
  copilotSubagentModelTokenMapper,
  codexSubagentModelTokenMapper,
} from '../plugin-processors/plugin-normalize-subagent-model.js';
import { pluginReplaceLiterals } from '../plugin-processors/plugin-replace-literals.js';
import { pluginAntigravityReduceFrontmatter } from '../plugin-processors/plugin-antigravity-reduce-frontmatter.js';
import { pluginRenderTemplates } from '../plugin-processors/plugin-render-templates.js';
import { pluginMirrorFiles } from '../plugin-processors/plugin-mirror-files.js';
import { pluginSyncBundles } from '../plugin-processors/plugin-sync-bundles.js';
import { pluginWrite } from '../plugin-processors/plugin-write.js';
import { pluginAssembleHooksJson } from '../plugin-processors/plugin-assemble-hooks-json.js';

// Standard excludes (FR-COPY-0011, GT-8)
const RULES_EXCLUDES = [
  'rules/bootstrap.md', // r2 MCP mode
  'rules/mcp-files-mode.md', // r3 MCP mode
  'rules/local-files-mode.md',
];

/**
 * `skills/harness/references/configure/**` is a byte-identical copy of the instruction set's
 * `configure/` tree, which was never reference-rewritten. Rewriting the copy while leaving the
 * original alone silently diverged the two. Reference rewriting was previously all-or-nothing per
 * SpecEntry, so expressing "this subtree only" needs SpecEntry.verbatimPaths (TODO-2).
 */
const VERBATIM_SKILL_PATHS = ['skills/harness/references/configure'];

// FR-ARCH-0049: literal content rewrite pair for targets whose workflows->skills SpecEntry
// restructures document paths (fileWorkflowToSkill). buildRenamePairs deliberately emits no
// folder-level pair for that restructuring mapping (a bare `workflows/` token carries no document
// identity there), so the `WORKFLOW/COMMAND \`workflows/*.md\`` glob-doc string in
// plugin-files-mode.md is left stale unless rewritten explicitly.
const WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR: readonly [string, string] = [
  'WORKFLOW/COMMAND `workflows/*.md`',
  'WORKFLOW/COMMAND `skills/*-flow/SKILL.md`',
];

// Base processors shared across all text file entries
const BASE_PROCESSORS = [fileRead, fileApplyOverrides, fileBundle];

// FR-CLI-0020: all source roots are resolved externally (from --source + overrides) and passed in.
export interface SpecBuildContext {
  pluginsSource: string;  // absolute path to plugin preserved-files root (FR-CLI-0020)
  hooksSource: string;    // absolute path to hooks root for bundle sync (FR-CLI-0020)
  outputDir: string;
  release: ReleaseDescriptor;
  /** FR-CLI-0050: when true, all pipeline processors skip disk writes */
  dryRun?: boolean;
  /** FR-ARCH-0045/FR-CLI-0050: dry-run output sink; defaults to process.stdout */
  out?: Writable;
  /** FR-PROF-0001/0010: the loaded profile descriptor for this variant, or null. */
  profile?: ProfileDescriptor | null;
  /** FR-PROF-0030: the active profile name (or null), threaded into TargetContext. */
  activeProfile?: string | null;
  /** DATA-CFG-0007: the plugin set being built. */
  set: PluginSetDecl;
  /** DATA-CFG-0007: which flavour of that set. */
  variant: SetVariant;
  /** DATA-CFG-0007: IDE targets to expand the set across. */
  targets: readonly TargetName[];
  /** DATA-CFG-0007: bundle modules this set ships, support modules already expanded. */
  hookModules: string[];
  /** DATA-CFG-0007: extra bundle modules pulled in by a named hook module. */
  hookSupportModules: Record<string, string[]>;
}

/** Everything a per-target builder needs that is identical across the seven builders. */
interface TargetCommon {
  set: PluginSetDecl;
  destination: string;
  pluginsRoot: string;
  profile: ProfileDescriptor | null;
  hookModules: string[];
  hookSupportModules: Record<string, string[]>;
  manifest: { name: string; description: string };
  /** Set manifest name BEFORE the variant suffix, for composing the standalone manifest name. */
  manifestBaseName: string;
  manifestNameSuffix: string;
  buildPipeline: (
    bootstrapAssembler: PluginProcessor,
    extraAfterIndexes?: PluginProcessor[],
  ) => PluginProcessor[];
}

// ─── Standard SpecEntries builders ──────────────────────────────────────────

function makeRulesEntry(normalizeModels: FileProcessor): SpecEntry {
  return {
    source: 'rules/**',
    target: 'rules',
    exclude: RULES_EXCLUDES,
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeWorkflowsEntry(normalizeModels: FileProcessor, targetFolder = 'workflows'): SpecEntry {
  return {
    source: 'workflows/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeAgentsEntry(normalizeModels: FileProcessor, targetFolder = 'agents'): SpecEntry {
  return {
    source: 'agents/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeSkillsEntry(normalizeModels: FileProcessor, targetFolder = 'skills'): SpecEntry {
  return {
    source: 'skills/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS, normalizeModels],
    verbatimPaths: VERBATIM_SKILL_PATHS,
  };
}

/**
 * The bundle modules ONE target actually ships: the set's declared modules, narrowed to those its
 * layout genuinely binds, plus those modules' support modules.
 *
 * A set declares hooks once, but not every IDE supports every hook — Antigravity's adapter builds
 * only 5 of the 8 bundles, because its layout binds just the two guardrail modules. Copying the
 * set's full list to every target therefore demanded files that are never built, and the (correct,
 * newly loud) missing-bundle check failed the run. Narrowing by layout is the data-driven fix: a
 * target ships what it can actually invoke.
 */
function modulesForTarget(
  layout: HookLayout | null,
  setModules: readonly string[],
  support: Record<string, string[]>,
): string[] {
  if (!layout) return [];
  const bound = new Set(layout.bindings.flatMap((b) => b.modules));
  const needed = new Set<string>();
  for (const m of setModules) {
    if (!bound.has(m)) continue;
    needed.add(m);
    for (const s of support[m] ?? []) needed.add(s);
  }
  return setModules.filter((m) => needed.has(m));
}

/**
 * The IDE family a target belongs to — the same derivation TARGET_FAMILIES uses. Standalone
 * targets share their parent's preserved template folder and hook bundles.
 */
function familyOf(target: TargetName): string {
  return target.replace(/-standalone$/, '');
}

// ─── Per-target spec builders ───────────────────────────────────────────────
// A Record keyed by target id. Selecting a builder is a data lookup, not a switch on identity
// (FR-ARCH-0005): no function below inspects which set or target it is being called for.

type TargetBuilder = (c: TargetCommon) => PluginSpec;

const TARGET_BUILDERS: Readonly<Record<TargetName, TargetBuilder>> = {
  claude: (c) => ({
    ...base(c, TARGET_NAMES.CLAUDE, CLAUDE_VOCABULARY),
    baseSubfolder: '',
    pluginRootPath: '${CLAUDE_PLUGIN_ROOT}',
    hookFolder: 'hooks',
    manifestConditionalFields: [
      { field: 'commands', requires: 'workflows', value: './workflows/' },
    ],
    specEntries: [
      makeRulesEntry(fileNormalizeClaudeModels),
      makeWorkflowsEntry(fileNormalizeClaudeModels),
      makeAgentsEntry(fileNormalizeClaudeModels),
      makeSkillsEntry(fileNormalizeClaudeModels),
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleClaudeBootstrap, [
      pluginNormalizeSubagentRequiredModel(claudeSubagentModelTokenMapper),
    ]),
  }),

  // workflows→commands, rules/*.md→*.mdc
  cursor: (c) => ({
    ...base(c, TARGET_NAMES.CURSOR, CURSOR_VOCABULARY),
    baseSubfolder: '',
    pluginRootPath: '',
    hookFolder: 'hooks',
    manifestConditionalFields: [
      {
        field: 'rules',
        requires: 'rules',
        value: [
          './rules/bootstrap-alwayson.mdc',
          './rules/plugin-files-mode.mdc',
          './rules/speckit-integration-policy.mdc',
        ],
      },
      { field: 'hooks', requires: HOOKS_PSEUDO_FOLDER, value: './hooks/hooks.json' },
    ],
    specEntries: [
      {
        source: 'rules/**',
        target: 'rules',
        exclude: RULES_EXCLUDES,
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCursorModels,
          fileRename('rules/(.+)\\.md', 'rules/$1.mdc'),
        ],
      },
      makeWorkflowsEntry(fileNormalizeCursorModels, 'commands'),
      makeAgentsEntry(fileNormalizeCursorModels),
      makeSkillsEntry(fileNormalizeCursorModels),
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleCursorBootstrap, [
      pluginNormalizeSubagentRequiredModel(cursorSubagentModelTokenMapper),
    ]),
  }),

  // workflows→commands, agents/*.md→*.agent.md
  // 2× hooks.json: (a) .github/plugin/hooks.json (rendered), (b) root hooks.json (mirror of a)
  copilot: (c) => ({
    ...base(c, TARGET_NAMES.COPILOT, COPILOT_VOCABULARY),
    baseSubfolder: '',
    pluginRootPath: '',
    hookFolder: 'hooks',
    manifestConditionalFields: [
      { field: 'agents', requires: 'agents', value: ['agents/'] },
      { field: 'skills', requires: 'skills', value: ['skills/'] },
      { field: 'commands', requires: 'workflows', value: ['commands/'] },
    ],
    mirrors: [{ from: '.github/plugin/hooks.json', to: 'hooks.json' }],
    specEntries: [
      makeRulesEntry(fileNormalizeCopilotModels),
      makeWorkflowsEntry(fileNormalizeCopilotModels, 'commands'),
      {
        source: 'agents/**',
        target: 'agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCopilotModels,
          fileRename('agents/(.+)\\.md', 'agents/$1.agent.md'),
        ],
      },
      makeSkillsEntry(fileNormalizeCopilotModels),
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleCopilotBootstrap, [
      pluginNormalizeSubagentRequiredModel(copilotSubagentModelTokenMapper),
    ]),
  }),

  // Instructions go under .agents/; agents → .codex/agents/*.toml; hooks → .codex/
  codex: (c) => ({
    ...base(c, TARGET_NAMES.CODEX, CODEX_VOCABULARY),
    baseSubfolder: '.agents',
    pluginRootPath: '',
    hookFolder: '.codex/hooks',
    manifestConditionalFields: [
      // .agents/skills/ is populated by BOTH the skills and the workflows entries below, so the
      // field is emitted when the set ships either.
      { field: 'skills', requires: 'skills|workflows', value: './.agents/skills/' },
    ],
    mirrors: [{ from: '.codex-plugin/hooks.json', to: '.codex/hooks.json' }],
    specEntries: [
      {
        source: 'rules/**',
        target: '.agents/rules',
        exclude: RULES_EXCLUDES,
        processors: [...BASE_PROCESSORS, fileNormalizeCodexModels],
      },
      // FR-COPY-0080/FR-VAR-0041/0042: each workflow doc → .agents/skills/<name>/SKILL.md.
      {
        source: 'workflows/**',
        target: '.agents/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCodexModels, fileWorkflowToSkill],
      },
      {
        source: 'agents/**',
        target: '.codex/agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileCodexAgentFormat,
          fileRename('\\.codex/agents/(.+)\\.md', '.codex/agents/$1.toml'),
        ],
      },
      {
        source: 'skills/**',
        target: '.agents/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCodexModels],
        verbatimPaths: VERBATIM_SKILL_PATHS,
      },
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleCodexBootstrap, [
      pluginReplaceLiterals([WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR], {
        requiredIn: 'plugin-files-mode',
        driftGuard: 'WORKFLOW/COMMAND',
      }),
      pluginNormalizeSubagentRequiredModel(codexSubagentModelTokenMapper),
    ]),
  }),

  // All files under .cursor/; plugin-files-mode.mdc gets the plugin-root injection
  'cursor-standalone': (c) => ({
    ...base(c, TARGET_NAMES.CURSOR_STANDALONE, CURSOR_VOCABULARY),
    baseSubfolder: '.cursor',
    pluginRootPath: '.cursor',
    hookFolder: '.cursor/hooks',
    manifestConditionalFields: [],
    injections: [
      {
        hostFramePath: '.cursor/rules/plugin-files-mode.mdc',
        anchor: '# PREP STEP 1:',
        requires: 'rules',
        sections: [{ kind: 'literal', text: CURSOR_STANDALONE_INJECTION_TEXT }],
      },
    ],
    // `<base>-standalone<suffix>`, mirroring the destination's `<set>-<ide><suffix>` ordering —
    // not `<base><suffix>-standalone`, which would read "rosetta-light-standalone".
    manifestOverride: {
      name: `${c.manifestBaseName}-standalone${c.manifestNameSuffix}`, version: 'parent',
    },
    standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
    specEntries: [
      {
        source: 'rules/**',
        target: '.cursor/rules',
        exclude: RULES_EXCLUDES,
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCursorModels,
          fileRename('\\.cursor/rules/(.+)\\.md', '.cursor/rules/$1.mdc'),
        ],
      },
      {
        source: 'workflows/**',
        target: '.cursor/commands',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCursorModels],
      },
      {
        source: 'agents/**',
        target: '.cursor/agents',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCursorModels],
      },
      {
        source: 'skills/**',
        target: '.cursor/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCursorModels],
        verbatimPaths: VERBATIM_SKILL_PATHS,
      },
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleCursorBootstrap, [
      pluginNormalizeSubagentRequiredModel(cursorSubagentModelTokenMapper),
    ]),
  }),

  // bootstrap rules → .github/instructions/*.instructions.md; others → .github/rules/
  // workflows → .github/prompts/*.prompt.md; agents → .github/agents/*.agent.md
  'copilot-standalone': (c) => ({
    ...base(c, TARGET_NAMES.COPILOT_STANDALONE, COPILOT_VOCABULARY),
    baseSubfolder: '.github',
    pluginRootPath: '.github',
    hookFolder: '.github/hooks',
    manifestConditionalFields: [],
    injections: [
      {
        hostFramePath: '.github/instructions/plugin-files-mode.instructions.md',
        anchor: '# PREP STEP 1:',
        requires: 'rules',
        sections: [{ kind: 'literal', text: COPILOT_STANDALONE_INJECTION_TEXT }],
      },
    ],
    manifestOverride: {
      name: `${c.manifestBaseName}-standalone${c.manifestNameSuffix}`, version: 'parent',
    },
    standaloneTemplates: [['hooks/hooks.json.tmpl', '.github/hooks/hooks.json.tmpl']],
    specEntries: [
      // Bootstrap rules → .github/instructions/*.instructions.md
      {
        source: 'rules/**',
        target: '.github/instructions',
        exclude: [...RULES_EXCLUDES, 'rules/speckit-integration-policy.md'],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCopilotModels,
          fileRename('\\.github/instructions/(bootstrap-.+)\\.md', '.github/instructions/$1.instructions.md'),
          fileRename('\\.github/instructions/(plugin-files-mode)\\.md', '.github/instructions/$1.instructions.md'),
        ],
      },
      // Non-bootstrap rules → .github/rules/
      {
        source: 'rules/**',
        target: '.github/rules',
        exclude: [
          ...RULES_EXCLUDES,
          'rules/bootstrap-alwayson.md',
          'rules/bootstrap-core-policy.md',
          'rules/bootstrap-execution-policy.md',
          'rules/bootstrap-hitl-questioning.md',
          'rules/bootstrap-guardrails.md',
          'rules/bootstrap-rosetta-files.md',
          'rules/plugin-files-mode.md',
        ],
        processors: [...BASE_PROCESSORS, fileNormalizeCopilotModels],
      },
      {
        source: 'workflows/**',
        target: '.github/prompts',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCopilotModels,
          fileRename('\\.github/prompts/(.+)\\.md', '.github/prompts/$1.prompt.md'),
        ],
      },
      {
        source: 'agents/**',
        target: '.github/agents',
        exclude: [],
        processors: [
          ...BASE_PROCESSORS,
          fileNormalizeCopilotModels,
          fileRename('\\.github/agents/(.+)\\.md', '.github/agents/$1.agent.md'),
        ],
      },
      {
        source: 'skills/**',
        target: '.github/skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileNormalizeCopilotModels],
        verbatimPaths: VERBATIM_SKILL_PATHS,
      },
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleCopilotBootstrap, [
      pluginNormalizeSubagentRequiredModel(copilotSubagentModelTokenMapper),
    ]),
  }),

  // DATA-CFG-0003: single combined plugin, no dot-prefixed config folder, no standalone target.
  // FR-VAR-0080/0081: rules→rules/; skills+workflows→skills/; agents→agents/; no workflows/ folder.
  antigravity: (c) => ({
    ...base(c, TARGET_NAMES.ANTIGRAVITY, ANTIGRAVITY_VOCABULARY),
    baseSubfolder: '',
    pluginRootPath: '',
    hookFolder: 'hooks',
    manifestConditionalFields: [],
    specEntries: [
      // FR-VAR-0081: rules — frontmatter preserved unchanged; no model normalization (AG-2).
      {
        source: 'rules/**',
        target: 'rules',
        exclude: RULES_EXCLUDES,
        processors: [...BASE_PROCESSORS],
      },
      // FR-COPY-0080: each workflow doc → skills/<name>/SKILL.md.
      {
        source: 'workflows/**',
        target: 'skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileWorkflowToSkill],
      },
      {
        source: 'skills/**',
        target: 'skills',
        exclude: [],
        processors: [...BASE_PROCESSORS],
        verbatimPaths: VERBATIM_SKILL_PATHS,
      },
      {
        source: 'agents/**',
        target: 'agents',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
    ],
    pluginProcessors: c.buildPipeline(pluginAssembleAntigravityBootstrap, [
      pluginAntigravityReduceFrontmatter,
      pluginAntigravitySubagentModel,
      pluginReplaceLiterals([WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR], {
        requiredIn: 'plugin-files-mode',
        driftGuard: 'WORKFLOW/COMMAND',
      }),
    ]),
  }),
};

// The leading \n adds the blank line separator after the bullets section; the trailing \n\n adds a
// blank line before the section end-tag.
const CURSOR_STANDALONE_INJECTION_TEXT =
  `\nRosetta plugin root: ".cursor". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".cursor/commands/<workflowtag>.md". Example ".cursor/commands/coding-flow.md".\n\n`;

const COPILOT_STANDALONE_INJECTION_TEXT =
  `\nRosetta plugin root: ".github". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".github/prompts/<workflowtag>.prompt.md". Example ".github/prompts/coding-flow.prompt.md".\n\n`;

/**
 * The fields every target spec shares. `name` is the bare IDE identity; `destination` carries the
 * set and variant. D6: `indexes` is empty and `includeIndexEntries` false on every set — the three
 * index code paths (pluginGenerateIndexes, pluginInjectSections, bootstrap/payload) are retained
 * but dormant, and all three are fail-soft, so an empty declaration simply produces no indexes.
 */
function base(
  c: TargetCommon,
  name: TargetName,
  vocabulary: Parameters<typeof resolveEffectiveVocabulary>[1],
): Omit<PluginSpec,
  'baseSubfolder' | 'pluginRootPath' | 'hookFolder' | 'specEntries' | 'pluginProcessors' |
  'manifestConditionalFields'> {
  const family = familyOf(name);
  const layout = HOOK_LAYOUTS[name] ?? null;
  return {
    name,
    set: c.set.name,
    destination: c.destination,
    preservedSource: path.join(c.pluginsRoot, `${c.set.template}-${family}`),
    modelVocabulary: resolveEffectiveVocabulary(name, vocabulary, c.profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: false,
    indexes: [],
    injections: [],
    hookModules: modulesForTarget(layout, c.hookModules, c.hookSupportModules),
    hookLayout: layout,
    bootstrap: c.set.bootstrap,
    manifest: c.manifest,
    // Standalone targets pull bundles from their parent IDE's directory; every target's bundle
    // directory is now the BARE IDE id (src/hooks/dist/bundles/<family>), matching build-bundles.mjs.
    bundleSource: family,
  };
}

/**
 * Build every PluginSpec for one (set, variant) pair — one per IDE target.
 * Called once per selected set-variant by generate(); the seven builders come from a data table.
 */
export function buildSpecsForSet(ctx: SpecBuildContext): PluginSpec[] {
  const {
    pluginsSource, hooksSource, outputDir, release,
    dryRun = false, out = process.stdout,
    profile = null, activeProfile = null,
    set, variant, targets, hookModules, hookSupportModules,
  } = ctx;

  const manifest = {
    name: set.manifest.name + variant.manifestNameSuffix,
    description: set.manifest.description + variant.manifestDescriptionSuffix,
  };
  return targets.map((target) => {
    const common: TargetCommon = {
      set,
      destination: `${set.name}-${target}${variant.destinationSuffix}`,
      pluginsRoot: pluginsSource,
      profile,
      hookModules,
      hookSupportModules,
      manifest,
      manifestBaseName: set.manifest.name,
      manifestNameSuffix: variant.manifestNameSuffix,
      buildPipeline: (bootstrapAssembler, extraAfterIndexes = []) =>
        buildPipeline(
          hooksSource, outputDir, release, dryRun, bootstrapAssembler, out,
          extraAfterIndexes, activeProfile,
        ),
    };
    return TARGET_BUILDERS[target](common);
  });
}

/**
 * Build the standard plugin processor pipeline for a target.
 * extraAfterIndexes: target-specific whole-plugin passes inserted right after pluginGenerateIndexes.
 * This is data supplied by the caller, not a branch on target/IDE identity inside this function.
 * FR-ARCH-0032
 */
function buildPipeline(
  hooksSource: string,
  outputDir: string,
  release: ReleaseDescriptor,
  dryRun: boolean,
  bootstrapAssembler: PluginProcessor,
  out: Writable = process.stdout,
  extraAfterIndexes: PluginProcessor[] = [],
  activeProfile: string | null = null,
) {
  return [
    pluginCleanup(outputDir, dryRun),
    pluginCopy(outputDir, dryRun, out),
    pluginProcessSpecEntries(release, activeProfile),
    pluginRewriteReferences,
    pluginGenerateIndexes,
    ...extraAfterIndexes,
    pluginInjectSections,
    bootstrapAssembler,
    // DATA-CFG-0008: assemble hooks.json from set data + layout, after the bootstrap payload
    // exists and before the template that carries it is rendered.
    pluginAssembleHooksJson,
    pluginRenderTemplates,
    pluginMirrorFiles,
    pluginSyncBundles(hooksSource, outputDir, release.deterministicHooks, dryRun),
    pluginWrite(outputDir, dryRun, out),
  ];
}
