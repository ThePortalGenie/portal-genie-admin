import { MetricOperator } from '../../../domain/metric.types';
import {
  ConditionValue,
  Rule,
  RuleCondition,
  RuleConditionGroup,
  RuleTiming,
} from '../../../../features/customer-engagement/models/rule.model';

function condition(
  id: string,
  metricKey: string,
  operator: MetricOperator,
  value: ConditionValue = null,
): RuleCondition {
  return { id, metricKey, operator, value };
}

function group(id: string, children: RuleCondition[]): RuleConditionGroup {
  return { id, combinator: 'and', children };
}

function timingOnMatch(): RuleTiming {
  return { mode: 'on_match' };
}

function timingAfter(days: number, anchor: string): RuleTiming {
  return { mode: 'days_after_date', delayDays: days, anchorMetricKey: anchor };
}

function timingBefore(days: number, anchor: string): RuleTiming {
  return { mode: 'days_before_date', delayDays: days, anchorMetricKey: anchor };
}

export const RULE_FIXTURES: Rule[] = [
  {
    id: 'rule_welcome',
    name: 'Welcome to Portal Genie',
    description: 'Send a welcome message when a customer first enters trial.',
    category: 'onboarding',
    status: 'active',
    rootGroup: group('g_welcome', [condition('c_welcome_trial', 'trialStatus', 'is', 'in_trial')]),
    templateId: 'welcome-onboarding',
    timing: timingOnMatch(),
    createdAt: '2026-01-08T09:00:00.000Z',
    updatedAt: '2026-08-12T10:15:00.000Z',
  },
  {
    id: 'rule_setup',
    name: 'Complete Your Setup',
    description: 'Remind customers who have not finished setup a few days after registering.',
    category: 'onboarding',
    status: 'active',
    rootGroup: group('g_setup', [
      condition('c_setup_days', 'daysSinceRegistration', 'gte', 3),
      condition('c_setup_logo', 'logoUploaded', 'is_false'),
    ]),
    templateId: 'setup-reminder',
    timing: timingAfter(3, 'registeredAt'),
    createdAt: '2026-01-08T09:10:00.000Z',
    updatedAt: '2026-08-18T14:40:00.000Z',
  },
  {
    id: 'rule_logo',
    name: 'Add Your Company Logo',
    description: 'Prompt customers who have not uploaded a company logo.',
    category: 'adoption',
    status: 'active',
    rootGroup: group('g_logo', [condition('c_logo', 'logoUploaded', 'is_false')]),
    templateId: 'logo-branding-setup',
    timing: timingAfter(3, 'registeredAt'),
    createdAt: '2026-02-02T11:00:00.000Z',
    updatedAt: '2026-08-21T08:05:00.000Z',
  },
  {
    id: 'rule_folder',
    name: 'Create Your First Folder',
    description: 'Encourage creating the first portal folder.',
    category: 'adoption',
    status: 'active',
    rootGroup: group('g_folder', [condition('c_folder', 'hasCreatedFolder', 'is_false')]),
    templateId: 'first-folder-adoption',
    timing: timingOnMatch(),
    createdAt: '2026-02-02T11:20:00.000Z',
    updatedAt: '2026-07-30T16:22:00.000Z',
  },
  {
    id: 'rule_document',
    name: 'Upload Your First Document',
    description: 'Encourage uploading the first document while still in trial.',
    category: 'adoption',
    status: 'disabled',
    rootGroup: group('g_document', [
      condition('c_doc_trial', 'trialStatus', 'is', 'in_trial'),
      condition('c_doc_uploaded', 'hasUploadedDocument', 'is_false'),
    ]),
    templateId: 'first-document-adoption',
    timing: timingOnMatch(),
    createdAt: '2026-02-14T09:45:00.000Z',
    updatedAt: '2026-06-11T12:00:00.000Z',
  },
  {
    id: 'rule_trial_7',
    name: 'Trial — 7 Days Remaining',
    description: 'Remind customers one week before trial expiry.',
    category: 'conversion',
    status: 'active',
    rootGroup: group('g_trial_7', [condition('c_trial_7', 'trialStatus', 'is', 'in_trial')]),
    templateId: 'trial-expiry-reminder',
    timing: timingBefore(7, 'trialExpiresAt'),
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-08-28T09:12:00.000Z',
  },
  {
    id: 'rule_trial_3',
    name: 'Trial — 3 Days Remaining',
    description: 'Follow up three days before trial expiry.',
    category: 'conversion',
    status: 'active',
    rootGroup: group('g_trial_3', [condition('c_trial_3', 'trialStatus', 'is', 'in_trial')]),
    templateId: 'trial-expiry-reminder',
    timing: timingBefore(3, 'trialExpiresAt'),
    createdAt: '2026-03-01T08:05:00.000Z',
    updatedAt: '2026-08-28T09:13:00.000Z',
  },
  {
    id: 'rule_trial_tomorrow',
    name: 'Trial Ends Tomorrow',
    description: 'Last reminder the day before trial expiry.',
    category: 'conversion',
    status: 'active',
    rootGroup: group('g_trial_1', [condition('c_trial_1', 'trialStatus', 'is', 'in_trial')]),
    templateId: 'trial-expiry-reminder',
    timing: timingBefore(1, 'trialExpiresAt'),
    createdAt: '2026-03-01T08:10:00.000Z',
    updatedAt: '2026-08-29T07:40:00.000Z',
  },
  {
    id: 'rule_trial_expired',
    name: 'Trial Expired',
    description: 'Follow up after the trial end date.',
    category: 'conversion',
    status: 'disabled',
    rootGroup: group('g_expired', [condition('c_expired', 'trialStatus', 'is', 'trial_expired')]),
    templateId: 'trial-expired',
    timing: timingAfter(0, 'trialExpiresAt'),
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-05-16T11:18:00.000Z',
  },
  {
    id: 'rule_inactive_14',
    name: 'Inactive for 14 Days',
    description: 'Re-engage customers with no recent portal sign-in.',
    category: 'engagement',
    status: 'active',
    rootGroup: group('g_inactive_14', [
      condition('c_inactive_14', 'daysSinceLastPortalSignIn', 'gte', 14),
    ]),
    templateId: 'inactivity-reengagement',
    timing: timingOnMatch(),
    createdAt: '2026-04-10T13:00:00.000Z',
    updatedAt: '2026-08-04T15:33:00.000Z',
  },
  {
    id: 'rule_inactive_30',
    name: 'Inactive for 30 Days',
    description: 'A stronger follow-up after a month without a sign-in.',
    category: 'engagement',
    status: 'disabled',
    rootGroup: group('g_inactive_30', [
      condition('c_inactive_30', 'daysSinceLastPortalSignIn', 'gte', 30),
    ]),
    templateId: 'inactivity-reengagement',
    timing: timingOnMatch(),
    createdAt: '2026-04-10T13:10:00.000Z',
    updatedAt: '2026-07-02T09:50:00.000Z',
  },
  {
    id: 'rule_feature',
    name: 'New Feature Announcement',
    description: 'Share a product update with active customers.',
    category: 'announcement',
    status: 'disabled',
    rootGroup: group('g_feature', [condition('c_feature_status', 'accountStatus', 'is', 'active')]),
    templateId: 'feature-announcement',
    timing: timingOnMatch(),
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-22T16:05:00.000Z',
  },
];
