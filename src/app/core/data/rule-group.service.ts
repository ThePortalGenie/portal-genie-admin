import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RuleGroup } from '../domain/rule-group';

@Injectable()
export abstract class RuleGroupService {
  abstract list(): Observable<readonly RuleGroup[]>;
  abstract getById(id: string): Observable<RuleGroup>;
}
