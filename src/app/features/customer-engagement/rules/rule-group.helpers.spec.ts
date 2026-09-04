import { describe, expect, it } from 'vitest';
import { RULE_GROUP_FIXTURES } from '../../../core/data/mock/fixtures/rule-groups.fixture';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import {
  groupOverviews,
  nextSequenceOrder,
  rulesForGroup,
  sortRulesBySequence,
} from './rule-group.helpers';

describe('rule group organisation', () => {
  it('assigns every fixture rule to a known group', () => {
    const groupIds = new Set(RULE_GROUP_FIXTURES.map((group) => group.id));
    for (const rule of RULE_FIXTURES) {
      expect(groupIds.has(rule.groupId)).toBe(true);
    }
  });

  it('keeps category independent from group', () => {
    const trialSeven = RULE_FIXTURES.find((rule) => rule.id === 'rule_trial_7');
    expect(trialSeven?.category).toBe('conversion');
    expect(trialSeven?.groupId).toBe('rg_trial_onboarding');
  });

  it('counts rules per group from the assigned set', () => {
    const overviews = groupOverviews(RULE_GROUP_FIXTURES, RULE_FIXTURES);
    const trial = overviews.find((item) => item.group.id === 'rg_trial_onboarding');
    expect(trial).toMatchObject({ total: 10, active: 10, disabled: 0 });
    expect(trial?.journeySpan).toBe('Registration → Trial expiry');

    const engagement = overviews.find((item) => item.group.id === 'rg_engagement');
    expect(engagement).toMatchObject({ total: 4, active: 3, disabled: 1 });
  });

  it('filters to a group without using category', () => {
    const adoption = rulesForGroup(RULE_FIXTURES, 'rg_adoption');
    expect(adoption.map((rule) => rule.name)).toEqual([
      'Take the Next Step With Portal Genie',
    ]);
    expect(adoption.every((rule) => rule.category === 'adoption')).toBe(true);
    expect(RULE_FIXTURES.find((rule) => rule.id === 'rule_logo')?.groupId).toBe(
      'rg_trial_onboarding',
    );
  });

  it('sorts a group by sequenceOrder, not by status', () => {
    const trial = rulesForGroup(RULE_FIXTURES, 'rg_trial_onboarding');
    expect(trial.map((rule) => rule.name)).toEqual([
      'Welcome to Portal Genie',
      'Complete Your Setup',
      'Add Your Company Logo',
      'Create Your First Folder',
      'Upload Your First Document',
      '7 Days Left in Your Trial',
      '3 Days Left in Your Trial',
      'Your Trial Ends Tomorrow',
      'Your Trial Ends Today',
      'Your Portal Genie Trial Has Expired',
    ]);
    expect(trial[9]?.status).toBe('active');
    expect(trial[9]?.sequenceOrder).toBe(10);
  });

  it('keeps a disabled engagement rule in its sequence position', () => {
    const engagement = rulesForGroup(RULE_FIXTURES, 'rg_engagement');
    expect(engagement.map((rule) => rule.name)).toEqual([
      'Need Help Getting Started?',
      "We Haven't Seen You in a While",
      "Let's Get Your Portal Working for You",
      'Your Portal Is Waiting for You',
    ]);
    expect(engagement[3]?.status).toBe('disabled');
    expect(engagement[3]?.sequenceOrder).toBe(4);
  });

  it('places a new rule after the current last sequence in that group', () => {
    expect(nextSequenceOrder(RULE_FIXTURES, 'rg_trial_onboarding')).toBe(11);
    expect(nextSequenceOrder(RULE_FIXTURES, 'rg_announcements')).toBe(3);
  });

  it('does not treat sequenceOrder as execution order — display sort only', () => {
    const shuffled = sortRulesBySequence([
      RULE_FIXTURES.find((rule) => rule.id === 'rule_trial_expired')!,
      RULE_FIXTURES.find((rule) => rule.id === 'rule_welcome')!,
    ]);
    expect(shuffled.map((rule) => rule.id)).toEqual(['rule_welcome', 'rule_trial_expired']);
  });
});
