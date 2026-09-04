import { CustomerMetric, MetricOperator } from '../../../core/domain/metric.types';
import { isAnnouncementGroup } from '../../../core/domain/rule-group';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { ConditionValue, RuleDraft, RuleTiming } from '../models/rule.model';
import { formatScheduledLong } from '../rules/announcement-schedule';

export type RulePreview = {
  isReadable: boolean;
  lines: string[];
  guidance: string | null;
};

export function previewRuleDraft(
  draft: RuleDraft,
  metrics: readonly CustomerMetric[],
  templates: readonly CommunicationTemplate[],
): RulePreview {
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const timingLine = previewTimingSentence(draft.timing);
  const clauses = draft.rootGroup.children
    .map((child, index) =>
      previewCondition(child, metricByKey.get(child.metricKey), index === 0 && !timingLine),
    )
    .filter((clause) => clause.length > 0);
  const template = templates.find((item) => item.id === draft.templateId);
  const guidance = incompleteGuidance(draft, clauses.length > 0, Boolean(template));

  if (draft.timing.mode === 'scheduled_once') {
    return {
      isReadable: clauses.length > 0 || Boolean(draft.timing.scheduledAt) || Boolean(template),
      lines: previewAnnouncement(draft.timing.scheduledAt, clauses, template, draft.rootGroup.combinator),
      guidance,
    };
  }

  if (clauses.length === 0 && !timingLine) {
    return { isReadable: false, lines: [], guidance };
  }

  const joiner = draft.rootGroup.combinator === 'or' ? 'or' : 'and';
  const lines: string[] = [];

  if (timingLine) {
    lines.push(timingLine);
    clauses.forEach((clause, index) => {
      lines.push(index === 0 ? `if ${clause}` : `${joiner} ${clause}`);
    });
  } else {
    clauses.forEach((clause, index) => {
      lines.push(index === 0 ? `When ${clause}` : `${joiner} ${clause}`);
    });
  }

  if (template) {
    lines.push(`send “${template.name}”.`);
  }

  return {
    isReadable: true,
    lines,
    guidance,
  };
}

function incompleteGuidance(
  draft: RuleDraft,
  hasCondition: boolean,
  hasTemplate: boolean,
): string | null {
  if (!draft.name.trim()) {
    return 'This rule is incomplete. Give the rule a name.';
  }
  if (!draft.category) {
    return 'This rule is incomplete. Choose a purpose.';
  }
  if (!draft.groupId) {
    return 'This rule is incomplete. Choose a journey.';
  }
  if (!hasCondition && (isAnnouncementGroup(draft.groupId) || !hasLifecycleTiming(draft.timing))) {
    return 'This rule is incomplete. Add a customer condition.';
  }
  if (isAnnouncementGroup(draft.groupId) && !draft.timing.scheduledAt) {
    return 'This rule is incomplete. Choose a send date and time.';
  }
  if (!hasTemplate) {
    return 'This rule is incomplete. Choose a communication to finish the rule.';
  }
  return null;
}

function hasLifecycleTiming(timing: RuleTiming): boolean {
  return timing.mode === 'days_after_date' || timing.mode === 'days_before_date';
}

function previewTimingSentence(timing: RuleTiming): string {
  if (timing.mode === 'on_match' || timing.mode === 'scheduled_once') {
    return '';
  }

  const days = timing.delayDays ?? 0;
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  const anchor = timing.anchorMetricKey;
  const before = timing.mode === 'days_before_date';

  if (anchor === 'trialExpiresAt') {
    if (days === 0) {
      return 'On trial expiry';
    }
    return `${dayLabel} ${before ? 'before' : 'after'} a customer’s trial expires`;
  }

  if (anchor === 'registeredAt') {
    if (days === 0) {
      return 'On registration';
    }
    return `${dayLabel} after a customer registers`;
  }

  if (!anchor) {
    return '';
  }

  if (days === 0) {
    return `on the selected date`;
  }
  return `${dayLabel} ${before ? 'before' : 'after'} the selected date`;
}

function previewAnnouncement(
  scheduledAt: string | undefined,
  clauses: string[],
  template: CommunicationTemplate | undefined,
  combinator: 'and' | 'or',
): string[] {
  const lines: string[] = [];
  if (template) {
    lines.push(`Send “${template.name}”`);
  }
  if (scheduledAt) {
    lines.push(`once on ${formatScheduledLong(scheduledAt)}`);
  }
  if (clauses.length > 0) {
    const joiner = combinator === 'or' ? ' or ' : ' and ';
    const audience = clauses
      .map((clause, index) => announcementAudienceClause(clause, index === 0))
      .join(joiner);
    lines.push(`to customers ${audience}.`);
  }
  return lines;
}

