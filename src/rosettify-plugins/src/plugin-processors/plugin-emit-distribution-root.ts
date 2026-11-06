// FR-VAR-0072 — tell a STANDALONE distribution's agent where the plugin content actually lives.
//
// THE PROBLEM. Every Rosetta unit path a document quotes is PLUGIN-ROOT-RELATIVE
// (`skills/*/SKILL.md`, `agents/*.md`, ...). For a marketplace plugin the install directory IS the
// plugin root, so those paths resolve as written. A standalone distribution extracts into a user's
// repository under `.cursor/` or `.github/` while the agent's working directory is the repository
// ROOT, so the very same path resolves to `./skills/...`, which does not exist.
//
// WHY NOT REWRITE THE PATHS. `agents/` is ambiguous. `agents/architect.md` is plugin content that
// moves under the root, while `agents/IMPLEMENTATION.md`, `agents/user-instructions/` and the
// `*-flow-state.md` files are TARGET-REPO workspace files that stay at the repository root. A
// folder-level `agents/` -> `.cursor/agents/` rewrite would corrupt all of the latter — the exact
// hazard FR-ARCH-0049 documents when it refuses to emit a folder pair for an ambiguous token. An
// agent disambiguates these by context, as it already does in marketplace mode; a string
// replacement cannot. So the agent is given the one fact it cannot derive — the root — and
// resolves the rest itself.
//
// WHY A FACTORY COMPOSED INTO TWO SPECS, NOT A FIELD ON ALL SEVEN. Only standalones have this
// behaviour at all; five of seven targets would carry a permanently-undefined field read by a
// processor that no-ops for them, which is identity branching wearing a data costume
// (FR-ARCH-0005). Composing it only where it applies means the behaviour does not exist elsewhere:
// nothing to leave unset, nothing to misconfigure. The root and the per-IDE workflow folder are
// genuinely data, so they are factory arguments rather than two near-duplicate processors.
//
// This replaces an anchor-based injection that had NEVER fired: it scanned for a `# PREP STEP 1:`
// anchor that exists only in a test fixture, and skipped silently when absent. Nothing here can
// silently skip — the text is appended at a position that always exists, and a missing host
// document in a rules-shipping set is a hard error.

import { updatePluginFrame, baseDocName } from '../frames.js';
import type {
  FileProcessingFrame, GenError, PluginProcessingFrame, PluginProcessor,
} from '../types.js';

/** The rule document that carries the declaration — the one loaded every session. */
const HOST_STEM = 'plugin-files-mode';

/** Closing tag of the block the declaration belongs inside. */
const BLOCK_END = '</rosetta:plugin_files_mode>';

export interface DistributionRootConfig {
  /**
   * The prefix the plugin content is extracted under inside the user's repository
   * (`.cursor`, `.github`). The agent's working directory is the repository root, not this.
   */
  root: string;
  /**
   * Folder, relative to `root`, where this IDE keeps its workflows (`commands`, `prompts`).
   * The file extension is derived from the emitted frames rather than restated here, so a rename
   * such as Copilot's `*.prompt.md` cannot drift from what the target actually writes.
   */
  workflowFolder: string;
}

/**
 * Compose the declaration. `workflowGlob` is omitted entirely when the set ships no workflows —
 * a sparse set must not advertise a folder it does not have.
 */
export function buildRootDeclaration(root: string, workflowGlob: string | null): string {
  const workflows = workflowGlob ? ` WORKFLOW/COMMAND lives at \`${workflowGlob}\`.` : '';
  return (
    `STANDALONE DISTRIBUTION — Rosetta plugin root: \`${root}\`. This plugin is extracted into ` +
    `your repository and your working directory is the repository root, so EVERY Rosetta unit ` +
    `path above is relative to \`${root}/\`.${workflows} A path that is NOT a Rosetta unit — ` +
    `workspace files such as \`agents/IMPLEMENTATION.md\` — stays at the repository root. ` +
    `Execute every prep step in order, then select a workflow and execute it.`
  );
}

/**
 * `<workflowFolder>/*<ext>`, with the extension taken from a real emitted workflow frame so a
 * per-IDE rename (Copilot's `*.prompt.md`) is reflected automatically. Returns null when the set
 * ships no workflows.
 */
function deriveWorkflowGlob(
  frames: readonly FileProcessingFrame[],
  workflowFolder: string,
): string | null {
  const marker = `/${workflowFolder}/`;

  for (const frame of frames) {
    if (!frame.sourcePath.startsWith('workflows/')) continue;
    if (frame.target_contents === null) continue;

    const idx = frame.target.indexOf(marker);
    const filename = idx >= 0
      ? frame.target.slice(idx + marker.length)
      : frame.target.split('/').pop() ?? '';
    if (filename === '' || filename.includes('/')) continue;

    // Preserve a compound extension (`.prompt.md`), not just the last segment.
    const dot = filename.indexOf('.');
    return `${workflowFolder}/*${dot >= 0 ? filename.slice(dot) : '.md'}`;
  }
  return null;
}

/**
 * pluginEmitDistributionRoot: append the distribution-root declaration to the plugin-files-mode
 * rule. Composed ONLY into the two standalone specs.
 *
 * The text is inserted immediately before the closing `</rosetta:plugin_files_mode>` tag so it
 * reads as part of that block; if the tag is absent it is appended to the end of the document
 * instead. Both positions always exist, so the declaration can never be silently dropped — which
 * is precisely how its predecessor failed.
 *
 * A spec that ships a `rules/` folder but produced no plugin-files-mode document is a HARD error.
 * A set with no `rules/` folder at all (an add-on set) has no host document and is skipped.
 */
export function pluginEmitDistributionRoot(config: DistributionRootConfig): PluginProcessor {
  const { root, workflowFolder } = config;

  return function pluginEmitDistributionRootProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const { spec, frames, vfs } = p;

    const hostIdx = frames.findIndex(
      (f) => baseDocName(f) === HOST_STEM && !f.isBinary && f.target_contents !== null,
    );

    if (hostIdx < 0) {
      const shipsRules = vfs.some((vf) => vf.path.startsWith('rules/'));
      if (!shipsRules) return p; // add-on set: no rules folder, so no host document exists

      const error: GenError = {
        target: spec.destination,
        file: HOST_STEM,
        message:
          `Cannot declare the standalone distribution root "${root}": this set ships a rules/ ` +
          `folder but produced no ${HOST_STEM} document to carry the declaration. Without it the ` +
          `agent resolves every unit path against the repository root instead of "${root}/".`,
        kind: 'hard',
      };
      return updatePluginFrame(p, (draft) => {
        draft.errors = [...draft.errors, error] as typeof draft.errors;
      });
    }

    const host = frames[hostIdx];
    const content = host.target_contents as string;
    const declaration = buildRootDeclaration(root, deriveWorkflowGlob(frames, workflowFolder));

    const endIdx = content.lastIndexOf(BLOCK_END);
    const updated = endIdx >= 0
      ? `${content.slice(0, endIdx)}${declaration}\n\n${content.slice(endIdx)}`
      : `${content.replace(/\n+$/, '')}\n\n${declaration}\n`;

    return updatePluginFrame(p, (draft) => {
      const next = [...frames];
      next[hostIdx] = { ...host, target_contents: updated };
      draft.frames = next as typeof draft.frames;
    });
  };
}
