import { CustomerMetric } from '../../../core/domain/metric.types';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { LogicalOperator, RuleDraft } from '../models/rule.model';
import { summariseConditionLine, summariseTimingPhrase } from './rule-summary';

export type EditorRuleSummary = {
  whoLines: string[];
  combinator: LogicalOperator;
  whenText: string;
  whatText: string;
};

export function summariseRuleDraft(
  draft: RuleDraft,
  metrics: readonly CustomerMetric[],
  templates: readonly CommunicationTemplate[],
): EditorRuleSummary {
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const whoLines = draft.rootGroup.children
    .map((child) => summariseConditionLine(child, metricByKey.get(child.metricKey)))
    .filter((line) => line.length > 0);

  const template = templates.find((item) => item.id === draft.templateId);

  return {
    whoLines: whoLines.length > 0 ? whoLines : ['Conditions not set yet'],
    combinator: draft.rootGroup.combinator,
    whenText: summariseTimingPhrase(draft.timing),
    whatText: template ? `Send “${template.name}”` : 'No communication selected',
  };
}
