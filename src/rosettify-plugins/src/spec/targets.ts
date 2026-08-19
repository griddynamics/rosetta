// DATA-CFG-0002/0003 — the seven PluginSpec values
// FR-VAR-0010–0072, FR-SEED-0001/0002, FR-COPY-0011

import path from 'path';
import { fileURLToPath } from 'url';
import type { Writable } from 'stream';
import type { PluginSpec, SpecEntry, FileProcessor, PluginProcessor, ReleaseDescriptor } from '../types.js';
import { TARGET_NAMES } from './target-names.js';
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
import type { ManifestSuffix } from '../plugin-processors/plugin-copy.js';
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

// Standard excludes (FR-COPY-0011, GT-8)
const RULES_EXCLUDES = [
  'rules/bootstrap.md', // r2 MCP mode
  'rules/mcp-files-mode.md', // r3 MCP mode
  'rules/local-files-mode.md',
];
// FR-COPY-0011, GT-8: exclude entire templates/shell-schemas/** folder (authoring-only schemas)
const TEMPLATES_EXCLUDES = ['templates/shell-schemas/**'];

// FR-ARCH-0049: literal content rewrite pair for targets whose workflows->skills SpecEntry
// restructures document paths (fileWorkflowToSkill). buildRenamePairs deliberately emits no
// folder-level pair for that restructuring mapping (a bare `workflows/` token carries no document
// identity there), so the `WORKFLOW/COMMAND \`workflows/*.md\`` glob-doc string in
// plugin-files-mode.md is left stale unless rewritten explicitly. Keyed on the long literal
// (including the `WORKFLOW/COMMAND ` prefix) — not the bare `workflows/*.md` token — because that
// bare token also appears (unrelated) in skills/rosetta/README.md, which must stay unchanged.
// Supplied to pluginReplaceLiterals (FR-ARCH-0058) only in the Codex and Antigravity pipelines,
// never selected by identity branching inside a shared processor (FR-ARCH-0004, FR-ARCH-0005).
const WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR: readonly [string, string] = [
  'WORKFLOW/COMMAND `workflows/*.md`',
  'WORKFLOW/COMMAND `skills/*-flow/SKILL.md`',
];

// Base processors shared across all text file entries
const BASE_PROCESSORS = [fileRead, fileApplyOverrides, fileBundle];

// --- Spec builders (called at generate time with resolved sources + release) ---

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
  /**
   * FR-PROF-0001/0010/0020/0021: the loaded profile descriptor for this run, or null when no
   * `--profile` was supplied. Sole entry point for profile data into spec construction — read here
   * to resolve each spec's effective model vocabulary (FR-PROF-0010), destination suffix
   * (FR-PROF-0020), and manifest name/description suffix (FR-PROF-0021). Optional with a `null`
   * default so pre-existing direct callers of buildAllSpecs() (e.g. unit tests exercising a single
   * spec in isolation) keep compiling and behaving exactly as the no-profile path (FR-PROF-0040).
   */
  profile?: ProfileDescriptor | null;
  /**
   * FR-PROF-0030: the active `--profile` name (or null), threaded unchanged into
   * TargetContext via pluginProcessSpecEntries for `profile-<name>-only` directive evaluation.
   * Optional with a `null` default for the same reason as `profile` above.
   */
  activeProfile?: string | null;
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

function makeWorkflowsEntry(
  normalizeModels: FileProcessor,
  targetFolder = 'workflows',
): SpecEntry {
  return {
    source: 'workflows/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS, normalizeModels],
  };
}

function makeAgentsEntry(
  normalizeModels: FileProcessor,
  targetFolder = 'agents',
): SpecEntry {
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
  };
}

function makeConfigureEntry(targetFolder = 'configure'): SpecEntry {
  return {
    source: 'configure/**',
    target: targetFolder,
    exclude: [],
    processors: [...BASE_PROCESSORS],
    verbatim: true, // TODO-2: configure files must not have references rewritten
  };
}

