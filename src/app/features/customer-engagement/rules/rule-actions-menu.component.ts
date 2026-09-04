import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '../../../shared/ui/button/button.component';
import { Rule } from '../models/rule.model';

@Component({
  selector: 'app-rule-actions-menu',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-actions-menu.component.html',
  styleUrl: './rule-actions-menu.component.scss',
})
export class RuleActionsMenu {
  readonly rule = input.required<Rule>();
  readonly pending = input(false);
  readonly showEdit = input(false);

  readonly edit = output<Rule>();
  readonly duplicate = output<Rule>();
  readonly toggleStatus = output<Rule>();
  readonly remove = output<Rule>();

  protected enableLabel(): string {
    return this.rule().status === 'active' ? 'Disable' : 'Enable';
  }
}
