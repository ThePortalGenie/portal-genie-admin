import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../layout/page-header/page-header.component';
let NotFoundPage = class NotFoundPage {
};
NotFoundPage = __decorate([
    Component({
        selector: 'app-not-found-page',
        imports: [PageHeader, RouterLink],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './not-found.page.html',
        styleUrl: './not-found.page.scss',
    })
], NotFoundPage);
export { NotFoundPage };
