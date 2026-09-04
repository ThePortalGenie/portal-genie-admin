import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { TEMPLATE_FIXTURES } from '../../../core/data/mock/fixtures/templates.fixture';
import { emptyConditionDraft, emptyRuleDraft } from '../rule-editor/rule-draft.helpers';
import { ConditionDraft, RuleDraft } from '../models/rule.model';
import { validateRuleDraft } from './rule-validator';

const templates = TEMPLATE_FIXTURES;

function validDraft(overrides: Partial<RuleDraft> = {}): RuleDraft {
  const draft = emptyRuleDraft();
  draft.name = 'Welcome';
  draft.category = 'onboarding';
  draft.groupId = 'rg_trial_onboarding';
  draft.sequenceOrder = 1;
  draft.templateId = 'welcome-onboarding';
  draft.rootGroup.children = [inTrialCondition()];
  return { ...draft, ...overrides };
}

function inTrialCondition(): ConditionDraft {
  return {
    id: 'c1',
    metricKey: 'trialStatus',
    operator: 'is',
    value: 'in_trial',
  };
}

describe('validateRuleDraft', () => {
  it('requires a rule name', () => {
    const result = validateRuleDraft(validDraft({ name: '   ' }), METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.name.required')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('requires a rule group independently of category', () => {
    const result = validateRuleDraft(validDraft({ groupId: '' }), METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.group.required')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('requires a sequence position of 1 or more', () => {
    expect(
      validateRuleDraft(validDraft({ sequenceOrder: null }), METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.sequence.required',
      ),
    ).toBe(true);
    expect(
      validateRuleDraft(validDraft({ sequenceOrder: 0 }), METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.sequence.invalid',
      ),
    ).toBe(true);
  });

  it('requires a category', () => {
    const result = validateRuleDraft(validDraft({ category: '' }), METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.category.required')).toBe(true);
  });

  it('requires a customer condition or a lifecycle date', () => {
    const draft = validDraft();
    draft.rootGroup = { ...draft.rootGroup, children: [] };
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.conditions.min')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('accepts a lifecycle-only trial expiry rule', () => {
    const draft = validDraft({
      name: 'Trial reminder',
      category: 'conversion',
      templateId: 'trial-expiry-reminder',
      timing: { mode: 'days_before_date', delayDays: 7, anchorMetricKey: 'trialExpiresAt' },
    });
    draft.rootGroup = { ...draft.rootGroup, children: [] };
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(true);
  });

  it('accepts a lifecycle-only registration rule', () => {
    const draft = validDraft({
      templateId: 'welcome-onboarding',
      timing: { mode: 'days_after_date', delayDays: 0, anchorMetricKey: 'registeredAt' },
    });
    draft.rootGroup = { ...draft.rootGroup, children: [] };
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(true);
  });

  it('accepts a behavioural condition-only rule with implicit on_match', () => {
    const draft = validDraft({
      name: 'Re-engagement',
      category: 'engagement',
      templateId: 'inactivity-reengagement',
      timing: { mode: 'on_match' },
    });
    draft.rootGroup.children = [
      { id: 'c', metricKey: 'daysSinceLastPortalSignIn', operator: 'gte', value: 14 },
    ];
    expect(validateRuleDraft(draft, METRIC_CATALOG, templates).isValid).toBe(true);
  });

  it('rejects an empty rule', () => {
    const result = validateRuleDraft(emptyRuleDraft(), METRIC_CATALOG, templates);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'rule.conditions.min')).toBe(true);
  });

  it('rejects an incomplete lifecycle timing row even without eligibility conditions', () => {
    const draft = validDraft({
      timing: { mode: 'days_before_date', anchorMetricKey: 'trialExpiresAt' },
    });
    draft.rootGroup = { ...draft.rootGroup, children: [] };
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'rule.timing.days.required')).toBe(true);
  });

  it('still rejects an incomplete eligibility row when lifecycle timing is valid', () => {
    const draft = validDraft({
      timing: { mode: 'days_before_date', delayDays: 7, anchorMetricKey: 'trialExpiresAt' },
    });
    draft.rootGroup.children = [emptyConditionDraft()];
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'rule.condition.metric.required')).toBe(true);
  });

  it('requires metric, operator, and value on a condition', () => {
    const draft = validDraft();
    draft.rootGroup.children = [emptyConditionDraft()];
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.condition.metric.required')).toBe(true);

    draft.rootGroup.children = [{ id: 'c', metricKey: 'trialStatus', operator: '', value: null }];
    const missingOperator = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(missingOperator.errors.some((issue) => issue.code === 'rule.condition.operator.required')).toBe(
      true,
    );

    draft.rootGroup.children = [{ id: 'c', metricKey: 'trialStatus', operator: 'is', value: '' }];
    const missingValue = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(missingValue.errors.some((issue) => issue.code === 'rule.condition.value.required')).toBe(true);
  });

  it('rejects operators that do not apply to the metric', () => {
    const draft = validDraft();
    draft.rootGroup.children = [{ id: 'c', metricKey: 'logoUploaded', operator: 'eq', value: 1 }];
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.condition.operator.invalid')).toBe(true);
  });

  it('accepts boolean operators without a separate value', () => {
    const draft = validDraft();
    draft.rootGroup.children = [
      { id: 'c', metricKey: 'logoUploaded', operator: 'is_false', value: null },
    ];
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(true);
  });

  it('accepts enum values from the catalog and rejects unknown values', () => {
    const draft = validDraft();
    draft.rootGroup.children = [
      { id: 'c', metricKey: 'accountStatus', operator: 'is', value: 'active' },
    ];
    expect(validateRuleDraft(draft, METRIC_CATALOG, templates).isValid).toBe(true);

    draft.rootGroup.children = [
      { id: 'c', metricKey: 'accountStatus', operator: 'is', value: 'platinum' },
    ];
    expect(
      validateRuleDraft(draft, METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.condition.value.enum',
      ),
    ).toBe(true);
  });

  it('rejects non-numeric and negative duration values', () => {
    const draft = validDraft();
    draft.rootGroup.children = [
      { id: 'c', metricKey: 'daysSinceLastPortalSignIn', operator: 'gte', value: 'two' },
    ];
    expect(
      validateRuleDraft(draft, METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.condition.value.required',
      ),
    ).toBe(true);

    draft.rootGroup.children = [
      { id: 'c', metricKey: 'daysSinceLastPortalSignIn', operator: 'gte', value: -1 },
    ];
    expect(
      validateRuleDraft(draft, METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.value.negative',
      ),
    ).toBe(true);
  });

  it('treats a timing offset of 0 as valid', () => {
    const draft = validDraft({
      timing: { mode: 'days_after_date', delayDays: 0, anchorMetricKey: 'registeredAt' },
    });
    expect(validateRuleDraft(draft, METRIC_CATALOG, templates).isValid).toBe(true);
  });

  it('rejects a negative timing offset', () => {
    const draft = validDraft({
      timing: { mode: 'days_after_date', delayDays: -3, anchorMetricKey: 'registeredAt' },
    });
    expect(
      validateRuleDraft(draft, METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.value.negative',
      ),
    ).toBe(true);
  });

  it('warns when timing is more than 365 days without blocking save', () => {
    const draft = validDraft({
      timing: { mode: 'days_before_date', delayDays: 400, anchorMetricKey: 'trialExpiresAt' },
    });
    const result = validateRuleDraft(draft, METRIC_CATALOG, templates);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((issue) => issue.code === 'rule.timing.days.long')).toBe(true);
  });

  it('rejects before-registration timing', () => {
    const draft = validDraft({
      timing: { mode: 'days_before_date', delayDays: 3, anchorMetricKey: 'registeredAt' },
    });
    expect(
      validateRuleDraft(draft, METRIC_CATALOG, templates).errors.some(
        (issue) => issue.code === 'rule.timing.direction.invalid',
      ),
    ).toBe(true);
  });

  it('requires a communication template', () => {
    const result = validateRuleDraft(validDraft({ templateId: '' }), METRIC_CATALOG, templates);
    expect(result.errors.some((issue) => issue.code === 'rule.template.required')).toBe(true);
  });
});
