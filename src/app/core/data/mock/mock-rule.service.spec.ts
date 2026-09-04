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

  it('toggles status without renaming the rule', async () => {
    const service = new MockRuleService();
    const updated = await firstValueFrom(service.setStatus('rule_document', 'active'));
    expect(updated.status).toBe('active');
    expect(updated.name).toBe('Upload Your First Document');
  });
});
