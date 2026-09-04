import { describe, expect, it } from 'vitest';
import { RULE_GROUP_FIXTURES } from '../../../core/data/mock/fixtures/rule-groups.fixture';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { draftForCreate, sequenceForGroupChange } from './create-defaults';

describe('draftForCreate', () => {
  it('leaves group empty when created from the global rules list', () => {
    const draft = draftForCreate({
      groupId: null,
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
    });
    expect(draft.groupId).toBe('');
    expect(draft.sequenceOrder).toBeNull();
    expect(draft.status).toBe('disabled');
  });

  it('preselects the group from the group route and appends to that journey', () => {
    const draft = draftForCreate({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
    });
    expect(draft.groupId).toBe('rg_trial_onboarding');
    expect(draft.sequenceOrder).toBe(8);
    expect(draft.timing).toEqual({ mode: 'on_match' });
  });

  it('uses scheduled_once with an empty send date when creating in Announcements', () => {
    const draft = draftForCreate({
      groupId: 'rg_announcements',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
    });
    expect(draft.groupId).toBe('rg_announcements');
    expect(draft.sequenceOrder).toBe(3);
    expect(draft.timing).toEqual({ mode: 'scheduled_once' });
    expect(draft.timing.scheduledAt).toBeUndefined();
  });

  it('ignores an unknown group id from the route', () => {
    const draft = draftForCreate({
      groupId: 'rg_missing',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
    });
    expect(draft.groupId).toBe('');
  });
});

describe('sequenceForGroupChange', () => {
  it('keeps the current position when the group does not change', () => {
    expect(
      sequenceForGroupChange(RULE_FIXTURES, 'rg_adoption', 'rg_adoption', 2),
    ).toBe(2);
  });

  it('moves a rule to the end when it is assigned to a different group', () => {
    expect(
      sequenceForGroupChange(RULE_FIXTURES, 'rg_engagement', 'rg_adoption', 1),
    ).toBe(5);
  });
});
