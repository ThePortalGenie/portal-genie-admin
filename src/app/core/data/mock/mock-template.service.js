import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { TemplateService } from '../template.service';
import { TEMPLATE_FIXTURES } from './fixtures/templates.fixture';
import { mockNotFound, mockOf } from './mock-async';
let MockTemplateService = class MockTemplateService extends TemplateService {
    list() {
        return mockOf(TEMPLATE_FIXTURES);
    }
    getById(id) {
        const template = TEMPLATE_FIXTURES.find((item) => item.id === id);
        return template ? mockOf(template) : mockNotFound('Template');
    }
};
MockTemplateService = __decorate([
    Injectable()
], MockTemplateService);
export { MockTemplateService };
