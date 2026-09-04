import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { TEMPLATE_FIXTURES } from '../../../core/data/mock/fixtures/templates.fixture';
import { emptyRuleDraft } from '../rule-editor/rule-draft.helpers';
import { previewRuleDraft } from './editor-summary';

describe('previewRuleDraft', () => {
  it('leads with lifecycle timing, then conditions, then the communication', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Trial reminder';
    draft.category = 'conversion';
    draft.groupId = 'rg_trial_onboarding';
    draft.sequenceOrder = 3;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'logoUploaded', operator: 'is_false', value: null },
    ];
    draft.timing = { mode: 'days_before_date', delayDays: 7, anchorMetricKey: 'trialExpiresAt' };
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.guidance).toBeNull();
    expect(preview.lines).toEqual([
      '7 days before a customer’s trial expires',
      'if they have not uploaded their company logo',
      'send “Setup reminder”.',
    ]);
  });

  it('reads a complete registration rule as a natural-language instruction', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Complete setup';
    draft.category = 'onboarding';
    draft.groupId = 'rg_trial_onboarding';
    draft.sequenceOrder = 2;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'trialStatus', operator: 'is', value: 'in_trial' },
      { id: '2', metricKey: 'logoUploaded', operator: 'is_false', value: null },
    ];
    draft.timing = { mode: 'days_after_date', delayDays: 3, anchorMetricKey: 'registeredAt' };
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.guidance).toBeNull();
    expect(preview.lines).toEqual([
      '3 days after a customer registers',
      'if they are in trial',
      'and they have not uploaded their company logo',
      'send “Setup reminder”.',
    ]);
  });

  it('uses OR wording when any condition may match', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Either path';
    draft.category = 'onboarding';
    draft.groupId = 'rg_adoption';
    draft.sequenceOrder = 1;
    draft.rootGroup.combinator = 'or';
    draft.rootGroup.children = [
      { id: '1', metricKey: 'hasCreatedFolder', operator: 'is_false', value: null },
      { id: '2', metricKey: 'hasUploadedDocument', operator: 'is_false', value: null },
    ];
    draft.templateId = 'first-folder-adoption';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines).toEqual([
      'When a customer has not created a folder',
      'or they have not uploaded a document',
      'send “First folder adoption”.',
    ]);
  });

  it('describes inactivity in everyday language', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Nudge';
    draft.category = 'engagement';
    draft.groupId = 'rg_engagement';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      {
        id: '1',
        metricKey: 'daysSinceLastPortalSignIn',
        operator: 'gt',
        value: 14,
      },
    ];
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe(
      'When a customer has not signed in as admin for 14 days',
    );
  });

  it('treats 0 days before trial expiry as the expiry date itself', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Expired';
    draft.category = 'conversion';
    draft.groupId = 'rg_trial_onboarding';
    draft.sequenceOrder = 6;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'trialStatus', operator: 'is', value: 'trial_expired' },
    ];
    draft.timing = { mode: 'days_before_date', delayDays: 0, anchorMetricKey: 'trialExpiresAt' };
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe('On trial expiry');
  });

  it('guides the next missing step when the rule is incomplete', () => {
    const draft = emptyRuleDraft();
    const unnamed = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(unnamed.guidance).toBe('This rule is incomplete. Give the rule a name.');

    draft.name = 'Welcome';
    const noCategory = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(noCategory.guidance).toBe('This rule is incomplete. Choose a purpose.');

    draft.category = 'onboarding';
    const noGroup = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(noGroup.guidance).toBe('This rule is incomplete. Choose a journey.');

    draft.groupId = 'rg_trial_onboarding';
    draft.sequenceOrder = 1;
    const noCondition = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(noCondition.guidance).toBe('This rule is incomplete. Add a customer condition.');

    draft.rootGroup.children = [
      { id: '1', metricKey: 'trialStatus', operator: 'is', value: 'in_trial' },
    ];
    const noTemplate = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(noTemplate.guidance).toBe(
      'This rule is incomplete. Choose a communication to finish the rule.',
    );
    expect(noTemplate.lines[0]).toBe('When a customer is in trial');
  });

  it('does not ask for a customer condition when lifecycle timing is set', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Trial reminder';
    draft.category = 'conversion';
    draft.groupId = 'rg_trial_onboarding';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [];
    draft.timing = { mode: 'days_before_date', delayDays: 7, anchorMetricKey: 'trialExpiresAt' };
    draft.templateId = 'trial-expiry-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.guidance).toBeNull();
    expect(preview.lines[0]).toBe('7 days before a customer’s trial expires');
  });

  it('describes accounting software connection in natural language', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Connect accounting';
    draft.category = 'onboarding';
    draft.groupId = 'rg_adoption';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'accountingSoftwareConnected', operator: 'is_false', value: null },
    ];
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe(
      'When a customer does not have accounting software connected',
    );
    expect(preview.lines.join(' ')).not.toContain('is_false');
  });

  it('describes scheduled email template creation in natural language', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Create template';
    draft.category = 'onboarding';
    draft.groupId = 'rg_adoption';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      {
        id: '1',
        metricKey: 'hasCreatedScheduledEmailTemplate',
        operator: 'is_false',
        value: null,
      },
    ];
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe(
      'When a customer has not created a scheduled email template',
    );
    expect(preview.lines.join(' ')).not.toContain('is_false');
  });

  it('describes client portal visits without using admin sign-in language', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Portal visit';
    draft.category = 'engagement';
    draft.groupId = 'rg_engagement';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'hasPortalVisit', operator: 'is_true', value: null },
    ];
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe('When a client has visited the portal');
    expect(preview.lines.join(' ')).not.toContain('admin');
    expect(preview.lines.join(' ')).not.toContain('signed in');
  });

  it('describes client portal document uploads separately from admin documents', () => {
    const draft = emptyRuleDraft();
    draft.name = 'Portal upload';
    draft.category = 'engagement';
    draft.groupId = 'rg_engagement';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'hasPortalDocumentUpload', operator: 'is_false', value: null },
    ];
    draft.templateId = 'setup-reminder';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.lines[0]).toBe('When a client has not uploaded a document to the portal');
  });

  it('describes portal visit recency and counts with duration and number operators', () => {
    const recency = emptyRuleDraft();
    recency.name = 'Quiet portal';
    recency.category = 'engagement';
    recency.groupId = 'rg_engagement';
    recency.sequenceOrder = 1;
    recency.rootGroup.children = [
      { id: '1', metricKey: 'daysSinceLastPortalVisit', operator: 'gt', value: 14 },
    ];
    recency.templateId = 'setup-reminder';
    expect(previewRuleDraft(recency, METRIC_CATALOG, TEMPLATE_FIXTURES).lines[0]).toBe(
      'When a client has not visited the portal for 14 days',
    );

    const count = emptyRuleDraft();
    count.name = 'Visit count';
    count.category = 'engagement';
    count.groupId = 'rg_engagement';
    count.sequenceOrder = 1;
    count.rootGroup.children = [
      { id: '1', metricKey: 'portalVisitCount', operator: 'gte', value: 3 },
    ];
    count.templateId = 'setup-reminder';
    expect(previewRuleDraft(count, METRIC_CATALOG, TEMPLATE_FIXTURES).lines[0]).toBe(
      'When portal visit count is at least 3',
    );

    const none = emptyRuleDraft();
    none.name = 'No uploads';
    none.category = 'engagement';
    none.groupId = 'rg_engagement';
    none.sequenceOrder = 1;
    none.rootGroup.children = [
      { id: '1', metricKey: 'portalDocumentUploadCount', operator: 'eq', value: 0 },
    ];
    none.templateId = 'setup-reminder';
    expect(previewRuleDraft(none, METRIC_CATALOG, TEMPLATE_FIXTURES).lines[0]).toBe(
      'When portal document upload count equals 0',
    );
  });

  it('describes a one-off announcement with its send date and audience', () => {
    const draft = emptyRuleDraft();
    draft.name = 'New Feature Available';
    draft.category = 'announcement';
    draft.groupId = 'rg_announcements';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'accountStatus', operator: 'is', value: 'active' },
    ];
    draft.timing = { mode: 'scheduled_once', scheduledAt: '2026-09-15T09:00:00+02:00' };
    draft.templateId = 'feature-announcement';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.guidance).toBeNull();
    expect(preview.lines[0]).toBe('Send “Feature announcement”');
    expect(preview.lines[1]).toMatch(/^once on .+ at \d{2}:\d{2}$/);
    expect(preview.lines[2]).toBe('to customers whose account is Active.');
    expect(preview.lines.join(' ')).not.toContain('scheduled');
    expect(preview.lines.join(' ')).not.toContain('delivered');
  });

  it('asks for a send date when an announcement is otherwise complete', () => {
    const draft = emptyRuleDraft();
    draft.name = 'New Feature Available';
    draft.category = 'announcement';
    draft.groupId = 'rg_announcements';
    draft.sequenceOrder = 1;
    draft.rootGroup.children = [
      { id: '1', metricKey: 'accountStatus', operator: 'is', value: 'active' },
    ];
    draft.timing = { mode: 'scheduled_once' };
    draft.templateId = 'feature-announcement';

    const preview = previewRuleDraft(draft, METRIC_CATALOG, TEMPLATE_FIXTURES);
    expect(preview.guidance).toBe('This rule is incomplete. Choose a send date and time.');
  });
});
