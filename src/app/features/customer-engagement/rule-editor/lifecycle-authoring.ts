import { CustomerMetric, TimingDirection } from '../../../core/domain/metric.types';
import { ConditionDraft, ConditionValue, RuleDraft, RuleTiming } from '../models/rule.model';
import { ValidationIssue } from '../models/validation.model';
import { emptyConditionDraft } from './rule-draft.helpers';

export type EditorConditionRow = {
  id: string;
  metricKey: string;
  operator: ConditionDraft['operator'];
  value: ConditionValue;
  offsetDays: number | null;
  timingDirection: TimingDirection | '';
};

export type AuthoringControl =
  | 'metric'
  | 'booleanValue'
  | 'operator'
  | 'enumValue'
  | 'numberValue'
  | 'rangeValue'
  | 'lifecycleDays'
  | 'lifecycleDirection';

export function isLifecycleTimingMetric(
  metric: CustomerMetric | undefined,
): metric is CustomerMetric & { supportsTimingAnchor: true } {
  return Boolean(metric?.supportsTimingAnchor);
}

export function isLifecycleTimingKey(
  metricKey: string,
  metrics: readonly CustomerMetric[],
): boolean {
  return isLifecycleTimingMetric(metrics.find((item) => item.key === metricKey));
}

export function defaultLifecycleDirection(metric: CustomerMetric): TimingDirection {
  if (metric.key === 'trialExpiresAt' && metric.timingDirections?.includes('before')) {
    return 'before';
  }
  return metric.timingDirections?.[0] ?? 'after';
}

/** Controls that must appear in the same block after a metric is chosen. */
export function authoringControlsForMetric(
  metric: CustomerMetric,
  operator: string = '',
): AuthoringControl[] {
  if (isLifecycleTimingMetric(metric)) {
    return ['metric', 'lifecycleDays', 'lifecycleDirection'];
  }
  if (metric.type === 'boolean') {
    return ['metric', 'booleanValue'];
  }
  if (metric.type === 'enum') {
    return ['metric', 'operator', 'enumValue'];
  }
  if (metric.type === 'number' || metric.type === 'duration_days') {
    if (operator === 'between') {
      return ['metric', 'operator', 'rangeValue'];
    }
    return ['metric', 'operator', 'numberValue'];
  }
  if (metric.type === 'date') {
    return ['metric', 'operator'];
  }
  return ['metric', 'operator'];
}

export function editorRowsFromDraft(
  draft: RuleDraft,
  metrics: readonly CustomerMetric[],
): EditorConditionRow[] {
  const rows: EditorConditionRow[] = [];
  const timingRow = lifecycleRowFromTiming(draft);
  if (timingRow) {
    rows.push(timingRow);
  }

  for (const child of draft.rootGroup.children) {
    if (
      timingRow &&
      child.metricKey === timingRow.metricKey &&
      (child.operator === 'is_empty' || child.operator === '')
    ) {
      continue;
    }
    rows.push({
      id: child.id,
      metricKey: child.metricKey,
      operator: child.operator,
      value: child.value,
      offsetDays: null,
      timingDirection: '',
    });
  }

  return rows.length > 0 ? rows : [editorRowFromCondition(emptyConditionDraft())];
}

export function draftPartsFromEditorRows(
  rows: readonly EditorConditionRow[],
  metrics: readonly CustomerMetric[],
): { children: ConditionDraft[]; timing: RuleTiming } {
  const lifecycle = rows.filter((row) => isLifecycleTimingKey(row.metricKey, metrics));
  const children = rows
    .filter((row) => !isLifecycleTimingKey(row.metricKey, metrics))
    .map((row) => ({
      id: row.id,
      metricKey: row.metricKey,
      operator: row.operator,
      value: row.value,
    }));

  const selected = lifecycle[0];
  if (!selected?.metricKey) {
    return { children, timing: { mode: 'on_match' } };
  }

  const metric = metrics.find((item) => item.key === selected.metricKey);
  const direction =
    selected.timingDirection || (metric ? defaultLifecycleDirection(metric) : 'after');

  return {
    children,
    timing: {
      mode: direction === 'before' ? 'days_before_date' : 'days_after_date',
      delayDays: selected.offsetDays ?? undefined,
      anchorMetricKey: selected.metricKey,
    },
  };
}

