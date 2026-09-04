import { describe, expect, it } from 'vitest';
import { draftsAreEqual, emptyRuleDraft } from './rule-draft.helpers';

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
