import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CustomerMetric, TimingDirection } from '../../../core/domain/metric.types';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ValidationIssue } from '../models/validation.model';
import { timingAnchorMetrics } from './condition-draft.helpers';

@Component({
  selector: 'app-timing-fields',
  imports: [ReactiveFormsModule, ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timing-fields.component.html',
  styleUrl: './timing-fields.component.scss',
})
export class TimingFields {
  readonly kind = input.required<FormControl<'on_match' | 'relative'>>();
  readonly anchor = input.required<FormControl<string>>();
  readonly direction = input.required<FormControl<TimingDirection | ''>>();
  readonly days = input.required<FormControl<number | null>>();
  readonly metrics = input.required<readonly CustomerMetric[]>();
  readonly issues = input<readonly ValidationIssue[]>([]);
  readonly showErrors = input(false);

  protected readonly anchors = computed(() => timingAnchorMetrics(this.metrics()));

  protected readonly directions = computed((): TimingDirection[] => {
    const key = this.anchor().value;
    const metric = this.anchors().find((item) => item.key === key);
    return [...(metric?.timingDirections ?? [])];
  });

  protected issue(path: string): ValidationIssue | undefined {
    if (!this.showErrors()) {
      return undefined;
    }
    return this.issues().find((item) => item.path === path && item.severity === 'error');
  }

  protected warning(path: string): ValidationIssue | undefined {
    return this.issues().find((item) => item.path === path && item.severity === 'warning');
  }
}
