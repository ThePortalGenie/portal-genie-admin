import { describe, expect, it } from 'vitest';
import { METRIC_CATEGORIES, NUMBER_OPERATORS } from './metric.types';
import { ACCOUNT_STATUS_VALUES, METRIC_CATALOG, TRIAL_STATUS_VALUES } from './metric-catalog';
import { isRuleConditionGroup } from '../../features/customer-engagement/models/rule.model';
import { RULE_FIXTURES } from '../data/mock/fixtures/rules.fixture';

const PRESERVED_KEYS = [
  'registeredAt',
  'daysSinceRegistration',
  'trialStatus',
  'trialExpiresAt',
  'daysUntilTrialExpiry',
  'accountStatus',
  'logoUploaded',
  'lastPortalSignInAt',
  'daysSinceLastPortalSignIn',
  'portalSignInCount',
  'hasCreatedFolder',
  'folderCount',
  'hasUploadedDocument',
  'documentCount',
  'accountingSoftwareConnected',
  'hasCreatedScheduledEmailTemplate',
] as const;

const EXPECTED_KEYS = [
  'registeredAt',
  'daysSinceRegistration',
  'trialStatus',
  'trialExpiresAt',
  'daysUntilTrialExpiry',
  'accountStatus',
  'logoUploaded',
  'lastPortalSignInAt',
  'daysSinceLastPortalSignIn',
  'portalSignInCount',
  'hasCreatedFolder',
  'folderCount',
  'hasUploadedDocument',
  'documentCount',
  'lastDocumentUploadedAt',
  'daysSinceLastDocumentUpload',
  'accountingSoftwareConnected',
  'hasPortalVisit',
  'daysSinceLastPortalVisit',
  'portalVisitCount',
  'hasPortalDocumentUpload',
  'portalDocumentUploadCount',
  'lastPortalDocumentUploadedAt',
  'daysSinceLastPortalDocumentUpload',
  'hasCreatedScheduledEmailTemplate',
] as const;

const EXPECTED_DESCRIPTIONS: Partial<Record<(typeof EXPECTED_KEYS)[number], string>> = {
  logoUploaded: 'whether a logo has been uploaded',
  hasCreatedFolder: 'whether at least one folder has been created',
  hasUploadedDocument: 'whether at least one document has been uploaded',
  accountingSoftwareConnected: 'whether accounting software is connected',
  hasPortalVisit: 'whether a client has visited the portal',
  hasPortalDocumentUpload: 'whether a client has uploaded a document',
  hasCreatedScheduledEmailTemplate: 'whether a scheduled email template has been created',
};

