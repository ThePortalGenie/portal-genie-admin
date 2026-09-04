import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
let UiButton = class UiButton {
    variant = input('primary');
    size = input('default');
    type = input('button');
    disabled = input(false);
    ariaLabel = input(undefined);
};
UiButton = __decorate([
    Component({
        selector: 'ui-button',
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './button.component.html',
        styleUrl: './button.component.scss',
    })
], UiButton);
export { UiButton };
