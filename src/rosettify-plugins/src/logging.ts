// FR-ARCH-0050, FR-CLI-0042 — pino logger; no-content rule; verbose expansion

import pino from 'pino';
import type { Writable } from 'stream';

let _logger: pino.Logger | null = null;

/**
 * Resolve the log level with the usual inheritance: default < env < param.
 * ROSETTIFY_PLUGINS_LOG_LEVEL overrides the 'info' default (e.g. 'warn' to see
 * only warnings/errors, 'silent' to mute); an explicit verbose param overrides
 * both. resolveLevel() alone yields the default<env result used when no param
 * is asserted, so initLogger(false) re-reads the env and self-resets.
 */
function resolveLevel(): string {
  const env = process.env['ROSETTIFY_PLUGINS_LOG_LEVEL']?.trim();
  return env ? env : 'info';
}

/**
 * Initialize the logger.
 * @param verbose - when true, forces 'debug' (param wins over env, FR-CLI-0051);
 *   when false, falls through to the env/default level (FR-ARCH-0050).
 * @param destination - optional writable stream for testing (defaults to stderr fd 2)
 */
export function initLogger(verbose: boolean, destination?: Writable): void {
  const level = verbose ? 'debug' : resolveLevel();
  if (destination) {
    // Test-injectable stream: use synchronous pino directly to the stream (no worker thread)
    _logger = pino({ level }, destination as pino.DestinationStream);
  } else {
    _logger = pino({
      level,
      transport: {
        target: 'pino/file',
        options: { destination: 2 }, // stderr
      },
    });
  }
}

export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = pino({ level: resolveLevel() });
  }
  return _logger;
}
