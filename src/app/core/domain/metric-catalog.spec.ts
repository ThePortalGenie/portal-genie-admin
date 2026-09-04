import { describe, expect, it } from 'vitest';
import { METRIC_CATEGORIES, NUMBER_OPERATORS } from './metric.types';
import { ACCOUNT_STATUS_VALUES, METRIC_CATALOG, TRIAL_STATUS_VALUES } from './metric-catalog';

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
  'folderCount',
  'hasCreatedFolder',
  'documentCount',
  'hasUploadedDocument',
] as const;

const EXPECTED_DESCRIPTIONS: Partial<Record<(typeof EXPECTED_KEYS)[number], string>> = {
  logoUploaded: 'whether a logo has been uploaded',
  lastPortalSignInAt: 'whether the customer has ever signed in',
  hasCreatedFolder: 'whether at least one folder has been created',
  hasUploadedDocument: 'whether at least one document has been uploaded',
};

describe('METRIC_CATALOG', () => {
  it('keeps metric IDs unchanged', () => {
    expect(METRIC_CATALOG.map((metric) => metric.key)).toEqual([...EXPECTED_KEYS]);
  });

  it('stores clarifying descriptions only where the name needs them', () => {
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

  it('keeps category grouping unchanged', () => {
    expect(METRIC_CATEGORIES).toEqual(['lifecycle', 'branding', 'activity', 'content']);
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
    expect(METRIC_CATALOG.filter((metric) => metric.category === 'activity').map((m) => m.key)).toEqual([
      'lastPortalSignInAt',
      'daysSinceLastPortalSignIn',
      'portalSignInCount',
    ]);
    expect(METRIC_CATALOG.filter((metric) => metric.category === 'content').map((m) => m.key)).toEqual([
      'folderCount',
      'hasCreatedFolder',
      'documentCount',
      'hasUploadedDocument',
    ]);
  });

  it('keeps types, operators, and timing metadata unchanged', () => {
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
      operators: ['is_true', 'is_false'],
      supportsTimingAnchor: false,
    });
    expect(byKey.get('lastPortalSignInAt')).toMatchObject({
      type: 'date',
      operators: ['is_empty'],
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
  });
});
