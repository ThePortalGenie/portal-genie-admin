import { describe, expect, it } from 'vitest';
import { METRIC_CATALOG } from '../../../core/domain/metric-catalog';
import { emptyConditionDraft } from './rule-draft.helpers';
import {
  authoringControlsForMetric,
  draftPartsFromEditorRows,
  editorRowsFromDraft,
  extraLifecycleIssues,
  type EditorConditionRow,
} from './lifecycle-authoring';

function metric(key: string) {
  const found = METRIC_CATALOG.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Missing metric ${key}`);
  }
  return found;
}

function row(partial: Partial<EditorConditionRow>): EditorConditionRow {
  return {
    id: partial.id ?? 'row',
    metricKey: partial.metricKey ?? '',
    operator: partial.operator ?? '',
    value: partial.value ?? null,
    offsetDays: partial.offsetDays ?? null,
    timingDirection: partial.timingDirection ?? '',
  };
}

describe('lifecycle authoring', () => {
  it('A: trial expiry 7 days before plus logo maps to timing, not an eligibility date condition', () => {
    const { children, timing } = draftPartsFromEditorRows(
      [
        row({
          id: 't',
          metricKey: 'trialExpiresAt',
          offsetDays: 7,
          timingDirection: 'before',
        }),
        row({
          id: 'l',
          metricKey: 'logoUploaded',
          operator: 'is_false',
        }),
      ],
      METRIC_CATALOG,
    );

    expect(timing).toEqual({
      mode: 'days_before_date',
      delayDays: 7,
      anchorMetricKey: 'trialExpiresAt',
    });
    expect(children).toEqual([
      { id: 'l', metricKey: 'logoUploaded', operator: 'is_false', value: null },
    ]);
  });

  it('B: trial expiry 0 days before is valid and means the expiry date itself', () => {
    const { timing } = draftPartsFromEditorRows(
      [
        row({
          metricKey: 'trialExpiresAt',
          offsetDays: 0,
          timingDirection: 'before',
        }),
      ],
      METRIC_CATALOG,
    );

    expect(timing).toEqual({
      mode: 'days_before_date',
      delayDays: 0,
      anchorMetricKey: 'trialExpiresAt',
    });
  });

  it('C: registration 3 days after plus logo maps to days after registration', () => {
    const { children, timing } = draftPartsFromEditorRows(
      [
        row({
          id: 'r',
          metricKey: 'registeredAt',
          offsetDays: 3,
          timingDirection: 'after',
        }),
        row({
          id: 'l',
          metricKey: 'logoUploaded',
          operator: 'is_false',
        }),
      ],
      METRIC_CATALOG,
    );

    expect(timing).toEqual({
      mode: 'days_after_date',
      delayDays: 3,
      anchorMetricKey: 'registeredAt',
    });
    expect(children.map((child) => child.metricKey)).toEqual(['logoUploaded']);
  });

  it('D: days since registration remains a duration condition, not lifecycle timing', () => {
    const { children, timing } = draftPartsFromEditorRows(
      [
        row({
          metricKey: 'daysSinceRegistration',
          operator: 'gte',
          value: 3,
        }),
      ],
      METRIC_CATALOG,
    );

    expect(timing).toEqual({ mode: 'on_match' });
    expect(children).toEqual([
      {
        id: 'row',
        metricKey: 'daysSinceRegistration',
        operator: 'gte',
        value: 3,
      },
    ]);
  });

  it('E: days since last portal sign-in does not require a timing object', () => {
    const { children, timing } = draftPartsFromEditorRows(
      [
        row({
          metricKey: 'daysSinceLastPortalSignIn',
          operator: 'gte',
          value: 14,
        }),
      ],
      METRIC_CATALOG,
    );

    expect(timing).toEqual({ mode: 'on_match' });
    expect(children[0]).toMatchObject({
      metricKey: 'daysSinceLastPortalSignIn',
      operator: 'gte',
      value: 14,
    });
  });

  it('F: company logo is a complete boolean condition', () => {
    const { children, timing } = draftPartsFromEditorRows(
      [row({ metricKey: 'logoUploaded', operator: 'is_false' })],
      METRIC_CATALOG,
    );
    expect(timing.mode).toBe('on_match');
    expect(children[0].operator).toBe('is_false');
    expect(authoringControlsForMetric(metric('logoUploaded'))).toEqual(['metric', 'booleanValue']);
  });

  it('G: trial status is a complete enum condition', () => {
    const { children } = draftPartsFromEditorRows(
      [row({ metricKey: 'trialStatus', operator: 'is', value: 'in_trial' })],
      METRIC_CATALOG,
    );
    expect(children[0]).toMatchObject({
      metricKey: 'trialStatus',
      operator: 'is',
      value: 'in_trial',
    });
    expect(authoringControlsForMetric(metric('trialStatus'))).toEqual([
      'metric',
      'operator',
      'enumValue',
    ]);
  });

  it('H: selecting any metric reveals every extra control required to finish it', () => {
    for (const item of METRIC_CATALOG) {
      const controls = authoringControlsForMetric(item);
      expect(controls[0]).toBe('metric');
      expect(controls.length).toBeGreaterThan(1);
    }

    expect(authoringControlsForMetric(metric('daysSinceRegistration'))).toEqual([
      'metric',
      'operator',
      'numberValue',
    ]);
    expect(authoringControlsForMetric(metric('trialExpiresAt'))).toEqual([
      'metric',
      'lifecycleDays',
      'lifecycleDirection',
    ]);
    expect(authoringControlsForMetric(metric('registeredAt'))).toEqual([
      'metric',
      'lifecycleDays',
      'lifecycleDirection',
    ]);
  });

  it('rehydrates a stored relative timing rule as a lifecycle condition row', () => {
    const rows = editorRowsFromDraft(
      {
        name: 'Logo',
        description: '',
        category: 'adoption',
        groupId: 'rg_adoption',
        sequenceOrder: 1,
        status: 'active',
        rootGroup: {
          id: 'g1',
          combinator: 'and',
          children: [{ id: 'c1', metricKey: 'logoUploaded', operator: 'is_false', value: null }],
        },
        templateId: 'logo-branding-setup',
        timing: { mode: 'days_after_date', delayDays: 3, anchorMetricKey: 'registeredAt' },
      },
      METRIC_CATALOG,
    );

    expect(rows[0]).toMatchObject({
      metricKey: 'registeredAt',
      offsetDays: 3,
      timingDirection: 'after',
    });
    expect(rows[1].metricKey).toBe('logoUploaded');
  });

  it('flags a second lifecycle date row instead of silently dropping it', () => {
    const issues = extraLifecycleIssues(
      [
        row({ id: 'a', metricKey: 'trialExpiresAt', offsetDays: 7, timingDirection: 'before' }),
        row({ id: 'b', metricKey: 'registeredAt', offsetDays: 3, timingDirection: 'after' }),
      ],
      METRIC_CATALOG,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('editor.rows.1.metricKey');
  });

  it('keeps an empty starter row when the draft has no conditions or timing', () => {
    const rows = editorRowsFromDraft(
      {
        name: '',
        description: '',
        category: '',
        groupId: '',
        sequenceOrder: null,
        status: 'disabled',
        rootGroup: { id: 'g', combinator: 'and', children: [emptyConditionDraft()] },
        templateId: '',
        timing: { mode: 'on_match' },
      },
      METRIC_CATALOG,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].metricKey).toBe('');
  });
});
