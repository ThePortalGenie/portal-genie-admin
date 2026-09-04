import { describe, expect, it } from 'vitest';
import { RULE_GROUP_FIXTURES } from '../../../core/data/mock/fixtures/rule-groups.fixture';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { emptyRuleDraft } from '../rule-editor/rule-draft.helpers';
import { sequenceForGroupChange } from '../rule-editor/create-defaults';
import { Rule, RuleDraft } from '../models/rule.model';
import {
  buildJourneySequence,
  CURRENT_DRAFT_ID,
  currentRuleDisplayName,
  insertAtIndex,
  journeyHelperText,
  placeRuleInGroupSequence,
  sequenceOrderFromVisualIndex,
  siblingRulesForGroup,
  visualIndexFromSequence,
} from './journey-sequence';
import { nextSequenceOrder } from './rule-group.helpers';

function trialDraft(overrides: Partial<RuleDraft> = {}): RuleDraft {
  const draft = emptyRuleDraft();
  return {
    ...draft,
    name: 'Check-in',
    category: 'onboarding',
    groupId: 'rg_trial_onboarding',
    sequenceOrder: 8,
    status: 'disabled',
    timing: { mode: 'days_after_date', delayDays: 5, anchorMetricKey: 'registeredAt' },
    ...overrides,
  };
}

describe('journey sequence placement', () => {
  it('derives sequenceOrder from the visual index', () => {
    expect(sequenceOrderFromVisualIndex(0)).toBe(1);
    expect(sequenceOrderFromVisualIndex(2)).toBe(3);
    expect(sequenceOrderFromVisualIndex(7)).toBe(8);
  });

  it('places a stored sequence into the matching gap among siblings', () => {
    const others = siblingRulesForGroup(RULE_FIXTURES, 'rg_trial_onboarding', 'rule_trial_7');
    expect(visualIndexFromSequence(others, 3)).toBe(2);
    expect(others.map((rule) => rule.id)[2]).toBe('rule_trial_3');
  });

  it('appends when the sequence is beyond the current last sibling', () => {
    const others = siblingRulesForGroup(RULE_FIXTURES, 'rg_trial_onboarding', null);
    expect(visualIndexFromSequence(others, nextSequenceOrder(RULE_FIXTURES, 'rg_trial_onboarding'))).toBe(
      others.length,
    );
  });

  it('moves the current rule to the end when the group changes', () => {
    const nextSequence = sequenceForGroupChange(
      RULE_FIXTURES,
      'rg_engagement',
      'rg_trial_onboarding',
      3,
    );
    expect(nextSequence).toBe(5);
    const others = siblingRulesForGroup(RULE_FIXTURES, 'rg_engagement', 'rule_trial_7');
    expect(visualIndexFromSequence(others, nextSequence)).toBe(others.length);
  });

  it('does not mutate stored rules when inserting a draft into the visual list', () => {
    const snapshot = RULE_FIXTURES.map((rule) => rule.sequenceOrder);
    const others = siblingRulesForGroup(RULE_FIXTURES, 'rg_trial_onboarding', null);
    insertAtIndex(others, RULE_FIXTURES[0]!, 2);
    expect(RULE_FIXTURES.map((rule) => rule.sequenceOrder)).toEqual(snapshot);
  });
});