function makeTemplatesEntry(targetFolder = 'templates', normalizeModels?: FileProcessor, extraExcludes: string[] = []): SpecEntry {
  const processors = normalizeModels ? [...BASE_PROCESSORS, normalizeModels] : [...BASE_PROCESSORS];
  return {
    source: 'templates/**',
    target: targetFolder,
    // FR-COPY-0011, GT-8: exclude shell-schemas folder (authoring-only, not shipped)
    exclude: [...TEMPLATES_EXCLUDES, ...extraExcludes],
    processors,
  };
}

// ─── Factory function for all seven PluginSpecs ────────────────────────────

export function buildAllSpecs(ctx: SpecBuildContext): PluginSpec[] {
  const {
    pluginsSource,
    hooksSource,
    outputDir,
    release,
    dryRun = false,
    out = process.stdout,
    profile = null,
    activeProfile = null,
  } = ctx;
  const pluginsRoot = pluginsSource; // alias for readability in spec constructors

  // FR-PROF-0020: global destination suffix, applied identically to all seven `spec.destination`
  // values; `spec.name` is NEVER suffixed (it is the directive-match identity, see
  // matchesTarget/fileApplyOverrides — suffixing it would silently stop every `<name>-only`
  // directive from matching its target).
  const destinationSuffix = profile?.destinationSuffix ?? '';
  // FR-PROF-0021: global manifest name/description suffix pair, or null when no profile is active
  // (pluginCopy keeps every manifest write byte-identical to today when null, FR-PROF-0040).
  const manifestSuffix: ManifestSuffix | null = profile
    ? { name: profile.pluginNameSuffix, description: profile.pluginDescriptionSuffix }
    : null;

  // ── core-claude ───────────────────────────────────────────────────────────
  const coreClaude: PluginSpec = {
    name: TARGET_NAMES.CLAUDE,
    destination: 'core-claude' + destinationSuffix,
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-claude'),
    modelVocabulary: resolveEffectiveVocabulary('core-claude', CLAUDE_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    pluginRootPath: '${CLAUDE_PLUGIN_ROOT}',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'workflows', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
    specEntries: [
      makeRulesEntry(fileNormalizeClaudeModels),
      makeWorkflowsEntry(fileNormalizeClaudeModels),
      makeAgentsEntry(fileNormalizeClaudeModels),
      makeSkillsEntry(fileNormalizeClaudeModels),
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeClaudeModels),
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleClaudeBootstrap,
      out,
      // FR-COPY-0083: always-on subagent_required_model list normalization, same late slot as
      // the Antigravity sibling (after index generation).
      [pluginNormalizeSubagentRequiredModel(claudeSubagentModelTokenMapper)],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-cursor ────────────────────────────────────────────────────────────
  // workflows→commands, rules/*.md→*.mdc
  const coreCursor: PluginSpec = {
    name: TARGET_NAMES.CURSOR,
    destination: 'core-cursor' + destinationSuffix,
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-cursor'),
    modelVocabulary: resolveEffectiveVocabulary('core-cursor', CURSOR_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    pluginRootPath: '',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
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
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeCursorModels),
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleCursorBootstrap,
      out,
      [pluginNormalizeSubagentRequiredModel(cursorSubagentModelTokenMapper)],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-copilot ───────────────────────────────────────────────────────────
  // workflows→commands, agents/*.md→*.agent.md
  // 3× hooks.json: (a) .github/plugin/hooks.json (rendered), (b) root hooks.json (copy of a), (c) hooks/hooks.json (standalone-form)
  const coreCopilot: PluginSpec = {
    name: TARGET_NAMES.COPILOT,
    destination: 'core-copilot' + destinationSuffix,
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-copilot'),
    modelVocabulary: resolveEffectiveVocabulary('core-copilot', COPILOT_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    pluginRootPath: '',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      { folder: 'workflows', targetFolder: 'commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: 'hooks',
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
      makeConfigureEntry(),
      makeTemplatesEntry('templates', fileNormalizeCopilotModels),
    ],
    // GT-4: mirror .github/plugin/hooks.json → root hooks.json (byte-identical copy) after rendering
    // DATA-CFG-0002: declarative mirrors on spec, consumed generically by pluginMirrorFiles
    mirrors: [
      { from: '.github/plugin/hooks.json', to: 'hooks.json' },
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleCopilotBootstrap,
      out,
      [pluginNormalizeSubagentRequiredModel(copilotSubagentModelTokenMapper)],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-codex ─────────────────────────────────────────────────────────────
  // Instructions go under .agents/; agents → .codex/agents/*.toml; hooks → .codex/
  const coreCodex: PluginSpec = {
    name: TARGET_NAMES.CODEX,
    destination: 'core-codex' + destinationSuffix,
    baseSubfolder: '.agents',
    preservedSource: path.join(pluginsRoot, 'core-codex'),
    modelVocabulary: resolveEffectiveVocabulary('core-codex', CODEX_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    pluginRootPath: '',
    indexes: [
      { folder: '.agents/rules', targetFolder: '.agents/rules', heading: 'rules' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.codex/hooks',
    specEntries: [
      {
        source: 'rules/**',
        target: '.agents/rules',
        exclude: RULES_EXCLUDES,
        processors: [...BASE_PROCESSORS, fileNormalizeCodexModels],
      },
      // FR-COPY-0080/FR-VAR-0041/0042: each workflow doc → .agents/skills/<name>/SKILL.md; each
      // phase file → .agents/skills/<name>/phases/<phase>.md, frontmatter stripped. No
      // .agents/workflows/ folder or index (removed above) — existing absent-document handling
      // omits that payload entry. Model normalization precedes the shared transform.
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
      },
      {
        source: 'configure/**',
        target: '.agents/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
        verbatim: true, // TODO-2: configure files must not have references rewritten
      },
      {
        source: 'templates/**',
        target: '.agents/templates',
        exclude: TEMPLATES_EXCLUDES,
        processors: [...BASE_PROCESSORS],
      },
    ],
    // GT-4: mirror .codex-plugin/hooks.json → .codex/hooks.json after rendering
    // DATA-CFG-0002: declarative mirrors on spec, consumed generically by pluginMirrorFiles
    mirrors: [
      { from: '.codex-plugin/hooks.json', to: '.codex/hooks.json' },
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleCodexBootstrap,
      out,
      // FR-ARCH-0058: workflows->skills restructures document paths, so FR-ARCH-0049 emits no
      // folder-level pair for it; this corrects the plugin-files-mode.md glob-doc string. Runs
      // before the bootstrap assembler, so the hooks payload inherits the correction.
      // FR-COPY-0083: always-on subagent_required_model list normalization, same late slot as
      // the Antigravity sibling (after index generation).
      [
        pluginReplaceLiterals([WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR]),
        pluginNormalizeSubagentRequiredModel(codexSubagentModelTokenMapper),
      ],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-cursor-standalone ────────────────────────────────────────────────
  // All files under .cursor/; plugin-files-mode.mdc gets injection
  const cursorStandalonePluginFilesPath = '.cursor/rules/plugin-files-mode.mdc';
  // The leading \n adds the blank line separator after the bullets section.
  // The trailing \n\n adds a blank line before the section end-tag.
  const cursorStandaloneInjectionText =
    `\nRosetta plugin root: ".cursor". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".cursor/commands/<workflowtag>.md". Example ".cursor/commands/coding-flow.md".\n\n`;

  const coreCursorStandalone: PluginSpec = {
    name: TARGET_NAMES.CURSOR_STANDALONE,
    destination: 'core-cursor-standalone' + destinationSuffix,
    baseSubfolder: '.cursor',
    preservedSource: path.join(pluginsRoot, 'core-cursor'),
    modelVocabulary: resolveEffectiveVocabulary('core-cursor-standalone', CURSOR_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: false,
    pluginRootPath: '.cursor',
    indexes: [
      { folder: '.cursor/rules', targetFolder: '.cursor/rules', heading: 'rules' },
      { folder: '.cursor/commands', targetFolder: '.cursor/commands', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [
      {
        hostFramePath: cursorStandalonePluginFilesPath,
        anchor: '# PREP STEP 1:',
        sections: [
          {
            kind: 'literal',
            text: cursorStandaloneInjectionText,
          },
          {
            kind: 'index',
            indexFolder: '.cursor/commands',
          },
        ],
      },
    ],
    manifestOverride: { name: 'core-cursor-standalone', version: 'parent' },
    // GT-4: cursor-standalone renders root hooks.json.tmpl (standalone-form) to .cursor/hooks.json
    standaloneTemplates: [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.cursor/hooks',
    bundleSource: 'core-cursor', // uses parent target's bundles
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
      },
      {
        source: 'configure/**',
        target: '.cursor/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
        verbatim: true, // TODO-2: configure files must not have references rewritten
      },
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleCursorBootstrap,
      out,
      [pluginNormalizeSubagentRequiredModel(cursorSubagentModelTokenMapper)],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-copilot-standalone ───────────────────────────────────────────────
  // bootstrap rules → .github/instructions/*.instructions.md
  // non-bootstrap rules → .github/rules/
  // workflows → .github/prompts/*.prompt.md
  // agents → .github/agents/*.agent.md
  // plugin-files-mode gets injected with root block + workflows index + rules index
  const copilotStandalonePluginFilesPath = '.github/instructions/plugin-files-mode.instructions.md';
  // The leading \n adds the blank line separator after the bullets section.
  const copilotStandaloneInjectionText =
    `\nRosetta plugin root: ".github". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".github/prompts/<workflowtag>.prompt.md". Example ".github/prompts/coding-flow.prompt.md".\n\n`;

  const coreCopilotStandalone: PluginSpec = {
    name: TARGET_NAMES.COPILOT_STANDALONE,
    destination: 'core-copilot-standalone' + destinationSuffix,
    baseSubfolder: '.github',
    preservedSource: path.join(pluginsRoot, 'core-copilot'),
    modelVocabulary: resolveEffectiveVocabulary('core-copilot-standalone', COPILOT_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: false,
    pluginRootPath: '.github',
    indexes: [
      { folder: '.github/rules', targetFolder: '.github/rules', heading: 'rules' },
      { folder: '.github/prompts', targetFolder: '.github/prompts', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [
      {
        hostFramePath: copilotStandalonePluginFilesPath,
        anchor: '# PREP STEP 1:',
        sections: [
          {
            kind: 'literal',
            text: copilotStandaloneInjectionText,
          },
          {
            kind: 'index',
            indexFolder: '.github/prompts',
          },
          {
            kind: 'literal',
            text: '\n\n',
          },
          {
            kind: 'index',
            indexFolder: '.github/rules',
          },
        ],
      },
    ],
    manifestOverride: { name: 'core-copilot-standalone', version: 'parent' },
    // GT-4: copilot-standalone renders hooks/hooks.json.tmpl (standalone-form) to .github/hooks/hooks.json
    standaloneTemplates: [['hooks/hooks.json.tmpl', '.github/hooks/hooks.json.tmpl']],
    // DATA-CFG-0002: hook folder and bundle config
    hookFolder: '.github/hooks',
    bundleSource: 'core-copilot', // uses parent target's bundles
    specEntries: [
      // Bootstrap rules → .github/instructions/*.instructions.md
      // Only bootstrap-* and plugin-files-mode go here; all others go to .github/rules/
      // FR-COPY-0011, GT-8
      {
        source: 'rules/**',
        target: '.github/instructions',
        exclude: [
          ...RULES_EXCLUDES,
          // Non-bootstrap, non-plugin-files-mode rules are excluded from instructions/
          // They go to .github/rules/ via the entry below
          'rules/speckit-integration-policy.md',
        ],
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
      // Workflows → .github/prompts/*.prompt.md
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
      // Agents → .github/agents/*.agent.md
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
      },
      {
        source: 'configure/**',
        target: '.github/configure',
        exclude: [],
        processors: [...BASE_PROCESSORS],
        verbatim: true, // TODO-2: configure files must not have references rewritten
      },
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleCopilotBootstrap,
      out,
      [pluginNormalizeSubagentRequiredModel(copilotSubagentModelTokenMapper)],
      manifestSuffix,
      activeProfile,
    ),
  };

  // ── core-antigravity ──────────────────────────────────────────────────────
  // DATA-CFG-0003: single combined plugin, no dot-prefixed config folder, no standalone target.
  // FR-VAR-0080/0081: rules+templates→rules/ (frontmatter untouched); skills+workflows→skills/
  // (workflow→skill transform, FR-COPY-0080); agents→agents/; configure→configure/ verbatim;
  // no workflows/ folder. FR-COPY-0081/0082: agent+skill frontmatter reduced to name+description,
  // subagent_required_model→inherit — both Antigravity-only, composed in below (no branching in
  // shared processors: fileWorkflowToSkill is shared with Codex; fileAntigravityReduceFrontmatter
  // and pluginAntigravitySubagentModel are wired only into this spec's specEntries/pipeline).
  // FR-VAR-0082/0083: bootstrap rides the source's authored always-on rule, not a
  // session-start hook; hooks.json.tmpl omits the bootstrap placeholder (mirrors Cursor, FR-VAR-0070).
  const coreAntigravity: PluginSpec = {
    name: TARGET_NAMES.ANTIGRAVITY,
    destination: 'core-antigravity' + destinationSuffix,
    baseSubfolder: '',
    preservedSource: path.join(pluginsRoot, 'core-antigravity'),
    // AG-2: no model vocabulary — V2 forbids a profile core-antigravity block, so this always
    // resolves to the empty built-in map unchanged; routed through the same resolver as every
    // other target purely for uniformity (FR-PROF-0010), not because a block can ever apply here.
    modelVocabulary: resolveEffectiveVocabulary('core-antigravity', ANTIGRAVITY_VOCABULARY, profile),
    bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
    includeIndexEntries: true,
    pluginRootPath: '',
    indexes: [
      { folder: 'rules', targetFolder: 'rules', heading: 'rules' },
      // AG-5: "skills index" is the Antigravity analog of Claude's workflow index — it lists only
      // the workflow-derived skills (tagged 'workflow'), not every plain skill.
      { folder: 'skills', targetFolder: 'skills', requiredTag: 'workflow', heading: 'workflows' },
    ],
    injections: [],
    // DATA-CFG-0002: hook folder and bundle config (bundleSource defaults to spec.name)
    hookFolder: 'hooks',
    specEntries: [
      // FR-VAR-0081: rules — frontmatter (incl. any authored `trigger:`) preserved unchanged;
      // NOT reduced (rules are excluded from FR-COPY-0081); no model normalization (AG-2).
      {
        source: 'rules/**',
        target: 'rules',
        exclude: RULES_EXCLUDES,
        processors: [...BASE_PROCESSORS],
      },
      // FR-VAR-0081: templates join rules/ (same target folder as the rules entry above).
      makeTemplatesEntry('rules'),
      // FR-COPY-0080: each workflow doc → skills/<name>/SKILL.md; each phase file →
      // skills/<name>/phases/<phase>.md; phase references rewritten within both.
      // Frontmatter reduction (FR-COPY-0081) happens later, as a plugin-tier pass AFTER indexes
      // are generated — the resulting SKILL.md's `tags: ["workflow"]` field must still be present
      // when pluginGenerateIndexes builds the skills index (AG-5).
      {
        source: 'workflows/**',
        target: 'skills',
        exclude: [],
        processors: [...BASE_PROCESSORS, fileWorkflowToSkill],
      },
      // Real Rosetta skills → skills/ verbatim structure.
      {
        source: 'skills/**',
        target: 'skills',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
      {
        source: 'agents/**',
        target: 'agents',
        exclude: [],
        processors: [...BASE_PROCESSORS],
      },
      makeConfigureEntry(),
    ],
    pluginProcessors: buildPipeline(
      hooksSource,
      outputDir,
      release,
      dryRun,
      pluginAssembleAntigravityBootstrap,
      out,
      // FR-COPY-0081/0082, Antigravity-only whole-plugin passes, run AFTER pluginGenerateIndexes
      // (see plugin-antigravity-reduce-frontmatter.ts for why reduction must come after indexing).
      [
        pluginAntigravityReduceFrontmatter,
        pluginAntigravitySubagentModel,
        // FR-ARCH-0058: same glob-doc correction as Codex — this target also restructures
        // workflows into skills, so FR-ARCH-0049 emits no folder-level pair for that mapping.
        pluginReplaceLiterals([WORKFLOW_GLOB_TO_SKILLS_FLOW_LITERAL_PAIR]),
        // FR-COPY-0083.AC6: Antigravity keeps its own unconditional pluginAntigravitySubagentModel
        // above and is deliberately NOT composed with pluginNormalizeSubagentRequiredModel.
      ],
      manifestSuffix,
      activeProfile,
    ),
  };

  return [
    coreClaude,
    coreCursor,
    coreCopilot,
    coreCodex,
    coreCursorStandalone,
    coreCopilotStandalone,
    coreAntigravity,
  ];
}

/**
 * Build the standard plugin processor pipeline for a target.
 * hooksSource: absolute path to hooks root (FR-CLI-0020); used by pluginSyncBundles.
 * dryRun threads through all disk-mutating processors (FR-CLI-0050, FR-ARCH-0045).
 * pluginMirrorFiles reads mirror pairs from spec.mirrors (data-driven, FR-ARCH-0035, DATA-CFG-0002).
 * extraAfterIndexes: optional target-specific whole-plugin passes inserted right after
 * pluginGenerateIndexes (composition point; empty for every target except where a caller supplies
 * some — e.g. FR-COPY-0081/0082's Antigravity-only frontmatter-reduction/subagent-model passes,
 * and FR-COPY-0083's always-on subagent-list normalization for the six non-Antigravity targets).
 * Inserted after indexing so index membership (e.g. a `tags: ["workflow"]` field) is still intact
 * when indexes are built. This is data supplied by the caller, not a branch on target/IDE identity
 * inside this function.
 * manifestSuffix: FR-PROF-0021 global {name, description} append pair (or null, no profile active),
 * forwarded to pluginCopy unchanged for every target.
 * activeProfile: FR-PROF-0030 active --profile name (or null), forwarded to
 * pluginProcessSpecEntries unchanged for every target, mirroring how `release` is threaded.
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
  manifestSuffix: ManifestSuffix | null = null,
  activeProfile: string | null = null,
) {
  const pipeline = [
    pluginCleanup(outputDir, dryRun),               // FR-CLI-0050: no-op in dry-run
    pluginCopy(outputDir, dryRun, manifestSuffix, out),  // FR-CLI-0050: skip disk copy; keep tmpl frames; dry-run preview goes to the same sink as pluginWrite
    pluginProcessSpecEntries(release, activeProfile),
    pluginRewriteReferences,
    pluginGenerateIndexes,
    ...extraAfterIndexes,
    pluginInjectSections,
    bootstrapAssembler,
    pluginRenderTemplates,
    // GT-4: mirror step reads spec.mirrors (declarative data); no-op if mirrors is empty/absent
    pluginMirrorFiles,
    // FR-CLI-0020: hooksSource is <source>/hooks; bundles at <hooksSource>/dist/bundles/<bundleSource>
    pluginSyncBundles(hooksSource, outputDir, release.deterministicHooks, dryRun), // FR-CLI-0050
    pluginWrite(outputDir, dryRun, out),      // FR-ARCH-0045: emit paths+contents to the output sink in dry-run
  ];
  return pipeline;
}
