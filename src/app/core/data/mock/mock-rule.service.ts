import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { nextDuplicateName } from '../../domain/rule-naming';
import { RuleStatus } from '../../domain/rule-status';
import {
  isRuleConditionGroup,
  Rule,
  RuleCondition,
  RuleConditionGroup,
} from '../../../features/customer-engagement/models/rule.model';
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
