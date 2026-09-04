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
      'admin_activity',
      'portal_usage',
      'communications',
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Lifecycle',
      'Branding',
      'Admin activity',
      'Portal usage',
      'Communications',
    ]);
    expect(groups.map((group) => group.id)).not.toContain('activity');
    expect(groups.map((group) => group.id)).not.toContain('content');
    expect(groups.map((group) => group.id)).not.toContain('integrations');
    expect(groups.map((group) => group.id).indexOf('admin_activity')).toBeLessThan(
      groups.map((group) => group.id).indexOf('portal_usage'),
    );
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

  it('persists new boolean metrics with is_true and is_false, not display copy', () => {
    const accounting = applyMetricChange(
      emptyConditionDraft(),
      metric('accountingSoftwareConnected'),
    );
    const notConnected = applyOperatorChange(
      accounting,
      metric('accountingSoftwareConnected'),
      operatorFromBooleanChoice('no'),
    );
    expect(notConnected.metricKey).toBe('accountingSoftwareConnected');
    expect(notConnected.operator).toBe('is_false');
    expect(notConnected.value).toBeNull();
    expect(notConnected.operator).not.toBe('is not connected');

    const template = applyOperatorChange(
      applyMetricChange(emptyConditionDraft(), metric('hasCreatedScheduledEmailTemplate')),
      metric('hasCreatedScheduledEmailTemplate'),
      operatorFromBooleanChoice('yes'),
    );
    expect(template.metricKey).toBe('hasCreatedScheduledEmailTemplate');
    expect(template.operator).toBe('is_true');
    expect(template.value).toBeNull();
    expect(operatorsForMetric(metric('accountingSoftwareConnected'))).toEqual([
      'is_true',
      'is_false',
    ]);
    expect(operatorsForMetric(metric('hasCreatedScheduledEmailTemplate'))).toEqual([
      'is_true',
      'is_false',
    ]);
  });

  it('persists portal-usage booleans without mixing them with admin activity keys', () => {
    const visit = applyOperatorChange(
      applyMetricChange(emptyConditionDraft(), metric('hasPortalVisit')),
      metric('hasPortalVisit'),
      operatorFromBooleanChoice('yes'),
    );
    expect(visit.metricKey).toBe('hasPortalVisit');
    expect(visit.operator).toBe('is_true');
    expect(visit.value).toBeNull();
    expect(visit.metricKey).not.toBe('lastPortalSignInAt');

    const noUpload = applyOperatorChange(
      applyMetricChange(emptyConditionDraft(), metric('hasPortalDocumentUpload')),
      metric('hasPortalDocumentUpload'),
      operatorFromBooleanChoice('no'),
    );
    expect(noUpload.metricKey).toBe('hasPortalDocumentUpload');
    expect(noUpload.operator).toBe('is_false');
    expect(noUpload.metricKey).not.toBe('hasUploadedDocument');
  });

  it('keeps numeric count and duration operators for admin and portal metrics', () => {
    expect(operatorsForMetric(metric('portalSignInCount'))).toEqual(
      operatorsForMetric(metric('portalVisitCount')),
    );
    expect(operatorsForMetric(metric('daysSinceLastPortalSignIn'))).toEqual(
      operatorsForMetric(metric('daysSinceLastPortalVisit')),
    );
    expect(operatorsForMetric(metric('daysSinceLastDocumentUpload'))).toContain('gt');
    expect(operatorsForMetric(metric('lastDocumentUploadedAt'))).toEqual(['is_empty']);
    expect(operatorsForMetric(metric('lastPortalDocumentUploadedAt'))).toEqual(['is_empty']);
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
