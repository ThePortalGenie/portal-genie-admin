export const NAV_DRAWER_MEDIA = '(max-width: 63.99rem)';

export type SidebarIcon = 'rules' | 'templates';

export type SidebarNavItem = {
  label: string;
  route: string;
  icon: SidebarIcon;
};

export const customerEngagementNav: readonly SidebarNavItem[] = [
  { label: 'Rules', route: '/engagement/rules', icon: 'rules' },
  { label: 'Templates', route: '/engagement/templates', icon: 'templates' },
];
