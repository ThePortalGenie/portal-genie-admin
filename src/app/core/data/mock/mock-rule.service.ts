import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { nextDuplicateName } from '../../domain/rule-naming';
import { RuleStatus } from '../../domain/rule-status';
import {
  isRuleConditionGroup,
  Rule,
  RuleCondition,
  RuleConditionGroup,
  RuleDraft,
} from '../../../features/customer-engagement/models/rule.model';
import { ruleFromDraft } from '../../../features/customer-engagement/rule-editor/rule-draft.helpers';
import { RuleService } from '../rule.service';
import { RULE_FIXTURES } from './fixtures/rules.fixture';
import { mockNotFound, mockOf, mockVoid } from './mock-async';

@Injectable()
export class MockRuleService extends RuleService {
  private rules: Rule[] = structuredClone(RULE_FIXTURES);

  override list(): Observable<Rule[]> {
    return mockOf(this.rules);
  }

  override getById(id: string): Observable<Rule> {
    const rule = this.rules.find((item) => item.id === id);
    return rule ? mockOf(rule) : mockNotFound('Rule');
  }

  override create(draft: RuleDraft): Observable<Rule> {
    const now = new Date().toISOString();
    const rule = ruleFromDraft(draft, {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    this.rules.unshift(rule);
    return mockOf(rule);
  }

  override update(id: string, draft: RuleDraft): Observable<Rule> {
    const index = this.rules.findIndex((item) => item.id === id);
    if (index < 0) {
      return mockNotFound('Rule');
    }

    const existing = this.rules[index];
    const rule = ruleFromDraft(draft, {
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    this.rules[index] = rule;
    return mockOf(rule);
  }

  override duplicate(id: string): Observable<Rule> {
    const source = this.rules.find((item) => item.id === id);
    if (!source) {
      return mockNotFound('Rule');
    }

    const now = new Date().toISOString();
    const copy: Rule = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: nextDuplicateName(
        source.name,
        this.rules.map((rule) => rule.name),
      ),
      status: 'disabled',
      rootGroup: rematerializeGroup(source.rootGroup),
      createdAt: now,
      updatedAt: now,
    };

    const index = this.rules.findIndex((item) => item.id === id);
    this.rules.splice(index + 1, 0, copy);
    return mockOf(copy);
  }

  override setStatus(id: string, status: RuleStatus): Observable<Rule> {
    const rule = this.rules.find((item) => item.id === id);
    if (!rule) {
      return mockNotFound('Rule');
    }

    rule.status = status;
    rule.updatedAt = new Date().toISOString();
    return mockOf(rule);
  }

  override delete(id: string): Observable<void> {
    const index = this.rules.findIndex((item) => item.id === id);
    if (index < 0) {
      return mockNotFound('Rule');
    }

    this.rules.splice(index, 1);
    return mockVoid();
  }
}

function rematerializeGroup(group: RuleConditionGroup): RuleConditionGroup {
  return {
    id: crypto.randomUUID(),
    combinator: group.combinator,
    children: group.children.map((child) =>
      isRuleConditionGroup(child) ? rematerializeGroup(child) : rematerializeCondition(child),
    ),
  };
}

function rematerializeCondition(condition: RuleCondition): RuleCondition {
  return { ...condition, id: crypto.randomUUID() };
}