describe('placeRuleInGroupSequence', () => {
  it('resequences siblings so a saved visual position stays unique', () => {
    const created: Rule = {
      ...RULE_FIXTURES[0]!,
      id: 'rule_new',
      name: 'Check-in',
      groupId: 'rg_trial_onboarding',
      sequenceOrder: 3,
    };
    const next = placeRuleInGroupSequence([created, ...RULE_FIXTURES], created);
    const trial = next
      .filter((rule) => rule.groupId === 'rg_trial_onboarding')
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder);

    expect(trial.map((rule) => rule.name)).toEqual([
      'Welcome to Portal Genie',
      'Complete Your Setup',
      'Check-in',
      '7 Days Left in Your Trial',
      '3 Days Left in Your Trial',
      'Your Trial Ends Tomorrow',
      'Your Trial Ends Today',
      'Your Portal Genie Trial Has Expired',
    ]);
    expect(trial.map((rule) => rule.sequenceOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('buildJourneySequence', () => {
  it('shows a New rule item at the end of the selected group on create', () => {
    const view = buildJourneySequence({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: null,
      draft: trialDraft({ name: '' }),
      placementIndex: 7,
      isCreate: true,
    });

    expect(view.hasGroup).toBe(true);
    expect(view.groupName).toBe('Trial & Onboarding');
    expect(view.helperText).toBe('Arrange rules so the customer journey is easy to understand.');
    expect(view.items).toHaveLength(8);
    expect(view.items[7]?.id).toBe(CURRENT_DRAFT_ID);
    expect(view.items[7]?.name).toBe('New rule');
    expect(view.items[7]?.isCurrent).toBe(true);
    expect(view.items[7]?.timingLabel).toBe('5 days after registration');
    expect(view.currentIndex).toBe(7);
    expect(view.canMoveUp).toBe(true);
    expect(view.canMoveDown).toBe(false);
  });

  it('recalculates sequenceOrder from a moved visual index', () => {
    const movedIndex = 2;
    expect(sequenceOrderFromVisualIndex(movedIndex)).toBe(3);

    const view = buildJourneySequence({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: null,
      draft: trialDraft(),
      placementIndex: movedIndex,
      isCreate: true,
    });

    expect(view.items[2]?.isCurrent).toBe(true);
    expect(view.items[2]?.name).toBe('Check-in');
    expect(view.items.map((item) => item.indexLabel)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
  });

  it('keeps the edited rule in its current sequence position', () => {
    const source = RULE_FIXTURES.find((rule) => rule.id === 'rule_trial_7');
    expect(source).toBeDefined();
    const others = siblingRulesForGroup(RULE_FIXTURES, 'rg_trial_onboarding', source!.id);
    const placementIndex = visualIndexFromSequence(others, source!.sequenceOrder);

    const view = buildJourneySequence({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: source!.id,
      draft: {
        ...emptyRuleDraft(),
        name: source!.name,
        groupId: source!.groupId,
        sequenceOrder: source!.sequenceOrder,
        status: source!.status,
        timing: source!.timing,
      },
      placementIndex,
      isCreate: false,
    });

    expect(view.items[2]?.id).toBe('rule_trial_7');
    expect(view.items[2]?.isCurrent).toBe(true);
    expect(view.items.some((item) => item.id === CURRENT_DRAFT_ID)).toBe(false);
  });

  it('flags a live timing conflict after the current rule is moved', () => {
    const view = buildJourneySequence({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: 'rule_trial_7',
      draft: {
        ...emptyRuleDraft(),
        name: '7 Days Left in Your Trial',
        groupId: 'rg_trial_onboarding',
        sequenceOrder: 4,
        status: 'active',
        timing: { mode: 'days_before_date', delayDays: 7, anchorMetricKey: 'trialExpiresAt' },
      },
      placementIndex: 3,
      isCreate: false,
    });

    const current = view.items.find((item) => item.isCurrent);
    expect(current?.name).toBe('7 Days Left in Your Trial');
    expect(view.items[current!.visualIndex - 1]?.name).toBe('3 Days Left in Your Trial');
    expect(current?.conflict?.suggestion).toBe("Move this rule above '3 Days Left in Your Trial'.");
  });

  it('clears the conflict when live timing becomes consistent with the position', () => {
    const view = buildJourneySequence({
      groupId: 'rg_trial_onboarding',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: 'rule_trial_7',
      draft: {
        ...emptyRuleDraft(),
        name: '7 Days Left in Your Trial',
        groupId: 'rg_trial_onboarding',
        sequenceOrder: 4,
        status: 'active',
        timing: { mode: 'days_before_date', delayDays: 2, anchorMetricKey: 'trialExpiresAt' },
      },
      placementIndex: 3,
      isCreate: false,
    });

    expect(view.items.find((item) => item.isCurrent)?.conflict).toBeNull();
  });

  it('keeps disabled siblings visible in the sequence', () => {
    const view = buildJourneySequence({
      groupId: 'rg_engagement',
      groups: RULE_GROUP_FIXTURES,
      rules: RULE_FIXTURES,
      currentRuleId: null,
      draft: {
        ...emptyRuleDraft(),
        name: '',
        groupId: 'rg_engagement',
        sequenceOrder: 5,
        status: 'disabled',
        timing: { mode: 'on_match' },
      },
      placementIndex: 4,
      isCreate: true,
    });

    const waiting = view.items.find((item) => item.name === 'Your Portal Is Waiting for You');
    expect(waiting?.isDisabled).toBe(true);
    expect(waiting?.isCurrent).toBe(false);
  });

  it('uses group-specific helper text', () => {
    expect(journeyHelperText('rg_adoption')).toContain('recommended product progression');
    expect(journeyHelperText('rg_engagement')).toContain('inactivity');
    expect(journeyHelperText('rg_announcements')).toContain('administrators should see them');
  });
});

describe('currentRuleDisplayName', () => {
  it('uses New rule when creating without a name', () => {
    expect(currentRuleDisplayName(emptyRuleDraft(), true)).toBe('New rule');
  });
});
