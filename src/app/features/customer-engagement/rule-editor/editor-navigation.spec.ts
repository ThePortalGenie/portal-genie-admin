import { describe, expect, it } from 'vitest';
import { RULE_FIXTURES } from '../../../core/data/mock/fixtures/rules.fixture';
import {
  editorReturnCommands,
  editorReturnContext,
  editorReturnQueryParams,
  ruleHasGlobalSequenceOrder,
} from './editor-navigation';

function query(values: Record<string, string | null>) {
  return {
    get(name: string): string | null {
      return name in values ? values[name] : null;
    },
  };
}

describe('editorReturnContext', () => {
  it('returns to the global journey when that is where the administrator came from', () => {
    const context = editorReturnContext(query({ fromJourney: '1', fromGroup: 'rg_adoption' }));
    expect(context.fromJourney).toBe(true);
    expect(editorReturnCommands(context)).toEqual(['/engagement/rules/journey']);
    expect(editorReturnQueryParams(context)).toEqual({ fromJourney: '1' });
  });

  it('returns to a rule group when opened from a group page', () => {
    const context = editorReturnContext(query({ fromGroup: 'rg_trial_onboarding' }));
    expect(context.fromJourney).toBe(false);
    expect(editorReturnCommands(context)).toEqual([
      '/engagement/rules/group',
      'rg_trial_onboarding',
    ]);
  });

  it('returns to the rules list by default', () => {
    expect(editorReturnCommands(editorReturnContext(query({})))).toEqual(['/engagement/rules']);
  });
});

describe('ruleHasGlobalSequenceOrder', () => {
  it('confirms rules have no second global sequence field', () => {
    expect(ruleHasGlobalSequenceOrder(RULE_FIXTURES[0]!)).toBe(false);
  });
});
