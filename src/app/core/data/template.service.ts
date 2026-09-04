import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommunicationTemplate } from '../domain/template.types';

@Injectable()
export abstract class TemplateService {
  abstract list(): Observable<readonly CommunicationTemplate[]>;
  abstract getById(id: string): Observable<CommunicationTemplate>;
}
