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
import { RuleGroupService } from '../../../core/data/rule-group.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { RuleGroup } from '../../../core/domain/rule-group';
import { RULE_STATUS_LABELS, RULE_STATUSES } from '../../../core/domain/rule-status';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { FROM_JOURNEY_PARAM } from '../rule-editor/editor-navigation';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { SearchField } from '../../../shared/ui/search-field/search-field.component';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge.component';
import { Rule } from '../models/rule.model';
import { RuleActionsMenu } from './rule-actions-menu.component';
import {
  AUTOMATED_JOURNEY_GROUP_IDS,
  buildGlobalJourney,
  DEFAULT_GLOBAL_JOURNEY_FILTERS,
  isGlobalJourneyFiltered,
} from './global-journey';
import { RULE_FILTER_ALL, RuleStatusFilter } from './rule-list.filters';

type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-global-journey-page',
  imports: [
    PageHeader,
    UiButton,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    SearchField,
    StatusBadge,
    RouterLink,
    RuleActionsMenu,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-journey.page.html',
  styleUrl: './global-journey.page.scss',
})
export class GlobalJourneyPage {
  private readonly router = inject(Router);
  private readonly ruleService = inject(RuleService);
  private readonly ruleGroupService = inject(RuleGroupService);
  private readonly templateService = inject(TemplateService);
  private readonly metricCatalogService = inject(MetricCatalogService);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  protected readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'Customer Engagement' },
    { label: 'Rules', routerLink: '/engagement/rules' },
    { label: 'Global journey' },
  ];

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly rules = signal<Rule[]>([]);
  protected readonly groups = signal<readonly RuleGroup[]>([]);
  protected readonly templates = signal<readonly CommunicationTemplate[]>([]);
  protected readonly metrics = signal<readonly CustomerMetric[]>([]);
  protected readonly query = signal(DEFAULT_GLOBAL_JOURNEY_FILTERS.query);
  protected readonly statusFilter = signal<RuleStatusFilter>(DEFAULT_GLOBAL_JOURNEY_FILTERS.status);
  protected readonly groupFilter = signal<string>(DEFAULT_GLOBAL_JOURNEY_FILTERS.groupId);
  protected readonly pendingRuleId = signal<string | null>(null);

  protected readonly statusFilterOptions = [
    { id: RULE_FILTER_ALL, label: 'All' },
    ...RULE_STATUSES.map((id) => ({ id, label: RULE_STATUS_LABELS[id] })),
  ];

  protected readonly groupFilterOptions = computed(() => [
    { id: RULE_FILTER_ALL, label: 'All' },
    ...this.groups()
      .filter((group) => (AUTOMATED_JOURNEY_GROUP_IDS as readonly string[]).includes(group.id))
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((group) => ({ id: group.id, label: group.name })),
  ]);

  private readonly filters = computed(() => ({
    query: this.query(),
    status: this.statusFilter(),
    groupId: this.groupFilter(),
  }));

  protected readonly filtered = computed(() => isGlobalJourneyFiltered(this.filters()));

  protected readonly view = computed(() =>
    buildGlobalJourney({
      rules: this.rules(),
      groups: this.groups(),
      metrics: this.metrics(),
      templates: this.templates(),
      filters: this.filters(),
    }),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadState.set('loading');
    forkJoin({
      rules: this.ruleService.list(),
      groups: this.ruleGroupService.list(),
      templates: this.templateService.list(),
      metrics: this.metricCatalogService.list(),
    }).subscribe({
      next: ({ rules, groups, templates, metrics }) => {
        this.rules.set(rules);
        this.groups.set(groups);
        this.templates.set(templates);
        this.metrics.set(metrics);
        this.loadState.set('loaded');
      },
      error: () => this.loadState.set('error'),
    });
  }

  protected backToRules(): void {
    void this.router.navigate(['/engagement/rules']);
  }

  protected editRule(rule: Rule): void {
    void this.router.navigate(['/engagement/rules', rule.id], {
      queryParams: { [FROM_JOURNEY_PARAM]: '1' },
    });
  }

  protected onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as RuleStatusFilter);
  }

  protected onGroupFilterChange(event: Event): void {
    this.groupFilter.set((event.target as HTMLSelectElement).value);
  }

  protected clearFilters(): void {
    this.query.set(DEFAULT_GLOBAL_JOURNEY_FILTERS.query);
    this.statusFilter.set(DEFAULT_GLOBAL_JOURNEY_FILTERS.status);
    this.groupFilter.set(DEFAULT_GLOBAL_JOURNEY_FILTERS.groupId);
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
        this.ruleService.list().subscribe({
          next: (rules) => this.rules.set(rules),
          error: () => this.loadState.set('error'),
        });
      },
      error: () => {
        this.pendingRuleId.set(null);
      },
    });
  }
}
