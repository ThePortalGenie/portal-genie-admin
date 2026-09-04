import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { METRIC_CATALOG } from '../../domain/metric-catalog';
import { CustomerMetric } from '../../domain/metric.types';
import { MetricCatalogService } from '../metric-catalog.service';
import { mockNotFound } from './mock-async';

@Injectable()
export class MockMetricCatalogService extends MetricCatalogService {
  override list(): Observable<readonly CustomerMetric[]> {
    return of(METRIC_CATALOG).pipe(delay(0));
  }

  override getByKey(key: string): Observable<CustomerMetric> {
    const metric = METRIC_CATALOG.find((item) => item.key === key);
    return metric ? of(metric).pipe(delay(0)) : mockNotFound('Metric');
  }
}
