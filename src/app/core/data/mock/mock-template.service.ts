import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommunicationTemplate } from '../../domain/template.types';
import { TemplateService } from '../template.service';
import { TEMPLATE_FIXTURES } from './fixtures/templates.fixture';
import { mockNotFound, mockOf } from './mock-async';

@Injectable()
export class MockTemplateService extends TemplateService {
  override list(): Observable<readonly CommunicationTemplate[]> {
    return mockOf(TEMPLATE_FIXTURES);
  }

  override getById(id: string): Observable<CommunicationTemplate> {
    const template = TEMPLATE_FIXTURES.find((item) => item.id === id);
    return template ? mockOf(template) : mockNotFound('Template');
  }
}
