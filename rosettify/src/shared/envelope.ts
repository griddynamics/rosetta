import type { RunEnvelope, EnrichedEnvelope, OutputPayload, FailurePayload } from "../registry/types.js";
import type pino from "pino";

export function ok<T>(result: T): RunEnvelope<T> {
  return { ok: true, result, error: null, include_help: false };
}

export function err(error: string, includeHelp = false): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: includeHelp };
}

export function usageErr(error: string): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: true };
}

export function extractOutput<T>(envelope: EnrichedEnvelope<T>): OutputPayload<T> {
  if (envelope.ok) {
    return { ok: true, payload: envelope.result as T };
  }
  const failurePayload: FailurePayload = { error: envelope.error ?? "unknown_error" };
  if (envelope.help !== undefined) {
    failurePayload.help = envelope.help;
  }
  return { ok: false, payload: failurePayload };
}

export function logFailure(
  log: pino.Logger,
  toolName: string,
  error: string,
  context?: Record<string, unknown>,
): void {
  if (error.startsWith("internal_error")) {
    log.error({ tool: toolName, error, ...context }, "tool call failed");
  } else {
    log.warn({ tool: toolName, error, ...context }, "tool call failed");
  }
}