function announcementAudienceClause(clause: string, first: boolean): string {
  if (clause.startsWith('a customer’s account is ')) {
    const status = clause.slice('a customer’s account is '.length);
    return `whose account is ${capitalizeStatus(status)}`;
  }
  if (clause.startsWith('their account is ')) {
    const status = clause.slice('their account is '.length);
    return first ? `whose account is ${capitalizeStatus(status)}` : `whose account is ${capitalizeStatus(status)}`;
  }
  if (clause.startsWith('a customer ')) {
    return `who ${clause.slice('a customer '.length)}`;
  }
  if (clause.startsWith('they ')) {
    return `who ${clause.slice('they '.length)}`;
  }
  return clause;
}

function capitalizeStatus(status: string): string {
  if (!status) {
    return status;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function previewCondition(
  condition: { metricKey: string; operator: string; value: ConditionValue },
  metric: CustomerMetric | undefined,
  lead: boolean,
): string {
  if (!condition.metricKey || !condition.operator) {
    return '';
  }

  const operator = condition.operator as MetricOperator;

  switch (condition.metricKey) {
    case 'trialStatus':
      return previewTrialStatus(operator, condition.value, lead);
    case 'accountStatus':
      return previewAccountStatus(operator, condition.value, metric, lead);
    case 'logoUploaded':
      return previewBooleanAction(
        operator,
        lead ? 'a customer' : 'they',
        'uploaded their company logo',
      );
    case 'accountingSoftwareConnected':
      return previewAccountingConnection(operator, lead);
    case 'hasCreatedFolder':
      return previewBooleanAction(operator, lead ? 'a customer' : 'they', 'created a folder');
    case 'hasUploadedDocument':
      return previewBooleanAction(operator, lead ? 'a customer' : 'they', 'uploaded a document');
    case 'hasCreatedScheduledEmailTemplate':
      return previewBooleanAction(
        operator,
        lead ? 'a customer' : 'they',
        'created a scheduled email template',
      );
    case 'hasPortalVisit':
      return previewClientBoolean(operator, 'visited the portal');
    case 'hasPortalDocumentUpload':
      return previewClientBoolean(operator, 'uploaded a document to the portal');
    case 'lastPortalSignInAt':
      return operator === 'is_empty'
        ? lead
          ? 'a customer has never signed in as admin'
          : 'they have never signed in as admin'
        : '';
    case 'lastDocumentUploadedAt':
      return operator === 'is_empty'
        ? lead
          ? 'a customer has no last document upload'
          : 'they have no last document upload'
        : '';
    case 'lastPortalDocumentUploadedAt':
      return operator === 'is_empty'
        ? 'a client has not uploaded a document to the portal'
        : '';
    case 'daysSinceLastPortalSignIn':
      return previewDaysSinceActivity(operator, condition.value, lead, {
        gteLead: (days) => `a customer has not signed in as admin for ${days} days`,
        gteFollow: (days) => `they have not signed in as admin for ${days} days`,
        eqLead: (days) => `a customer’s last admin sign-in was ${days} days ago`,
        eqFollow: (days) => `their last admin sign-in was ${days} days ago`,
        subjectLead: 'a customer’s last admin sign-in',
        subjectFollow: 'their last admin sign-in',
      });
    case 'daysSinceLastDocumentUpload':
      return previewDaysSinceActivity(operator, condition.value, lead, {
        gteLead: (days) => `a customer has not uploaded a document for ${days} days`,
        gteFollow: (days) => `they have not uploaded a document for ${days} days`,
        eqLead: (days) => `a customer’s last document upload was ${days} days ago`,
        eqFollow: (days) => `their last document upload was ${days} days ago`,
        subjectLead: 'a customer’s last document upload',
        subjectFollow: 'their last document upload',
      });
    case 'daysSinceLastPortalVisit':
      return previewDaysSinceActivity(operator, condition.value, lead, {
        gteLead: (days) => `a client has not visited the portal for ${days} days`,
        gteFollow: (days) => `a client has not visited the portal for ${days} days`,
        eqLead: (days) => `the last client portal visit was ${days} days ago`,
        eqFollow: (days) => `the last client portal visit was ${days} days ago`,
        subjectLead: 'the last client portal visit',
        subjectFollow: 'the last client portal visit',
      });
    case 'daysSinceLastPortalDocumentUpload':
      return previewDaysSinceActivity(operator, condition.value, lead, {
        gteLead: (days) =>
          `a client has not uploaded a document to the portal for ${days} days`,
        gteFollow: (days) =>
          `a client has not uploaded a document to the portal for ${days} days`,
        eqLead: (days) => `the last client portal document upload was ${days} days ago`,
        eqFollow: (days) => `the last client portal document upload was ${days} days ago`,
        subjectLead: 'the last client portal document upload',
        subjectFollow: 'the last client portal document upload',
      });
    case 'registeredAt':
      return operator === 'is_empty'
        ? lead
          ? 'a customer has no registration date'
          : 'they have no registration date'
        : '';
    case 'trialExpiresAt':
      return operator === 'is_empty'
        ? lead
          ? 'a customer has no trial expiry date'
          : 'they have no trial expiry date'
        : '';
    default:
      return previewGeneric(condition, metric);
  }
}

function previewBooleanAction(
  operator: MetricOperator,
  subject: string,
  action: string,
): string {
  const verb = subject === 'they' ? 'have' : 'has';
  if (operator === 'is_true') {
    return `${subject} ${verb} ${action}`;
  }
  if (operator === 'is_false') {
    return `${subject} ${verb} not ${action}`;
  }
  return '';
}

function previewAccountingConnection(operator: MetricOperator, lead: boolean): string {
  if (operator === 'is_true') {
    return lead
      ? 'a customer has accounting software connected'
      : 'they have accounting software connected';
  }
  if (operator === 'is_false') {
    return lead
      ? 'a customer does not have accounting software connected'
      : 'they do not have accounting software connected';
  }
  return '';
}

function previewTrialStatus(
  operator: MetricOperator,
  value: ConditionValue,
  lead: boolean,
): string {
  if (operator === 'is' && value === 'in_trial') {
    return lead ? 'a customer is in trial' : 'they are in trial';
  }
  if (operator === 'is' && value === 'trial_expired') {
    return lead ? 'a customer’s trial has expired' : 'their trial has expired';
  }
  if (operator === 'is' && value === 'not_in_trial') {
    return lead ? 'a customer is not in a trial' : 'they are not in a trial';
  }
  if (operator === 'is_not' && typeof value === 'string') {
    return lead
      ? `a customer’s trial status is not ${trialLabel(value)}`
      : `their trial status is not ${trialLabel(value)}`;
  }
  return '';
}

function previewAccountStatus(
  operator: MetricOperator,
  value: ConditionValue,
  metric: CustomerMetric | undefined,
  lead: boolean,
): string {
  const label =
    metric?.enumValues?.find((item) => item.value === value)?.label.toLowerCase() ??
    String(value ?? '');
  if (!label) {
    return '';
  }
  const subject = lead ? 'a customer’s account' : 'their account';
  if (operator === 'is') {
    return `${subject} is ${label}`;
  }
  if (operator === 'is_not') {
    return `${subject} is not ${label}`;
  }
  return '';
}

function previewClientBoolean(operator: MetricOperator, action: string): string {
  if (operator === 'is_true') {
    return `a client has ${action}`;
  }
  if (operator === 'is_false') {
    return `a client has not ${action}`;
  }
  return '';
}

type DaysSinceCopy = {
  gteLead: (days: number) => string;
  gteFollow: (days: number) => string;
  eqLead: (days: number) => string;
  eqFollow: (days: number) => string;
  subjectLead: string;
  subjectFollow: string;
};

function previewDaysSinceActivity(
  operator: MetricOperator,
  value: ConditionValue,
  lead: boolean,
  copy: DaysSinceCopy,
): string {
  const subject = lead ? copy.subjectLead : copy.subjectFollow;
  if (operator === 'between' && isRange(value)) {
    return `${subject} was between ${value.min} and ${value.max} days ago`;
  }
  const days = typeof value === 'number' ? value : null;
  if (days === null) {
    return '';
  }
  switch (operator) {
    case 'gte':
    case 'gt':
      return lead ? copy.gteLead(days) : copy.gteFollow(days);
    case 'eq':
      return lead ? copy.eqLead(days) : copy.eqFollow(days);
    case 'lte':
      return `${subject} was at most ${days} days ago`;
    case 'lt':
      return `${subject} was less than ${days} days ago`;
    default:
      return '';
  }
}

function previewGeneric(
  condition: { metricKey: string; operator: string; value: ConditionValue },
  metric: CustomerMetric | undefined,
): string {
  if (!metric) {
    return '';
  }
  const name = metric.displayName.toLowerCase();
  const operator = condition.operator as MetricOperator;

  if (operator === 'is_true') {
    return name;
  }
  if (operator === 'is_false') {
    return `${name} is no`;
  }
  if (operator === 'is_empty') {
    return `${name} has not happened`;
  }
  if ((operator === 'is' || operator === 'is_not') && typeof condition.value === 'string') {
    const label =
      metric.enumValues?.find((item) => item.value === condition.value)?.label.toLowerCase() ??
      condition.value;
    return operator === 'is' ? `${name} is ${label}` : `${name} is not ${label}`;
  }
  if (operator === 'between' && isRange(condition.value)) {
    return `${name} is between ${condition.value.min} and ${condition.value.max}`;
  }
  if (typeof condition.value !== 'number') {
    return '';
  }
  switch (operator) {
    case 'eq':
      return `${name} equals ${condition.value}`;
    case 'gt':
      return `${name} is greater than ${condition.value}`;
    case 'gte':
      return `${name} is at least ${condition.value}`;
    case 'lt':
      return `${name} is less than ${condition.value}`;
    case 'lte':
      return `${name} is at most ${condition.value}`;
    default:
      return '';
  }
}

function trialLabel(value: string): string {
  if (value === 'in_trial') {
    return 'in trial';
  }
  if (value === 'trial_expired') {
    return 'trial expired';
  }
  if (value === 'not_in_trial') {
    return 'not in trial';
  }
  return value;
}

function isRange(value: ConditionValue): value is { min: number; max: number } {
  return typeof value === 'object' && value !== null && 'min' in value && 'max' in value;
}
