// FR-ARCH-0051, FR-VAR-0072 — standalone injection into host frame at anchor

import { updatePluginFrame } from '../frames.js';
import type { FileProcessingFrame, InjectionDecl, PluginProcessingFrame } from '../types.js';

/**
 * pluginInjectSections: insert generated sections at anchor in host frame.
 * Missing host frame → error. Missing anchor → error.
 * FR-ARCH-0051
 */
export function pluginInjectSections(
  p: PluginProcessingFrame,
): PluginProcessingFrame {
  if (p.spec.injections.length === 0) return p;

  const { spec, frames } = p;
  let errors = [...p.errors];
  let changed = false;

  const updatedFrames = [...frames] as FileProcessingFrame[];

  for (const injection of spec.injections) {
    const hostIdx = updatedFrames.findIndex((f) => f.target === injection.hostFramePath);

    if (hostIdx < 0) {
      errors.push({
        target: spec.name,
        file: injection.hostFramePath,
        message: `Inject: host frame not found: ${injection.hostFramePath}`,
        kind: 'hard',
      });
      continue;
    }

    const hostFrame = updatedFrames[hostIdx];
    if (hostFrame.isBinary || hostFrame.target_contents === null) {
      errors.push({
        target: spec.name,
        file: injection.hostFramePath,
        message: `Inject: host frame is binary or empty: ${injection.hostFramePath}`,
        kind: 'hard',
      });
      continue;
    }

    const content = hostFrame.target_contents as string;
    const anchorIdx = content.indexOf(injection.anchor);

    if (anchorIdx < 0) {
      // Anchor not found — skip gracefully (r3 plugin-files-mode has no PREP STEP 1 section)
      // FR-VAR-0072: missing anchor → skip injection without error for standalone targets
      continue;
    }

    // Build the injected section text
    const injectedText = buildInjectionText(injection, updatedFrames, spec);

    // Insert AFTER the anchor section (not before it).
    // The anchor section ends at the next blank line or end-of-content.
    // We scan forward from the anchor to find the end of the section block.
    // GT-8/SPECS §6.4: injection goes AFTER "# PREP STEP 1:" and its bullet lines.
    const insertPos = findInsertPositionAfterAnchor(content, anchorIdx, injection.anchor);
    const newContent = content.slice(0, insertPos) + injectedText + content.slice(insertPos);

    updatedFrames[hostIdx] = { ...hostFrame, target_contents: newContent };
    changed = true;
  }

  if (!changed && errors.length === p.errors.length) return p;

  return updatePluginFrame(p, (draft) => {
    if (changed) {
      draft.frames = updatedFrames as typeof draft.frames;
    }
    draft.errors = errors as typeof draft.errors;
  });
}

/**
 * Find the insert position AFTER the anchor section.
 * Starting from anchorIdx, skip forward past the anchor heading and its continuation lines
 * (bullet lines starting with "- ") until we hit a blank line or end of section.
 * Returns the position where injected content should go (after the section).
 * GT-8: insertion goes after "# PREP STEP 1:" section (heading + bullet lines).
 */
function findInsertPositionAfterAnchor(content: string, anchorIdx: number, anchor: string): number {
  // Skip past the anchor heading line itself
  let pos = anchorIdx + anchor.length;
  // Skip the rest of the heading line (to end of line)
  const nlAfterAnchor = content.indexOf('\n', pos);
  if (nlAfterAnchor < 0) return content.length;
  pos = nlAfterAnchor + 1;

  // Skip blank line after heading
  if (content[pos] === '\n') {
    pos++;
  }

  // Skip bullet lines (lines starting with '- ' or '-\n')
  while (pos < content.length) {
    const lineEnd = content.indexOf('\n', pos);
    const lineEndActual = lineEnd < 0 ? content.length : lineEnd;
    const line = content.slice(pos, lineEndActual);

    if (line.startsWith('- ') || line === '-') {
      pos = lineEndActual + 1; // skip past this bullet line
    } else {
      // Non-bullet line: we've passed the section
      break;
    }
  }

  return pos;
}

function buildInjectionText(
  injection: InjectionDecl,
  frames: FileProcessingFrame[],
  spec: PluginProcessingFrame['spec'],
): string {
  const parts: string[] = [];

  for (const section of injection.sections) {
    if (section.kind === 'literal' && section.text) {
      parts.push(section.text);
    } else if (section.kind === 'index' && section.indexFolder) {
      // Find the INDEX.md for this folder
      const indexTarget = `${section.indexFolder}/INDEX.md`;
      const indexFrame = frames.find((f) => f.target === indexTarget);
      if (indexFrame && indexFrame.target_contents) {
        parts.push(indexFrame.target_contents as string);
      }
    } else if (section.kind === 'plugin-root') {
      // Nothing to inject here — plugin root is handled by bootstrap, not injection
      // Standalones inject a literal text that includes the plugin root
    }
  }

  return parts.join('');
}
