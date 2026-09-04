import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RulePreview } from '../validation/editor-summary';

@Component({
  selector: 'app-rule-summary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-summary-card.component.html',
  styleUrl: './rule-summary-card.component.scss',
})
export class RuleSummaryCard {
  readonly preview = input.required<RulePreview>();
}
