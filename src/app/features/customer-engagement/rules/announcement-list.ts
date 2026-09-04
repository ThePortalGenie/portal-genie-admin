import { Rule } from '../models/rule.model';
import { parseScheduledAt } from './announcement-schedule';

export type AnnouncementBucket = 'upcoming' | 'past';

export type AnnouncementListItem = {
  rule: Rule;
  bucket: AnnouncementBucket;
  scheduledAt: string | undefined;
};

export function announcementBucket(rule: Rule, now: Date = new Date()): AnnouncementBucket {
  const parsed = parseScheduledAt(rule.timing.scheduledAt);
  if (!parsed || parsed.getTime() >= now.getTime()) {
    return 'upcoming';
  }
  return 'past';
}

export function sortAnnouncementsChronologically(
  rules: readonly Rule[],
  now: Date = new Date(),
): AnnouncementListItem[] {
  return [...rules]
    .map((rule) => ({
      rule,
      bucket: announcementBucket(rule, now),
      scheduledAt: rule.timing.scheduledAt,
    }))
    .sort((left, right) => compareScheduled(left, right));
}

export function upcomingAnnouncements(
  rules: readonly Rule[],
  now: Date = new Date(),
): AnnouncementListItem[] {
  return sortAnnouncementsChronologically(rules, now).filter((item) => item.bucket === 'upcoming');
}

export function pastAnnouncements(
  rules: readonly Rule[],
  now: Date = new Date(),
): AnnouncementListItem[] {
  return sortAnnouncementsChronologically(rules, now).filter((item) => item.bucket === 'past');
}

function compareScheduled(left: AnnouncementListItem, right: AnnouncementListItem): number {
  const leftTime = parseScheduledAt(left.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = parseScheduledAt(right.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.rule.name.localeCompare(right.rule.name);
}
