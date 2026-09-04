import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import {
  applyMetricChange,
  applyOperatorChange,
  booleanChoice,
  groupMetricsByCategory,
  operatorFromBooleanChoice,
  operatorsForMetric,
} from './condition-draft.helpers';
import { emptyConditionDraft } from './rule-draft.helpers';

function metric(key: string) {
  const found = METRIC_CATALOG.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Missing metric ${key}`);
  }
  return found;
}

describe('condition draft helpers', () => {
  it('groups metrics from catalogue category metadata', () => {
    const groups = groupMetricsByCategory(METRIC_CATALOG);
    expect(groups.map((group) => group.id)).toEqual([
      'lifecycle',
      'branding',
      'activity',
      'content',
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Lifecycle',
      'Branding',
      'Activity',
      'Content',
    ]);
    expect(groups[0].metrics.map((item) => item.key)).toEqual([
      'registeredAt',
      'daysSinceRegistration',
      'trialStatus',
      'trialExpiresAt',
      'daysUntilTrialExpiry',
      'accountStatus',
    ]);
  });

  it('limits operators to those declared on the metric', () => {
    expect(operatorsForMetric(metric('logoUploaded'))).toEqual(['is_true', 'is_false']);
    expect(operatorsForMetric(metric('trialStatus'))).toEqual(['is', 'is_not']);
    expect(operatorsForMetric(metric('registeredAt'))).toEqual(['is_empty']);
    expect(operatorsForMetric(metric('folderCount'))).toContain('between');
    expect(operatorsForMetric(metric('folderCount'))).not.toContain('is');
  });

  it('clears incompatible operators and values when the metric changes', () => {
    const current = {
      ...emptyConditionDraft(),
      metricKey: 'folderCount',
      operator: 'gte' as const,
      value: 3,
    };
    const next = applyMetricChange(current, metric('logoUploaded'));
    expect(next.metricKey).toBe('logoUploaded');
    expect(next.operator).toBe('');
    expect(next.value).toBeNull();
  });

  it('keeps a compatible operator when the new metric allows it', () => {
    const current = {
      ...emptyConditionDraft(),
      metricKey: 'folderCount',
      operator: 'gte' as const,
      value: 3,
    };
    const next = applyMetricChange(current, metric('documentCount'));
    expect(next.operator).toBe('gte');
    expect(next.value).toBeNull();
  });

  it('reveals an operator immediately for duration metrics', () => {
    const next = applyMetricChange(emptyConditionDraft(), metric('daysSinceRegistration'));
    expect(next.operator).toBe('eq');
  });

  it('maps boolean Yes/No to is_true and is_false', () => {
    expect(operatorFromBooleanChoice('yes')).toBe('is_true');
    expect(operatorFromBooleanChoice('no')).toBe('is_false');
    expect(booleanChoice('is_true')).toBe('yes');
    expect(booleanChoice('is_false')).toBe('no');
  });

  it('resets enum values when the operator changes', () => {
    const current = {
      ...emptyConditionDraft(),
      metricKey: 'trialStatus',
      operator: 'is' as const,
      value: 'in_trial',
    };
    const next = applyOperatorChange(current, metric('trialStatus'), 'is_not');
    expect(next.operator).toBe('is_not');
    expect(next.value).toBe('');
  });
});
