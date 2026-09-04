import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { METRIC_OPERATOR_LABELS } from '../../../core/domain/metric-operators';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ValidationIssue } from '../models/validation.model';
import {
  applyMetricChange,
  applyOperatorChange,
  booleanChoice,
  groupMetricsByCategory,
  operatorFromBooleanChoice,
} from './condition-draft.helpers';
import { ConditionFormGroup } from './condition-form';

@Component({
  selector: 'app-condition-row',
  imports: [ReactiveFormsModule, ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condition-row.component.html',
  styleUrl: './condition-row.component.scss',
})
export class ConditionRow {
  readonly group = input.required<ConditionFormGroup>();
  readonly metrics = input.required<readonly CustomerMetric[]>();
  readonly issues = input<readonly ValidationIssue[]>([]);
  readonly showErrors = input(false);
  readonly remove = output<void>();

  protected readonly operatorLabels = METRIC_OPERATOR_LABELS;
  protected readonly groupedMetrics = computed(() => groupMetricsByCategory(this.metrics()));

  protected readonly metric = computed(() => {
    const key = this.group().controls.metricKey.value;
    return this.metrics().find((item) => item.key === key);
  });

  protected readonly fieldId = computed(() => this.group().controls.id.value);

  protected showIssue(suffix: string): ValidationIssue | undefined {
    if (!this.showErrors() && !this.isTouched(suffix)) {
      return undefined;
    }
    return this.issues().find((issue) => issue.path.endsWith(suffix));
  }

  protected onMetricChange(): void {
    const current = this.group().getRawValue();
    const metric = this.metrics().find((item) => item.key === current.metricKey);
    const next = applyMetricChange(current, metric);
    this.group().patchValue(next);
  }

  protected onOperatorChange(): void {
    const current = this.group().getRawValue();
    const next = applyOperatorChange(current, this.metric(), current.operator);
    this.group().patchValue(next);
  }

  protected onBooleanChange(event: Event): void {
    const choice = (event.target as HTMLSelectElement).value as '' | 'yes' | 'no';
    this.group().patchValue({
      operator: operatorFromBooleanChoice(choice),
      value: null,
    });
    this.group().controls.operator.markAsTouched();
  }

  protected onNumberChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.group().controls.value.setValue(raw === '' ? null : Number(raw));
  }

  protected onRangeChange(part: 'min' | 'max', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const amount = raw === '' ? null : Number(raw);
    const current = this.group().controls.value.value;
    const range =
      typeof current === 'object' && current !== null && 'min' in current
        ? { ...current }
        : { min: Number.NaN, max: Number.NaN };
    range[part] = amount ?? Number.NaN;
    if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
      this.group().controls.value.setValue(null);
      return;
    }
    this.group().controls.value.setValue(range);
  }

  protected rangePart(part: 'min' | 'max'): string {
    const value = this.group().controls.value.value;
    if (typeof value === 'object' && value !== null && part in value) {
      const amount = value[part];
      return Number.isFinite(amount) ? String(amount) : '';
    }
    return '';
  }

  protected numberValue(): string {
    const value = this.group().controls.value.value;
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  }

  protected booleanValue(): string {
    return booleanChoice(this.group().controls.operator.value);
  }

  protected enumValue(): string {
    const value = this.group().controls.value.value;
    return typeof value === 'string' ? value : '';
  }

  protected onEnumChange(event: Event): void {
    this.group().controls.value.setValue((event.target as HTMLSelectElement).value);
  }

  private isTouched(suffix: string): boolean {
    if (suffix === 'metricKey') {
      return this.group().controls.metricKey.touched;
    }
    if (suffix === 'operator') {
      return this.group().controls.operator.touched;
    }
    return this.group().controls.value.touched || this.group().controls.operator.touched;
  }
}
