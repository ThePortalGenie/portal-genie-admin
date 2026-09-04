import {
  CustomerMetric,
  METRIC_CATEGORIES,
  METRIC_CATEGORY_LABELS,
  MetricCategory,
  MetricOperator,
} from '../../../core/domain/metric.types';
import { ConditionDraft, ConditionValue } from '../models/rule.model';

export function applyMetricChange(
  current: ConditionDraft,
  metric: CustomerMetric | undefined,
): ConditionDraft {
  if (!metric) {
    return { ...current, metricKey: '', operator: '', value: null };
  }

  const nextOperator = nextOperatorForMetric(current.operator, metric);
  return {
    ...current,
    metricKey: metric.key,
    operator: nextOperator,
    value: defaultValueFor(metric, nextOperator),
  };
}

export function applyOperatorChange(
  current: ConditionDraft,
  metric: CustomerMetric | undefined,
  operator: MetricOperator | '',
): ConditionDraft {
  if (!metric || operator === '') {
    return { ...current, operator, value: null };
  }
  if (!metric.operators.includes(operator)) {
    return { ...current, operator: '', value: null };
  }
  return {
    ...current,
    operator,
    value: defaultValueFor(metric, operator),
  };
}

export function operatorsForMetric(metric: CustomerMetric): readonly MetricOperator[] {
  return metric.operators;
}

export function groupMetricsByCategory(
  metrics: readonly CustomerMetric[],
): Array<{ id: MetricCategory; label: string; metrics: CustomerMetric[] }> {
  return METRIC_CATEGORIES.map((id) => ({
    id,
    label: METRIC_CATEGORY_LABELS[id],
    metrics: metrics.filter((metric) => metric.category === id),
  })).filter((group) => group.metrics.length > 0);
}

export function timingAnchorMetrics(metrics: readonly CustomerMetric[]): CustomerMetric[] {
  return metrics.filter((metric) => metric.supportsTimingAnchor);
}

function nextOperatorForMetric(
  current: MetricOperator | '',
  metric: CustomerMetric,
): MetricOperator | '' {
  if (metric.type === 'boolean') {
    return current === 'is_true' || current === 'is_false' ? current : '';
  }
  if (current !== '' && metric.operators.includes(current)) {
    return current;
  }
  return metric.operators[0] ?? '';
}

function defaultValueFor(metric: CustomerMetric, operator: MetricOperator | ''): ConditionValue {
  if (operator === '' || !metric.valueRequired || operator === 'is_true' || operator === 'is_false' || operator === 'is_empty') {
    return null;
  }
  if (operator === 'between') {
    return null;
  }
  if (metric.type === 'enum') {
    return '';
  }
  return null;
}

export function booleanChoice(operator: MetricOperator | ''): '' | 'yes' | 'no' {
  if (operator === 'is_true') {
    return 'yes';
  }
  if (operator === 'is_false') {
    return 'no';
  }
  return '';
}

export function operatorFromBooleanChoice(choice: '' | 'yes' | 'no'): MetricOperator | '' {
  if (choice === 'yes') {
    return 'is_true';
  }
  if (choice === 'no') {
    return 'is_false';
  }
  return '';
}
