import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ValidationIssue } from '../models/validation.model';
import { EditorRuleSummary } from '../validation/editor-summary';

@Component({
  selector: 'app-rule-summary-card',
  imports: [ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-summary-card.component.html',
  styleUrl: './rule-summary-card.component.scss',
})
export class RuleSummaryCard {
  readonly summary = input.required<EditorRuleSummary>();
  readonly errors = input<readonly ValidationIssue[]>([]);
  readonly warnings = input<readonly ValidationIssue[]>([]);
  readonly showIssueList = input(false);
}
