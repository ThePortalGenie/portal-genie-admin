import { describe, expect, it } from 'vitest';
import { Rule } from '../models/rule.model';
import {
  DEFAULT_RULE_LIST_FILTERS,
  filterRules,
  isRuleListFiltered,
  ruleListCounts,
} from './rule-list.filters';

const templates = new Map<string, string>([
  ['welcome-onboarding', 'Welcome / onboarding'],
  ['trial-expiry-reminder', 'Trial expiry reminder'],
  ['feature-announcement', 'Feature announcement'],
  ['inactivity-reengagement', 'Inactivity / re-engagement'],
]);

function rule(overrides: Partial<Rule> & Pick<Rule, 'id' | 'name'>): Rule {
  return {
    description: '',
    category: 'onboarding',
    groupId: 'rg_trial_onboarding',
    sequenceOrder: 1,
    status: 'active',
    rootGroup: { id: 'g', combinator: 'and', children: [] },
    templateId: 'welcome-onboarding',
    timing: { mode: 'on_match' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const rules: Rule[] = [
  rule({
    id: '1',
    name: 'Welcome to Portal Genie',
    description: 'Greet new customers',
    category: 'onboarding',
    status: 'active',
    templateId: 'welcome-onboarding',
  }),
  rule({
    id: '2',
    name: 'Trial — 7 Days Remaining',
    description: 'Remind customers one week before expiry',
    category: 'conversion',
    status: 'active',
    templateId: 'trial-expiry-reminder',
  }),
  rule({
    id: '3',
    name: 'New Feature Announcement',
    description: 'Share a product update',
    category: 'announcement',
    status: 'disabled',
    templateId: 'feature-announcement',
  }),
];

describe('filterRules', () => {
  it('returns all rules when filters are at their defaults', () => {
    expect(filterRules(rules, DEFAULT_RULE_LIST_FILTERS, templates)).toHaveLength(3);
  });

  it('filters by active status', () => {
    const result = filterRules(
      rules,
      { ...DEFAULT_RULE_LIST_FILTERS, status: 'active' },
      templates,
    );
    expect(result.map((item) => item.id)).toEqual(['1', '2']);
  });

  it('filters by disabled status', () => {
    const result = filterRules(
      rules,
      { ...DEFAULT_RULE_LIST_FILTERS, status: 'disabled' },
      templates,
    );
    expect(result.map((item) => item.id)).toEqual(['3']);
  });

  it('filters by category', () => {
    const result = filterRules(
      rules,
      { ...DEFAULT_RULE_LIST_FILTERS, category: 'conversion' },
      templates,
    );
    expect(result.map((item) => item.id)).toEqual(['2']);
  });

  it('searches rule name, description, and template name', () => {
    expect(
      filterRules(rules, { ...DEFAULT_RULE_LIST_FILTERS, query: 'welcome' }, templates).map(
        (item) => item.id,
      ),
    ).toEqual(['1']);
    expect(
      filterRules(rules, { ...DEFAULT_RULE_LIST_FILTERS, query: 'product update' }, templates).map(
        (item) => item.id,
      ),
    ).toEqual(['3']);
    expect(
      filterRules(rules, { ...DEFAULT_RULE_LIST_FILTERS, query: 'expiry reminder' }, templates).map(
        (item) => item.id,
      ),
    ).toEqual(['2']);
  });

  it('searches across groups rather than the current group only', () => {
    const mixed = [
      rule({
        id: '1',
        name: 'Welcome to Portal Genie',
        groupId: 'rg_trial_onboarding',
        templateId: 'welcome-onboarding',
      }),
      rule({
        id: 'inactive',
        name: 'Inactive for 14 Days',
        category: 'engagement',
        groupId: 'rg_engagement',
        sequenceOrder: 1,
        templateId: 'inactivity-reengagement',
      }),
      rule({
        id: '3',
        name: 'New Feature Announcement',
        category: 'announcement',
        groupId: 'rg_announcements',
        templateId: 'feature-announcement',
      }),
    ];

    expect(
      filterRules(mixed, { ...DEFAULT_RULE_LIST_FILTERS, query: 'inactive' }, templates).map(
        (item) => item.id,
      ),
    ).toEqual(['inactive']);
    expect(
      filterRules(mixed, { ...DEFAULT_RULE_LIST_FILTERS, query: 'welcome' }, templates).map(
        (item) => item.id,
      ),
    ).toEqual(['1']);
  });

  it('combines search with status and category filters', () => {
    const result = filterRules(
      rules,
      { query: 'trial', status: 'active', category: 'conversion' },
      templates,
    );
    expect(result.map((item) => item.id)).toEqual(['2']);
  });
});

describe('isRuleListFiltered', () => {
  it('is false for default filters and true when any filter is applied', () => {
    expect(isRuleListFiltered(DEFAULT_RULE_LIST_FILTERS)).toBe(false);
    expect(isRuleListFiltered({ ...DEFAULT_RULE_LIST_FILTERS, query: 'logo' })).toBe(true);
    expect(isRuleListFiltered({ ...DEFAULT_RULE_LIST_FILTERS, status: 'disabled' })).toBe(true);
    expect(isRuleListFiltered({ ...DEFAULT_RULE_LIST_FILTERS, category: 'adoption' })).toBe(true);
  });
});

describe('ruleListCounts', () => {
  it('summarises the full loaded set, not a filtered view', () => {
    expect(ruleListCounts(rules)).toEqual({ total: 3, active: 2, disabled: 1 });
    expect(ruleListCounts(rules.filter((item) => item.status === 'disabled'))).toEqual({
      total: 1,
      active: 0,
      disabled: 1,
    });
  });
});
