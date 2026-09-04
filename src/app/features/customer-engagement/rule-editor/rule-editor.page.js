import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PageHeader } from '../../../layout/page-header/page-header.component';
let RuleEditorPage = class RuleEditorPage {
    router = inject(Router);
    isCreate = toSignal(this.router.events.pipe(filter((event) => event instanceof NavigationEnd), map(() => this.isCreateUrl(this.router.url)), startWith(this.isCreateUrl(this.router.url))), { initialValue: this.isCreateUrl(this.router.url) });
    title = computed(() => (this.isCreate() ? 'Create Rule' : 'Edit Rule'));
    description = computed(() => this.isCreate()
        ? 'Define who should receive a communication and when it should be triggered.'
        : '');
    breadcrumbs = computed(() => [
        { label: 'Customer Engagement' },
        { label: 'Rules', routerLink: '/engagement/rules' },
        { label: this.isCreate() ? 'Create rule' : 'Edit rule' },
    ]);
    isCreateUrl(url) {
        return url.split('?')[0] === '/engagement/rules/new';
    }
};
RuleEditorPage = __decorate([
    Component({
        selector: 'app-rule-editor-page',
        imports: [PageHeader],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './rule-editor.page.html',
        styleUrl: './rule-editor.page.scss',
    })
], RuleEditorPage);
export { RuleEditorPage };
