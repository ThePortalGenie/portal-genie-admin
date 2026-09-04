export const METRIC_TYPES = ['boolean', 'enum', 'number', 'duration_days', 'date'] as const;

export type MetricType = (typeof METRIC_TYPES)[number];

export const METRIC_OPERATORS = [
  'is_true',
  'is_false',
  'is',
  'is_not',
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'is_empty',
] as const;

export type MetricOperator = (typeof METRIC_OPERATORS)[number];

export const METRIC_CATEGORIES = [
  'lifecycle',
  'branding',
  'integrations',
  'activity',
  'content',
  'communications',
] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export const METRIC_CATEGORY_LABELS: Record<MetricCategory, string> = {
  lifecycle: 'Lifecycle',
  branding: 'Branding',
  integrations: 'Integrations',
  activity: 'Activity',
  content: 'Content',
  communications: 'Communications',
};

export type MetricEnumValue = {
  value: string;
  label: string;
};

export type TimingDirection = 'after' | 'before';

export type CustomerMetric = {
  key: string;
  displayName: string;
  /** Optional selector clarification. Not persisted and not used in summaries. */
  description?: string;
  category: MetricCategory;
  type: MetricType;
  operators: readonly MetricOperator[];
  valueRequired: boolean;
  enumValues?: readonly MetricEnumValue[];
  supportsTimingAnchor: boolean;
  timingDirections?: readonly TimingDirection[];
};

export const NUMBER_OPERATORS: readonly MetricOperator[] = [
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
];
