export function tagsToInput(tags: string[] | null | undefined) {
  return (tags ?? []).join(", ");
}

/** Splits on commas, trims, drops empties, dedupes case-insensitively (keeps first-seen casing). */
export function inputToTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}
