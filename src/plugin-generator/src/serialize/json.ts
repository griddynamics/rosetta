// NFR-0001/0005 — byte-exact JSON emitter (2-space indent, no trailing spaces, LF)
// Generator-owned: do NOT use JSON.stringify defaults for parity-bearing files.

/**
 * Emit a 2-space-indented JSON object with a trailing newline.
 * Used for plugin.json, standalone manifest, hooks.json (via Handlebars),
 * and any other generator-owned JSON output.
 * PARITY: uses standard JSON.stringify with 2-space indent + trailing newline (LF).
 */
export function emitJson(obj: unknown): string {
  // JSON.stringify with 2 spaces matches Python json.dumps(indent=2) for simple objects.
  // LF only — NFR encoding rule.
  return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * Emit a standalone plugin manifest: { "name": "...", "version": "..." }
 * FR-VAR-0060, GT-7: 2-space indent, key order name→version, trailing newline.
 */
export function emitStandaloneManifest(name: string, version: string): string {
  return emitJson({ name, version });
}
