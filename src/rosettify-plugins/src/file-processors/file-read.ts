// FR-ARCH-0040 — sole content ingress; text → gray-matter split; binary → bytes

import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from '../serialize/frontmatter.js';
import { updateFileFrame } from '../frames.js';
import type { FileProcessingFrame, TargetContext } from '../types.js';

// Binary file extensions — treat these as binary (copy verbatim)
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.pdf',
  '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot',
  '.js', '.cjs', '.mjs', // hook bundle JS files
]);

/**
 * fileRead: read content from all SourceFiles and populate target_contents and frontmatter.
 * For text files: read all sources, parse frontmatter from the first, set on frame.
 * For binary: read each source as Buffer and cache it on SourceFile._readBytes.
 * FR-ARCH-0040
 */
export function fileRead(frame: FileProcessingFrame, ctx: TargetContext): FileProcessingFrame {
  const sources = frame.source;
  if (sources.length === 0) return frame;

  const ext = path.extname(frame.sourcePath).toLowerCase();
  const isBinary = BINARY_EXTENSIONS.has(ext);

  if (isBinary) {
    // Binary file: read each source's bytes and cache them on SourceFile._readBytes, so
    // fileApplyOverrides can set target_contents from the new lead source (FR-ARCH-0024).
    // More than one source is not an error here: fileApplyOverrides may still leave one;
    // fileBundle raises the error when more than one remains (FR-ARCH-0042).
    const bytes = sources.map((src) => fs.readFileSync(src.origin));
    return updateFileFrame(frame, (draft) => {
      draft.isBinary = true;
      draft.source = draft.source.map((sf, i) => ({ ...sf, _readBytes: bytes[i] }));
      draft.target_contents = bytes[0];
    });
  }

  // Text file: read each source's content separately.
  // fileRead is the sole disk-read site (FR-ARCH-0033).
  // Store each source's raw content on SourceFile._readContent for fileBundle to consume
  // without re-reading from disk (NFR-0007, F-E fix).
  // For single-source files, set target_contents directly; fileBundle will see source.length<=1 and no-op.
  const texts = sources.map((src) => {
    const rawContent = fs.readFileSync(src.origin, 'utf-8');
    // Ensure LF-only (NFR encoding)
    return rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  });

  return updateFileFrame(frame, (draft) => {
    draft.isBinary = false;

    // Set frontmatter from parsing the first source; cache each source's content on _readContent
    const parsed = parseFrontmatter(texts[0]);
    draft.source = draft.source.map((sf, i) => {
      const withContent: typeof sf = { ...sf, _readContent: texts[i] };
      if (i === 0 && parsed.frontmatter) {
        return { ...withContent, frontmatter: parsed.frontmatter };
      }
      return withContent;
    });

    // For single source: set target_contents to its raw content.
    // For multi-source: set to first source's raw content; fileBundle will concatenate properly.
    draft.target_contents = texts[0];
  });
}
