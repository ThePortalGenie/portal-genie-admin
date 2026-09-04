import { RuleCategory } from '../../../core/domain/rule-category';
import { RuleStatus } from '../../../core/domain/rule-status';
import { Rule } from '../models/rule.model';

export const RULE_FILTER_ALL = 'all' as const;

export type RuleStatusFilter = typeof RULE_FILTER_ALL | RuleStatus;
export type RuleCategoryFilter = typeof RULE_FILTER_ALL | RuleCategory;

export type RuleListFilters = {
  query: string;
  status: RuleStatusFilter;
  category: RuleCategoryFilter;
};

export const DEFAULT_RULE_LIST_FILTERS: RuleListFilters = {
  query: '',
  status: RULE_FILTER_ALL,
  category: RULE_FILTER_ALL,
};

export type RuleListCounts = {
  total: number;
  active: number;
  disabled: number;
};

export function ruleListCounts(rules: readonly Rule[]): RuleListCounts {
  return {
    total: rules.length,
    active: rules.filter((rule) => rule.status === 'active').length,
    disabled: rules.filter((rule) => rule.status === 'disabled').length,
  };
}

export function isRuleListFiltered(filters: RuleListFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== RULE_FILTER_ALL ||
    filters.category !== RULE_FILTER_ALL
  );
}

export function filterRules(
  rules: readonly Rule[],
  filters: RuleListFilters,
  templateNameById: ReadonlyMap<string, string>,
): Rule[] {
  const query = filters.query.trim().toLowerCase();

  return rules.filter((rule) => {
    if (filters.status !== RULE_FILTER_ALL && rule.status !== filters.status) {
      return false;
    }
    if (filters.category !== RULE_FILTER_ALL && rule.category !== filters.category) {
      return false;
    }
    if (!query) {
      return true;
    }

    const templateName = templateNameById.get(rule.templateId) ?? '';
    return [rule.name, rule.description, templateName].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}
