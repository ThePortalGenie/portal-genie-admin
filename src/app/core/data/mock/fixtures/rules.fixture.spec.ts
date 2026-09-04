import { describe, expect, it } from 'vitest';
import {
  isRuleConditionGroup,
  RuleCondition,
} from '../../../../features/customer-engagement/models/rule.model';
import { TEMPLATE_FIXTURES } from './templates.fixture';
import { RULE_FIXTURES } from './rules.fixture';

function conditionsOf(ruleId: string): RuleCondition[] {
  const rule = RULE_FIXTURES.find((item) => item.id === ruleId);
  expect(rule).toBeDefined();
  return (rule?.rootGroup.children ?? []).filter(
    (child): child is RuleCondition => !isRuleConditionGroup(child),
  );
}

function ruleById(id: string) {
  const rule = RULE_FIXTURES.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing fixture ${id}`);
  }
  return rule;
}

describe('rule fixtures', () => {
  it('does not duplicate registration timing with days since registration on Complete Your Setup', () => {
    const rule = ruleById('rule_setup');
    expect(rule.timing).toEqual({
      mode: 'days_after_date',
      delayDays: 2,
      anchorMetricKey: 'registeredAt',
    });

    const metricKeys = conditionsOf('rule_setup').map((child) => child.metricKey);
    expect(metricKeys).toEqual(['logoUploaded', 'hasCreatedFolder', 'hasUploadedDocument']);
    expect(metricKeys).not.toContain('daysSinceRegistration');
  });

  it('has unique ids, names, and default purposes', () => {
    const ids = RULE_FIXTURES.map((rule) => rule.id);
    const names = RULE_FIXTURES.map((rule) => rule.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('references only available communication templates', () => {
    const templateIds = new Set(TEMPLATE_FIXTURES.map((template) => template.id));
    for (const rule of RULE_FIXTURES) {
      expect(templateIds.has(rule.templateId), rule.id).toBe(true);
      expect(TEMPLATE_FIXTURES.find((template) => template.id === rule.templateId)?.available).toBe(
        true,
      );
    }
  });

  it('uses registration offset 0 for Welcome', () => {
    expect(ruleById('rule_welcome').timing).toEqual({
      mode: 'days_after_date',
      delayDays: 0,
      anchorMetricKey: 'registeredAt',
    });
  });

  it('uses 0 days before trial expiry for Your Trial Ends Today', () => {
    expect(ruleById('rule_trial_today').timing).toEqual({
      mode: 'days_before_date',
      delayDays: 0,
      anchorMetricKey: 'trialExpiresAt',
    });
  });

  it('uses 1 day after trial expiry for the expired follow-up', () => {
    expect(ruleById('rule_trial_expired').timing).toEqual({
      mode: 'days_after_date',
      delayDays: 1,
      anchorMetricKey: 'trialExpiresAt',
    });
    expect(conditionsOf('rule_trial_expired')).toEqual([
      expect.objectContaining({
        metricKey: 'accountStatus',
        operator: 'is_not',
        value: 'active',
      }),
    ]);
  });

  it('uses 7, 3, and 1 days before trial expiry', () => {
    expect(ruleById('rule_trial_7').timing).toEqual({
      mode: 'days_before_date',
      delayDays: 7,
      anchorMetricKey: 'trialExpiresAt',
    });
    expect(ruleById('rule_trial_3').timing).toEqual({
      mode: 'days_before_date',
      delayDays: 3,
      anchorMetricKey: 'trialExpiresAt',
    });
    expect(ruleById('rule_trial_tomorrow').timing).toEqual({
      mode: 'days_before_date',
      delayDays: 1,
      anchorMetricKey: 'trialExpiresAt',
    });
  });

  it('uses 14, 30, and 60-day inactivity conditions with implicit on_match', () => {
    expect(ruleById('rule_inactive_14').timing.mode).toBe('on_match');
    expect(conditionsOf('rule_inactive_14')).toEqual([
      expect.objectContaining({
        metricKey: 'daysSinceLastPortalSignIn',
        operator: 'gte',
        value: 14,
      }),
    ]);
    expect(conditionsOf('rule_inactive_30')[0]?.value).toBe(30);
    expect(conditionsOf('rule_inactive_60')[0]?.value).toBe(60);
    expect(ruleById('rule_inactive_60').status).toBe('disabled');
  });

  it('keeps missing-logo, no-folder, and no-document as distinct lifecycle rules', () => {
    expect(conditionsOf('rule_logo')).toEqual([
      expect.objectContaining({ metricKey: 'logoUploaded', operator: 'is_false' }),
    ]);
    expect(ruleById('rule_logo').timing).toEqual({
      mode: 'days_after_date',
      delayDays: 3,
      anchorMetricKey: 'registeredAt',
    });
    expect(conditionsOf('rule_folder')).toEqual([
      expect.objectContaining({ metricKey: 'hasCreatedFolder', operator: 'is_false' }),
    ]);
    expect(ruleById('rule_folder').timing.delayDays).toBe(4);
    expect(conditionsOf('rule_document')).toEqual([
      expect.objectContaining({ metricKey: 'hasUploadedDocument', operator: 'is_false' }),
    ]);
    expect(ruleById('rule_document').timing.delayDays).toBe(5);
  });

  it('keeps announcement rules as one-off scheduled communications', () => {
    expect(ruleById('rule_feature').status).toBe('disabled');
    expect(ruleById('rule_product_update').status).toBe('disabled');
    expect(ruleById('rule_feature').timing).toEqual({
      mode: 'scheduled_once',
      scheduledAt: '2026-09-15T09:00:00+02:00',
    });
    expect(ruleById('rule_product_update').timing).toEqual({
      mode: 'scheduled_once',
      scheduledAt: '2026-08-01T09:00:00+02:00',
    });
  });

  it('places Trial & Onboarding rules in display sequence', () => {
    const trial = RULE_FIXTURES.filter((rule) => rule.groupId === 'rg_trial_onboarding').sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder,
    );
    expect(trial.map((rule) => rule.name)).toEqual([
      'Welcome to Portal Genie',
      'Complete Your Setup',
      '7 Days Left in Your Trial',
      '3 Days Left in Your Trial',
      'Your Trial Ends Tomorrow',
      'Your Trial Ends Today',
      'Your Portal Genie Trial Has Expired',
    ]);
  });

  it('places Adoption rules in recommended product progression order', () => {
    const adoption = RULE_FIXTURES.filter((rule) => rule.groupId === 'rg_adoption').sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder,
    );
    expect(adoption.map((rule) => rule.name)).toEqual([
      'Add Your Company Logo',
      'Create Your First Folder',
      'Upload Your First Document',
      'Take the Next Step With Portal Genie',
    ]);
  });

  it('keeps logo, folder, and document in Adoption without changing their categories', () => {
    expect(ruleById('rule_logo')).toMatchObject({
      groupId: 'rg_adoption',
      category: 'adoption',
      sequenceOrder: 1,
    });
    expect(ruleById('rule_folder')).toMatchObject({
      groupId: 'rg_adoption',
      category: 'adoption',
      sequenceOrder: 2,
    });
    expect(ruleById('rule_document')).toMatchObject({
      groupId: 'rg_adoption',
      category: 'adoption',
      sequenceOrder: 3,
    });
    expect(ruleById('rule_setup')).toMatchObject({
      groupId: 'rg_trial_onboarding',
      category: 'onboarding',
      sequenceOrder: 2,
    });
    expect(ruleById('rule_trial_7')).toMatchObject({
      groupId: 'rg_trial_onboarding',
      category: 'conversion',
      sequenceOrder: 3,
    });
  });

  it('places Engagement rules in display sequence, including the disabled 60-day rule', () => {
    const engagement = RULE_FIXTURES.filter((rule) => rule.groupId === 'rg_engagement').sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder,
    );
    expect(engagement.map((rule) => rule.name)).toEqual([
      'Need Help Getting Started?',
      "We Haven't Seen You in a While",
      "Let's Get Your Portal Working for You",
      'Your Portal Is Waiting for You',
    ]);
    expect(engagement[3]?.status).toBe('disabled');
    expect(engagement[3]?.sequenceOrder).toBe(4);
  });
});
