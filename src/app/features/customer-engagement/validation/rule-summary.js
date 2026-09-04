import { isRuleConditionGroup, } from '../models/rule.model';
const TIMING_ANCHOR_LABELS = {
    registeredAt: 'registration',
    trialExpiresAt: 'trial expiry',
};
/**
 * Informational one-line summary for the rules table.
 * Does not evaluate whether a customer would match.
 */
export function summariseRule(rule, metrics) {
    const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
    const timingText = summariseTiming(rule.timing);
    const conditionText = summariseGroup(rule.rootGroup, metricByKey, rule.timing);
    return [timingText, conditionText].filter((part) => part.length > 0).join(' · ');
}
export function summariseTiming(timing) {
    if (timing.mode === 'on_match') {
        return '';
    }
    const days = timing.delayDays ?? 0;
    const anchor = TIMING_ANCHOR_LABELS[timing.anchorMetricKey ?? ''] ?? 'the selected date';
    const direction = timing.mode === 'days_before_date' ? 'before' : 'after';
    if (days === 0) {
        return anchor === 'trial expiry' ? 'On trial expiry' : `On ${anchor}`;
    }
    const dayLabel = days === 1 ? '1 day' : `${days} days`;
    return `${dayLabel} ${direction} ${anchor}`;
}
function summariseGroup(group, metricByKey, timing) {
    const parts = group.children
        .map((child) => {
        if (isRuleConditionGroup(child)) {
            return summariseGroup(child, metricByKey, timing);
        }
        if (shouldOmitCondition(child, timing)) {
            return '';
        }
        return summariseCondition(child, metricByKey.get(child.metricKey));
    })
        .filter((part) => part.length > 0);
    const joiner = group.combinator === 'or' ? ' or ' : ' · ';
    return parts.join(joiner);
}
function shouldOmitCondition(condition, timing) {
    const isRelativeTiming = timing.mode === 'days_after_date' || timing.mode === 'days_before_date';
    if (isRelativeTiming &&
        timing.anchorMetricKey === 'registeredAt' &&
        condition.metricKey === 'daysSinceRegistration') {
        return true;
    }
    if (isRelativeTiming &&
        timing.anchorMetricKey === 'trialExpiresAt' &&
        condition.metricKey === 'trialStatus') {
        return true;
    }
    return false;
}
function summariseCondition(condition, metric) {
    if (!metric) {
        return condition.metricKey;
    }
    if (condition.operator === 'is_true' || condition.operator === 'is_false') {
        return summariseBoolean(condition.metricKey, condition.operator, metric.displayName);
    }
    if (condition.operator === 'is' || condition.operator === 'is_not') {
        const enumLabel = metric.enumValues?.find((item) => item.value === condition.value)?.label ??
            String(condition.value ?? '');
        if (condition.operator === 'is_not') {
            return `Not ${enumLabel.toLowerCase()}`;
        }
        if (condition.metricKey === 'accountStatus') {
            return `Account is ${enumLabel.toLowerCase()}`;
        }
        return enumLabel;
    }
    if (condition.operator === 'is_empty') {
        if (condition.metricKey === 'lastPortalSignInAt') {
            return 'Never signed in to the portal';
        }
        return `${metric.displayName} not set`;
    }
    if (condition.metricKey === 'daysSinceLastPortalSignIn' && isAtLeastOperator(condition.operator)) {
        const days = numericValue(condition.value);
        return days === null ? metric.displayName : `No portal sign-in for ${days} days`;
    }
    return summariseNumeric(metric.displayName, condition.operator, condition.value);
}
function summariseBoolean(metricKey, operator, displayName) {
    const isYes = operator === 'is_true';
    switch (metricKey) {
        case 'logoUploaded':
            return isYes ? 'Logo uploaded' : 'Logo not uploaded';
        case 'hasCreatedFolder':
            return isYes ? 'Has created a folder' : 'No folder created';
        case 'hasUploadedDocument':
            return isYes ? 'Has uploaded a document' : 'No documents uploaded';
        default:
            return isYes ? displayName : `${displayName}: no`;
    }
}
function isAtLeastOperator(operator) {
    return operator === 'gte' || operator === 'gt';
}
function summariseNumeric(displayName, operator, value) {
    if (operator === 'between' && isRange(value)) {
        return `${displayName} between ${value.min} and ${value.max}`;
    }
    const amount = numericValue(value);
    if (amount === null) {
        return displayName;
    }
    switch (operator) {
        case 'eq':
            return `${displayName} is ${amount}`;
        case 'gt':
            return `${displayName} greater than ${amount}`;
        case 'gte':
            return `${displayName} at least ${amount}`;
        case 'lt':
            return `${displayName} less than ${amount}`;
        case 'lte':
            return `${displayName} at most ${amount}`;
        default:
            return displayName;
    }
}
function numericValue(value) {
    return typeof value === 'number' ? value : null;
}
function isRange(value) {
    return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}
