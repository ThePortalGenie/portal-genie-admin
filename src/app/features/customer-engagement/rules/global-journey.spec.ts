import { describe, expect, it } from 'vitest';
import { RULE_GROUP_FIXTURES } from '../../../core/data/mock/fixtures/rule-groups.fixture';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { TEMPLATE_FIXTURES } from '../../../core/data/mock/fixtures/templates.fixture';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { Rule } from '../models/rule.model';
import { RULE_FILTER_ALL } from './rule-list.filters';
import { analyseSequence, normaliseLifecycleTiming } from './sequence-analysis';
import {
  ANNOUNCEMENTS_GROUP_ID,
  AUTOMATED_JOURNEY_GROUP_IDS,
  buildGlobalJourney,
  filterGlobalJourneyRules,
  findCommunicationClusters,
  globalJourneyOverview,
  isAutomatedJourneyGroup,
  isDeterministicLifecycle,
  orderRulesForGlobalJourney,
  phaseForRule,
  rulesForGlobalJourney,
} from './global-journey';

function build(filters?: Parameters<typeof buildGlobalJourney>[0]['filters']) {
  return buildGlobalJourney({
    rules: RULE_FIXTURES,
    groups: RULE_GROUP_FIXTURES,
    metrics: METRIC_CATALOG,
    templates: TEMPLATE_FIXTURES,
    filters,
  });
}

function withStatus(ruleId: string, status: Rule['status']): Rule[] {
  return RULE_FIXTURES.map((rule) => (rule.id === ruleId ? { ...rule, status } : rule));
}

describe('global journey membership', () => {
  it('excludes Announcements and does not treat the view as a RuleGroup', () => {
    const included = rulesForGlobalJourney(RULE_FIXTURES);
    expect(included.some((rule) => rule.groupId === ANNOUNCEMENTS_GROUP_ID)).toBe(false);
    expect(AUTOMATED_JOURNEY_GROUP_IDS).not.toContain(ANNOUNCEMENTS_GROUP_ID);
    expect(RULE_GROUP_FIXTURES.some((group) => group.id === ANNOUNCEMENTS_GROUP_ID)).toBe(true);
    expect(isAutomatedJourneyGroup(ANNOUNCEMENTS_GROUP_ID)).toBe(false);
  });

  it('includes Trial & Onboarding, Adoption, and Engagement', () => {
    const included = rulesForGlobalJourney(RULE_FIXTURES);
    expect(included.some((rule) => rule.groupId === 'rg_trial_onboarding')).toBe(true);
    expect(included.some((rule) => rule.groupId === 'rg_adoption')).toBe(true);
    expect(included.some((rule) => rule.groupId === 'rg_engagement')).toBe(true);
    expect(included.map((rule) => rule.id)).toContain('rule_welcome');
    expect(included.map((rule) => rule.id)).toContain('rule_logo');
    expect(included.map((rule) => rule.id)).toContain('rule_inactive_14');
  });

  it('does not introduce a globalSequenceOrder field', () => {
    for (const rule of RULE_FIXTURES) {
      expect(Object.prototype.hasOwnProperty.call(rule, 'globalSequenceOrder')).toBe(false);
    }
    const view = build();
    for (const item of view.items) {
      expect(item.rule.sequenceOrder).toBe(
        RULE_FIXTURES.find((rule) => rule.id === item.rule.id)?.sequenceOrder,
      );
      expect(Object.prototype.hasOwnProperty.call(item, 'globalSequenceOrder')).toBe(false);
    }
  });
});

describe('global journey ordering', () => {
  it('orders same-anchor lifecycle rules chronologically across groups', () => {
    const ordered = orderRulesForGlobalJourney(RULE_FIXTURES, RULE_GROUP_FIXTURES);
    const registration = ordered.filter(
      (rule) => normaliseLifecycleTiming(rule.timing)?.anchorMetricKey === 'registeredAt',
    );
    const offsets = registration.map((rule) => normaliseLifecycleTiming(rule.timing)?.offset);
    expect(offsets).toEqual([0, 2, 3, 3, 4, 5]);
    expect(registration.map((rule) => rule.name)).toEqual([
      'Welcome to Portal Genie',
      'Complete Your Setup',
      'Add Your Company Logo',
      'Need Help Getting Started?',
      'Create Your First Folder',
      'Upload Your First Document',
    ]);

    const trial = ordered.filter(
      (rule) => normaliseLifecycleTiming(rule.timing)?.anchorMetricKey === 'trialExpiresAt',
    );
    expect(trial.map((rule) => normaliseLifecycleTiming(rule.timing)?.offset)).toEqual([
      -7, -3, -1, 0, 1,
    ]);
  });

  it('does not falsely compare registration timing with trial expiry', () => {
    const ordered = orderRulesForGlobalJourney(RULE_FIXTURES, RULE_GROUP_FIXTURES);
    expect(analyseSequence(ordered)).toEqual([]);
  });

  it('marks behavioural rules as non-deterministic', () => {
    const view = build();
    const behavioural = view.items.filter((item) => !item.deterministic);
    expect(behavioural.map((item) => item.rule.name)).toEqual([
      'Take the Next Step With Portal Genie',
      "We Haven't Seen You in a While",
      "Let's Get Your Portal Working for You",
      'Your Portal Is Waiting for You',
    ]);
    expect(behavioural.every((item) => item.phase === 'behaviour')).toBe(true);
    expect(isDeterministicLifecycle(RULE_FIXTURES.find((rule) => rule.id === 'rule_inactive_14')!)).toBe(
      false,
    );
  });
});

