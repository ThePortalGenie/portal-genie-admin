import { RuleStatus } from '../../../core/domain/rule-status';
import { RuleTiming } from '../models/rule.model';

/**
 * A lifecycle offset relative to a single anchor, for display analysis only.
 * `days_after_date` is positive; `days_before_date` is negative; on-the-date is 0.
 * Does not change persisted RuleTiming and is not execution logic.
 */
export type NormalisedLifecycleTiming = {
  anchorMetricKey: string;
  offset: number;
};

export type SequenceAnalysable = {
  id: string;
  name: string;
  timing: RuleTiming;
  status?: RuleStatus;
};

export type SequenceConflict = {
  itemId: string;
  itemName: string;
  otherId: string;
  otherName: string;
  detail: string;
  suggestion: string;
};

/**
 * Normalise authored lifecycle timing for comparison.
 * Returns null when the timing is behavioural, incomplete, or otherwise not
 * safely comparable (including `on_match`).
 */
export function normaliseLifecycleTiming(timing: RuleTiming): NormalisedLifecycleTiming | null {
  if (timing.mode !== 'days_after_date' && timing.mode !== 'days_before_date') {
    return null;
  }

  const anchorMetricKey = timing.anchorMetricKey?.trim();
  if (!anchorMetricKey) {
    return null;
  }

  const days = timing.delayDays ?? 0;
  if (!Number.isFinite(days)) {
    return null;
  }

  const signed = timing.mode === 'days_before_date' ? -days : days;
  const offset = Object.is(signed, -0) ? 0 : signed;
  return { anchorMetricKey, offset };
}

export function isLifecycleComparable(timing: RuleTiming): boolean {
  return normaliseLifecycleTiming(timing) !== null;
}

/**
 * Compare items in display order. Conflicts are raised only when two items
 * share the same lifecycle anchor and a later-listed item would occur earlier.
 *
 * Different anchors (e.g. registration vs trial expiry) are not compared.
 * Behavioural / on-match rules are skipped so they cannot produce false conflicts.
 */
export function analyseSequence(items: readonly SequenceAnalysable[]): SequenceConflict[] {
  const normalised = items.map((item) => ({
    item,
    timing: normaliseLifecycleTiming(item.timing),
  }));

  const conflicts: SequenceConflict[] = [];

  for (let index = 0; index < normalised.length; index += 1) {
    const current = normalised[index];
    if (!current.timing) {
      continue;
    }

    let partner: (typeof normalised)[number] | undefined;
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = normalised[previousIndex];
      if (!previous.timing) {
        continue;
      }
      if (previous.timing.anchorMetricKey !== current.timing.anchorMetricKey) {
        continue;
      }
      if (previous.timing.offset > current.timing.offset) {
        partner = previous;
        break;
      }
    }

    if (!partner) {
      continue;
    }

    conflicts.push({
      itemId: current.item.id,
      itemName: current.item.name,
      otherId: partner.item.id,
      otherName: partner.item.name,
      detail: `This rule is positioned after '${partner.item.name}', but its timing indicates it would normally occur before it.`,
      suggestion: `Move this rule above '${partner.item.name}'.`,
    });
  }

  return conflicts;
}

export function conflictByItemId(
  conflicts: readonly SequenceConflict[],
): ReadonlyMap<string, SequenceConflict> {
  return new Map(conflicts.map((conflict) => [conflict.itemId, conflict]));
}

/**
 * Editor-facing conflict for the rule being positioned.
 * Copy always describes how to move this rule, never a sibling.
 */
export function conflictForCurrentRule(
  conflicts: readonly SequenceConflict[],
  currentId: string,
): SequenceConflict | null {
  const direct = conflicts.find((conflict) => conflict.itemId === currentId);
  if (direct) {
    return direct;
  }

  const inverse = conflicts.find((conflict) => conflict.otherId === currentId);
  if (!inverse) {
    return null;
  }

  return {
    itemId: currentId,
    itemName: inverse.otherName,
    otherId: inverse.itemId,
    otherName: inverse.itemName,
    detail: `This rule is positioned before '${inverse.itemName}', but its timing indicates it would normally occur after it.`,
    suggestion: `Move this rule below '${inverse.itemName}'.`,
  };
}
