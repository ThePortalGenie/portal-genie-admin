import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { summariseRule } from './rule-summary';

function fixture(id: string) {
  const rule = RULE_FIXTURES.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing fixture ${id}`);
  }
  return rule;
}

describe('summariseRule', () => {
  it('describes timing and conditions in plain language', () => {
    expect(summariseRule(fixture('rule_welcome'), METRIC_CATALOG)).toBe('In trial');
    expect(summariseRule(fixture('rule_logo'), METRIC_CATALOG)).toBe(
      '3 days after registration · Logo not uploaded',
    );
    expect(summariseRule(fixture('rule_document'), METRIC_CATALOG)).toBe(
      'In trial · No documents uploaded',
    );
    expect(summariseRule(fixture('rule_trial_7'), METRIC_CATALOG)).toBe(
      '7 days before trial expiry',
    );
    expect(summariseRule(fixture('rule_inactive_14'), METRIC_CATALOG)).toBe(
      'No portal sign-in for 14 days',
    );
    expect(summariseRule(fixture('rule_trial_expired'), METRIC_CATALOG)).toBe('On trial expiry');
  });
});
