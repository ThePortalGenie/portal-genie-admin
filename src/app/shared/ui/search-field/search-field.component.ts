import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let searchFieldId = 0;

@Component({
  selector: 'ui-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-field.component.html',
  styleUrl: './search-field.component.scss',
})
export class SearchField {
  readonly label = input('Search');
  readonly placeholder = input('');
  readonly value = input('');
  readonly valueChange = output<string>();

  protected readonly fieldId = `ui-search-${++searchFieldId}`;

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
