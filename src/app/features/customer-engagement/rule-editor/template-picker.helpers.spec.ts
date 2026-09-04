import { describe, expect, it } from 'vitest';
import { TEMPLATE_FIXTURES } from '../../../core/data/mock/fixtures/templates.fixture';
import { groupTemplatesForLibrary } from './template-picker.helpers';

describe('groupTemplatesForLibrary', () => {
  it('groups available templates by category', () => {
    const groups = groupTemplatesForLibrary(TEMPLATE_FIXTURES, '');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => group.templates.length > 0)).toBe(true);
    expect(groups.some((group) => group.templates.some((item) => item.id === 'setup-reminder'))).toBe(
      true,
    );
  });

  it('filters by name or purpose', () => {
    const groups = groupTemplatesForLibrary(TEMPLATE_FIXTURES, 'logo');
    const ids = groups.flatMap((group) => group.templates.map((item) => item.id));
    expect(ids).toContain('logo-branding-setup');
    expect(ids).not.toContain('welcome-onboarding');
  });
});
