import { RuleGroup } from '../../../core/domain/rule-group';
import { Rule, RuleTiming } from '../models/rule.model';
import { RuleListCounts, ruleListCounts } from './rule-list.filters';

export type RuleGroupOverview = RuleListCounts & {
  group: RuleGroup;
  journeySpan: string;
};

/**
 * Sort for the group journey view. sequenceOrder is display-only.
 * Disabled rules keep their stored position.
 */
export function sortRulesBySequence(rules: readonly Rule[]): Rule[] {
  return [...rules].sort((left, right) => {
    if (left.sequenceOrder !== right.sequenceOrder) {
      return left.sequenceOrder - right.sequenceOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

export function rulesForGroup(rules: readonly Rule[], groupId: string): Rule[] {
  return sortRulesBySequence(rules.filter((rule) => rule.groupId === groupId));
}

export function nextSequenceOrder(rules: readonly Rule[], groupId: string): number {
  const members = rules.filter((rule) => rule.groupId === groupId);
  if (members.length === 0) {
    return 1;
  }
  return Math.max(...members.map((rule) => rule.sequenceOrder)) + 1;
}

export function groupOverviews(
  groups: readonly RuleGroup[],
  rules: readonly Rule[],
): RuleGroupOverview[] {
  return [...groups]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((group) => {
      const members = rulesForGroup(rules, group.id);
      return {
        group,
        ...ruleListCounts(members),
        journeySpan: journeySpan(members),
      };
    });
}

/**
 * Short span of lifecycle anchors in display order, e.g. "Registration → Trial expiry".
 * Derived for scanning only — not an execution path.
 */
export function journeySpan(rules: readonly Rule[]): string {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const rule of sortRulesBySequence(rules)) {
    const label = spanLabel(rule.timing, rule);
    if (!label || seen.has(label)) {
      continue;
    }
    seen.add(label);
    labels.push(label);
  }

  return labels.join(' → ');
}

function spanLabel(timing: RuleTiming, rule: Rule): string | null {
  if (timing.anchorMetricKey === 'registeredAt') {
    return 'Registration';
  }
  if (timing.anchorMetricKey === 'trialExpiresAt') {
    return 'Trial expiry';
  }
  if (hasInactivityCondition(rule)) {
    return 'Inactivity';
  }
  return null;
}

function hasInactivityCondition(rule: Rule): boolean {
  return rule.rootGroup.children.some(
    (child) => !('combinator' in child) && child.metricKey === 'daysSinceLastPortalSignIn',
  );
}
