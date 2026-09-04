import { FormControl, FormGroup } from '@angular/forms';
import { MetricOperator } from '../../../core/domain/metric.types';
import { ConditionValue } from '../models/rule.model';

export type ConditionFormControls = {
  id: FormControl<string>;
  metricKey: FormControl<string>;
  operator: FormControl<MetricOperator | ''>;
  value: FormControl<ConditionValue>;
};

export type ConditionFormGroup = FormGroup<ConditionFormControls>;
