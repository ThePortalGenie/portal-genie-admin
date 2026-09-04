import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '../button/button.component';
let ErrorState = class ErrorState {
    title = input('Something went wrong');
    message = input('The data could not be loaded. Try again.');
    retry = output();
};
ErrorState = __decorate([
    Component({
        selector: 'ui-error-state',
        imports: [UiButton],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './error-state.component.html',
        styleUrl: './error-state.component.scss',
    })
], ErrorState);
export { ErrorState };
