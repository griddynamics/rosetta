/**
 * Error classes shared across the harness.
 *
 * `UnknownIdError` is thrown by `Registry.get` (§5.1) and always lists the known
 * ids so a mistyped config reference produces an actionable message.
 */

export class CuriocityError extends Error {
  readonly code: string;

  constructor(message: string, code = 'CURIOCITY_ERROR') {
    super(message);
    this.name = new.target.name;
    this.code = code;
    // Restore prototype chain for reliable instanceof across transpilation targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Invalid / unreadable configuration (maps to CLI exit code 2). */
export class ConfigError extends CuriocityError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

/** A value failed schema validation at a boundary. */
export class ValidationError extends CuriocityError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/** Thrown by `Registry.get(id)` when `id` was never registered. */
export class UnknownIdError extends CuriocityError {
  readonly kind: string;
  readonly id: string;
  readonly knownIds: readonly string[];

  constructor(kind: string, id: string, knownIds: readonly string[]) {
    const known = knownIds.length > 0 ? knownIds.join(', ') : '(none registered)';
    super(`Unknown ${kind} id "${id}". Known ${kind} ids: ${known}.`, 'UNKNOWN_ID');
    this.kind = kind;
    this.id = id;
    this.knownIds = knownIds;
  }
}
