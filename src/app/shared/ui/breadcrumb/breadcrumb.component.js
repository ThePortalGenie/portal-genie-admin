import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
let Breadcrumb = class Breadcrumb {
    items = input.required();
};
Breadcrumb = __decorate([
    Component({
        selector: 'app-breadcrumb',
        imports: [RouterLink],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './breadcrumb.component.html',
        styleUrl: './breadcrumb.component.scss',
    })
], Breadcrumb);
export { Breadcrumb };
