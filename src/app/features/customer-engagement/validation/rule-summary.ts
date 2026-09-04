import { CustomerMetric, MetricOperator } from '../../../core/domain/metric.types';
import {
  ConditionValue,
  isRuleConditionGroup,
  Rule,
  RuleCondition,
  RuleConditionGroup,
  RuleTiming,
} from '../models/rule.model';
import { formatScheduledLong } from '../rules/announcement-schedule';

const TIMING_ANCHOR_LABELS: Record<string, string> = {
  registeredAt: 'registration',
  trialExpiresAt: 'trial expiry',
};

/**
 * Informational one-line summary for the rules table.
 * Does not evaluate whether a customer would match.
 */
export function summariseRule(rule: Rule, metrics: readonly CustomerMetric[]): string {
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const timingText = summariseTiming(rule.timing);
  const conditionText = summariseGroup(rule.rootGroup, metricByKey, rule.timing);
  return [timingText, conditionText].filter((part) => part.length > 0).join(' · ');
}

export function summariseAnnouncementAudience(
  rule: Rule,
  metrics: readonly CustomerMetric[],
): string {
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const parts = rule.rootGroup.children
    .map((child) => {
      if (isRuleConditionGroup(child)) {
        return '';
      }
      return summariseAnnouncementCondition(child, metricByKey.get(child.metricKey));
    })
    .filter((part) => part.length > 0);
  return parts.join(' · ');
}

function summariseAnnouncementCondition(
  condition: RuleCondition,
  metric: CustomerMetric | undefined,
): string {
  if (condition.metricKey === 'accountStatus' && condition.operator === 'is') {
    const label =
      metric?.enumValues?.find((item) => item.value === condition.value)?.label ??
      String(condition.value ?? '');
    return label ? `${label} customers` : summariseCondition(condition, metric);
  }
  return summariseCondition(condition, metric);
}

export function summariseTimingPhrase(timing: RuleTiming): string {
  if (timing.mode === 'on_match') {
    return 'When the conditions become true';
  }
  if (timing.mode === 'scheduled_once') {
    return timing.scheduledAt
      ? `Send once on ${formatScheduledLong(timing.scheduledAt)}`
      : 'Choose a send date and time';
  }
  return summariseTiming(timing) || 'Timing not set yet';
}

export function summariseConditionLine(
  condition: { metricKey: string; operator: string; value: ConditionValue },
  metric: CustomerMetric | undefined,
): string {
  if (!condition.metricKey || !condition.operator) {
    return '';
  }
  return summariseCondition(
    {
      id: '',
      metricKey: condition.metricKey,
      operator: condition.operator as MetricOperator,
      value: condition.value,
    },
    metric,
  );
}

export type JourneyItemSummary = {
  timing: string;
  eligibility: string;
};

/**
 * Presentation for a rule in a group journey. Timing is display copy only.
 */
export function summariseJourneyItem(
  rule: Rule,
  metrics: readonly CustomerMetric[],
): JourneyItemSummary {
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const timing = summariseJourneyTiming(rule);
  const eligibility = summariseGroup(rule.rootGroup, metricByKey, rule.timing);

  if (rule.timing.mode === 'on_match' && hasInactivityCondition(rule)) {
    return { timing, eligibility: '' };
  }

  return { timing, eligibility };
}

export function summariseJourneyTiming(rule: Rule): string {
  if (rule.timing.mode !== 'on_match') {
    return summariseTiming(rule.timing) || 'Timing not set yet';
  }

  const inactivityDays = inactivityThresholdDays(rule);
  if (inactivityDays !== null) {
    return inactivityDays === 1
      ? 'When inactive for 1 day'
      : `When inactive for ${inactivityDays} days`;
  }

  return 'When the conditions become true';
}

function hasInactivityCondition(rule: Rule): boolean {
  return inactivityThresholdDays(rule) !== null;
}

function inactivityThresholdDays(rule: Rule): number | null {
  for (const child of rule.rootGroup.children) {
    if (isRuleConditionGroup(child)) {
      continue;
    }
    if (child.metricKey !== 'daysSinceLastPortalSignIn' || !isAtLeastOperator(child.operator)) {
      continue;
    }
    return numericValue(child.value);
  }
  return null;
}

export function summariseTiming(timing: RuleTiming): string {
  if (timing.mode === 'on_match') {
    return '';
  }

  if (timing.mode === 'scheduled_once') {
    return timing.scheduledAt ? `Send once ${formatScheduledLong(timing.scheduledAt)}` : '';
  }

  const days = timing.delayDays ?? 0;
  const anchor = TIMING_ANCHOR_LABELS[timing.anchorMetricKey ?? ''] ?? 'the selected date';
  const direction = timing.mode === 'days_before_date' ? 'before' : 'after';

  if (days === 0) {
    return anchor === 'trial expiry' ? 'On trial expiry' : `On ${anchor}`;
  }

  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  return `${dayLabel} ${direction} ${anchor}`;
}

