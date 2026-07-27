import pino from "pino";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// FR-ARCH-0010, FR-SHRD-0005
// Writes to file only. Never stdout, never stderr.
// ROSETTIFY_LOG env var overrides default path.
// ROSETTIFY_LOG_LEVEL env var sets level (default: "warn").

const defaultLogDirectory = path.join(os.homedir(), ".rosetta");
const logFile = process.env["ROSETTIFY_LOG"] ?? path.join(defaultLogDirectory, "rosettify.log");

const logLevel = process.env["ROSETTIFY_LOG_LEVEL"] ?? "warn";

fs.mkdirSync(path.dirname(logFile), { recursive: true });

export const logger: pino.Logger = pino(
  { level: logLevel },
  pino.destination({ dest: logFile, sync: true }),
);

/** Enables trace-level diagnostics for the current CLI invocation. */
export function enableVerboseLogging(): void {
  logger.level = "trace";
}
