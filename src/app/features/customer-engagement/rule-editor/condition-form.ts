import { FormControl, FormGroup } from '@angular/forms';
import { MetricOperator, TimingDirection } from '../../../core/domain/metric.types';
import { ConditionValue } from '../models/rule.model';

export type ConditionFormControls = {
  id: FormControl<string>;
  metricKey: FormControl<string>;
  operator: FormControl<MetricOperator | ''>;
  value: FormControl<ConditionValue>;
  offsetDays: FormControl<number | null>;
  timingDirection: FormControl<TimingDirection | ''>;
};

export type ConditionFormGroup = FormGroup<ConditionFormControls>;
