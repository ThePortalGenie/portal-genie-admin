import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuleGroup } from '../../domain/rule-group';
import { RuleGroupService } from '../rule-group.service';
import { RULE_GROUP_FIXTURES } from './fixtures/rule-groups.fixture';
import { mockNotFound, mockOf } from './mock-async';

@Injectable()
export class MockRuleGroupService extends RuleGroupService {
  override list(): Observable<readonly RuleGroup[]> {
    return mockOf(RULE_GROUP_FIXTURES);
  }

  override getById(id: string): Observable<RuleGroup> {
    const group = RULE_GROUP_FIXTURES.find((item) => item.id === id);
    return group ? mockOf(group) : mockNotFound('Rule group');
  }
}
