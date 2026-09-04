export const LOGICAL_OPERATORS = ['and', 'or'];
export const RULE_TIMING_MODES = ['on_match', 'days_after_date', 'days_before_date'];
export function isRuleConditionGroup(node) {
    return 'combinator' in node && 'children' in node;
}