describe('global journey filters', () => {
  const templates = new Map(TEMPLATE_FIXTURES.map((template) => [template.id, template.name]));

  it('filters by active and disabled status', () => {
    const active = filterGlobalJourneyRules(
      RULE_FIXTURES,
      { query: '', status: 'active', groupId: RULE_FILTER_ALL },
      templates,
    );
    const disabled = filterGlobalJourneyRules(
      RULE_FIXTURES,
      { query: '', status: 'disabled', groupId: RULE_FILTER_ALL },
      templates,
    );
    expect(active.every((rule) => rule.status === 'active')).toBe(true);
    expect(disabled.every((rule) => rule.status === 'disabled')).toBe(true);
    expect(active.some((rule) => rule.groupId === ANNOUNCEMENTS_GROUP_ID)).toBe(false);
    expect(disabled.map((rule) => rule.name)).toContain('Take the Next Step With Portal Genie');
  });

  it('can limit the view to one automated group', () => {
    const adoption = filterGlobalJourneyRules(
      RULE_FIXTURES,
      { query: '', status: RULE_FILTER_ALL, groupId: 'rg_adoption' },
      templates,
    );
    expect(adoption.every((rule) => rule.groupId === 'rg_adoption')).toBe(true);
    expect(adoption).toHaveLength(4);
  });
});

describe('communication clusters', () => {
  it('warns when two active rules share the exact same lifecycle offset', () => {
    const clusters = findCommunicationClusters(rulesForGlobalJourney(RULE_FIXTURES));
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.names).toEqual([
      'Add Your Company Logo',
      'Need Help Getting Started?',
    ]);
    expect(clusters[0]?.title).toBe('2 communications may occur on the same lifecycle day.');
    expect(clusters[0]?.detail).toContain('on day 3 after registration');
  });

  it('does not create an active collision warning from a disabled rule', () => {
    const clusters = findCommunicationClusters(withStatus('rule_logo', 'disabled'));
    expect(clusters).toEqual([]);
  });
});

describe('buildGlobalJourney', () => {
  it('builds a planning view with group labels and no execution order field', () => {
    const view = build();
    expect(view.counts.total).toBe(15);
    expect(view.span).toBe('Registration → Trial expiry → Behaviour');
    expect(view.sections.map((section) => section.id)).toEqual([
      'registration',
      'trial_expiry',
      'behaviour',
    ]);
    expect(view.items.find((item) => item.rule.id === 'rule_logo')?.groupName).toBe('Adoption');
    expect(view.items.find((item) => item.rule.id === 'rule_logo')?.cluster).not.toBeNull();
    expect(view.items.every((item) => item.conflict === null)).toBe(true);
  });

  it('summarises the landing-card overview from included rules only', () => {
    const overview = globalJourneyOverview(RULE_FIXTURES);
    expect(overview.total).toBe(15);
    expect(overview.active).toBe(13);
    expect(overview.disabled).toBe(2);
  });
});

describe('phaseForRule', () => {
  it('classifies lifecycle anchors without inventing a calendar slot for on-match rules', () => {
    expect(phaseForRule(RULE_FIXTURES.find((rule) => rule.id === 'rule_welcome')!)).toBe(
      'registration',
    );
    expect(phaseForRule(RULE_FIXTURES.find((rule) => rule.id === 'rule_trial_7')!)).toBe(
      'trial_expiry',
    );
    expect(phaseForRule(RULE_FIXTURES.find((rule) => rule.id === 'rule_next_step')!)).toBe(
      'behaviour',
    );
  });
});
