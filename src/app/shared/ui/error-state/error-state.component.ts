import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '../button/button.component';

@Component({
  selector: 'ui-error-state',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('The data could not be loaded. Try again.');
  readonly retry = output<void>();
}
