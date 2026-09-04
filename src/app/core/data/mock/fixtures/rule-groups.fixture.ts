import { RuleGroup } from '../../../domain/rule-group';

export const RULE_GROUP_FIXTURES: readonly RuleGroup[] = [
  {
    id: 'rg_trial_onboarding',
    name: 'Trial & Onboarding',
    description: 'Lifecycle communications from registration through trial expiry.',
    displayOrder: 1,
  },
  {
    id: 'rg_adoption',
    name: 'Adoption',
    description: 'Follow-on adoption after the first setup milestones.',
    displayOrder: 2,
  },
  {
    id: 'rg_engagement',
    name: 'Engagement',
    description: 'Re-engage customers who have gone quiet.',
    displayOrder: 3,
  },
  {
    id: 'rg_announcements',
    name: 'Announcements',
    description: 'One-off product and feature communications.',
    displayOrder: 4,
  },
];
