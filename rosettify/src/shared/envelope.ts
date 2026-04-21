import type { RunEnvelope } from "../registry/types.js";

export function ok<T>(result: T): RunEnvelope<T> {
  return { ok: true, result, error: null, include_help: false };
}

export function err(error: string, includeHelp = false): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: includeHelp };
}

export function usageErr(error: string): RunEnvelope<never> {
  return { ok: false, result: null, error, include_help: true };
}
