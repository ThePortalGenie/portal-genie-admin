import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { METRIC_CATALOG } from '../../domain/metric-catalog';
import { MetricCatalogService } from '../metric-catalog.service';
import { mockNotFound } from './mock-async';
let MockMetricCatalogService = class MockMetricCatalogService extends MetricCatalogService {
    list() {
        return of(METRIC_CATALOG).pipe(delay(0));
    }
    getByKey(key) {
        const metric = METRIC_CATALOG.find((item) => item.key === key);
        return metric ? of(metric).pipe(delay(0)) : mockNotFound('Metric');
    }
};
MockMetricCatalogService = __decorate([
    Injectable()
], MockMetricCatalogService);
export { MockMetricCatalogService };
