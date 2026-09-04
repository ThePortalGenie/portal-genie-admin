import { MetricOperator } from './metric.types';

export const METRIC_OPERATOR_LABELS: Record<MetricOperator, string> = {
  is_true: 'is yes',
  is_false: 'is no',
  is: 'is',
  is_not: 'is not',
  eq: 'equals',
  gt: 'greater than',
  gte: 'greater than or equal',
  lt: 'less than',
  lte: 'less than or equal',
  between: 'between',
  is_empty: 'is not set',
};
