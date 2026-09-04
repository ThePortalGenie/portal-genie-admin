import { Rule } from '../models/rule.model';

export const FROM_JOURNEY_PARAM = 'fromJourney';

export type EditorReturnContext = {
  fromJourney: boolean;
  groupId: string | null;
};

export function editorReturnContext(query: {
  get(name: string): string | null;
}): EditorReturnContext {
  const fromJourneyValue = query.get(FROM_JOURNEY_PARAM);
  return {
    fromJourney: fromJourneyValue === '1' || fromJourneyValue === 'true',
    groupId: query.get('fromGroup') ?? query.get('group'),
  };
}

export function editorReturnCommands(context: EditorReturnContext): string[] {
  if (context.fromJourney) {
    return ['/engagement/rules/journey'];
  }
  if (context.groupId) {
    return ['/engagement/rules/group', context.groupId];
  }
  return ['/engagement/rules'];
}

export function editorReturnQueryParams(
  context: EditorReturnContext,
): Record<string, string> | undefined {
  if (context.fromJourney) {
    return { [FROM_JOURNEY_PARAM]: '1' };
  }
  return undefined;
}

export function ruleHasGlobalSequenceOrder(rule: Rule): boolean {
  return Object.prototype.hasOwnProperty.call(rule, 'globalSequenceOrder');
}
