import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RULE_STATUS_LABELS, RuleStatus } from '../../../core/domain/rule-status';

@Component({
  selector: 'ui-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadge {
  readonly status = input.required<RuleStatus>();

  protected readonly labels = RULE_STATUS_LABELS;
}
