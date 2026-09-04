import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { UiButton } from '../button/button.component';
import { ConfirmDialogRequest } from './confirm-dialog.model';

@Component({
  selector: 'ui-confirm-dialog',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialog {
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  protected readonly request = signal<ConfirmDialogRequest | null>(null);

  private resolver: ((confirmed: boolean) => void) | null = null;
  private previousFocus: HTMLElement | null = null;
  private settled = false;

  open(request: ConfirmDialogRequest): Promise<boolean> {
    this.settled = false;
    this.request.set({
      cancelLabel: 'Cancel',
      destructive: false,
      ...request,
    });
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return new Promise((resolve) => {
      this.resolver = resolve;
      afterNextRender(
        () => {
          const dialogEl = this.dialog()?.nativeElement;
          if (!dialogEl) {
            this.finish(false);
            return;
          }

          dialogEl.showModal();
          this.focusInitialControl(dialogEl, request.destructive === true);
        },
        { injector: this.injector },
      );
    });
  }

  protected accept(): void {
    this.dialog()?.nativeElement.close('confirm');
  }

  protected dismiss(): void {
    this.dialog()?.nativeElement.close('cancel');
  }

  protected onClose(): void {
    const confirmed = this.dialog()?.nativeElement.returnValue === 'confirm';
    this.finish(confirmed);
  }

  private focusInitialControl(dialogEl: HTMLDialogElement, destructive: boolean): void {
    const buttons = dialogEl.querySelectorAll('button');
    const cancel = buttons.item(0);
    const confirm = buttons.item(1);
    (destructive ? cancel : confirm)?.focus();
  }

  private finish(confirmed: boolean): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.resolver?.(confirmed);
    this.resolver = null;
    this.request.set(null);
    this.previousFocus?.focus();
    this.previousFocus = null;
  }
}
