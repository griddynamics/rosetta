/**
 * Minimal glob matcher for `envRemove` patterns (§5.2) — supports `*` (any run)
 * and `?` (one char), anchored full-string match. Env var names are simple tokens
 * (e.g. `CLAUDE_CODE*`, `ANTHROPIC_*`), so a full glob engine (and a new
 * dependency outside §16) is unwarranted.
 */
export function minimatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  return re.test(value);
}
