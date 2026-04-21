import pino from "pino";

// FR-ARCH-0010, FR-SHRD-0005
// Writes to file only. Never stdout, never stderr.
// ROSETTIFY_LOG env var overrides default path.
// ROSETTIFY_LOG_LEVEL env var sets level (default: "info").

const logFile = process.env["ROSETTIFY_LOG"] ?? "rosettify.log";

const logLevel = process.env["ROSETTIFY_LOG_LEVEL"] ?? "info";

export const logger: pino.Logger = pino(
  { level: logLevel },
  pino.destination({ dest: logFile, sync: true }),
);