describe('METRIC_CATALOG', () => {
  it('preserves existing metric keys so stored fixture rules keep loading', () => {
    const keys = METRIC_CATALOG.map((metric) => metric.key);
    expect(keys).toEqual([...EXPECTED_KEYS]);
    expect(keys).toEqual(expect.arrayContaining([...PRESERVED_KEYS]));
  });

  it('groups metrics by actor and keeps branding and communications separate', () => {
    expect(METRIC_CATEGORIES).toEqual([
      'lifecycle',
      'branding',
      'admin_activity',
      'portal_usage',
      'communications',
    ]);
    expect(METRIC_CATEGORIES).not.toContain('activity');
    expect(METRIC_CATEGORIES).not.toContain('content');
    expect(METRIC_CATEGORIES).not.toContain('integrations');

    expect(METRIC_CATALOG.filter((metric) => metric.category === 'lifecycle').map((m) => m.key)).toEqual(
      [
        'registeredAt',
        'daysSinceRegistration',
        'trialStatus',
        'trialExpiresAt',
        'daysUntilTrialExpiry',
        'accountStatus',
      ],
    );
    expect(METRIC_CATALOG.filter((metric) => metric.category === 'branding').map((m) => m.key)).toEqual([
      'logoUploaded',
    ]);
    expect(
      METRIC_CATALOG.filter((metric) => metric.category === 'admin_activity').map((m) => m.key),
    ).toEqual([
      'lastPortalSignInAt',
      'daysSinceLastPortalSignIn',
      'portalSignInCount',
      'hasCreatedFolder',
      'folderCount',
      'hasUploadedDocument',
      'documentCount',
      'lastDocumentUploadedAt',
      'daysSinceLastDocumentUpload',
      'accountingSoftwareConnected',
    ]);
    expect(
      METRIC_CATALOG.filter((metric) => metric.category === 'portal_usage').map((m) => m.key),
    ).toEqual([
      'hasPortalVisit',
      'daysSinceLastPortalVisit',
      'portalVisitCount',
      'hasPortalDocumentUpload',
      'portalDocumentUploadCount',
      'lastPortalDocumentUploadedAt',
      'daysSinceLastPortalDocumentUpload',
    ]);
    expect(
      METRIC_CATALOG.filter((metric) => metric.category === 'communications').map((m) => m.key),
    ).toEqual(['hasCreatedScheduledEmailTemplate']);
  });

  it('treats admin sign-in and client portal usage as distinct metrics', () => {
    const byKey = new Map(METRIC_CATALOG.map((metric) => [metric.key, metric]));

    expect(byKey.get('lastPortalSignInAt')?.displayName).toBe('Admin sign-in');
    expect(byKey.get('daysSinceLastPortalSignIn')?.displayName).toBe(
      'Days since last admin sign-in',
    );
    expect(byKey.get('portalSignInCount')?.displayName).toBe('Admin sign-in count');
    expect(byKey.get('hasPortalVisit')?.displayName).toBe('Portal visit');
    expect(byKey.get('daysSinceLastPortalVisit')?.displayName).toBe('Days since last portal visit');
    expect(byKey.get('portalVisitCount')?.displayName).toBe('Portal visit count');

    expect(byKey.get('lastPortalSignInAt')?.key).not.toBe(byKey.get('hasPortalVisit')?.key);
    expect(byKey.get('portalSignInCount')?.key).not.toBe(byKey.get('portalVisitCount')?.key);
    expect(byKey.get('hasUploadedDocument')?.key).not.toBe(byKey.get('hasPortalDocumentUpload')?.key);
    expect(byKey.get('documentCount')?.key).not.toBe(byKey.get('portalDocumentUploadCount')?.key);
  });

  it('stores clarifying descriptions only where the short name is not enough', () => {
    for (const metric of METRIC_CATALOG) {
      const expected = EXPECTED_DESCRIPTIONS[metric.key as (typeof EXPECTED_KEYS)[number]];
      if (expected) {
        expect(metric.description).toBe(expected);
      } else {
        expect(metric.description).toBeUndefined();
        expect(metric).not.toHaveProperty('description');
      }
    }
  });

  it('keeps date activity metrics as eligibility-only is_empty checks, not timing anchors', () => {
    const byKey = new Map(METRIC_CATALOG.map((metric) => [metric.key, metric]));
    for (const key of [
      'lastPortalSignInAt',
      'lastDocumentUploadedAt',
      'lastPortalDocumentUploadedAt',
    ]) {
      expect(byKey.get(key)).toMatchObject({
        type: 'date',
        operators: ['is_empty'],
        valueRequired: false,
        supportsTimingAnchor: false,
      });
    }
  });

  it('keeps types, operators, and timing metadata for existing metrics', () => {
    const byKey = new Map(METRIC_CATALOG.map((metric) => [metric.key, metric]));

    expect(byKey.get('registeredAt')).toMatchObject({
      type: 'date',
      operators: ['is_empty'],
      supportsTimingAnchor: true,
      timingDirections: ['after'],
    });
    expect(byKey.get('daysSinceRegistration')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('trialStatus')).toMatchObject({
      type: 'enum',
      operators: ['is', 'is_not'],
      enumValues: TRIAL_STATUS_VALUES,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('trialExpiresAt')).toMatchObject({
      type: 'date',
      operators: ['is_empty'],
      supportsTimingAnchor: true,
      timingDirections: ['after', 'before'],
    });
    expect(byKey.get('daysUntilTrialExpiry')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('accountStatus')).toMatchObject({
      type: 'enum',
      operators: ['is', 'is_not'],
      enumValues: ACCOUNT_STATUS_VALUES,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('logoUploaded')).toMatchObject({
      type: 'boolean',
      category: 'branding',
      operators: ['is_true', 'is_false'],
      supportsTimingAnchor: false,
    });
    expect(byKey.get('daysSinceLastPortalSignIn')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('portalSignInCount')).toMatchObject({
      type: 'number',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('folderCount')).toMatchObject({
      type: 'number',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('hasCreatedFolder')).toMatchObject({
      type: 'boolean',
      operators: ['is_true', 'is_false'],
      supportsTimingAnchor: false,
    });
    expect(byKey.get('documentCount')).toMatchObject({
      type: 'number',
      operators: NUMBER_OPERATORS,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('hasUploadedDocument')).toMatchObject({
      type: 'boolean',
      operators: ['is_true', 'is_false'],
      supportsTimingAnchor: false,
    });
    expect(byKey.get('accountingSoftwareConnected')).toMatchObject({
      type: 'boolean',
      category: 'admin_activity',
      operators: ['is_true', 'is_false'],
      valueRequired: false,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('hasCreatedScheduledEmailTemplate')).toMatchObject({
      type: 'boolean',
      category: 'communications',
      operators: ['is_true', 'is_false'],
      valueRequired: false,
      supportsTimingAnchor: false,
    });
    expect(byKey.get('hasPortalVisit')).toMatchObject({
      type: 'boolean',
      operators: ['is_true', 'is_false'],
      valueRequired: false,
    });
    expect(byKey.get('portalVisitCount')).toMatchObject({
      type: 'number',
      operators: NUMBER_OPERATORS,
    });
    expect(byKey.get('daysSinceLastPortalVisit')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
    });
    expect(byKey.get('hasPortalDocumentUpload')).toMatchObject({
      type: 'boolean',
      operators: ['is_true', 'is_false'],
    });
    expect(byKey.get('portalDocumentUploadCount')).toMatchObject({
      type: 'number',
      operators: NUMBER_OPERATORS,
    });
    expect(byKey.get('daysSinceLastDocumentUpload')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
    });
    expect(byKey.get('daysSinceLastPortalDocumentUpload')).toMatchObject({
      type: 'duration_days',
      operators: NUMBER_OPERATORS,
    });
  });

  it('resolves every metric key used by existing fixture rules', () => {
    const keys = new Set(METRIC_CATALOG.map((metric) => metric.key));
    for (const rule of RULE_FIXTURES) {
      for (const child of rule.rootGroup.children) {
        if (isRuleConditionGroup(child)) {
          continue;
        }
        expect(keys.has(child.metricKey), `${rule.id} → ${child.metricKey}`).toBe(true);
      }
    }
  });
});
