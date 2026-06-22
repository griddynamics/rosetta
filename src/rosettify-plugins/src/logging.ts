// FR-ARCH-0050, FR-CLI-0042 — pino logger; no-content rule; verbose expansion

import pino from 'pino';
import type { Writable } from 'stream';

let _logger: pino.Logger | null = null;

/**
 * Initialize the logger.
 * @param verbose - when true, sets level to 'debug' (FR-CLI-0051)
 * @param destination - optional writable stream for testing (defaults to stderr fd 2)
 */
export function initLogger(verbose: boolean, destination?: Writable): void {
  const level = verbose ? 'debug' : 'info';
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
    _logger = pino({ level: 'info' });
  }
  return _logger;
}