function summariseGroup(
  group: RuleConditionGroup,
  metricByKey: Map<string, CustomerMetric>,
  timing: RuleTiming,
): string {
  const parts = group.children
    .map((child) => {
      if (isRuleConditionGroup(child)) {
        return summariseGroup(child, metricByKey, timing);
      }
      if (shouldOmitCondition(child, timing)) {
        return '';
      }
      return summariseCondition(child, metricByKey.get(child.metricKey));
    })
    .filter((part) => part.length > 0);

  const joiner = group.combinator === 'or' ? ' or ' : ' · ';
  return parts.join(joiner);
}

function shouldOmitCondition(condition: RuleCondition, timing: RuleTiming): boolean {
  const isRelativeTiming =
    timing.mode === 'days_after_date' || timing.mode === 'days_before_date';

  if (
    isRelativeTiming &&
    timing.anchorMetricKey === 'registeredAt' &&
    condition.metricKey === 'daysSinceRegistration'
  ) {
    return true;
  }

  if (
    isRelativeTiming &&
    timing.anchorMetricKey === 'trialExpiresAt' &&
    condition.metricKey === 'trialStatus'
  ) {
    return true;
  }

  return false;
}

function summariseCondition(condition: RuleCondition, metric: CustomerMetric | undefined): string {
  if (!metric) {
    return condition.metricKey;
  }

  if (condition.operator === 'is_true' || condition.operator === 'is_false') {
    return summariseBoolean(condition.metricKey, condition.operator, metric.displayName);
  }

  if (condition.operator === 'is' || condition.operator === 'is_not') {
    const enumLabel =
      metric.enumValues?.find((item) => item.value === condition.value)?.label ??
      String(condition.value ?? '');
    if (condition.operator === 'is_not') {
      return `Not ${enumLabel.toLowerCase()}`;
    }
    if (condition.metricKey === 'accountStatus') {
      return `Account is ${enumLabel.toLowerCase()}`;
    }
    return enumLabel;
  }

  if (condition.operator === 'is_empty') {
    if (condition.metricKey === 'lastPortalSignInAt') {
      return 'Never signed in to the portal';
    }
    return `${metric.displayName} not set`;
  }

  if (condition.metricKey === 'daysSinceLastPortalSignIn' && isAtLeastOperator(condition.operator)) {
    const days = numericValue(condition.value);
    return days === null ? metric.displayName : `No portal sign-in for ${days} days`;
  }

  return summariseNumeric(metric.displayName, condition.operator, condition.value);
}

function summariseBoolean(
  metricKey: string,
  operator: 'is_true' | 'is_false',
  displayName: string,
): string {
  const isYes = operator === 'is_true';
  switch (metricKey) {
    case 'logoUploaded':
      return isYes ? 'Logo uploaded' : 'Logo not uploaded';
    case 'accountingSoftwareConnected':
      return isYes ? 'Accounting software connected' : 'Accounting software not connected';
    case 'hasCreatedFolder':
      return isYes ? 'Has created a folder' : 'No folder created';
    case 'hasUploadedDocument':
      return isYes ? 'Has uploaded a document' : 'No documents uploaded';
    case 'hasCreatedScheduledEmailTemplate':
      return isYes ? 'Scheduled email template created' : 'No scheduled email template created';
    default:
      return isYes ? displayName : `${displayName}: no`;
  }
}

function isAtLeastOperator(operator: MetricOperator): boolean {
  return operator === 'gte' || operator === 'gt';
}

function summariseNumeric(
  displayName: string,
  operator: MetricOperator,
  value: ConditionValue,
): string {
  if (operator === 'between' && isRange(value)) {
    return `${displayName} between ${value.min} and ${value.max}`;
  }

  const amount = numericValue(value);
  if (amount === null) {
    return displayName;
  }

  switch (operator) {
    case 'eq':
      return `${displayName} is ${amount}`;
    case 'gt':
      return `${displayName} greater than ${amount}`;
    case 'gte':
      return `${displayName} at least ${amount}`;
    case 'lt':
      return `${displayName} less than ${amount}`;
    case 'lte':
      return `${displayName} at most ${amount}`;
    default:
      return displayName;
  }
}

function numericValue(value: ConditionValue): number | null {
  return typeof value === 'number' ? value : null;
}

function isRange(value: ConditionValue): value is { min: number; max: number } {
  return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}
