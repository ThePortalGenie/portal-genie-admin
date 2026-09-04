import { RuleGroup } from '../../../core/domain/rule-group';
import { RuleStatus } from '../../../core/domain/rule-status';
import { Rule, RuleDraft, RuleTiming } from '../models/rule.model';
import { summariseJourneyTiming } from '../validation/rule-summary';
import { rulesForGroup } from './rule-group.helpers';
import { analyseSequence, conflictForCurrentRule, SequenceConflict } from './sequence-analysis';

export const CURRENT_DRAFT_ID = '__draft__';

export type JourneySequenceItem = {
  id: string;
  visualIndex: number;
  indexLabel: string;
  name: string;
  timingLabel: string;
  status: RuleStatus;
  isCurrent: boolean;
  isDisabled: boolean;
  conflict: SequenceConflict | null;
};

export type JourneySequenceView = {
  groupName: string;
  helperText: string;
  hasGroup: boolean;
  items: JourneySequenceItem[];
  currentIndex: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

const JOURNEY_HELPER_TEXT: Record<string, string> = {
  rg_trial_onboarding: 'Arrange rules so the customer journey is easy to understand.',
  rg_adoption:
    'Arrange rules by recommended product progression. Actual timing depends on each rule.',
  rg_engagement: 'Arrange rules by increasing level of inactivity or re-engagement.',
  rg_announcements: 'Arrange rules in the order administrators should see them.',
};

const DEFAULT_HELPER_TEXT = 'Arrange rules in the order administrators should see them.';

export function journeyHelperText(groupId: string): string {
  return JOURNEY_HELPER_TEXT[groupId] ?? DEFAULT_HELPER_TEXT;
}

export function siblingRulesForGroup(
  rules: readonly Rule[],
  groupId: string,
  currentRuleId: string | null,
): Rule[] {
  if (!groupId) {
    return [];
  }
  return rulesForGroup(rules, groupId).filter((rule) => rule.id !== currentRuleId);
}

/** 0-based insert index among siblings for a stored sequenceOrder. */
export function visualIndexFromSequence(
  others: readonly { sequenceOrder: number }[],
  sequenceOrder: number | null,
): number {
  if (sequenceOrder === null || others.length === 0) {
    return others.length;
  }
  const index = others.findIndex((item) => item.sequenceOrder >= sequenceOrder);
  return index === -1 ? others.length : index;
}

export function sequenceOrderFromVisualIndex(index: number): number {
  return index + 1;
}

export function clampPlacementIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, itemCount - 1));
}

export function insertAtIndex<T>(items: readonly T[], item: T, index: number): T[] {
  const next = [...items];
  const clamped = Math.max(0, Math.min(index, next.length));
  next.splice(clamped, 0, item);
  return next;
}

/**
 * Compact a group's display positions after placing one rule.
 * Administrative numbering only — does not change eligibility or timing.
 */
export function placeRuleInGroupSequence(rules: readonly Rule[], placed: Rule): Rule[] {
  const others = siblingRulesForGroup(rules, placed.groupId, placed.id);
  const index = visualIndexFromSequence(others, placed.sequenceOrder);
  const ordered = insertAtIndex(others, placed, index).map((rule, position) => {
    const sequenceOrder = sequenceOrderFromVisualIndex(position);
    return rule.sequenceOrder === sequenceOrder ? rule : { ...rule, sequenceOrder };
  });
  const byId = new Map(ordered.map((rule) => [rule.id, rule]));
  return rules.map((rule) => byId.get(rule.id) ?? rule);
}

export function currentRuleDisplayName(draft: RuleDraft, isCreate: boolean): string {
  const name = draft.name.trim();
  if (name) {
    return name;
  }
  return isCreate ? 'New rule' : 'Untitled rule';
}

export function buildJourneySequence(input: {
  groupId: string;
  groups: readonly RuleGroup[];
  rules: readonly Rule[];
  currentRuleId: string | null;
  draft: RuleDraft;
  placementIndex: number;
  isCreate: boolean;
}): JourneySequenceView {
  const group = input.groups.find((item) => item.id === input.groupId);
  if (!group) {
    return {
      groupName: '',
      helperText: '',
      hasGroup: false,
      items: [],
      currentIndex: 0,
      canMoveUp: false,
      canMoveDown: false,
    };
  }

  const currentId = input.currentRuleId ?? CURRENT_DRAFT_ID;
  const others = siblingRulesForGroup(input.rules, input.groupId, input.currentRuleId);
  const currentMember: JourneyMember = {
    id: currentId,
    name: currentRuleDisplayName(input.draft, input.isCreate),
    status: input.draft.status,
    timing: input.draft.timing,
    rootGroup: input.draft.rootGroup,
    isCurrent: true,
  };
  const members = insertAtIndex(
    others.map((rule) => ruleAsMember(rule, false)),
    currentMember,
    Math.max(0, Math.min(input.placementIndex, others.length)),
  );
  const currentConflict = conflictForCurrentRule(analyseSequence(members), currentId);

  const items: JourneySequenceItem[] = members.map((member, visualIndex) => ({
    id: member.id,
    visualIndex,
    indexLabel: String(visualIndex + 1).padStart(2, '0'),
    name: member.name,
    timingLabel: summariseJourneyTiming(memberAsRule(member)),
    status: member.status,
    isCurrent: member.isCurrent,
    isDisabled: member.status === 'disabled',
    conflict: member.isCurrent ? currentConflict : null,
  }));

  const currentIndex = items.findIndex((item) => item.isCurrent);

  return {
    groupName: group.name,
    helperText: journeyHelperText(group.id),
    hasGroup: true,
    items,
    currentIndex,
    canMoveUp: currentIndex > 0,
    canMoveDown: currentIndex >= 0 && currentIndex < items.length - 1,
  };
}

type JourneyMember = SequenceMemberSource & { isCurrent: boolean };

type SequenceMemberSource = {
  id: string;
  name: string;
  status: RuleStatus;
  timing: RuleTiming;
  rootGroup: Rule['rootGroup'] | RuleDraft['rootGroup'];
};

function ruleAsMember(rule: Rule, isCurrent: boolean): JourneyMember {
  return {
    id: rule.id,
    name: rule.name,
    status: rule.status,
    timing: rule.timing,
    rootGroup: rule.rootGroup,
    isCurrent,
  };
}

function memberAsRule(member: JourneyMember): Rule {
  return {
    id: member.id,
    name: member.name,
    description: '',
    category: 'other',
    groupId: '',
    sequenceOrder: 1,
    status: member.status,
    rootGroup: {
      id: member.rootGroup.id,
      combinator: member.rootGroup.combinator,
      children: member.rootGroup.children.map((child) =>
        'combinator' in child
          ? child
          : {
              id: child.id,
              metricKey: child.metricKey,
              operator: child.operator === '' ? 'eq' : child.operator,
              value: child.value,
            },
      ),
    },
    templateId: '',
    timing: member.timing,
    createdAt: '',
    updatedAt: '',
  };
}
