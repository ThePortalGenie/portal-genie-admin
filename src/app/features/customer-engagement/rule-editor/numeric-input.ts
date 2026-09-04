/** Parse a number-input string into a RuleDraft numeric value. Empty stays empty. */
export function parseNumericInput(raw: string): number | null {
  if (raw.trim() === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Display a stored numeric draft value in an input. Never uses error punctuation. */
export function displayNumericInput(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export type NumericRange = { min: number; max: number };

export function applyRangePart(
  current: unknown,
  part: 'min' | 'max',
  amount: number | null,
): NumericRange | null {
  const range: NumericRange =
    isNumericRange(current)
      ? { min: current.min, max: current.max }
      : { min: Number.NaN, max: Number.NaN };
  range[part] = amount ?? Number.NaN;
  if (!Number.isFinite(range.min) && !Number.isFinite(range.max)) {
    return null;
  }
  return range;
}

function isNumericRange(value: unknown): value is NumericRange {
  return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}
