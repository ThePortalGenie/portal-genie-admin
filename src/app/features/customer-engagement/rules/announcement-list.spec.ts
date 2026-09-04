import { describe, expect, it } from 'vitest';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { Rule } from '../models/rule.model';
import {
  announcementBucket,
  pastAnnouncements,
  sortAnnouncementsChronologically,
  upcomingAnnouncements,
} from './announcement-list';

const NOW = new Date('2026-09-04T12:00:00+02:00');

function fixture(id: string): Rule {
  const rule = RULE_FIXTURES.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing fixture ${id}`);
  }
  return rule;
}

describe('announcement list', () => {
  it('sorts announcements chronologically by scheduledAt', () => {
    const earlier: Rule = {
      ...fixture('rule_feature'),
      id: 'rule_earlier',
      name: 'Earlier feature',
      timing: { mode: 'scheduled_once', scheduledAt: '2026-09-10T09:00:00+02:00' },
      status: 'active',
    };
    const later: Rule = {
      ...fixture('rule_feature'),
      id: 'rule_later',
      name: 'Later feature',
      timing: { mode: 'scheduled_once', scheduledAt: '2026-10-01T09:00:00+02:00' },
      status: 'disabled',
    };
    const sorted = sortAnnouncementsChronologically(
      [later, fixture('rule_product_update'), earlier],
      NOW,
    );
    expect(sorted.map((item) => item.rule.id)).toEqual([
      'rule_product_update',
      'rule_earlier',
      'rule_later',
    ]);
  });

  it('splits upcoming and past by scheduledAt versus now', () => {
    const announcements = RULE_FIXTURES.filter((rule) => rule.groupId === 'rg_announcements');
    expect(announcementBucket(fixture('rule_feature'), NOW)).toBe('upcoming');
    expect(announcementBucket(fixture('rule_product_update'), NOW)).toBe('past');
    expect(upcomingAnnouncements(announcements, NOW).map((item) => item.rule.id)).toEqual([
      'rule_feature',
    ]);
    expect(pastAnnouncements(announcements, NOW).map((item) => item.rule.id)).toEqual([
      'rule_product_update',
    ]);
  });

  it('keeps disabled announcements visible', () => {
    const announcements = RULE_FIXTURES.filter((rule) => rule.groupId === 'rg_announcements');
    const sorted = sortAnnouncementsChronologically(announcements, NOW);
    expect(sorted.every((item) => item.rule.status === 'disabled')).toBe(true);
    expect(sorted.map((item) => item.rule.id)).toEqual(['rule_product_update', 'rule_feature']);
  });
});
