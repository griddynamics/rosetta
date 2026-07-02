import type { CaseConfig } from '../config/schema';

/**
 * A fully-resolved case ready to enter the trial pipeline. Discovered cases and
 * inline (ephemeral, D7) cases produce the identical shape so they flow through
 * one pipeline (§8).
 */
export interface CaseDefinition {
  /** Folder name for discovered cases; a synthetic name (e.g. `inline`) otherwise. */
  name: string;
  /** True for ephemeral `--prompt` cases (no folder, no discovery). */
  ephemeral: boolean;
  /** Source folder for discovered cases. */
  dir?: string;
  /** Task prompt text (launch argument, D15). */
  prompt: string;
  /** QnA answering policy text (§6). */
  qna: string;
  /** Judge rubric text, verbatim; undefined when evaluation is off (§8). */
  evaluation?: string;
  /** Path to `src.zip` for discovered cases. */
  srcZipPath?: string;
  /** Inline `--src <dir>` source directory (ephemeral cases). */
  srcDir?: string;
  /** Validated case config. */
  config: CaseConfig;
}

/** A subfolder that could not be run, with a human-readable reason (§8). */
export interface SkippedCase {
  name: string;
  dir: string;
  reason: string;
}

export interface DiscoveryResult {
  source: string;
  valid: CaseDefinition[];
  skipped: SkippedCase[];
}
