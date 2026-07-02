import pino, { type Logger, type LoggerOptions } from 'pino';

/**
 * Structured NDJSON logging (§16, pino). Child (Curion) logs are forwarded to the
 * parent over IPC in later milestones; this util is the single logger factory so
 * level/format stay consistent. Secrets are never logged (§4/§12) — callers must
 * not pass key material into log fields.
 */
export type { Logger };

const DEFAULT_LEVEL = process.env['CURIOCITY_LOG_LEVEL'] ?? 'info';

export function createLogger(name: string, options: LoggerOptions = {}): Logger {
  return pino({
    name,
    level: DEFAULT_LEVEL,
    ...options,
  });
}

/** Shared root logger for the orchestrator process. */
export const logger: Logger = createLogger('curiocity');
