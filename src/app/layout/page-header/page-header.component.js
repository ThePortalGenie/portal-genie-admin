import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb.component';
let PageHeader = class PageHeader {
    title = input.required();
    description = input('');
    breadcrumbs = input([]);
};
PageHeader = __decorate([
    Component({
        selector: 'app-page-header',
        imports: [Breadcrumb],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './page-header.component.html',
        styleUrl: './page-header.component.scss',
    })
], PageHeader);
export { PageHeader };
