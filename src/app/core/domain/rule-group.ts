/**
 * A Rule Group is an administrator-facing collection / customer communication journey.
 * It is organisational metadata only: it does not control evaluation or send order.
 *
 * Distinct from RuleCategory, which classifies the purpose of a single rule.
 */
export type RuleGroup = {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
};

/** One-off calendar communications. Not part of the automated global journey. */
export const ANNOUNCEMENTS_GROUP_ID = 'rg_announcements';

export function isAnnouncementGroup(groupId: string | null | undefined): boolean {
  return groupId === ANNOUNCEMENTS_GROUP_ID;
}
