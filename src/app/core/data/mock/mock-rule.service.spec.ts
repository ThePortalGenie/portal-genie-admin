import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { MockRuleService } from './mock-rule.service';

describe('MockRuleService', () => {
  it('creates a disabled copy with a Copy suffix', async () => {
    const service = new MockRuleService();
    const rules = await firstValueFrom(service.list());
    const original = rules.find((rule) => rule.name === 'Trial — 7 Days Remaining');
    expect(original).toBeDefined();

    const copy = await firstValueFrom(service.duplicate(original!.id));

    expect(copy.id).not.toBe(original!.id);
    expect(copy.name).toBe('Trial — 7 Days Remaining (Copy)');
    expect(copy.status).toBe('disabled');
    expect(original?.status).toBe('active');
  });

  it('adds a further suffix when a Copy already exists', async () => {
    const service = new MockRuleService();
    const rules = await firstValueFrom(service.list());
    const original = rules.find((rule) => rule.name === 'Trial — 7 Days Remaining');

    await firstValueFrom(service.duplicate(original!.id));
    const second = await firstValueFrom(service.duplicate(original!.id));

    expect(second.name).toBe('Trial — 7 Days Remaining (Copy 2)');
    expect(second.status).toBe('disabled');
  });

  it('creates a new rule from a draft and lists it', async () => {
    const service = new MockRuleService();
    const created = await firstValueFrom(
      service.create({
        name: 'Brand new rule',
        description: '',
        category: 'other',
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
  });

  it('updates an existing rule', async () => {
    const service = new MockRuleService();
    const existing = (await firstValueFrom(service.list()))[0];
    const updated = await firstValueFrom(
      service.update(existing.id, {
        name: 'Renamed rule',
        description: existing.description,
        category: existing.category,
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
  });
});
