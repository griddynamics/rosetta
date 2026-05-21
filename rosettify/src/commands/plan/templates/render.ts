// Implements FR-PLAN-0034 (placeholder substitution with strict bidirectional matching).

import { ERR_MISSING_TEMPLATE_PARAM, ERR_UNEXPECTED_TEMPLATE_PARAM } from "../errors.js";

// ---------------------------------------------------------------------------
// FR-PLAN-0034 — Placeholder render with strict bidirectional matching
// ---------------------------------------------------------------------------

// Regex to find ALL [token] occurrences in a string value
const PLACEHOLDER_REGEX = /\[([a-z][a-z0-9-]*)\]/g;

/** Collects all [token] occurrences in a JSON tree (only in string leaves). */
function collectPlaceholderTokens(value: unknown): Set<string> {
  const found = new Set<string>();

  function walk(v: unknown): void {
    if (typeof v === "string") {
      for (const match of v.matchAll(PLACEHOLDER_REGEX)) {
        found.add(match[1]!);
      }
    } else if (Array.isArray(v)) {
      for (const item of v) walk(item);
    } else if (typeof v === "object" && v !== null) {
      for (const val of Object.values(v as Record<string, unknown>)) walk(val);
    }
  }

  walk(value);
  return found;
}

/** Replaces all [token] occurrences in a JSON tree (only in string leaves) with params values. */
function substituteValues(value: unknown, params: Record<string, string>): unknown {
  if (typeof value === "string") {
    // FR-PLAN-0034 — literal string replacement; values are not re-interpreted
    let result = value;
    for (const [token, replacement] of Object.entries(params)) {
      // Replace all occurrences of [token]
      result = result.split(`[${token}]`).join(replacement);
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteValues(item, params));
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteValues(v, params);
    }
    return out;
  }
  return value;
}

/**
 * Renders a template by substituting placeholder values.
 * FR-PLAN-0034 — strict bidirectional matching:
 *  1. Pre-substitution scan: any [token] in template content not in declared set → unexpected_template_param
 *  2. If caller provides key not in declared set → unexpected_template_param
 *  3. If declared placeholder not provided by caller → missing_template_param
 *  4. Then substitute (literal string replacement).
 */
export function renderTemplate(
  template: { placeholders: readonly string[]; content: unknown },
  params: Record<string, string>,
): { ok: true; rendered: unknown } | { ok: false; error: string } {
  const declared = new Set(template.placeholders);
  const provided = new Set(Object.keys(params));

  // FR-PLAN-0034 — check caller provides no undeclared params
  for (const key of provided) {
    if (!declared.has(key)) {
      return { ok: false, error: `${ERR_UNEXPECTED_TEMPLATE_PARAM}: ${key}` };
    }
  }

  // FR-PLAN-0034 — check all declared placeholders are provided
  for (const placeholder of declared) {
    if (!provided.has(placeholder)) {
      return { ok: false, error: `${ERR_MISSING_TEMPLATE_PARAM}: ${placeholder}` };
    }
  }

  // FR-PLAN-0034 — pre-substitution scan: check template content contains no undeclared [token] literals
  const tokensInContent = collectPlaceholderTokens(template.content);
  for (const token of tokensInContent) {
    if (!declared.has(token)) {
      return { ok: false, error: `${ERR_UNEXPECTED_TEMPLATE_PARAM}: ${token}` };
    }
  }

  // FR-PLAN-0034 — substitute (literal replacement; values are not re-interpreted)
  const rendered = substituteValues(template.content, params as Record<string, string>);
  return { ok: true, rendered };
}
