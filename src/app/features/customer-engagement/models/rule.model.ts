import { MetricOperator } from '../../../core/domain/metric.types';
import { RuleCategory } from '../../../core/domain/rule-category';
import { RuleStatus } from '../../../core/domain/rule-status';

export const LOGICAL_OPERATORS = ['and', 'or'] as const;

export type LogicalOperator = (typeof LOGICAL_OPERATORS)[number];

export const RULE_TIMING_MODES = ['on_match', 'days_after_date', 'days_before_date'] as const;

export type RuleTimingMode = (typeof RULE_TIMING_MODES)[number];

export type ConditionValue = string | number | { min: number; max: number } | null;

export type RuleCondition = {
  id: string;
  metricKey: string;
  operator: MetricOperator;
  value: ConditionValue;
};

export type RuleConditionGroup = {
  id: string;
  combinator: LogicalOperator;
  children: Array<RuleConditionGroup | RuleCondition>;
};

export type RuleTiming = {
  mode: RuleTimingMode;
  delayDays?: number;
  anchorMetricKey?: string;
};

export type Rule = {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  /** Opaque Rule Group id. Organises the rule in a journey; does not affect execution. */
  groupId: string;
  /**
   * Display position within the rule’s group.
   * Administrative ordering only — not send sequence or dependency.
   * There is no globalSequenceOrder; the global journey derives order from timing.
   */
  sequenceOrder: number;
  status: RuleStatus;
  rootGroup: RuleConditionGroup;
  templateId: string;
  timing: RuleTiming;
  createdAt: string;
  updatedAt: string;
};

/** Editor state. Incomplete fields use empty string / null until the administrator fills them. */
export type ConditionDraft = {
  id: string;
  metricKey: string;
  operator: MetricOperator | '';
  value: ConditionValue;
};

export type RuleConditionGroupDraft = {
  id: string;
  combinator: LogicalOperator;
  children: ConditionDraft[];
};

export type RuleDraft = {
  name: string;
  description: string;
  category: RuleCategory | '';
  groupId: string;
  sequenceOrder: number | null;
  status: RuleStatus;
  rootGroup: RuleConditionGroupDraft;
  templateId: string;
  timing: RuleTiming;
};

export function isRuleConditionGroup(
  node: RuleConditionGroup | RuleCondition,
): node is RuleConditionGroup {
  return 'combinator' in node && 'children' in node;
}
