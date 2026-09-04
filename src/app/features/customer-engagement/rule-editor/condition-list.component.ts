import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { LogicalOperator } from '../models/rule.model';
import { ValidationIssue } from '../models/validation.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ConditionFormGroup } from './condition-form';
import { ConditionRow } from './condition-row.component';
import {
  EditorConditionRow,
  isLifecycleTimingKey,
  issuesForEditorRow,
} from './lifecycle-authoring';

@Component({
  selector: 'app-condition-list',
  imports: [ReactiveFormsModule, ConditionRow, UiButton, ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condition-list.component.html',
  styleUrl: './condition-list.component.scss',
})
export class ConditionList {
  readonly combinator = input.required<FormControl<LogicalOperator>>();
  readonly conditions = input.required<FormArray<ConditionFormGroup>>();
  readonly metrics = input.required<readonly CustomerMetric[]>();
  readonly issues = input<readonly ValidationIssue[]>([]);
  readonly showErrors = input(false);
  readonly audienceOnly = input(false);
  readonly add = output<void>();
  readonly remove = output<number>();

  protected joinLabel(index: number): string {
    const previous = this.conditions().at(index - 1);
    if (
      !this.audienceOnly() &&
      previous &&
      isLifecycleTimingKey(previous.controls.metricKey.value, this.metrics())
    ) {
      return 'AND';
    }
    return this.combinator().value === 'or' ? 'OR' : 'AND';
  }

  protected issuesFor(index: number): ValidationIssue[] {
    return issuesForEditorRow(this.editorRows(), index, this.metrics(), this.issues(), {
      treatLifecycleRows: !this.audienceOnly(),
    });
  }

  protected groupIssue(): ValidationIssue | undefined {
    if (!this.showErrors()) {
      return undefined;
    }
    return this.issues().find((issue) => issue.path === 'rootGroup');
  }

  private editorRows(): EditorConditionRow[] {
    return this.conditions().getRawValue().map((row) => ({
      id: row.id,
      metricKey: row.metricKey,
      operator: row.operator,
      value: row.value ?? null,
      offsetDays: row.offsetDays,
      timingDirection: row.timingDirection,
    }));
  }
}
