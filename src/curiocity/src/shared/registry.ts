import { CuriocityError, UnknownIdError } from './errors';

/**
 * Generic static registry (§5.1, D5). A typed map keyed by `id` — NOT a plugin
 * framework. Each domain folder (agents/, evaluators/, stats/, reporters/,
 * combiners/) constructs one and registers its built-ins in its `index.ts`;
 * config refers to entries by id.
 */
export interface Identified {
  readonly id: string;
}

export class Registry<T extends Identified> {
  private readonly items = new Map<string, T>();

  constructor(private readonly kind: string) {}

  register(item: T): void {
    if (this.items.has(item.id)) {
      throw new CuriocityError(
        `Duplicate ${this.kind} id "${item.id}" registered.`,
        'DUPLICATE_ID',
      );
    }
    this.items.set(item.id, item);
  }

  /** Throws `UnknownIdError` (with the known-ids list) when `id` is not registered. */
  get(id: string): T {
    const item = this.items.get(id);
    if (item === undefined) {
      throw new UnknownIdError(this.kind, id, [...this.items.keys()]);
    }
    return item;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  list(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }
}
