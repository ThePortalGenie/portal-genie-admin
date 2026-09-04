import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { MetricCatalogService } from './core/data/metric-catalog.service';
import { MockMetricCatalogService } from './core/data/mock/mock-metric-catalog.service';
import { MockRuleService } from './core/data/mock/mock-rule.service';
import { MockTemplateService } from './core/data/mock/mock-template.service';
import { RuleService } from './core/data/rule.service';
import { TemplateService } from './core/data/template.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: RuleService, useClass: MockRuleService },
    { provide: TemplateService, useClass: MockTemplateService },
    { provide: MetricCatalogService, useClass: MockMetricCatalogService },
  ],
};
