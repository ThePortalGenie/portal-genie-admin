import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import {
  booleanValueLabels,
  EDITOR_OPERATOR_LABELS,
  metricEditorLabel,
  metricSelectorLabel,
  timingAnchorLabel,
} from './metric-display';

function metric(key: string) {
  const found = METRIC_CATALOG.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Missing metric ${key}`);
  }
  return found;
}

const EXPECTED_SELECTOR_LABELS: Record<string, string> = {
  registeredAt: 'Registration',
  daysSinceRegistration: 'Days since registration',
  trialStatus: 'Trial status',
  trialExpiresAt: 'Trial expiry',
  daysUntilTrialExpiry: 'Days until trial expiry',
  accountStatus: 'Account status',
  logoUploaded: 'Company logo (whether a logo has been uploaded)',
  lastPortalSignInAt: 'Admin sign-in',
  daysSinceLastPortalSignIn: 'Days since last admin sign-in',
  portalSignInCount: 'Admin sign-in count',
  hasCreatedFolder: 'Folder (whether at least one folder has been created)',
  folderCount: 'Folder count',
  hasUploadedDocument: 'Document (whether at least one document has been uploaded)',
  documentCount: 'Document count',
  lastDocumentUploadedAt: 'Last document uploaded',
  daysSinceLastDocumentUpload: 'Days since last document upload',
  accountingSoftwareConnected:
    'Accounting software (whether accounting software is connected)',
  hasPortalVisit: 'Portal visit (whether a client has visited the portal)',
  daysSinceLastPortalVisit: 'Days since last portal visit',
  portalVisitCount: 'Portal visit count',
  hasPortalDocumentUpload: 'Portal document upload (whether a client has uploaded a document)',
  portalDocumentUploadCount: 'Portal document upload count',
  lastPortalDocumentUploadedAt: 'Last portal document uploaded',
  daysSinceLastPortalDocumentUpload: 'Days since last portal document upload',
  hasCreatedScheduledEmailTemplate:
    'Scheduled email template (whether a scheduled email template has been created)',
};

describe('metric display labels', () => {
  it('uses administrator-friendly names without changing catalog keys', () => {
    expect(metric('logoUploaded').key).toBe('logoUploaded');
    expect(metricEditorLabel(metric('logoUploaded'))).toBe('Company logo');
    expect(metricEditorLabel(metric('hasCreatedFolder'))).toBe('Folder');
    expect(metricEditorLabel(metric('lastPortalSignInAt'))).toBe('Admin sign-in');
    expect(metric('lastPortalSignInAt').key).toBe('lastPortalSignInAt');
    expect(metricEditorLabel(metric('registeredAt'))).toBe('Registration');
    expect(metricEditorLabel(metric('trialExpiresAt'))).toBe('Trial expiry');
    expect(metricEditorLabel(metric('daysSinceLastPortalSignIn'))).toBe(
      'Days since last admin sign-in',
    );
    expect(metricEditorLabel(metric('portalSignInCount'))).toBe('Admin sign-in count');
    expect(metricEditorLabel(metric('hasPortalVisit'))).toBe('Portal visit');
    expect(metricEditorLabel(metric('accountingSoftwareConnected'))).toBe('Accounting software');
    expect(metricEditorLabel(metric('hasCreatedScheduledEmailTemplate'))).toBe(
      'Scheduled email template',
    );
  });

  it('keeps authored condition labels concise', () => {
    expect(metricEditorLabel(metric('logoUploaded'))).toBe('Company logo');
    expect(metricEditorLabel(metric('logoUploaded'))).not.toContain('whether');
    expect(metricEditorLabel(metric('daysSinceLastPortalSignIn'))).toBe(
      'Days since last admin sign-in',
    );
    expect(metricEditorLabel(metric('daysSinceLastPortalSignIn'))).not.toContain('most recent');
    expect(metricEditorLabel(metric('hasPortalVisit'))).not.toContain('whether');
  });

  it('appends a catalogue description only when one is present', () => {
    expect(metricSelectorLabel(metric('logoUploaded'))).toBe(
      'Company logo (whether a logo has been uploaded)',
    );
    expect(metricSelectorLabel(metric('accountingSoftwareConnected'))).toBe(
      'Accounting software (whether accounting software is connected)',
    );
    expect(metricSelectorLabel(metric('lastPortalSignInAt'))).toBe('Admin sign-in');
    expect(metricSelectorLabel(metric('hasCreatedFolder'))).toBe(
      'Folder (whether at least one folder has been created)',
    );
    expect(metricSelectorLabel(metric('hasUploadedDocument'))).toBe(
      'Document (whether at least one document has been uploaded)',
    );
    expect(metricSelectorLabel(metric('hasPortalVisit'))).toBe(
      'Portal visit (whether a client has visited the portal)',
    );
    expect(metricSelectorLabel(metric('hasPortalDocumentUpload'))).toBe(
      'Portal document upload (whether a client has uploaded a document)',
    );
    expect(metricSelectorLabel(metric('hasCreatedScheduledEmailTemplate'))).toBe(
      'Scheduled email template (whether a scheduled email template has been created)',
    );
  });

  it('uses the short name when a metric has no description', () => {
    expect(metricSelectorLabel(metric('registeredAt'))).toBe('Registration');
    expect(metricSelectorLabel(metric('daysSinceRegistration'))).toBe('Days since registration');
    expect(metricSelectorLabel(metric('folderCount'))).toBe('Folder count');
    expect(metricSelectorLabel(metric('portalSignInCount'))).toBe('Admin sign-in count');
    expect(metricSelectorLabel(metric('portalVisitCount'))).toBe('Portal visit count');
    expect(metricSelectorLabel(metric('documentCount'))).not.toContain('number of');
  });

  it('puts catalogue descriptions only on selector option labels', () => {
    for (const item of METRIC_CATALOG) {
      expect(metricSelectorLabel(item)).toBe(EXPECTED_SELECTOR_LABELS[item.key]);
      expect(metricEditorLabel(item)).not.toContain('(');
    }
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
    expect(booleanValueLabels('accountingSoftwareConnected')).toEqual({
      yes: 'is connected',
      no: 'is not connected',
    });
    expect(booleanValueLabels('hasPortalVisit')).toEqual({
      yes: 'has occurred',
      no: 'has not occurred',
    });
    expect(booleanValueLabels('hasPortalDocumentUpload')).toEqual({
      yes: 'has occurred',
      no: 'has not occurred',
    });
    expect(booleanValueLabels('hasCreatedScheduledEmailTemplate')).toEqual({
      yes: 'has been created',
      no: 'has not been created',
    });
  });

  it('keeps comparison wording readable in the condition row', () => {
    expect(EDITOR_OPERATOR_LABELS.gte).toBe('is greater than or equal to');
    expect(EDITOR_OPERATOR_LABELS.is).toBe('is');
    expect(EDITOR_OPERATOR_LABELS.eq).toBe('equals');
    expect(EDITOR_OPERATOR_LABELS.is_empty).toBe('has not occurred');
  });

  it('labels timing anchors in sentence form', () => {
    expect(timingAnchorLabel(metric('registeredAt'))).toBe('Registration date');
    expect(timingAnchorLabel(metric('trialExpiresAt'))).toBe('Trial expiry');
  });
});
