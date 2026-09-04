import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { TEMPLATE_FIXTURES } from '../../../core/data/mock/fixtures/templates.fixture';
import { emptyRuleDraft } from '../rule-editor/rule-draft.helpers';
import { summariseRuleDraft } from './editor-summary';

describe('summariseRuleDraft', () => {
  it('builds a WHO / WHEN / WHAT summary from the draft', () => {
    const draft = emptyRuleDraft();
    draft.rootGroup.children = [
      { id: '1', metricKey: 'trialStatus', operator: 'is', value: 'in_trial' },
      { id: '2', metricKey: 'logoUploaded', operator: 'is_false', value: null },
    ];
    draft.timing = { mode: 'days_after_date', delayDays: 3, anchorMetricKey: 'registeredAt' };
    draft.templateId = 'setup-reminder';

    const summary = summariseRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(summary.whoLines).toEqual(['In trial', 'Logo not uploaded']);
    expect(summary.combinator).toBe('and');
    expect(summary.whenText).toBe('3 days after registration');
    expect(summary.whatText).toBe('Send “Setup reminder”');
  });

  it('uses on-match wording when no relative timing is set', () => {
    const draft = emptyRuleDraft();
    const summary = summariseRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(summary.whenText).toBe('When the conditions become true');
    expect(summary.whatText).toBe('No communication selected');
  });
});
