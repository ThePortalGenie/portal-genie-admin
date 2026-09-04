import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-validation-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validation-message.component.html',
  styleUrl: './validation-message.component.scss',
})
export class ValidationMessage {
  readonly message = input.required<string>();
  readonly tone = input<'error' | 'warning'>('error');
}
