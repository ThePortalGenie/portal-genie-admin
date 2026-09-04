export const RULE_FILTER_ALL = 'all';
export const DEFAULT_RULE_LIST_FILTERS = {
    query: '',
    status: RULE_FILTER_ALL,
    category: RULE_FILTER_ALL,
};
export function ruleListCounts(rules) {
    return {
        total: rules.length,
        active: rules.filter((rule) => rule.status === 'active').length,
        disabled: rules.filter((rule) => rule.status === 'disabled').length,
    };
}
export function isRuleListFiltered(filters) {
    return (filters.query.trim() !== '' ||
        filters.status !== RULE_FILTER_ALL ||
        filters.category !== RULE_FILTER_ALL);
}
export function filterRules(rules, filters, templateNameById) {
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
        return [rule.name, rule.description, templateName].some((value) => value.toLowerCase().includes(query));
    });
}
