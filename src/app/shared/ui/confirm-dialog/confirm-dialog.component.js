import { __decorate } from "tslib";
import { afterNextRender, ChangeDetectionStrategy, Component, Injector, inject, signal, viewChild, } from '@angular/core';
import { UiButton } from '../button/button.component';
let ConfirmDialog = class ConfirmDialog {
    injector = inject(Injector);
    dialog = viewChild('dialogEl');
    request = signal(null);
    resolver = null;
    previousFocus = null;
    settled = false;
    open(request) {
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
            afterNextRender(() => {
                const dialogEl = this.dialog()?.nativeElement;
                if (!dialogEl) {
                    this.finish(false);
                    return;
                }
                dialogEl.showModal();
                this.focusInitialControl(dialogEl, request.destructive === true);
            }, { injector: this.injector });
        });
    }
    accept() {
        this.dialog()?.nativeElement.close('confirm');
    }
    dismiss() {
        this.dialog()?.nativeElement.close('cancel');
    }
    onClose() {
        const confirmed = this.dialog()?.nativeElement.returnValue === 'confirm';
        this.finish(confirmed);
    }
    focusInitialControl(dialogEl, destructive) {
        const buttons = dialogEl.querySelectorAll('button');
        const cancel = buttons.item(0);
        const confirm = buttons.item(1);
        (destructive ? cancel : confirm)?.focus();
    }
    finish(confirmed) {
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
};
ConfirmDialog = __decorate([
    Component({
        selector: 'ui-confirm-dialog',
        imports: [UiButton],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './confirm-dialog.component.html',
        styleUrl: './confirm-dialog.component.scss',
    })
], ConfirmDialog);
export { ConfirmDialog };
