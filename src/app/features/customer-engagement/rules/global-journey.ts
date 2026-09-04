import { CustomerMetric } from '../../../core/domain/metric.types';
import { RULE_CATEGORY_LABELS } from '../../../core/domain/rule-category';
import { ANNOUNCEMENTS_GROUP_ID, RuleGroup } from '../../../core/domain/rule-group';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { Rule } from '../models/rule.model';
import { summariseJourneyItem } from '../validation/rule-summary';
import { RULE_FILTER_ALL, RuleStatusFilter, ruleListCounts, RuleListCounts } from './rule-list.filters';
import {
  analyseSequence,
  NormalisedLifecycleTiming,
  normaliseLifecycleTiming,
  SequenceConflict,
} from './sequence-analysis';

export { ANNOUNCEMENTS_GROUP_ID };

/**
 * Automated lifecycle groups shown on the global journey.
 * Announcements are excluded: they are one-off product communications.
 * This is not a RuleGroup and must not be given a groupId.
 */
export const AUTOMATED_JOURNEY_GROUP_IDS = [
  'rg_trial_onboarding',
  'rg_adoption',
  'rg_engagement',
] as const;

export const GLOBAL_JOURNEY_PATH = '/engagement/rules/journey';

export type GlobalJourneyGroupId = (typeof AUTOMATED_JOURNEY_GROUP_IDS)[number];

export type GlobalJourneyPhase = 'registration' | 'trial_expiry' | 'other_lifecycle' | 'behaviour';

export type GlobalJourneyFilters = {
  query: string;
  status: RuleStatusFilter;
  groupId: typeof RULE_FILTER_ALL | string;
};

export const DEFAULT_GLOBAL_JOURNEY_FILTERS: GlobalJourneyFilters = {
  query: '',
  status: RULE_FILTER_ALL,
  groupId: RULE_FILTER_ALL,
};

export type CommunicationCluster = {
  key: string;
  anchorMetricKey: string;
  offset: number;
  ruleIds: readonly string[];
  names: readonly string[];
  title: string;
  detail: string;
};

export type GlobalJourneyItem = {
  rule: Rule;
  groupName: string;
  categoryLabel: string;
  timingLabel: string;
  eligibility: string;
  templateName: string;
  indexLabel: string;
  deterministic: boolean;
  phase: GlobalJourneyPhase;
  conflict: SequenceConflict | null;
  conflictDetail: string | null;
  cluster: CommunicationCluster | null;
};

export type GlobalJourneySection = {
  id: GlobalJourneyPhase;
  title: string;
  lead: string;
  items: GlobalJourneyItem[];
};

export type GlobalJourneyView = {
  counts: RuleListCounts;
  span: string;
  sections: GlobalJourneySection[];
  items: GlobalJourneyItem[];
};

export type GlobalJourneyOverview = RuleListCounts & {
  span: string;
};

const SECTION_COPY: Record<GlobalJourneyPhase, { title: string; lead: string }> = {
  registration: {
    title: 'Registration',
    lead: 'Communications with a known offset from registration.',
  },
  trial_expiry: {
    title: 'Trial expiry',
    lead: 'Communications with a known offset from trial expiry.',
  },
  other_lifecycle: {
    title: 'Other lifecycle dates',
    lead: 'Communications with a known offset from another lifecycle date.',
  },
  behaviour: {
    title: 'When conditions become true',
    lead: 'Timing depends on customer behaviour. These are not placed on a calendar day.',
  },
};

export function isAutomatedJourneyGroup(groupId: string): boolean {
  return (AUTOMATED_JOURNEY_GROUP_IDS as readonly string[]).includes(groupId);
}

export function rulesForGlobalJourney(rules: readonly Rule[]): Rule[] {
  return rules.filter((rule) => isAutomatedJourneyGroup(rule.groupId));
}

export function globalJourneyOverview(rules: readonly Rule[]): GlobalJourneyOverview {
  const members = rulesForGlobalJourney(rules);
  return {
    ...ruleListCounts(members),
    span: globalJourneySpan(members),
  };
}

export function globalJourneySpan(rules: readonly Rule[]): string {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const rule of orderRulesForGlobalJourney(rules, [])) {
    const label = spanLabel(rule);
    if (!label || seen.has(label)) {
      continue;
    }
    seen.add(label);
    labels.push(label);
  }

  return labels.join(' → ');
}

