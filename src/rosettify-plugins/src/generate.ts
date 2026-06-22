// FR-CLI-0002, FR-ARCH-0032 — orchestration: resolve → build VFS → per-target pipeline run
// FR-CLI-0050: dryRun threads into buildAllSpecs → buildPipeline; no processor swapping here.
// FR-CLI-0020: all source roots resolved externally and passed via GenerateOptions.sources.

import { buildVfs } from './vfs/build-vfs.js';
import { createPluginFrame } from './frames.js';
import { getRelease, listReleases } from './spec/releases.js';
import { buildAllSpecs } from './spec/targets.js';
import { getLogger } from './logging.js';
import type { GenerateOptions, GenError, PluginProcessingFrame } from './types.js';

/**
 * Main generation entry point.
 * Returns exit code: 0 = success, 1 = any error.
 * FR-CLI-0002, FR-CLI-0041 (run-to-completion)
 */
export async function generate(options: GenerateOptions): Promise<number> {
  const logger = getLogger();
  const { sources, release: releaseName, domain, dryRun } = options;
  const { instructionsSource, pluginsSource, hooksSource, outputDir } = sources;

  // Validate release (FR-CLI-0010/0011)
  const release = getRelease(releaseName);
  if (!release) {
    const known = listReleases().join(', ');
    process.stderr.write(`Unknown release: "${releaseName}". Known releases: ${known}\n`);
    return 1;
  }

  // Build VFS (FR-ARCH-0010–0014, FR-CLI-0030/0031)
  // instructionsSource is the resolved instructions root (FR-CLI-0020)
  let vfs;
  try {
    vfs = buildVfs(instructionsSource, releaseName, domain);
  } catch (err) {
    process.stderr.write(`Failed to resolve instruction sources: ${(err as Error).message}\n`);
    return 1;
  }

  logger.info({ release: releaseName, domain, vfsSize: vfs.length }, 'VFS built');

  // Build all target specs — dryRun threads into every disk-mutating processor (FR-CLI-0050)
  // FR-CLI-0020: pluginsSource and hooksSource are resolved externally
  const specs = buildAllSpecs({
    pluginsSource,
    hooksSource,
    outputDir,
    release,
    dryRun,
  });

  // Template context for all targets
  const baseTemplateContext: Record<string, unknown> = {
    release: releaseName,
    deterministic_hooks: release.deterministicHooks,
    bootstrap_hooks: '',
  };

  const allErrors: GenError[] = [];
  let anyError = false;

  // Process each target independently (FR-CLI-0040, FR-CLI-0041)
  for (const spec of specs) {
    logger.info({ target: spec.name }, 'Processing target');

    const frame = createPluginFrame(spec, vfs, { ...baseTemplateContext });

    // Pipeline already has dryRun baked in via buildAllSpecs (FR-CLI-0050).
    const pipeline = spec.pluginProcessors;

    let currentFrame: PluginProcessingFrame = frame;

    try {
      for (const processor of pipeline) {
        // FR-ARCH-0050: per-PluginProcessor debug logging — frame metadata, no content
        logger.debug({
          target: spec.name,
          processor: processor.name || '(anonymous)',
          framesBefore: currentFrame.frames.length,
          errorsBefore: currentFrame.errors.length,
        }, 'FR-ARCH-0050: plugin-processor start');
        currentFrame = processor(currentFrame);
        logger.debug({
          target: spec.name,
          processor: processor.name || '(anonymous)',
          framesAfter: currentFrame.frames.length,
          errorsAfter: currentFrame.errors.length,
        }, 'FR-ARCH-0050: plugin-processor done');
      }
    } catch (err) {
      const errMsg = (err as Error).message ?? String(err);
      allErrors.push({
        target: spec.name,
        message: `Processor error: ${errMsg}`,
        kind: 'hard',
      });
      anyError = true;
      logger.error({ target: spec.name, error: errMsg }, 'Target processing failed');
      continue;
    }

    if (currentFrame.errors.length > 0) {
      for (const e of currentFrame.errors) {
        allErrors.push(e);
        process.stderr.write(`[${e.kind}] ${e.target}${e.file ? ':' + e.file : ''}: ${e.message}\n`);
        if (e.kind === 'hard' || e.kind === 'soft') anyError = true; // NFR-0004/QF-2: soft errors also set exit ≠ 0
      }
    }

    logger.info({ target: spec.name, frames: currentFrame.frames.length }, 'Target complete');
  }

  return anyError ? 1 : 0;
}
