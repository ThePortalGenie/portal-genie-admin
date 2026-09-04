import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { summariseJourneyItem, summariseRule } from './rule-summary';

function fixture(id: string) {
  const rule = RULE_FIXTURES.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing fixture ${id}`);
  }
  return rule;
}

describe('summariseRule', () => {
  it('describes timing and conditions in plain language', () => {
    expect(summariseRule(fixture('rule_welcome'), METRIC_CATALOG)).toBe(
      'On registration · In trial',
    );
    expect(summariseRule(fixture('rule_logo'), METRIC_CATALOG)).toBe(
      '3 days after registration · Logo not uploaded',
    );
    expect(summariseRule(fixture('rule_document'), METRIC_CATALOG)).toBe(
      '5 days after registration · No documents uploaded',
    );
    expect(summariseRule(fixture('rule_trial_7'), METRIC_CATALOG)).toBe(
      '7 days before trial expiry',
    );
    expect(summariseRule(fixture('rule_inactive_14'), METRIC_CATALOG)).toBe(
      'No portal sign-in for 14 days',
    );
    expect(summariseRule(fixture('rule_trial_today'), METRIC_CATALOG)).toBe('On trial expiry');
    expect(summariseRule(fixture('rule_trial_expired'), METRIC_CATALOG)).toBe(
      '1 day after trial expiry · Not active',
    );
  });
});

describe('summariseJourneyItem', () => {
  it('uses lifecycle timing copy for sequence items', () => {
    expect(summariseJourneyItem(fixture('rule_setup'), METRIC_CATALOG)).toEqual({
      timing: '2 days after registration',
      eligibility: 'Logo not uploaded · No folder created · No documents uploaded',
    });
    expect(summariseJourneyItem(fixture('rule_trial_7'), METRIC_CATALOG).timing).toBe(
      '7 days before trial expiry',
    );
    expect(summariseJourneyItem(fixture('rule_trial_today'), METRIC_CATALOG).timing).toBe(
      'On trial expiry',
    );
    expect(summariseJourneyItem(fixture('rule_trial_expired'), METRIC_CATALOG).timing).toBe(
      '1 day after trial expiry',
    );
  });

  it('describes inactivity as the trigger without repeating the condition', () => {
    expect(summariseJourneyItem(fixture('rule_inactive_14'), METRIC_CATALOG)).toEqual({
      timing: 'When inactive for 14 days',
      eligibility: '',
    });
  });
});
