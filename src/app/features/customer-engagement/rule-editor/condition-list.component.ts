import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { LogicalOperator } from '../models/rule.model';
import { ValidationIssue } from '../models/validation.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ConditionFormGroup } from './condition-form';
import { ConditionRow } from './condition-row.component';

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
  readonly add = output<void>();
  readonly remove = output<number>();

  protected issuesFor(index: number): ValidationIssue[] {
    const prefix = `rootGroup.children.${index}.`;
    return this.issues().filter((issue) => issue.path.startsWith(prefix));
  }

  protected groupIssue(): ValidationIssue | undefined {
    if (!this.showErrors()) {
      return undefined;
    }
    return this.issues().find((issue) => issue.path === 'rootGroup');
  }
}
