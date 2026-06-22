// NFR-0002, PARITY-5 — stable lexicographic sort matching Python sorted() (byte order, case-sensitive)

/**
 * Comparator that matches Python sorted() on path strings.
 * Python sorted() uses Unicode code point order (same as JS localeCompare with no locale,
 * but we use direct string comparison to guarantee byte order matching).
 */
export function lexicographicCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function sortPaths<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => lexicographicCompare(keyFn(a), keyFn(b)));
}
