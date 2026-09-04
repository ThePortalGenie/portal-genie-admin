import { CustomerMetric, MetricOperator } from '../../../core/domain/metric.types';
import { isAnnouncementGroup } from '../../../core/domain/rule-group';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import {
  ConditionDraft,
  ConditionValue,
  RuleDraft,
  RuleTiming,
} from '../models/rule.model';
import { ValidationIssue, ValidationResult } from '../models/validation.model';
import { extraScheduleIssues, parseScheduledAt, schedulePartsFromIso } from '../rules/announcement-schedule';

const DAYS_WARNING_THRESHOLD = 365;

export type RuleValidationContext = {
  now?: Date;
  isCreate?: boolean;
  originalScheduledAt?: string;
  scheduleParts?: { date: string; time: string };
};

export function validateRuleDraft(
  draft: RuleDraft,
  metrics: readonly CustomerMetric[],
  templates: readonly CommunicationTemplate[],
  context: RuleValidationContext = {},
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const availableTemplateIds = new Set(
    templates.filter((template) => template.available).map((template) => template.id),
  );

  if (!draft.name.trim()) {
    errors.push(issue('rule.name.required', 'Enter a rule name', 'name'));
  }

  if (!draft.category) {
    errors.push(issue('rule.category.required', 'Choose a purpose', 'category'));
  }

  if (!draft.groupId) {
    errors.push(issue('rule.group.required', 'Choose a journey', 'groupId'));
  }

  if (draft.sequenceOrder === null || draft.sequenceOrder === undefined) {
    errors.push(
      issue('rule.sequence.required', 'Place this rule in the journey sequence', 'sequenceOrder'),
    );
  } else if (!Number.isInteger(draft.sequenceOrder) || draft.sequenceOrder < 1) {
    errors.push(
      issue(
        'rule.sequence.invalid',
        'Journey position must be a whole number of 1 or more',
        'sequenceOrder',
      ),
    );
  }

  if (draft.status !== 'active' && draft.status !== 'disabled') {
    errors.push(issue('rule.status.required', 'Choose a status', 'status'));
  }

  const conditions = draft.rootGroup.children;
  const timingErrors: ValidationIssue[] = [];
  const announcement = isAnnouncementGroup(draft.groupId);
  validateTiming(draft.timing, metricByKey, timingErrors, warnings, {
    announcement,
    now: context.now,
    isCreate: context.isCreate,
    originalScheduledAt: context.originalScheduledAt,
    scheduleParts: context.scheduleParts,
  });

  let validConditionCount = 0;
  conditions.forEach((condition, index) => {
    const before = errors.length;
    validateCondition(condition, index, metricByKey, errors);
    if (errors.length === before && isConditionComplete(condition, metricByKey)) {
      validConditionCount += 1;
    }
  });

  const hasValidEligibility = validConditionCount > 0;
  const hasValidLifecycleTiming =
    !announcement &&
    (draft.timing.mode === 'days_after_date' || draft.timing.mode === 'days_before_date') &&
    timingErrors.length === 0;

  if (!hasValidEligibility && !hasValidLifecycleTiming) {
    errors.push(
      issue(
        'rule.conditions.min',
        announcement
          ? 'Add a customer condition to define who receives this announcement'
          : 'Add a customer condition, or choose a lifecycle date',
        'rootGroup',
      ),
    );
  }

  if (draft.rootGroup.combinator === 'and') {
    addContradictionErrors(conditions, errors);
  }

  if (!draft.templateId) {
    errors.push(
      issue('rule.template.required', 'Select a communication template', 'templateId'),
    );
  } else if (!availableTemplateIds.has(draft.templateId)) {
    errors.push(
      issue('rule.template.invalid', 'Select an available communication template', 'templateId'),
    );
  }

  errors.push(...timingErrors);

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

export function issuesForPath(result: ValidationResult, path: string): ValidationIssue[] {
  return [...result.errors, ...result.warnings].filter((item) => item.path === path);
}

function validateCondition(
  condition: ConditionDraft,
  index: number,
  metricByKey: Map<string, CustomerMetric>,
  errors: ValidationIssue[],
): void {
  const base = `rootGroup.children.${index}`;

  if (!condition.metricKey) {
    errors.push(issue('rule.condition.metric.required', 'Choose a metric', `${base}.metricKey`));
    return;
  }

  const metric = metricByKey.get(condition.metricKey);
  if (!metric) {
    errors.push(issue('rule.condition.metric.unknown', 'Choose a metric from the catalog', `${base}.metricKey`));
    return;
  }

  if (!condition.operator) {
    errors.push(issue('rule.condition.operator.required', 'Choose an operator', `${base}.operator`));
    return;
  }

  if (!metric.operators.includes(condition.operator)) {
    errors.push(
      issue(
        'rule.condition.operator.invalid',
        'Choose an operator that applies to this metric',
        `${base}.operator`,
      ),
    );
    return;
  }

  validateConditionValue(condition, metric, base, errors);
}

function validateConditionValue(
  condition: ConditionDraft,
  metric: CustomerMetric,
  base: string,
  errors: ValidationIssue[],
): void {
  const operator = condition.operator as MetricOperator;

  if (operator === 'is_true' || operator === 'is_false' || operator === 'is_empty') {
    return;
  }

  if (operator === 'between') {
    if (!isRange(condition.value)) {
      errors.push(issue('rule.condition.value.required', 'Enter a valid range', `${base}.value`));
      return;
    }
    if (!isWholeNumber(condition.value.min) || !isWholeNumber(condition.value.max)) {
      errors.push(
        issue('rule.condition.value.numeric', 'Enter a whole number in both range fields', `${base}.value`),
      );
      return;
    }
    if (condition.value.min > condition.value.max) {
      errors.push(issue('rule.condition.value.range', 'Enter a valid range', `${base}.value`));
    }
    if (isNonNegativeType(metric.type) && (condition.value.min < 0 || condition.value.max < 0)) {
      errors.push(negativeDaysIssue(`${base}.value`));
    }
    return;
  }

  if (metric.type === 'enum') {
    if (typeof condition.value !== 'string' || condition.value === '') {
      errors.push(issue('rule.condition.value.required', 'Enter a value', `${base}.value`));
      return;
    }
    const allowed = metric.enumValues?.some((item) => item.value === condition.value);
    if (!allowed) {
      errors.push(issue('rule.condition.value.enum', 'Choose a value from the list', `${base}.value`));
    }
    return;
  }

  if (metric.type === 'number' || metric.type === 'duration_days') {
    if (typeof condition.value !== 'number' || !Number.isFinite(condition.value)) {
      errors.push(issue('rule.condition.value.required', 'Enter a value', `${base}.value`));
      return;
    }
    if (!Number.isInteger(condition.value)) {
      errors.push(
        issue('rule.condition.value.numeric', 'Enter a whole number of days (0 or more)', `${base}.value`),
      );
      return;
    }
    if (isNonNegativeType(metric.type) && condition.value < 0) {
      errors.push(negativeDaysIssue(`${base}.value`));
    }
  }
}

function validateAnnouncementTiming(
  timing: RuleTiming,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  options: {
    now?: Date;
    isCreate?: boolean;
    originalScheduledAt?: string;
    scheduleParts?: { date: string; time: string };
  },
): void {
  if (timing.mode !== 'scheduled_once') {
    errors.push(
      issue(
        'rule.timing.mode.required',
        'Choose a send date and time for this one-off announcement',
        'timing.mode',
      ),
    );
    return;
  }

  if (!options.scheduleParts && timing.scheduledAt && !parseScheduledAt(timing.scheduledAt)) {
    errors.push(
      issue('rule.timing.scheduledAt.invalid', 'Enter a valid send date and time', 'timing.scheduledAt'),
    );
    return;
  }

  const parts = options.scheduleParts ?? schedulePartsFromIso(timing.scheduledAt);
  const scheduleIssues = extraScheduleIssues({
    date: parts.date,
    time: parts.time,
    now: options.now,
    isCreate: options.isCreate,
    originalScheduledAt: options.originalScheduledAt,
  });
  errors.push(...scheduleIssues.filter((item) => item.severity === 'error'));
  warnings.push(...scheduleIssues.filter((item) => item.severity === 'warning'));
}

function validateTiming(
  timing: RuleTiming,
  metricByKey: Map<string, CustomerMetric>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  options: {
    announcement: boolean;
    now?: Date;
    isCreate?: boolean;
    originalScheduledAt?: string;
    scheduleParts?: { date: string; time: string };
  },
): void {
  if (options.announcement) {
    validateAnnouncementTiming(timing, errors, warnings, options);
    return;
  }

  if (timing.mode === 'scheduled_once') {
    errors.push(
      issue(
        'rule.timing.mode.invalid',
        'Scheduled send dates are only used for announcements',
        'timing.mode',
      ),
    );
    return;
  }

  if (timing.mode !== 'on_match' && timing.mode !== 'days_after_date' && timing.mode !== 'days_before_date') {
    errors.push(issue('rule.timing.mode.required', 'Choose when the communication should send', 'timing.mode'));
    return;
  }

  if (timing.mode === 'on_match') {
    return;
  }

  if (!timing.anchorMetricKey) {
    errors.push(issue('rule.timing.anchor.required', 'Choose a date', 'timing.anchorMetricKey'));
  } else {
    const anchor = metricByKey.get(timing.anchorMetricKey);
    if (!anchor?.supportsTimingAnchor) {
      errors.push(issue('rule.timing.anchor.invalid', 'Choose a date', 'timing.anchorMetricKey'));
    } else {
      const direction = timing.mode === 'days_before_date' ? 'before' : 'after';
      if (!anchor.timingDirections?.includes(direction)) {
        errors.push(
          issue(
            'rule.timing.direction.invalid',
            'Choose a relationship that applies to this date',
            'timing.mode',
          ),
        );
      }
    }
  }

  if (timing.delayDays === undefined || timing.delayDays === null) {
    errors.push(
      issue('rule.timing.days.required', 'Enter a valid number of days (0 or more)', 'timing.delayDays'),
    );
    return;
  }

  if (!Number.isInteger(timing.delayDays) || !Number.isFinite(timing.delayDays)) {
    errors.push(
      issue('rule.timing.days.numeric', 'Enter a valid number of days (0 or more)', 'timing.delayDays'),
    );
    return;
  }

  if (timing.delayDays < 0) {
    errors.push(negativeDaysIssue('timing.delayDays'));
    return;
  }

  if (timing.delayDays > DAYS_WARNING_THRESHOLD) {
    warnings.push({
      code: 'rule.timing.days.long',
      message: 'This is more than a year — check this is intentional.',
      path: 'timing.delayDays',
      severity: 'warning',
    });
  }
}

function addContradictionErrors(
  conditions: readonly ConditionDraft[],
  errors: ValidationIssue[],
): void {
  const trialValues = conditions
    .filter((condition) => condition.metricKey === 'trialStatus' && condition.operator === 'is')
    .map((condition) => condition.value);

  if (trialValues.includes('in_trial') && trialValues.includes('trial_expired')) {
    errors.push(
      issue('rule.conditions.contradiction', 'These conditions cannot both be true', 'rootGroup'),
    );
  }

  const hasFolderYes = conditions.some(
    (condition) => condition.metricKey === 'hasCreatedFolder' && condition.operator === 'is_true',
  );
  const folderCountZero = conditions.some(
    (condition) =>
      condition.metricKey === 'folderCount' && condition.operator === 'eq' && condition.value === 0,
  );
  if (hasFolderYes && folderCountZero) {
    errors.push(
      issue('rule.conditions.contradiction', 'These conditions cannot both be true', 'rootGroup'),
    );
  }
}

function isConditionComplete(
  condition: ConditionDraft,
  metricByKey: Map<string, CustomerMetric>,
): boolean {
  if (!condition.metricKey || !condition.operator) {
    return false;
  }
  const metric = metricByKey.get(condition.metricKey);
  if (!metric || !metric.operators.includes(condition.operator)) {
    return false;
  }
  const probe: ValidationIssue[] = [];
  validateConditionValue(condition, metric, 'tmp', probe);
  return probe.length === 0;
}

function isNonNegativeType(type: CustomerMetric['type']): boolean {
  return type === 'duration_days' || type === 'number';
}

function isWholeNumber(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

function isRange(value: ConditionValue): value is { min: number; max: number } {
  return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}

function negativeDaysIssue(path: string): ValidationIssue {
  return issue(
    'rule.value.negative',
    'Enter a whole number of days (0 or more). Direction is before/after, not a minus sign.',
    path,
  );
}

function issue(code: string, message: string, path: string): ValidationIssue {
  return { code, message, path, severity: 'error' };
}
