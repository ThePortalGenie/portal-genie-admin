import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import { MetricOperator } from '../../../core/domain/metric.types';
import { Rule } from '../models/rule.model';
import { summariseAnnouncementAudience, summariseJourneyItem, summariseRule, summariseTiming } from './rule-summary';

function fixture(id: string) {
  const rule = RULE_FIXTURES.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing fixture ${id}`);
  }
  return rule;
}

function ruleWithCondition(metricKey: string, operator: MetricOperator): Rule {
  return {
    id: 'rule_test',
    name: 'Test',
    description: '',
    category: 'onboarding',
    groupId: 'rg_adoption',
    sequenceOrder: 1,
    status: 'disabled',
    rootGroup: {
      id: 'g',
      combinator: 'and',
      children: [{ id: 'c', metricKey, operator, value: null }],
    },
    templateId: 'setup-reminder',
    timing: { mode: 'on_match' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
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
      'No admin sign-in for 14 days',
    );
    expect(summariseRule(fixture('rule_trial_today'), METRIC_CATALOG)).toBe('On trial expiry');
    expect(summariseRule(fixture('rule_trial_expired'), METRIC_CATALOG)).toBe(
      '1 day after trial expiry · Not active',
    );
  });

  it('summarises accounting and scheduled-email booleans in natural language', () => {
    expect(
      summariseRule(
        ruleWithCondition('accountingSoftwareConnected', 'is_false'),
        METRIC_CATALOG,
      ),
    ).toBe('Accounting software not connected');
    expect(
      summariseRule(
        ruleWithCondition('accountingSoftwareConnected', 'is_true'),
        METRIC_CATALOG,
      ),
    ).toBe('Accounting software connected');
    expect(
      summariseRule(
        ruleWithCondition('hasCreatedScheduledEmailTemplate', 'is_false'),
        METRIC_CATALOG,
      ),
    ).toBe('No scheduled email template created');
    expect(
      summariseRule(
        ruleWithCondition('hasCreatedScheduledEmailTemplate', 'is_true'),
        METRIC_CATALOG,
      ),
    ).toBe('Scheduled email template created');
  });

  it('keeps admin and client portal summaries distinct', () => {
    expect(
      summariseRule(ruleWithCondition('lastPortalSignInAt', 'is_empty'), METRIC_CATALOG),
    ).toBe('Never signed in as admin');
    expect(summariseRule(ruleWithCondition('hasPortalVisit', 'is_true'), METRIC_CATALOG)).toBe(
      'Client has visited the portal',
    );
    expect(summariseRule(ruleWithCondition('hasPortalVisit', 'is_false'), METRIC_CATALOG)).toBe(
      'No client portal visit',
    );
    expect(
      summariseRule(ruleWithCondition('hasPortalDocumentUpload', 'is_true'), METRIC_CATALOG),
    ).toBe('Client has uploaded a portal document');
    expect(
      summariseRule(ruleWithCondition('hasPortalDocumentUpload', 'is_false'), METRIC_CATALOG),
    ).toBe('No portal document uploaded');
    expect(
      summariseRule(
        {
          ...ruleWithCondition('daysSinceLastPortalVisit', 'gt'),
          rootGroup: {
            id: 'g',
            combinator: 'and',
            children: [
              { id: 'c', metricKey: 'daysSinceLastPortalVisit', operator: 'gt', value: 14 },
            ],
          },
        },
        METRIC_CATALOG,
      ),
    ).toBe('No portal visit for 14 days');
    expect(
      summariseRule(
        {
          ...ruleWithCondition('portalVisitCount', 'gte'),
          rootGroup: {
            id: 'g',
            combinator: 'and',
            children: [{ id: 'c', metricKey: 'portalVisitCount', operator: 'gte', value: 3 }],
          },
        },
        METRIC_CATALOG,
      ),
    ).toBe('Portal visit count at least 3');
    expect(
      summariseRule(
        {
          ...ruleWithCondition('portalDocumentUploadCount', 'eq'),
          rootGroup: {
            id: 'g',
            combinator: 'and',
            children: [
              { id: 'c', metricKey: 'portalDocumentUploadCount', operator: 'eq', value: 0 },
            ],
          },
        },
        METRIC_CATALOG,
      ),
    ).toBe('Portal document upload count is 0');
    expect(
      summariseRule(
        {
          ...ruleWithCondition('portalSignInCount', 'eq'),
          rootGroup: {
            id: 'g',
            combinator: 'and',
            children: [{ id: 'c', metricKey: 'portalSignInCount', operator: 'eq', value: 0 }],
          },
        },
        METRIC_CATALOG,
      ),
    ).toBe('Admin sign-in count is 0');
  });

  it('does not include metric catalogue descriptions', () => {
    for (const rule of RULE_FIXTURES) {
      const summary = summariseRule(rule, METRIC_CATALOG);
      const journey = summariseJourneyItem(rule, METRIC_CATALOG);
      for (const metric of METRIC_CATALOG) {
        if (!metric.description) {
          continue;
        }
        expect(summary).not.toContain(`(${metric.description})`);
        expect(journey.timing).not.toContain(`(${metric.description})`);
        expect(journey.eligibility).not.toContain(`(${metric.description})`);
      }
    }
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
      timing: 'When no admin sign-in for 14 days',
      eligibility: '',
    });
  });

  it('summarises announcement audience without using journey timing language', () => {
    expect(summariseAnnouncementAudience(fixture('rule_feature'), METRIC_CATALOG)).toBe(
      'Active customers',
    );
    expect(summariseTiming(fixture('rule_feature').timing)).toMatch(/^Send once .+ at \d{2}:\d{2}$/);
  });
});
