import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MetricCatalogService } from '../../../core/data/metric-catalog.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { RULE_CATEGORY_OPTIONS } from '../../../core/domain/rule-category';
import { RULE_STATUS_LABELS, RULE_STATUSES } from '../../../core/domain/rule-status';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { SearchField } from '../../../shared/ui/search-field/search-field.component';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge.component';
import { summariseRule } from '../validation/rule-summary';
import { formatIsoDate } from './format-iso-date';
import { DEFAULT_RULE_LIST_FILTERS, filterRules, isRuleListFiltered, RULE_FILTER_ALL, ruleListCounts, } from './rule-list.filters';
let RulesListPage = class RulesListPage {
    router = inject(Router);
    ruleService = inject(RuleService);
    templateService = inject(TemplateService);
    metricCatalogService = inject(MetricCatalogService);
    confirmDialog = viewChild.required(ConfirmDialog);
    breadcrumbs = [
        { label: 'Customer Engagement' },
        { label: 'Rules' },
    ];
    loadState = signal('loading');
    rules = signal([]);
    templates = signal([]);
    metrics = signal([]);
    query = signal(DEFAULT_RULE_LIST_FILTERS.query);
    statusFilter = signal(DEFAULT_RULE_LIST_FILTERS.status);
    categoryFilter = signal(DEFAULT_RULE_LIST_FILTERS.category);
    pendingRuleId = signal(null);
    statusFilterOptions = [
        { id: RULE_FILTER_ALL, label: 'All' },
        ...RULE_STATUSES.map((id) => ({ id, label: RULE_STATUS_LABELS[id] })),
    ];
    categoryFilterOptions = [
        { id: RULE_FILTER_ALL, label: 'All' },
        ...RULE_CATEGORY_OPTIONS,
    ];
    filters = computed(() => ({
        query: this.query(),
        status: this.statusFilter(),
        category: this.categoryFilter(),
    }));
    templateNameById = computed(() => {
        const names = new Map();
        for (const template of this.templates()) {
            names.set(template.id, template.name);
        }
        return names;
    });
    counts = computed(() => ruleListCounts(this.rules()));
    filtered = computed(() => isRuleListFiltered(this.filters()));
    visibleRules = computed(() => filterRules(this.rules(), this.filters(), this.templateNameById()));
    rows = computed(() => {
        const metrics = this.metrics();
        const templateNames = this.templateNameById();
        const categories = new Map(RULE_CATEGORY_OPTIONS.map((option) => [option.id, option.label]));
        return this.visibleRules().map((rule) => ({
            rule,
            categoryLabel: categories.get(rule.category) ?? rule.category,
            summary: summariseRule(rule, metrics),
            templateName: templateNames.get(rule.templateId) ?? 'Unknown template',
            updatedLabel: formatIsoDate(rule.updatedAt),
            enableLabel: rule.status === 'active' ? 'Disable' : 'Enable',
        }));
    });
    constructor() {
        this.load();
    }
    load() {
        this.loadState.set('loading');
        forkJoin({
            rules: this.ruleService.list(),
            templates: this.templateService.list(),
            metrics: this.metricCatalogService.list(),
        }).subscribe({
            next: ({ rules, templates, metrics }) => {
                this.rules.set(rules);
                this.templates.set(templates);
                this.metrics.set(metrics);
                this.loadState.set('loaded');
            },
            error: () => {
                this.loadState.set('error');
            },
        });
    }
    createRule() {
        void this.router.navigate(['/engagement/rules/new']);
    }
    editRule(rule) {
        void this.router.navigate(['/engagement/rules', rule.id]);
    }
    onStatusFilterChange(event) {
        this.statusFilter.set(event.target.value);
    }
    onCategoryFilterChange(event) {
        this.categoryFilter.set(event.target.value);
    }
    clearFilters() {
        this.query.set(DEFAULT_RULE_LIST_FILTERS.query);
        this.statusFilter.set(DEFAULT_RULE_LIST_FILTERS.status);
        this.categoryFilter.set(DEFAULT_RULE_LIST_FILTERS.category);
    }
    duplicate(rule) {
        this.runMutation(rule.id, this.ruleService.duplicate(rule.id));
    }
    async toggleStatus(rule) {
        if (rule.status === 'active') {
            const confirmed = await this.confirmDialog().open({
                title: 'Disable rule',
                message: `Disable ${rule.name}? It will stop matching customers once delivery is connected.`,
                confirmLabel: 'Disable',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) {
                return;
            }
            this.runMutation(rule.id, this.ruleService.setStatus(rule.id, 'disabled'));
            return;
        }
        this.runMutation(rule.id, this.ruleService.setStatus(rule.id, 'active'));
    }
    async deleteRule(rule) {
        const confirmed = await this.confirmDialog().open({
            title: 'Delete rule',
            message: rule.status === 'active'
                ? `Delete ${rule.name}? This rule is active. Deleting it will stop future communications associated with it. This cannot be undone.`
                : `Delete ${rule.name}? This cannot be undone.`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            destructive: true,
        });
        if (!confirmed) {
            return;
        }
        this.runMutation(rule.id, this.ruleService.delete(rule.id));
    }
    runMutation(ruleId, request) {
        this.pendingRuleId.set(ruleId);
        request.subscribe({
            next: () => {
                this.pendingRuleId.set(null);
                this.refreshRules();
            },
            error: () => {
                this.pendingRuleId.set(null);
            },
        });
    }
    refreshRules() {
        this.ruleService.list().subscribe({
            next: (rules) => this.rules.set(rules),
            error: () => this.loadState.set('error'),
        });
    }
};
RulesListPage = __decorate([
    Component({
        selector: 'app-rules-list-page',
        imports: [
            PageHeader,
            UiButton,
            ConfirmDialog,
            EmptyState,
            ErrorState,
            SearchField,
            StatusBadge,
            RouterLink,
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './rules-list.page.html',
        styleUrl: './rules-list.page.scss',
    })
], RulesListPage);
export { RulesListPage };
