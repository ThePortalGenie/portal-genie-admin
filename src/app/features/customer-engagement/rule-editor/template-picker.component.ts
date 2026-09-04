import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { COMMUNICATION_CATEGORY_LABELS, CommunicationTemplate } from '../../../core/domain/template.types';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ValidationIssue } from '../models/validation.model';
import { groupTemplatesForLibrary } from './template-picker.helpers';

@Component({
  selector: 'app-template-picker',
  imports: [UiButton, ValidationMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-picker.component.html',
  styleUrl: './template-picker.component.scss',
})
export class TemplatePicker {
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('libraryEl');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchEl');

  readonly control = input.required<FormControl<string>>();
  readonly templates = input.required<readonly CommunicationTemplate[]>();
  readonly issues = input<readonly ValidationIssue[]>([]);
  readonly showErrors = input(false);

  protected readonly query = signal('');
  protected readonly pendingId = signal('');
  protected readonly categoryLabels = COMMUNICATION_CATEGORY_LABELS;
  private applyOnClose = false;

  protected readonly groups = computed(() =>
    groupTemplatesForLibrary(this.templates(), this.query()),
  );

  protected readonly selected = computed(() =>
    this.templates().find((template) => template.id === this.control().value),
  );

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected openLibrary(): void {
    this.applyOnClose = false;
    this.pendingId.set(this.control().value);
    this.query.set('');
    afterNextRender(
      () => {
        const dialogEl = this.dialog()?.nativeElement;
        if (!dialogEl) {
          return;
        }
        dialogEl.showModal();
        this.searchInput()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected selectPending(id: string): void {
    this.pendingId.set(id);
  }

  protected confirm(): void {
    if (!this.pendingId()) {
      return;
    }
    this.applyOnClose = true;
    this.dialog()?.nativeElement.close('confirm');
  }

  protected dismiss(): void {
    this.dialog()?.nativeElement.close('cancel');
  }

  protected onLibraryClose(): void {
    if (this.applyOnClose && this.pendingId()) {
      this.control().setValue(this.pendingId());
      this.control().markAsDirty();
      this.control().markAsTouched();
    }
    this.applyOnClose = false;
  }

  protected issue(): ValidationIssue | undefined {
    if (!this.showErrors()) {
      return undefined;
    }
    return this.issues().find((item) => item.path === 'templateId');
  }
}
