import type { ToolDef, RunEnvelope, EnrichedEnvelope, CommandInput } from "../registry/types.js";
import { err, usageErr } from "./envelope.js";
import { logger } from "./logger.js";

// Lightweight input validation against a JSON Schema (structural checks only)
// No external validator — keeps deps minimal (NFR-STAB-0002)
export function validateInput(
  input: unknown,
  schema: Record<string, unknown>,
): string | null {
  if (typeof input !== "object" || input === null) {
    return "input must be an object";
  }

  const obj = input as Record<string, unknown>;
  const properties = schema["properties"] as
    | Record<string, Record<string, unknown>>
    | undefined;
  const required = schema["required"] as string[] | undefined;

  if (required) {
    for (const field of required) {
      if (!(field in obj)) {
        return `missing required field: ${field}`;
      }
    }
  }

  if (properties) {
    for (const [key, propSchema] of Object.entries(properties)) {
      if (!(key in obj)) continue;
      const value = obj[key];
      const type = propSchema["type"] as string | undefined;
      const enumValues = propSchema["enum"] as unknown[] | undefined;
      const oneOf = propSchema["oneOf"] as Array<Record<string, unknown>> | undefined;

      if (type && value !== undefined && value !== null) {
        let valid = false;
        if (type === "string" && typeof value === "string") valid = true;
        else if (type === "integer" && typeof value === "number" && Number.isInteger(value)) valid = true;
        else if (type === "number" && typeof value === "number") valid = true;
        else if (type === "boolean" && typeof value === "boolean") valid = true;
        else if (type === "object" && typeof value === "object" && !Array.isArray(value)) valid = true;
        else if (type === "array" && Array.isArray(value)) valid = true;
        if (!valid && !oneOf) return `field ${key} must be of type ${type}`;
      }

      if (oneOf && value !== undefined && value !== null) {
        const anyMatch = oneOf.some((subSchema) => {
          const subType = subSchema["type"] as string | undefined;
          if (!subType) return true;
          if (subType === "string" && typeof value === "string") return true;
          if (subType === "object" && typeof value === "object" && !Array.isArray(value)) return true;
          return false;
        });
        if (!anyMatch) return `field ${key} did not match any allowed type`;
      }

      if (enumValues && value !== undefined && !enumValues.includes(value)) {
        return `field ${key} must be one of: ${enumValues.join(", ")}`;
      }
    }
  }

  return null;
}

export async function dispatch<TInput extends CommandInput, TResult>(
  tool: ToolDef<TInput, TResult>,
  input: unknown,
): Promise<EnrichedEnvelope<TResult>> {
  try {
    // Step 1: Validate input against schema
    const validationError = validateInput(input, tool.inputSchema);
    if (validationError) {
      return usageErr(validationError);
    }

    // Step 2: Call run delegate
    let envelope: RunEnvelope<TResult>;
    try {
      envelope = await tool.run(input as TInput);
    } catch (runError) {
      const msg = runError instanceof Error ? runError.message : String(runError);
      logger.error({ tool: tool.name, error: msg }, "run delegate threw");
      return err(`internal_error: ${msg}`);
    }

    // Step 3: Enrich with help if requested
    if (envelope.include_help) {
      try {
        // Lazy import to avoid circular dependency
        const { helpToolDef } = await import("../commands/help/index.js");
        const helpEnvelope = await helpToolDef.run({ subcommand: tool.name });
        const enriched: EnrichedEnvelope<TResult> = {
          ...envelope,
          help: helpEnvelope.result ?? undefined,
        };
        return enriched;
      } catch (helpError) {
        logger.warn({ error: String(helpError) }, "help enrichment failed");
      }
    }

    return envelope;
  } catch (unexpected) {
    const msg =
      unexpected instanceof Error ? unexpected.message : String(unexpected);
    logger.error({ tool: tool.name, error: msg }, "dispatch unexpected error");
    return err(`internal_error: ${msg}`);
  }
}
