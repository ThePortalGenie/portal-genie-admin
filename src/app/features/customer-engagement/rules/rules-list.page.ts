import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { MetricCatalogService } from '../../../core/data/metric-catalog.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { RULE_CATEGORY_OPTIONS } from '../../../core/domain/rule-category';
import { RULE_STATUS_LABELS, RULE_STATUSES } from '../../../core/domain/rule-status';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { SearchField } from '../../../shared/ui/search-field/search-field.component';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge.component';
import { Rule } from '../models/rule.model';
import { summariseRule } from '../validation/rule-summary';
import { formatIsoDate } from './format-iso-date';
import {
  DEFAULT_RULE_LIST_FILTERS,
  filterRules,
  isRuleListFiltered,
  RULE_FILTER_ALL,
  RuleCategoryFilter,
  ruleListCounts,
  RuleListFilters,
  RuleStatusFilter,
} from './rule-list.filters';

type LoadState = 'loading' | 'loaded' | 'error';

type RuleRow = {
  rule: Rule;
  categoryLabel: string;
  summary: string;
  templateName: string;
  updatedLabel: string;
  enableLabel: string;
};

@Component({
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
export class RulesListPage {
  private readonly router = inject(Router);
  private readonly ruleService = inject(RuleService);
  private readonly templateService = inject(TemplateService);
  private readonly metricCatalogService = inject(MetricCatalogService);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  protected readonly breadcrumbs = [
    { label: 'Customer Engagement' },
    { label: 'Rules' },
  ];

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly rules = signal<Rule[]>([]);
  protected readonly templates = signal<readonly CommunicationTemplate[]>([]);
  protected readonly metrics = signal<readonly CustomerMetric[]>([]);
  protected readonly query = signal(DEFAULT_RULE_LIST_FILTERS.query);
  protected readonly statusFilter = signal<RuleStatusFilter>(DEFAULT_RULE_LIST_FILTERS.status);
  protected readonly categoryFilter = signal<RuleCategoryFilter>(
    DEFAULT_RULE_LIST_FILTERS.category,
  );
  protected readonly pendingRuleId = signal<string | null>(null);

  protected readonly statusFilterOptions = [
    { id: RULE_FILTER_ALL, label: 'All' },
    ...RULE_STATUSES.map((id) => ({ id, label: RULE_STATUS_LABELS[id] })),
  ];

  protected readonly categoryFilterOptions = [
    { id: RULE_FILTER_ALL, label: 'All' },
    ...RULE_CATEGORY_OPTIONS,
  ];

  private readonly filters = computed<RuleListFilters>(() => ({
    query: this.query(),
    status: this.statusFilter(),
    category: this.categoryFilter(),
  }));

  private readonly templateNameById = computed(() => {
    const names = new Map<string, string>();
    for (const template of this.templates()) {
      names.set(template.id, template.name);
    }
    return names;
  });

  protected readonly counts = computed(() => ruleListCounts(this.rules()));
  protected readonly filtered = computed(() => isRuleListFiltered(this.filters()));
  protected readonly visibleRules = computed(() =>
    filterRules(this.rules(), this.filters(), this.templateNameById()),
  );

  protected readonly rows = computed((): RuleRow[] => {
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

  protected load(): void {
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

  protected createRule(): void {
    void this.router.navigate(['/engagement/rules/new']);
  }

  protected editRule(rule: Rule): void {
    void this.router.navigate(['/engagement/rules', rule.id]);
  }

  protected onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as RuleStatusFilter);
  }

  protected onCategoryFilterChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value as RuleCategoryFilter);
  }

  protected clearFilters(): void {
    this.query.set(DEFAULT_RULE_LIST_FILTERS.query);
    this.statusFilter.set(DEFAULT_RULE_LIST_FILTERS.status);
    this.categoryFilter.set(DEFAULT_RULE_LIST_FILTERS.category);
  }

  protected duplicate(rule: Rule): void {
    this.runMutation(rule.id, this.ruleService.duplicate(rule.id));
  }

  protected async toggleStatus(rule: Rule): Promise<void> {
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

  protected async deleteRule(rule: Rule): Promise<void> {
    const confirmed = await this.confirmDialog().open({
      title: 'Delete rule',
      message:
        rule.status === 'active'
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

  private runMutation(ruleId: string, request: Observable<unknown>): void {
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

  private refreshRules(): void {
    this.ruleService.list().subscribe({
      next: (rules) => this.rules.set(rules),
      error: () => this.loadState.set('error'),
    });
  }
}
