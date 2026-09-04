import {
  ConditionDraft,
  isRuleConditionGroup,
  Rule,
  RuleDraft,
  RuleTiming,
} from '../models/rule.model';

export function newConditionId(): string {
  return crypto.randomUUID();
}

export function emptyConditionDraft(): ConditionDraft {
  return {
    id: newConditionId(),
    metricKey: '',
    operator: '',
    value: null,
  };
}

export function emptyRuleDraft(): RuleDraft {
  return {
    name: '',
    description: '',
    category: '',
    groupId: '',
    sequenceOrder: null,
    status: 'disabled',
    rootGroup: {
      id: newConditionId(),
      combinator: 'and',
      children: [emptyConditionDraft()],
    },
    templateId: '',
    timing: { mode: 'on_match' },
  };
}

export function draftFromRule(rule: Rule): RuleDraft {
  return {
    name: rule.name,
    description: rule.description,
    category: rule.category,
    groupId: rule.groupId,
    sequenceOrder: rule.sequenceOrder,
    status: rule.status,
    rootGroup: {
      id: rule.rootGroup.id,
      combinator: rule.rootGroup.combinator,
      children: flattenConditions(rule),
    },
    templateId: rule.templateId,
    timing: { ...rule.timing },
  };
}

export function ruleFromDraft(
  draft: RuleDraft,
  identity: { id: string; createdAt: string; updatedAt: string },
): Rule {
  if (draft.category === '') {
    throw new Error('Cannot persist a rule without a category');
  }
  if (!draft.groupId) {
    throw new Error('Cannot persist a rule without a rule group');
  }
  if (draft.sequenceOrder === null || draft.sequenceOrder < 1) {
    throw new Error('Cannot persist a rule without a sequence position');
  }

  return {
    id: identity.id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    groupId: draft.groupId,
    sequenceOrder: draft.sequenceOrder,
    status: draft.status,
    rootGroup: {
      id: draft.rootGroup.id,
      combinator: draft.rootGroup.combinator,
      children: draft.rootGroup.children.map((child) => ({
        id: child.id,
        metricKey: child.metricKey,
        operator: child.operator === '' ? 'eq' : child.operator,
        value: child.value,
      })),
    },
    templateId: draft.templateId,
    timing: persistTiming(draft.timing),
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  };
}

export function draftsAreEqual(left: RuleDraft, right: RuleDraft): boolean {
  return stableDraft(left) === stableDraft(right);
}

function flattenConditions(rule: Rule): ConditionDraft[] {
  return rule.rootGroup.children.flatMap((child) => {
    if (isRuleConditionGroup(child)) {
      return child.children.flatMap((nested) =>
        isRuleConditionGroup(nested)
          ? []
          : [
              {
                id: nested.id,
                metricKey: nested.metricKey,
                operator: nested.operator,
                value: nested.value,
              },
            ],
      );
    }
    return [
      {
        id: child.id,
        metricKey: child.metricKey,
        operator: child.operator,
        value: child.value,
      },
    ];
  });
}

function persistTiming(timing: RuleTiming): RuleTiming {
  if (timing.mode === 'on_match') {
    return { mode: 'on_match' };
  }
  if (timing.mode === 'scheduled_once') {
    return timing.scheduledAt
      ? { mode: 'scheduled_once', scheduledAt: timing.scheduledAt }
      : { mode: 'scheduled_once' };
  }
  return {
    mode: timing.mode,
    delayDays: timing.delayDays ?? 0,
    anchorMetricKey: timing.anchorMetricKey,
  };
}

function stableDraft(draft: RuleDraft): string {
  return JSON.stringify({
    name: draft.name,
    description: draft.description,
    category: draft.category,
    groupId: draft.groupId,
    sequenceOrder: draft.sequenceOrder,
    status: draft.status,
    combinator: draft.rootGroup.combinator,
    conditions: draft.rootGroup.children.map((child) => ({
      metricKey: child.metricKey,
      operator: child.operator,
      value: child.value,
    })),
    templateId: draft.templateId,
    timing: draft.timing,
  });
}
