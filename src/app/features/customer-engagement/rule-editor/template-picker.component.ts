import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_CATEGORY_LABELS,
  CommunicationTemplate,
} from '../../../core/domain/template.types';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ValidationIssue } from '../models/validation.model';

@Component({
  selector: 'app-template-picker',
  imports: [ReactiveFormsModule, ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-picker.component.html',
  styleUrl: './template-picker.component.scss',
})
export class TemplatePicker {
  readonly control = input.required<FormControl<string>>();
  readonly templates = input.required<readonly CommunicationTemplate[]>();
  readonly issues = input<readonly ValidationIssue[]>([]);
  readonly showErrors = input(false);

  protected readonly query = signal('');

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  protected readonly categoryLabels = COMMUNICATION_CATEGORY_LABELS;

  protected readonly groups = computed(() => {
    const query = this.query().trim().toLowerCase();
    const available = this.templates().filter((template) => template.available);
    const filtered = query
      ? available.filter((template) =>
          [template.name, template.purpose, template.lifecycleStage].some((value) =>
            value.toLowerCase().includes(query),
          ),
        )
      : available;

    return COMMUNICATION_CATEGORIES.map((category) => ({
      category,
      label: COMMUNICATION_CATEGORY_LABELS[category],
      templates: filtered.filter((template) => template.category === category),
    })).filter((group) => group.templates.length > 0);
  });

  protected readonly selected = computed(() =>
    this.templates().find((template) => template.id === this.control().value),
  );

  protected issue(): ValidationIssue | undefined {
    if (!this.showErrors()) {
      return undefined;
    }
    return this.issues().find((item) => item.path === 'templateId');
  }
}
