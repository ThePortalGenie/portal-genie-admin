import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CustomerMetric, TimingDirection } from '../../../core/domain/metric.types';
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
import {
  applyRangePart,
  displayNumericInput,
  parseNumericInput,
} from './numeric-input';
import { booleanValueLabels, EDITOR_OPERATOR_LABELS, metricEditorLabel, metricSelectorLabel } from './metric-display';
import {
  defaultLifecycleDirection,
  isLifecycleTimingMetric,
} from './lifecycle-authoring';

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

  protected readonly operatorLabels = EDITOR_OPERATOR_LABELS;
  protected readonly groupedMetrics = () => groupMetricsByCategory(this.metrics());

  protected selectedMetric(): CustomerMetric | undefined {
    const key = this.group().controls.metricKey.value;
    return this.metrics().find((item) => item.key === key);
  }

  protected isLifecycle(): boolean {
    return isLifecycleTimingMetric(this.selectedMetric());
  }

  protected lifecycleDirections(): TimingDirection[] {
    return [...(this.selectedMetric()?.timingDirections ?? [])];
  }

  protected fieldId(): string {
    return this.group().controls.id.value;
  }

  protected metricLabel(metric: CustomerMetric): string {
    return metricEditorLabel(metric);
  }

  protected selectorLabel(metric: CustomerMetric): string {
    return metricSelectorLabel(metric);
  }

  protected selectorTitle(): string | null {
    const selected = this.selectedMetric();
    return selected ? metricSelectorLabel(selected) : null;
  }

  protected booleanLabels(): { yes: string; no: string } {
    return booleanValueLabels(this.group().controls.metricKey.value);
  }

  protected showIssue(suffix: string): ValidationIssue | undefined {
    const issue = this.issues().find((item) => item.path.endsWith(suffix));
    if (!issue) {
      return undefined;
    }
    if (issue.severity === 'warning') {
      return issue;
    }
    if (!this.showErrors() && !this.isTouched(suffix)) {
      return undefined;
    }
    return issue;
  }

  protected onMetricChange(): void {
    const current = this.group().getRawValue();
    const metric = this.metrics().find((item) => item.key === current.metricKey);
    const next = applyMetricChange(
      {
        id: current.id,
        metricKey: current.metricKey,
        operator: current.operator,
        value: current.value,
      },
      metric,
    );
    this.group().patchValue({
      ...next,
      offsetDays: isLifecycleTimingMetric(metric) ? 0 : null,
      timingDirection: isLifecycleTimingMetric(metric)
        ? defaultLifecycleDirection(metric)
        : '',
    });
  }

  protected onOperatorChange(): void {
    const current = this.group().getRawValue();
    const next = applyOperatorChange(
      {
        id: current.id,
        metricKey: current.metricKey,
        operator: current.operator,
        value: current.value,
      },
      this.selectedMetric(),
      current.operator,
    );
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
    const value = parseNumericInput((event.target as HTMLInputElement).value);
    this.group().controls.value.setValue(value);
    this.group().controls.value.markAsTouched();
  }

  protected onOffsetChange(event: Event): void {
    const value = parseNumericInput((event.target as HTMLInputElement).value);
    this.group().controls.offsetDays.setValue(value);
    this.group().controls.offsetDays.markAsTouched();
  }

  protected offsetValue(): string {
    return displayNumericInput(this.group().controls.offsetDays.value);
  }

  protected onRangeChange(part: 'min' | 'max', event: Event): void {
    const amount = parseNumericInput((event.target as HTMLInputElement).value);
    this.group().controls.value.setValue(applyRangePart(this.group().controls.value.value, part, amount));
    this.group().controls.value.markAsTouched();
  }

  protected rangePart(part: 'min' | 'max'): string {
    const value = this.group().controls.value.value;
    if (typeof value === 'object' && value !== null && part in value) {
      return displayNumericInput(value[part]);
    }
    return '';
  }

  protected numberValue(): string {
    return displayNumericInput(this.group().controls.value.value);
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
    if (suffix === 'operator' || suffix === 'timingDirection') {
      return this.group().controls.operator.touched || this.group().controls.timingDirection.touched;
    }
    if (suffix === 'offsetDays') {
      return this.group().controls.offsetDays.touched;
    }
    return this.group().controls.value.touched || this.group().controls.operator.touched;
  }
}
