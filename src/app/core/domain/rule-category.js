export const RULE_CATEGORIES = [
    'onboarding',
    'adoption',
    'engagement',
    'conversion',
    'announcement',
    'other',
];
export const RULE_CATEGORY_OPTIONS = [
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'adoption', label: 'Adoption' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'conversion', label: 'Conversion' },
    { id: 'announcement', label: 'Announcement' },
    { id: 'other', label: 'Other' },
];
export const RULE_CATEGORY_LABELS = Object.fromEntries(RULE_CATEGORY_OPTIONS.map((option) => [option.id, option.label]));
