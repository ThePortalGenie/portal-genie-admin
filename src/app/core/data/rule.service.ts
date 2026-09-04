import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuleStatus } from '../domain/rule-status';
import { Rule, RuleDraft } from '../../features/customer-engagement/models/rule.model';

@Injectable()
export abstract class RuleService {
  abstract list(): Observable<Rule[]>;
  abstract getById(id: string): Observable<Rule>;
  abstract create(draft: RuleDraft): Observable<Rule>;
  abstract update(id: string, draft: RuleDraft): Observable<Rule>;
  abstract duplicate(id: string): Observable<Rule>;
  abstract setStatus(id: string, status: RuleStatus): Observable<Rule>;
  abstract delete(id: string): Observable<void>;
}
