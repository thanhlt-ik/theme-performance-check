/**
 * Products are named "<Family> - <Variant>" (e.g. "Blum - Solie"). This is
 * the one place that assumption lives, so filters that group by theme
 * family (Overview trend, Analytics) all agree on what a "family" is.
 */
export function productFamily(name: string): string {
  const idx = name.indexOf(' - ');
  return idx === -1 ? name : name.slice(0, idx).trim();
}

/** Unique family names, in first-seen order — stable as long as the
 * underlying product list order is stable (API already sorts by name). */
export function uniqueFamilies(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const family = productFamily(name);
    if (!seen.has(family)) {
      seen.add(family);
      result.push(family);
    }
  }
  return result;
}
