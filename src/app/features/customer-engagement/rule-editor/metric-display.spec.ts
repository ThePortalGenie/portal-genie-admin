import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import {
  booleanValueLabels,
  EDITOR_OPERATOR_LABELS,
  metricEditorLabel,
  timingAnchorLabel,
} from './metric-display';

function metric(key: string) {
  const found = METRIC_CATALOG.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Missing metric ${key}`);
  }
  return found;
}

describe('metric display labels', () => {
  it('uses administrator-friendly names without changing catalog keys', () => {
    expect(metric('logoUploaded').key).toBe('logoUploaded');
    expect(metricEditorLabel(metric('logoUploaded'))).toBe('Company logo');
    expect(metricEditorLabel(metric('hasCreatedFolder'))).toBe('Folder');
    expect(metricEditorLabel(metric('lastPortalSignInAt'))).toBe('Portal sign-in');
    expect(metricEditorLabel(metric('registeredAt'))).toBe('Registration');
    expect(metricEditorLabel(metric('trialExpiresAt'))).toBe('Trial expiry');
    expect(metricEditorLabel(metric('daysSinceLastPortalSignIn'))).toBe(
      'Days since last portal sign-in',
    );
  });

  it('uses natural boolean value labels', () => {
    expect(booleanValueLabels('logoUploaded')).toEqual({
      yes: 'has been uploaded',
      no: 'has not been uploaded',
    });
    expect(booleanValueLabels('hasCreatedFolder')).toEqual({
      yes: 'has been created',
      no: 'has not been created',
    });
  });

  it('keeps comparison wording readable in the condition row', () => {
    expect(EDITOR_OPERATOR_LABELS.gte).toBe('is greater than or equal to');
    expect(EDITOR_OPERATOR_LABELS.is).toBe('is');
  });

  it('labels timing anchors in sentence form', () => {
    expect(timingAnchorLabel(metric('registeredAt'))).toBe('Registration date');
    expect(timingAnchorLabel(metric('trialExpiresAt'))).toBe('Trial expiry');
  });
});
