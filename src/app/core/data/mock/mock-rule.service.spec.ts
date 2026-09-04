import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { MockRuleService } from './mock-rule.service';

describe('MockRuleService', () => {
  it('creates a disabled copy with a Copy suffix', async () => {
    const service = new MockRuleService();
    const rules = await firstValueFrom(service.list());
    const original = rules.find((rule) => rule.name === '7 Days Left in Your Trial');
    expect(original).toBeDefined();

    const copy = await firstValueFrom(service.duplicate(original!.id));

    expect(copy.id).not.toBe(original!.id);
    expect(copy.name).toBe('7 Days Left in Your Trial (Copy)');
    expect(copy.status).toBe('disabled');
    expect(original?.status).toBe('active');
  });

  it('adds a further suffix when a Copy already exists', async () => {
    const service = new MockRuleService();
    const rules = await firstValueFrom(service.list());
    const original = rules.find((rule) => rule.name === '7 Days Left in Your Trial');

    await firstValueFrom(service.duplicate(original!.id));
    const second = await firstValueFrom(service.duplicate(original!.id));

    expect(second.name).toBe('7 Days Left in Your Trial (Copy 2)');
    expect(second.status).toBe('disabled');
  });

  it('creates a new rule from a draft and lists it', async () => {
    const service = new MockRuleService();
    const created = await firstValueFrom(
      service.create({
        name: 'Brand new rule',
        description: '',
        category: 'other',
        groupId: 'rg_announcements',
        sequenceOrder: 2,
        status: 'disabled',
        rootGroup: {
          id: 'g1',
          combinator: 'and',
          children: [{ id: 'c1', metricKey: 'trialStatus', operator: 'is', value: 'in_trial' }],
        },
        templateId: 'welcome-onboarding',
        timing: { mode: 'on_match' },
      }),
    );

    expect(created.status).toBe('disabled');
    expect(created.name).toBe('Brand new rule');
    const listed = await firstValueFrom(service.list());
    expect(listed[0]?.id).toBe(created.id);
    expect(created.groupId).toBe('rg_announcements');
    expect(created.sequenceOrder).toBe(2);
    const announcements = listed
      .filter((rule) => rule.groupId === 'rg_announcements')
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder);
    expect(announcements.map((rule) => rule.name)).toEqual([
      'New Feature Available',
      'Brand new rule',
      'Portal Genie Product Update',
    ]);
    expect(announcements.map((rule) => rule.sequenceOrder)).toEqual([1, 2, 3]);
  });

  it('updates an existing rule', async () => {
    const service = new MockRuleService();
    const existing = (await firstValueFrom(service.list()))[0];
    const updated = await firstValueFrom(
      service.update(existing.id, {
        name: 'Renamed rule',
        description: existing.description,
        category: existing.category,
        groupId: existing.groupId,
        sequenceOrder: existing.sequenceOrder,
        status: existing.status,
        rootGroup: {
          id: existing.rootGroup.id,
          combinator: existing.rootGroup.combinator,
          children: existing.rootGroup.children.map((child) =>
            'combinator' in child
              ? { id: child.id, metricKey: '', operator: '', value: null }
              : { id: child.id, metricKey: child.metricKey, operator: child.operator, value: child.value },
          ),
        },
        templateId: existing.templateId,
        timing: existing.timing,
      }),
    );

    expect(updated.id).toBe(existing.id);
    expect(updated.name).toBe('Renamed rule');
    expect(updated.createdAt).toBe(existing.createdAt);
    expect(updated.groupId).toBe(existing.groupId);
    expect(updated.sequenceOrder).toBe(existing.sequenceOrder);
  });

  it('keeps a duplicate in the same group at the end of the sequence', async () => {
    const service = new MockRuleService();
    const rules = await firstValueFrom(service.list());
    const original = rules.find((rule) => rule.name === 'Welcome to Portal Genie');
    expect(original?.groupId).toBe('rg_trial_onboarding');

    const copy = await firstValueFrom(service.duplicate(original!.id));
    expect(copy.groupId).toBe('rg_trial_onboarding');
    expect(copy.sequenceOrder).toBeGreaterThan(original!.sequenceOrder);
    const groupMax = Math.max(
      ...rules
        .filter((rule) => rule.groupId === 'rg_trial_onboarding')
        .map((rule) => rule.sequenceOrder),
    );
    expect(copy.sequenceOrder).toBe(groupMax + 1);
  });
});
