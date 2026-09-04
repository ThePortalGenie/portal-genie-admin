import { describe, expect, it } from 'vitest';
import { RuleTiming } from '../models/rule.model';
import {
  analyseSequence,
  conflictForCurrentRule,
  normaliseLifecycleTiming,
  SequenceAnalysable,
} from './sequence-analysis';

function after(days: number, anchor: string): RuleTiming {
  return { mode: 'days_after_date', delayDays: days, anchorMetricKey: anchor };
}

function before(days: number, anchor: string): RuleTiming {
  return { mode: 'days_before_date', delayDays: days, anchorMetricKey: anchor };
}

function onMatch(): RuleTiming {
  return { mode: 'on_match' };
}

function item(id: string, name: string, timing: RuleTiming): SequenceAnalysable {
  return { id, name, timing, status: 'active' };
}

describe('normaliseLifecycleTiming', () => {
  it('maps registration offsets as days after the anchor', () => {
    expect(normaliseLifecycleTiming(after(0, 'registeredAt'))).toEqual({
      anchorMetricKey: 'registeredAt',
      offset: 0,
    });
    expect(normaliseLifecycleTiming(after(2, 'registeredAt'))).toEqual({
      anchorMetricKey: 'registeredAt',
      offset: 2,
    });
    expect(normaliseLifecycleTiming(after(5, 'registeredAt'))).toEqual({
      anchorMetricKey: 'registeredAt',
      offset: 5,
    });
  });

  it('maps trial expiry offsets as signed days relative to the anchor', () => {
    expect(normaliseLifecycleTiming(before(7, 'trialExpiresAt'))).toEqual({
      anchorMetricKey: 'trialExpiresAt',
      offset: -7,
    });
    expect(normaliseLifecycleTiming(before(3, 'trialExpiresAt'))).toEqual({
      anchorMetricKey: 'trialExpiresAt',
      offset: -3,
    });
    expect(normaliseLifecycleTiming(before(1, 'trialExpiresAt'))).toEqual({
      anchorMetricKey: 'trialExpiresAt',
      offset: -1,
    });
    expect(normaliseLifecycleTiming(before(0, 'trialExpiresAt'))).toEqual({
      anchorMetricKey: 'trialExpiresAt',
      offset: 0,
    });
    expect(normaliseLifecycleTiming(after(1, 'trialExpiresAt'))).toEqual({
      anchorMetricKey: 'trialExpiresAt',
      offset: 1,
    });
  });

  it('does not normalise behavioural or incomplete timing', () => {
    expect(normaliseLifecycleTiming(onMatch())).toBeNull();
    expect(normaliseLifecycleTiming({ mode: 'days_after_date', delayDays: 5 })).toBeNull();
  });
});

describe('analyseSequence', () => {
  it('finds no conflict when trial expiry offsets increase in display order', () => {
    const conflicts = analyseSequence([
      item('a', '7 Days Left in Your Trial', before(7, 'trialExpiresAt')),
      item('b', '3 Days Left in Your Trial', before(3, 'trialExpiresAt')),
      item('c', 'Your Trial Ends Tomorrow', before(1, 'trialExpiresAt')),
      item('d', 'Your Trial Ends Today', before(0, 'trialExpiresAt')),
      item('e', 'Your Portal Genie Trial Has Expired', after(1, 'trialExpiresAt')),
    ]);
    expect(conflicts).toEqual([]);
  });

  it('flags a trial expiry rule displayed after one that occurs later', () => {
    const conflicts = analyseSequence([
      item('a', 'Welcome to Portal Genie', after(0, 'registeredAt')),
      item('b', '3 Days Left in Your Trial', before(3, 'trialExpiresAt')),
      item('c', '7 Days Left in Your Trial', before(7, 'trialExpiresAt')),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.itemId).toBe('c');
    expect(conflicts[0]?.otherName).toBe('3 Days Left in Your Trial');
    expect(conflicts[0]?.detail).toContain("after '3 Days Left in Your Trial'");
    expect(conflicts[0]?.suggestion).toBe("Move this rule above '3 Days Left in Your Trial'.");
  });

  it('finds no conflict when registration offsets increase in display order', () => {
    const conflicts = analyseSequence([
      item('a', 'Welcome to Portal Genie', after(0, 'registeredAt')),
      item('b', 'Complete Your Setup', after(2, 'registeredAt')),
      item('c', 'Check-in', after(5, 'registeredAt')),
    ]);
    expect(conflicts).toEqual([]);
  });

  it('flags a registration rule displayed after one that occurs later', () => {
    const conflicts = analyseSequence([
      item('a', 'Check-in', after(5, 'registeredAt')),
      item('b', 'Complete Your Setup', after(2, 'registeredAt')),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.itemId).toBe('b');
    expect(conflicts[0]?.suggestion).toBe("Move this rule above 'Check-in'.");
  });

  it('does not compare registration timing with trial expiry timing', () => {
    const conflicts = analyseSequence([
      item('a', 'Check-in', after(5, 'registeredAt')),
      item('b', '7 Days Left in Your Trial', before(7, 'trialExpiresAt')),
    ]);
    expect(conflicts).toEqual([]);
  });

  it('does not treat behavioural rules as chronological conflicts', () => {
    const conflicts = analyseSequence([
      item('a', 'Welcome to Portal Genie', after(0, 'registeredAt')),
      item('b', 'Create Your First Folder', onMatch()),
      item('c', "We Haven't Seen You in a While", onMatch()),
      item('d', 'New Feature Available', onMatch()),
      item('e', 'Complete Your Setup', after(2, 'registeredAt')),
    ]);
    expect(conflicts).toEqual([]);
  });

  it('still analyses a disabled rule when its timing is comparable', () => {
    const conflicts = analyseSequence([
      {
        id: 'a',
        name: '3 Days Left in Your Trial',
        timing: before(3, 'trialExpiresAt'),
        status: 'active',
      },
      {
        id: 'b',
        name: '7 Days Left in Your Trial',
        timing: before(7, 'trialExpiresAt'),
        status: 'disabled',
      },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.itemId).toBe('b');
  });

  it('does not flag equal offsets on the same anchor', () => {
    const conflicts = analyseSequence([
      item('a', 'On registration A', after(0, 'registeredAt')),
      item('b', 'On registration B', after(0, 'registeredAt')),
    ]);
    expect(conflicts).toEqual([]);
  });
});

describe('conflictForCurrentRule', () => {
  it('keeps the direct message when the current rule is listed too late', () => {
    const conflicts = analyseSequence([
      item('b', '3 Days Left in Your Trial', before(3, 'trialExpiresAt')),
      item('a', '7 Days Left in Your Trial', before(7, 'trialExpiresAt')),
    ]);
    const current = conflictForCurrentRule(conflicts, 'a');
    expect(current?.suggestion).toBe("Move this rule above '3 Days Left in Your Trial'.");
  });

  it('inverts the message when the current rule is listed too early', () => {
    const conflicts = analyseSequence([
      item('a', 'Check-in', after(5, 'registeredAt')),
      item('b', 'Complete Your Setup', after(2, 'registeredAt')),
    ]);
    const current = conflictForCurrentRule(conflicts, 'a');
    expect(current?.detail).toContain("before 'Complete Your Setup'");
    expect(current?.suggestion).toBe("Move this rule below 'Complete Your Setup'.");
  });
});
