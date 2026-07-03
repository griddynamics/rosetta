// FR-HOOK-0001-0009, NFR-0004 — bootstrap payload assembly
// GT-2, GT-3 — per-IDE entry shapes, prefix on lead, absent→skip
// FR-ARCH-0005: switch functions removed; IDE-specific behavior supplied via callbacks.

import { buildHookPayloadJson } from '../escaping/json-string.js';
import { wrapInPrintf } from '../escaping/shell.js';
import { wrapInPsWriteOutput } from '../escaping/powershell.js';
import {
  BOOTSTRAP_PREFIX,
  BOOTSTRAP_MANIFEST_ORDER,
} from '../spec/bootstrap-manifest.js';
import { stripFrontmatter } from '../serialize/frontmatter.js';
import { applyFolderRewrites, buildRenamePairs } from '../plugin-processors/plugin-rewrite-references.js';
import type { FileProcessingFrame, GenError, PluginProcessingFrame } from '../types.js';

export { buildHookPayloadJson, wrapInPrintf, wrapInPsWriteOutput, applyFolderRewrites };

const MAX_ENTRY_CHARS = 10000; // NFR-0004

/**
 * Build a claude hook entry JSON object (compact, with spaces after : and ,).
 * GT-3.1: {"type": "command", "command": "...", "once": true}
 */
export function buildClaudeBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}, "once": true}`;
}

/**
 * Build a codex hook entry JSON object.
 * GT-3.2: {"type": "command", "command": "...", "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}
 */
export function buildCodexBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}, "statusMessage": "Loading Rosetta bootstrap", "timeout": 30}`;
}

/**
 * Build a copilot hook entry JSON object.
 * GT-3.3: {"type": "command", "bash": "...", "powershell": "..."}
 */
export function buildCopilotBootstrapEntry(bash: string, powershell: string): string {
  return `{"type": "command", "bash": ${JSON.stringify(bash)}, "powershell": ${JSON.stringify(powershell)}}`;
}

/**
 * Build a cursor hook entry JSON object.
 * GT-3 cursor: {"type": "command", "command": "..."} — no once, no statusMessage, no bash/powershell.
 */
export function buildCursorBootstrapEntry(command: string): string {
  return `{"type": "command", "command": ${JSON.stringify(command)}}`;
}

/**
 * Callback type for building one per-document bootstrap entry.
 * additionalContext: the rewritten body string (prefix-prepended for lead, folder-rewritten).
 * Returns the entry JSON object string, or null to skip this entry.
 * FR-ARCH-0005: IDE-specific entry shape (and its own JSON payload) supplied by caller, not derived here.
 */
export type EntryBuilderFn = (
  additionalContext: string,
) => string | null;

/**
 * Callback type for building the plugin-root path entry (always the final entry).
 * folderPairs: rename pairs for reference-rewriting the plugin-root command string.
 * Returns the entry JSON object string, or null to omit the plugin-root entry.
 * FR-HOOK-0007
 */
export type RootEntryBuilderFn = (
  folderPairs: Array<[string, string]>,
) => string | null;

/**
 * Assemble the bootstrap payload string for a target.
 * Returns the string to inject as {{{bootstrap_hooks}}} plus any soft errors.
 * IDE-specific behavior (entry shape, payload format) is supplied via callbacks.
 * FR-ARCH-0005, FR-HOOK-0001-0009, NFR-0004
 */
export function assembleBootstrapPayload(
  p: PluginProcessingFrame,
  buildEntry: EntryBuilderFn,
  buildRootEntry: RootEntryBuilderFn,
): { payload: string; errors: GenError[] } {
  const { spec, frames } = p;
  const errors: GenError[] = [];
  const folderPairs = buildRenamePairs(frames, spec);

  const entryStrings: string[] = [];

  // Process manifest entries (FR-HOOK-0001: absent→skip, NFR-0006: content-agnostic)
  for (const ref of BOOTSTRAP_MANIFEST_ORDER) {
    // Skip index entries unless includeIndexEntries is set (FR-HOOK-0004)
    if (ref.basename.startsWith('__') && !spec.includeIndexEntries) continue;

    // Find the document in frames
    let body: string | null = null;
    let isIndex = false;

    if (ref.basename === '__rules_index__') {
      body = findIndexBody(frames, spec, 'rules');
      isIndex = true;
    } else if (ref.basename === '__workflows_index__') {
      body = findIndexBody(frames, spec, 'workflows');
      isIndex = true;
    } else {
      body = findDocBody(frames, ref.basename);
    }

    if (body === null) {
      // Absent → skip (FR-HOOK-0001)
      continue;
    }

    // Apply prefix to lead document (FR-HOOK-0003)
    let additionalContext: string;
    if (ref.isLead) {
      const cleanBody = body.startsWith('\n') ? body.slice(1) : body;
      additionalContext = BOOTSTRAP_PREFIX + cleanBody;
    } else {
      additionalContext = body;
    }

    // Apply folder rewrites to payload (FR-HOOK-0008) — only for doc bodies, not INDEX bodies.
    const rewrittenContext = isIndex
      ? additionalContext
      : applyFolderRewrites(additionalContext, folderPairs);

    // Size check on the ORIGINAL content (NFR-0004) — measured BEFORE any IDE-specific JSON
    // wrapping/escaping. The 10,000-char budget is about the actual bootstrap document text an
    // agent has to read, not the incidental overhead of whichever wire format carries it — a
    // wrapped/escaped/duplicated (e.g. Copilot's merged top-level+nested emit) payload is not a
    // bigger "entry" by this measure, and a per-IDE proxy would wrongly vary the same content's
    // pass/fail by which IDE happens to be rendering it.
    if (rewrittenContext.length > MAX_ENTRY_CHARS) {
      errors.push({
        target: spec.name,
        file: ref.basename,
        message: `Bootstrap entry exceeds ${MAX_ENTRY_CHARS} chars (${rewrittenContext.length})`,
        kind: 'soft',
      });
    }

    // Build IDE-specific entry via callback
    const entryStr = buildEntry(rewrittenContext);

    if (entryStr !== null) {
      entryStrings.push(entryStr);
    }
  }

  // Append plugin-root entry (GT-3.4, FR-HOOK-0007) — always last, separate
  const pluginRootEntry = buildRootEntry(folderPairs);
  if (pluginRootEntry !== null) {
    entryStrings.push(pluginRootEntry);
  }

  const payload = entryStrings.join(', ');
  return { payload, errors };
}

function findDocBody(frames: FileProcessingFrame[], basename: string): string | null {
  const matchingFrame = frames.find((f) => {
    const name = f.target.split('/').pop() ?? '';
    const stem = name.replace(/\.[^.]+$/, '');
    return stem === basename && f.target_contents !== null && !f.isBinary;
  });

  if (!matchingFrame || matchingFrame.target_contents === null) return null;

  const content = matchingFrame.target_contents as string;
  return stripFrontmatter(content);
}

function findIndexBody(
  frames: FileProcessingFrame[],
  spec: PluginProcessingFrame['spec'],
  kind: 'rules' | 'workflows',
): string | null {
  const indexCandidates = frames.filter((f) => {
    const fname = f.target.split('/').pop();
    if (fname !== 'INDEX.md') return false;
    if (f.target_contents === null || f.isBinary) return false;

    const content = f.target_contents as string;
    if (kind === 'rules') return content.startsWith('# Rosetta Rules Index');
    return content.startsWith('# Rosetta Workflows Index');
  });

  if (indexCandidates.length === 0) return null;
  return indexCandidates[0].target_contents as string;
}
