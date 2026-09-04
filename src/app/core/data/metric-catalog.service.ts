import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerMetric } from '../domain/metric.types';

@Injectable()
export abstract class MetricCatalogService {
  abstract list(): Observable<readonly CustomerMetric[]>;
  abstract getByKey(key: string): Observable<CustomerMetric>;
}
