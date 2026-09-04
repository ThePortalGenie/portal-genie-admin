export const RULE_STATUSES = ['active', 'disabled'] as const;

export type RuleStatus = (typeof RULE_STATUSES)[number];

export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
};
