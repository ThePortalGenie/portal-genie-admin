import { isAnnouncementGroup, RuleGroup } from '../../../core/domain/rule-group';
import { Rule, RuleDraft } from '../models/rule.model';
import { emptyRuleDraft } from './rule-draft.helpers';
import { nextSequenceOrder } from '../rules/rule-group.helpers';
import { emptyScheduledOnceTiming } from '../rules/announcement-schedule';

export type CreateRuleContext = {
  groupId: string | null;
  groups: readonly RuleGroup[];
  rules: readonly Rule[];
};

/** Applies a group from the create route and places the rule at the end of that journey. */
export function draftForCreate(context: CreateRuleContext): RuleDraft {
  const draft = emptyRuleDraft();
  if (!context.groupId) {
    return draft;
  }

  const group = context.groups.find((item) => item.id === context.groupId);
  if (!group) {
    return draft;
  }

  return {
    ...draft,
    groupId: group.id,
    sequenceOrder: nextSequenceOrder(context.rules, group.id),
    timing: isAnnouncementGroup(group.id) ? emptyScheduledOnceTiming() : draft.timing,
  };
}

export function sequenceForGroupChange(
  rules: readonly Rule[],
  nextGroupId: string,
  previousGroupId: string,
  currentSequence: number | null,
): number {
  if (nextGroupId === previousGroupId && currentSequence && currentSequence > 0) {
    return currentSequence;
  }
  return nextSequenceOrder(rules, nextGroupId);
}
