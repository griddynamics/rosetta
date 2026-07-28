// FR-COPY-0080 — Workflow→skill transform (Codex + Antigravity)
// Shared FileProcessor: wired into each target's own workflows→skills SpecEntry
// (composition, FR-ARCH — no target/IDE branching inside this function).
//
// Each Rosetta workflow document becomes a skill under the incoming frame's own already-computed
// target base: the workflow body becomes `<target-base>/<name>/SKILL.md`; each of that workflow's
// phase files becomes `<target-base>/<name>/phases/<phase>.md`, with frontmatter stripped. The
// target base is recovered from `frame.target` (set by `computeTargetPath` from the composing
// `SpecEntry.target`) BEFORE this function mutates it — `SpecEntry.target` remains the sole
// placement owner (FR-ARCH). Workflow/phase membership is derived at runtime from the full set of
// `workflows/**` VFS paths (via ctx.vfs) — no workflow/phase name is hardcoded (FR-ARCH-0004).

import { updateFileFrame } from '../frames.js';
import { stripFrontmatter } from '../serialize/frontmatter.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

const WORKFLOWS_FOLDER = 'workflows/';

function workflowStem(vfsPath: string): string {
  const base = vfsPath.split('/').pop() ?? vfsPath;
  return base.replace(/\.md$/, '');
}

/**
 * Find the workflow "root" that owns `stem`: the SHORTEST OTHER stem in `allStems` that is a
 * hyphen-bounded prefix of it (e.g. root "init-workspace-flow" owns phase
 * "init-workspace-flow-discovery"). No owning root found → `stem` IS a root (a main workflow doc).
 *
 * Shortest — not longest — is correct: the true root is the prefix-stem that has no shorter
 * prefix-stem of its own. If the shortest candidate R had a shorter prefix-stem R', then R' would
 * transitively also be a hyphen-bounded prefix of `stem` (a shorter candidate), contradicting R
 * being shortest. Picking longest instead misroutes a phase whose stem is a prefix of a sibling
 * phase (e.g. "sample-flow-setup-advanced" wrongly routed under phase "sample-flow-setup" rather
 * than under the real root "sample-flow").
 */
function findWorkflowRoot(stem: string, allStems: readonly string[]): string {
  let best: string | null = null;
  for (const candidate of allStems) {
    if (candidate === stem) continue;
    if (stem.startsWith(candidate + '-') && (!best || candidate.length < best.length)) {
      best = candidate;
    }
  }
  return best ?? stem;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the delimited alternation for one literal phase filename (e.g. "x-phase.md"): the filename
 * wrapped in a matching delimiter — backtick, single quote, or double quote — on BOTH sides.
 * Requiring both-side delimiters makes a match immune to substring/nesting collisions (a shorter
 * phase name can never match inside a longer phase's wrapped token) and prevents re-matching the
 * rewritten `` `phases/<name>.md` `` (a `/` sits before `<name>`, not a delimiter).
 */
function delimitedAlternation(escapedName: string): string {
  return '`' + escapedName + '`' + "|'" + escapedName + "'" + '|"' + escapedName + '"';
}

/**
 * Rewrite references to `phaseName.md` within `content`, per real phase name, in two ordered
 * passes (FR-COPY-0080):
 *   1. full form: `APPLY PHASE <ref>` where <ref> is delimited OR bare. Bare is safe here because
 *      the `APPLY PHASE ` prefix bounds the left and `.md` + a non-word boundary bounds the right,
 *      so a bare name cannot partial-match a longer sibling (e.g. `…-reuse.md` never matches inside
 *      `…-reuse-extra.md`). Some source workflows write bare `APPLY PHASE x.md` (e.g.
 *      modernization-flow), so bare MUST be accepted here. Whole match replaced (the `APPLY PHASE `
 *      prefix is dropped).
 *   2. short form: a STANDALONE reference elsewhere → matched ONLY when delimited on both sides
 *      (never bare). Delimiters prevent substring collisions, re-matching pass 1's `phases/…`
 *      output, and touching bare prose / unrelated `*.md`.
 * Full form runs first so its output isn't left with a dangling `APPLY PHASE ` prefix.
 */
function rewritePhaseReferences(content: string, phaseNames: readonly string[]): string {
  let result = content;

  for (const phase of phaseNames) {
    const fileName = `${phase}.md`;
    const escaped = escapeRegExp(fileName);
    const delimited = delimitedAlternation(escaped);
    const replacement = 'APPLY SKILL FILE `phases/' + fileName + '`';

    // Pass 1 — full form: delimited OR bare (bare bounded by the `APPLY PHASE ` prefix + `.md` right boundary).
    const fullForm = new RegExp(
      'APPLY PHASE\\s+(?:' + delimited + '|' + escaped + '(?![A-Za-z0-9_-]))',
      'g',
    );
    result = result.replace(fullForm, replacement);

    // Pass 2 — standalone short form: delimited on both sides only.
    result = result.replace(new RegExp('(?:' + delimited + ')', 'g'), replacement);
  }

  return result;
}

/**
 * fileWorkflowToSkill: reshape this workflow-entry frame into its skill location under the
 * composing SpecEntry's own target base, strip phase frontmatter, and rewrite its own workflow's
 * real phase-file references within the content. FR-COPY-0080.
 */
export function fileWorkflowToSkill(
  frame: FileProcessingFrame,
  ctx: TargetContext,
): FileProcessingFrame {
  const allStems = ctx.vfs
    .filter((vf) => vf.path.startsWith(WORKFLOWS_FOLDER) && vf.path.endsWith('.md'))
    .map((vf) => workflowStem(vf.path));

  const stem = workflowStem(frame.sourcePath);
  const root = findWorkflowRoot(stem, allStems);
  const isMainDoc = root === stem;

  // Recover the target base already selected by the composing SpecEntry (e.g. "skills" or
  // ".agents/skills") from the incoming frame BEFORE mutating it — placement stays owned solely
  // by SpecEntry.target, never re-derived or hardcoded here.
  const lastSlash = frame.target.lastIndexOf('/');
  const targetBase = lastSlash === -1 ? '' : frame.target.slice(0, lastSlash);
  const newTarget = isMainDoc
    ? `${targetBase}/${root}/SKILL.md`
    : `${targetBase}/${root}/phases/${stem}.md`;

  // This workflow's own real phase basenames (siblings owned by the same root), excluding root itself.
  const phaseNames = allStems.filter((s) => s !== root && findWorkflowRoot(s, allStems) === root);

  return updateFileFrame(frame, (draft) => {
    draft.target = newTarget;
    if (typeof draft.target_contents === 'string') {
      if (phaseNames.length > 0) {
        draft.target_contents = rewritePhaseReferences(draft.target_contents, phaseNames);
      }
      if (!isMainDoc) {
        // Phase documents lose their frontmatter; the main workflow SKILL.md keeps it.
        draft.target_contents = stripFrontmatter(draft.target_contents);
      }
    }
  });
}
