export const RULE_CATEGORIES = [
  'onboarding',
  'adoption',
  'engagement',
  'conversion',
  'announcement',
  'other',
] as const;

export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export type RuleCategoryOption = {
  id: RuleCategory;
  label: string;
};

export const RULE_CATEGORY_OPTIONS: readonly RuleCategoryOption[] = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'conversion', label: 'Conversion' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'other', label: 'Other' },
];

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = Object.fromEntries(
  RULE_CATEGORY_OPTIONS.map((option) => [option.id, option.label]),
) as Record<RuleCategory, string>;
