import { CustomerMetric, MetricOperator } from '../../../core/domain/metric.types';

/** Administrator-facing metric names in the editor. Catalog keys are unchanged. */
const METRIC_EDITOR_LABELS: Record<string, string> = {
  registeredAt: 'Registration',
  daysSinceRegistration: 'Days since registration',
  trialStatus: 'Trial status',
  trialExpiresAt: 'Trial expiry',
  daysUntilTrialExpiry: 'Days until trial expiry',
  accountStatus: 'Account status',
  logoUploaded: 'Company logo',
  lastPortalSignInAt: 'Admin sign-in',
  daysSinceLastPortalSignIn: 'Days since last admin sign-in',
  portalSignInCount: 'Admin sign-in count',
  hasCreatedFolder: 'Folder',
  folderCount: 'Folder count',
  hasUploadedDocument: 'Document',
  documentCount: 'Document count',
  lastDocumentUploadedAt: 'Last document uploaded',
  daysSinceLastDocumentUpload: 'Days since last document upload',
  accountingSoftwareConnected: 'Accounting software',
  hasPortalVisit: 'Portal visit',
  daysSinceLastPortalVisit: 'Days since last portal visit',
  portalVisitCount: 'Portal visit count',
  hasPortalDocumentUpload: 'Portal document upload',
  portalDocumentUploadCount: 'Portal document upload count',
  lastPortalDocumentUploadedAt: 'Last portal document uploaded',
  daysSinceLastPortalDocumentUpload: 'Days since last portal document upload',
  hasCreatedScheduledEmailTemplate: 'Scheduled email template',
};

const BOOLEAN_VALUE_LABELS: Record<string, { yes: string; no: string }> = {
  logoUploaded: { yes: 'has been uploaded', no: 'has not been uploaded' },
  accountingSoftwareConnected: { yes: 'is connected', no: 'is not connected' },
  hasCreatedFolder: { yes: 'has been created', no: 'has not been created' },
  hasUploadedDocument: { yes: 'has been uploaded', no: 'has not been uploaded' },
  hasPortalVisit: { yes: 'has occurred', no: 'has not occurred' },
  hasPortalDocumentUpload: { yes: 'has occurred', no: 'has not occurred' },
  hasCreatedScheduledEmailTemplate: { yes: 'has been created', no: 'has not been created' },
};

export const EDITOR_OPERATOR_LABELS: Record<MetricOperator, string> = {
  is_true: 'is yes',
  is_false: 'is no',
  is: 'is',
  is_not: 'is not',
  eq: 'equals',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
  between: 'is between',
  is_empty: 'has not occurred',
};

export function metricEditorLabel(metric: CustomerMetric): string {
  return METRIC_EDITOR_LABELS[metric.key] ?? metric.displayName;
}

/** Option text for the metric selector. Descriptions are discovery-only. */
export function metricSelectorLabel(metric: CustomerMetric): string {
  const name = metricEditorLabel(metric);
  const description = metric.description?.trim();
  return description ? `${name} (${description})` : name;
}

export function booleanValueLabels(metricKey: string): { yes: string; no: string } {
  return BOOLEAN_VALUE_LABELS[metricKey] ?? { yes: 'Yes', no: 'No' };
}

export function timingAnchorLabel(metric: CustomerMetric): string {
  if (metric.key === 'registeredAt') {
    return 'Registration date';
  }
  if (metric.key === 'trialExpiresAt') {
    return 'Trial expiry';
  }
  return metric.displayName;
}
