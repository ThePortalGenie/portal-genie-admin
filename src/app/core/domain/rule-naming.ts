/**
 * Builds the next label for a duplicated rule.
 * Duplicate names are allowed; this only avoids repeating the same "(Copy)" suffix.
 */
export function nextDuplicateName(
  originalName: string,
  existingNames: readonly string[],
): string {
  const names = new Set(existingNames);
  const copy = `${originalName} (Copy)`;
  if (!names.has(copy)) {
    return copy;
  }

  let suffix = 2;
  while (names.has(`${originalName} (Copy ${suffix})`)) {
    suffix += 1;
  }
  return `${originalName} (Copy ${suffix})`;
}