export function extraLifecycleIssues(
  rows: readonly EditorConditionRow[],
  metrics: readonly CustomerMetric[],
): ValidationIssue[] {
  const indexes = rows
    .map((row, index) => (isLifecycleTimingKey(row.metricKey, metrics) ? index : -1))
    .filter((index) => index >= 0);

  if (indexes.length < 2) {
    return [];
  }

  return indexes.slice(1).map((index) => ({
    code: 'rule.timing.duplicate',
    message:
      'This rule already uses a lifecycle date. Remove this row, or use a duration condition such as days since registration.',
    path: `editor.rows.${index}.metricKey`,
    severity: 'error' as const,
  }));
}

export function issuesForEditorRow(
  rows: readonly EditorConditionRow[],
  editorIndex: number,
  metrics: readonly CustomerMetric[],
  issues: readonly ValidationIssue[],
): ValidationIssue[] {
  const row = rows[editorIndex];
  if (!row) {
    return [];
  }

  const extras = issues.filter((issue) => issue.path === `editor.rows.${editorIndex}.metricKey`);
  if (isLifecycleTimingKey(row.metricKey, metrics)) {
    const remapped = issues
      .filter((issue) => issue.path.startsWith('timing.'))
      .map((issue) => ({
        ...issue,
        path: rewriteTimingPath(issue.path, editorIndex),
      }));
    return [...extras, ...remapped];
  }

  const eligibilityIndex = eligibilityIndexForRow(rows, metrics, editorIndex);
  if (eligibilityIndex === null) {
    return extras;
  }
  const prefix = `rootGroup.children.${eligibilityIndex}.`;
  return [
    ...extras,
    ...issues.filter((issue) => issue.path.startsWith(prefix)),
  ];
}

export function editorRowFromCondition(condition: ConditionDraft): EditorConditionRow {
  return {
    id: condition.id,
    metricKey: condition.metricKey,
    operator: condition.operator,
    value: condition.value,
    offsetDays: null,
    timingDirection: '',
  };
}

function lifecycleRowFromTiming(draft: RuleDraft): EditorConditionRow | null {
  if (draft.timing.mode === 'on_match' || !draft.timing.anchorMetricKey) {
    return null;
  }
  return {
    id: `lifecycle:${draft.rootGroup.id}`,
    metricKey: draft.timing.anchorMetricKey,
    operator: '',
    value: null,
    offsetDays: draft.timing.delayDays ?? 0,
    timingDirection: draft.timing.mode === 'days_before_date' ? 'before' : 'after',
  };
}

function eligibilityIndexForRow(
  rows: readonly EditorConditionRow[],
  metrics: readonly CustomerMetric[],
  editorIndex: number,
): number | null {
  if (isLifecycleTimingKey(rows[editorIndex]?.metricKey ?? '', metrics)) {
    return null;
  }
  let index = 0;
  for (let i = 0; i < editorIndex; i += 1) {
    if (!isLifecycleTimingKey(rows[i].metricKey, metrics)) {
      index += 1;
    }
  }
  return index;
}

function rewriteTimingPath(path: string, editorIndex: number): string {
  const base = `rootGroup.children.${editorIndex}`;
  if (path === 'timing.delayDays') {
    return `${base}.offsetDays`;
  }
  if (path === 'timing.mode') {
    return `${base}.timingDirection`;
  }
  if (path === 'timing.anchorMetricKey') {
    return `${base}.metricKey`;
  }
  return `${base}.${path}`;
}
