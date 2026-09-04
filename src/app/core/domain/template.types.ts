export const COMMUNICATION_CATEGORIES = [
  'welcome',
  'onboarding',
  'setup',
  'branding',
  'folder_adoption',
  'document_adoption',
  'inactivity',
  'trial_reminder',
  'trial_expiry',
  'announcement',
  'milestone',
] as const;

export type CommunicationCategory = (typeof COMMUNICATION_CATEGORIES)[number];

export const COMMUNICATION_CATEGORY_LABELS: Record<CommunicationCategory, string> = {
  welcome: 'Welcome',
  onboarding: 'Onboarding',
  setup: 'Setup',
  branding: 'Branding / logo adoption',
  folder_adoption: 'Folder adoption',
  document_adoption: 'Document adoption',
  inactivity: 'Inactivity / re-engagement',
  trial_reminder: 'Trial reminders',
  trial_expiry: 'Trial expiry',
  announcement: 'Product / feature announcements',
  milestone: 'Customer milestones',
};

export type CommunicationTemplate = {
  id: string;
  name: string;
  category: CommunicationCategory;
  purpose: string;
  lifecycleStage: string;
  available: boolean;
};
