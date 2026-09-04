import { describe, expect, it } from 'vitest';
import { applyRangePart, displayNumericInput, parseNumericInput } from './numeric-input';

describe('parseNumericInput', () => {
  it('keeps duration values as numbers, including 0, 14, 365, and 1000', () => {
    expect(parseNumericInput('14')).toBe(14);
    expect(parseNumericInput('0')).toBe(0);
    expect(parseNumericInput('7')).toBe(7);
    expect(parseNumericInput('365')).toBe(365);
    expect(parseNumericInput('1000')).toBe(1000);
    expect(typeof parseNumericInput('14')).toBe('number');
  });

  it('treats an empty field as null rather than a display string', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
    expect(displayNumericInput(null)).toBe('');
    expect(displayNumericInput(undefined)).toBe('');
  });

  it('preserves a negative number so existing validation can flag it', () => {
    expect(parseNumericInput('-1')).toBe(-1);
    expect(typeof parseNumericInput('-1')).toBe('number');
    expect(displayNumericInput(-1)).toBe('-1');
  });

  it('parses count metrics the same way as duration metrics', () => {
    expect(parseNumericInput('3')).toBe(3);
    expect(displayNumericInput(3)).toBe('3');
  });
});

describe('applyRangePart', () => {
  it('stores between 14 and 30 as { min, max } numbers', () => {
    const afterMin = applyRangePart(null, 'min', 14);
    expect(afterMin?.min).toBe(14);
    const range = applyRangePart(afterMin, 'max', 30);
    expect(range).toEqual({ min: 14, max: 30 });
    expect(typeof range?.min).toBe('number');
    expect(typeof range?.max).toBe('number');
  });
});

describe('displayNumericInput', () => {
  it('shows lifecycle offsets 0 and 7 as digits, not a placeholder mark', () => {
    expect(displayNumericInput(0)).toBe('0');
    expect(displayNumericInput(7)).toBe('7');
    expect(displayNumericInput('!')).toBe('');
  });
});
