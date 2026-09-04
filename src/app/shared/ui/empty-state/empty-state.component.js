import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
let EmptyState = class EmptyState {
    title = input.required();
    message = input.required();
};
EmptyState = __decorate([
    Component({
        selector: 'ui-empty-state',
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './empty-state.component.html',
        styleUrl: './empty-state.component.scss',
    })
], EmptyState);
export { EmptyState };
