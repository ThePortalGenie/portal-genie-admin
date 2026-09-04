import { describe, expect, it } from 'vitest';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { draftsAreEqual, draftFromRule, emptyRuleDraft } from './rule-draft.helpers';

describe('emptyRuleDraft', () => {
  it('defaults a new rule to Disabled', () => {
    expect(emptyRuleDraft().status).toBe('disabled');
  });

  it('starts with an empty name, no category, and one condition row', () => {
    const draft = emptyRuleDraft();
    expect(draft.name).toBe('');
    expect(draft.category).toBe('');
    expect(draft.rootGroup.combinator).toBe('and');
    expect(draft.rootGroup.children).toHaveLength(1);
    expect(draft.timing.mode).toBe('on_match');
    expect(draft.groupId).toBe('');
    expect(draft.sequenceOrder).toBeNull();
  });
});

describe('draftsAreEqual', () => {
  it('detects unsaved changes', () => {
    const original = emptyRuleDraft();
    const edited = { ...original, name: 'Welcome' };
    expect(draftsAreEqual(original, original)).toBe(true);
    expect(draftsAreEqual(original, edited)).toBe(false);
  });
});

describe('draftFromRule', () => {
  it('preserves group and sequence when editing', () => {
    const source = RULE_FIXTURES.find((rule) => rule.id === 'rule_trial_7');
    expect(source).toBeDefined();
    const draft = draftFromRule(source!);
    expect(draft.groupId).toBe('rg_trial_onboarding');
    expect(draft.sequenceOrder).toBe(3);
    expect(draft.category).toBe('conversion');
  });
});
