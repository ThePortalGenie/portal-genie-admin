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
  status: RuleStatus;
  rootGroup: RuleConditionGroup;
  templateId: string;
  timing: RuleTiming;
  createdAt: string;
  updatedAt: string;
};

export function isRuleConditionGroup(
  node: RuleConditionGroup | RuleCondition,
): node is RuleConditionGroup {
  return 'combinator' in node && 'children' in node;
}
