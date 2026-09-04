import { describe, expect, it } from 'vitest';
import {
  announcementTimingFromParts,
  extraScheduleIssues,
  scheduledAtFromParts,
  showsJourneySequencePanel,
  timingForGroupChange,
} from './announcement-schedule';

describe('announcement schedule', () => {
  it('uses scheduled_once without inventing a send date', () => {
    expect(announcementTimingFromParts('', '')).toEqual({ mode: 'scheduled_once' });
    expect(announcementTimingFromParts('2026-09-15', '')).toEqual({ mode: 'scheduled_once' });
    expect(announcementTimingFromParts('', '09:00')).toEqual({ mode: 'scheduled_once' });
  });

  it('maps a valid local date and time to scheduledAt with an offset', () => {
    const iso = scheduledAtFromParts('2026-09-15', '09:00');
    expect(iso).toBeDefined();
    const parsed = new Date(iso!);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(0);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T09:00:00[+-]\d{2}:\d{2}$/);
    expect(announcementTimingFromParts('2026-09-15', '09:00')).toEqual({
      mode: 'scheduled_once',
      scheduledAt: iso,
    });
  });

  it('requires both date and time', () => {
    const missingDate = extraScheduleIssues({ date: '', time: '09:00' });
    expect(missingDate.some((issue) => issue.code === 'rule.timing.scheduledDate.required')).toBe(
      true,
    );
    expect(missingDate.some((issue) => issue.severity === 'error')).toBe(true);

    const missingTime = extraScheduleIssues({ date: '2026-09-15', time: '' });
    expect(missingTime.some((issue) => issue.code === 'rule.timing.scheduledTime.required')).toBe(
      true,
    );
  });

  it('blocks a newly authored datetime that is already in the past', () => {
    const issues = extraScheduleIssues({
      date: '2026-08-01',
      time: '09:00',
      now: new Date(2026, 8, 4, 12, 0, 0),
      isCreate: true,
    });
    expect(issues.some((issue) => issue.code === 'rule.timing.scheduledAt.past')).toBe(true);
    expect(issues.some((issue) => issue.code === 'rule.timing.scheduledAt.elapsed')).toBe(false);
  });

  it('warns, rather than blocking, when an existing unchanged datetime has elapsed', () => {
    const scheduledAt = scheduledAtFromParts('2026-08-01', '09:00');
    const issues = extraScheduleIssues({
      date: '2026-08-01',
      time: '09:00',
      now: new Date(2026, 8, 4, 12, 0, 0),
      isCreate: false,
      originalScheduledAt: scheduledAt,
    });
    expect(issues.some((issue) => issue.code === 'rule.timing.scheduledAt.elapsed')).toBe(true);
    expect(issues.some((issue) => issue.severity === 'error')).toBe(false);
  });

  it('hides Journey sequence for announcements', () => {
    expect(showsJourneySequencePanel('rg_announcements')).toBe(false);
    expect(showsJourneySequencePanel('rg_trial_onboarding')).toBe(true);
    expect(showsJourneySequencePanel('rg_adoption')).toBe(true);
  });

  it('does not leave scheduled_once on an automated group, or journey timing on announcements', () => {
    expect(
      timingForGroupChange('rg_announcements', {
        mode: 'days_after_date',
        delayDays: 3,
        anchorMetricKey: 'registeredAt',
      }),
    ).toEqual({ mode: 'scheduled_once' });

    expect(
      timingForGroupChange('rg_trial_onboarding', {
        mode: 'scheduled_once',
        scheduledAt: '2026-09-15T09:00:00+02:00',
      }),
    ).toEqual({ mode: 'on_match' });

    expect(
      timingForGroupChange('rg_announcements', {
        mode: 'scheduled_once',
        scheduledAt: '2026-09-15T09:00:00+02:00',
      }),
    ).toEqual({
      mode: 'scheduled_once',
      scheduledAt: '2026-09-15T09:00:00+02:00',
    });

    expect(timingForGroupChange('rg_engagement', { mode: 'on_match' })).toEqual({
      mode: 'on_match',
    });
  });
});
