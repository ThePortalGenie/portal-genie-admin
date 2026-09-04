import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeader } from '../../../layout/page-header/page-header.component';
let TemplateLibraryPage = class TemplateLibraryPage {
};
TemplateLibraryPage = __decorate([
    Component({
        selector: 'app-template-library-page',
        imports: [PageHeader],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './template-library.page.html',
        styleUrl: './template-library.page.scss',
    })
], TemplateLibraryPage);
export { TemplateLibraryPage };