export function phaseForRule(rule: Rule): GlobalJourneyPhase {
  const timing = normaliseLifecycleTiming(rule.timing);
  if (!timing) {
    return 'behaviour';
  }
  if (timing.anchorMetricKey === 'registeredAt') {
    return 'registration';
  }
  if (timing.anchorMetricKey === 'trialExpiresAt') {
    return 'trial_expiry';
  }
  return 'other_lifecycle';
}

export function isDeterministicLifecycle(rule: Rule): boolean {
  return normaliseLifecycleTiming(rule.timing) !== null;
}

export function orderRulesForGlobalJourney(
  rules: readonly Rule[],
  groups: readonly RuleGroup[],
): Rule[] {
  const groupRank = new Map(groups.map((group) => [group.id, group.displayOrder]));

  return [...rulesForGlobalJourney(rules)].sort((left, right) => {
    const leftPhase = phaseRank(phaseForRule(left));
    const rightPhase = phaseRank(phaseForRule(right));
    if (leftPhase !== rightPhase) {
      return leftPhase - rightPhase;
    }

    const leftTiming = normaliseLifecycleTiming(left.timing);
    const rightTiming = normaliseLifecycleTiming(right.timing);
    if (leftTiming && rightTiming && leftTiming.offset !== rightTiming.offset) {
      return leftTiming.offset - rightTiming.offset;
    }

    const leftGroup = groupRank.get(left.groupId) ?? Number.MAX_SAFE_INTEGER;
    const rightGroup = groupRank.get(right.groupId) ?? Number.MAX_SAFE_INTEGER;
    if (leftGroup !== rightGroup) {
      return leftGroup - rightGroup;
    }

    if (left.sequenceOrder !== right.sequenceOrder) {
      return left.sequenceOrder - right.sequenceOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function filterGlobalJourneyRules(
  rules: readonly Rule[],
  filters: GlobalJourneyFilters,
  templateNameById: ReadonlyMap<string, string>,
): Rule[] {
  const query = filters.query.trim().toLowerCase();

  return rules.filter((rule) => {
    if (!isAutomatedJourneyGroup(rule.groupId)) {
      return false;
    }
    if (filters.status !== RULE_FILTER_ALL && rule.status !== filters.status) {
      return false;
    }
    if (filters.groupId !== RULE_FILTER_ALL && rule.groupId !== filters.groupId) {
      return false;
    }
    if (!query) {
      return true;
    }

    const templateName = templateNameById.get(rule.templateId) ?? '';
    return [rule.name, rule.description, templateName].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}

export function isGlobalJourneyFiltered(filters: GlobalJourneyFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== RULE_FILTER_ALL ||
    filters.groupId !== RULE_FILTER_ALL
  );
}

/**
 * Exact same lifecycle offset on the same anchor, among ACTIVE rules only.
 * Disabled rules never create a customer-contact cluster warning.
 */
export function findCommunicationClusters(rules: readonly Rule[]): CommunicationCluster[] {
  const buckets = new Map<string, { timing: NormalisedLifecycleTiming; members: Rule[] }>();

  for (const rule of rules) {
    if (rule.status !== 'active') {
      continue;
    }
    const timing = normaliseLifecycleTiming(rule.timing);
    if (!timing) {
      continue;
    }
    const key = clusterKey(timing);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.members.push(rule);
    } else {
      buckets.set(key, { timing, members: [rule] });
    }
  }

  const clusters: CommunicationCluster[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.members.length < 2) {
      continue;
    }
    const names = bucket.members.map((rule) => rule.name);
    clusters.push({
      key,
      anchorMetricKey: bucket.timing.anchorMetricKey,
      offset: bucket.timing.offset,
      ruleIds: bucket.members.map((rule) => rule.id),
      names,
      title: `${bucket.members.length} communications may occur on the same lifecycle day.`,
      detail: clusterDetail(names, bucket.timing),
    });
  }

  return clusters;
}

export function describeLifecycleDay(timing: NormalisedLifecycleTiming): string {
  const anchor =
    timing.anchorMetricKey === 'registeredAt'
      ? 'registration'
      : timing.anchorMetricKey === 'trialExpiresAt'
        ? 'trial expiry'
        : 'the selected date';

  if (timing.offset === 0) {
    return anchor === 'trial expiry' ? 'on trial expiry' : `on ${anchor}`;
  }

  if (timing.offset > 0 && anchor === 'registration') {
    return `on day ${timing.offset} after registration`;
  }

  const abs = Math.abs(timing.offset);
  const dayLabel = abs === 1 ? '1 day' : `${abs} days`;
  const direction = timing.offset < 0 ? 'before' : 'after';
  return `${dayLabel} ${direction} ${anchor}`;
}

export function globalSequenceConflictDetail(conflict: SequenceConflict): string {
  return `${conflict.itemName} is positioned after ${conflict.otherName}, but its timing indicates it would normally occur earlier.`;
}

export function buildGlobalJourney(input: {
  rules: readonly Rule[];
  groups: readonly RuleGroup[];
  metrics: readonly CustomerMetric[];
  templates: readonly CommunicationTemplate[];
  filters?: GlobalJourneyFilters;
}): GlobalJourneyView {
  const filters = input.filters ?? DEFAULT_GLOBAL_JOURNEY_FILTERS;
  const templateNameById = new Map(input.templates.map((template) => [template.id, template.name]));
  const included = rulesForGlobalJourney(input.rules);
  const visible = orderRulesForGlobalJourney(
    filterGlobalJourneyRules(included, filters, templateNameById),
    input.groups,
  );
  const clusters = findCommunicationClusters(visible);
  const clusterByRuleId = new Map<string, CommunicationCluster>();
  for (const cluster of clusters) {
    for (const ruleId of cluster.ruleIds) {
      clusterByRuleId.set(ruleId, cluster);
    }
  }

  const conflicts = analyseSequence(visible);
  const conflictById = new Map(conflicts.map((conflict) => [conflict.itemId, conflict]));
  const groupNames = new Map(input.groups.map((group) => [group.id, group.name]));

  const items: GlobalJourneyItem[] = visible.map((rule, index) => {
    const summary = summariseJourneyItem(rule, input.metrics);
    const conflict = conflictById.get(rule.id) ?? null;
    const deterministic = isDeterministicLifecycle(rule);
    return {
      rule,
      groupName: groupNames.get(rule.groupId) ?? 'Ungrouped',
      categoryLabel: RULE_CATEGORY_LABELS[rule.category] ?? rule.category,
      timingLabel: summary.timing,
      eligibility: summary.eligibility,
      templateName: templateNameById.get(rule.templateId) ?? 'Unknown template',
      indexLabel: String(index + 1).padStart(2, '0'),
      deterministic,
      phase: phaseForRule(rule),
      conflict,
      conflictDetail: conflict ? globalSequenceConflictDetail(conflict) : null,
      cluster: clusterByRuleId.get(rule.id) ?? null,
    };
  });

  return {
    counts: ruleListCounts(included),
    span: globalJourneySpan(included),
    items,
    sections: sectionsFromItems(items),
  };
}

function sectionsFromItems(items: readonly GlobalJourneyItem[]): GlobalJourneySection[] {
  const order: GlobalJourneyPhase[] = [
    'registration',
    'trial_expiry',
    'other_lifecycle',
    'behaviour',
  ];
  return order
    .map((id) => {
      const sectionItems = items.filter((item) => item.phase === id);
      return {
        id,
        title: SECTION_COPY[id].title,
        lead: SECTION_COPY[id].lead,
        items: sectionItems,
      };
    })
    .filter((section) => section.items.length > 0);
}

function phaseRank(phase: GlobalJourneyPhase): number {
  switch (phase) {
    case 'registration':
      return 0;
    case 'trial_expiry':
      return 1;
    case 'other_lifecycle':
      return 2;
    default:
      return 3;
  }
}

function clusterKey(timing: NormalisedLifecycleTiming): string {
  return `${timing.anchorMetricKey}:${timing.offset}`;
}

function clusterDetail(names: readonly string[], timing: NormalisedLifecycleTiming): string {
  const day = describeLifecycleDay(timing);
  if (names.length === 2) {
    return `This customer could receive both ${names[0]} and ${names[1]} ${day}.`;
  }
  const head = names.slice(0, -1).join(', ');
  return `This customer could receive ${head} and ${names[names.length - 1]} ${day}.`;
}

function spanLabel(rule: Rule): string | null {
  const timing = normaliseLifecycleTiming(rule.timing);
  if (timing?.anchorMetricKey === 'registeredAt') {
    return 'Registration';
  }
  if (timing?.anchorMetricKey === 'trialExpiresAt') {
    return 'Trial expiry';
  }
  if (phaseForRule(rule) === 'behaviour') {
    return 'Behaviour';
  }
  return null;
}
