import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { MetricCatalogService } from '../../../core/data/metric-catalog.service';
import { RuleGroupService } from '../../../core/data/rule-group.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { CustomerMetric } from '../../../core/domain/metric.types';
import { RULE_CATEGORY_LABELS } from '../../../core/domain/rule-category';
import { RuleGroup } from '../../../core/domain/rule-group';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { SearchField } from '../../../shared/ui/search-field/search-field.component';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge.component';
import { Rule } from '../models/rule.model';
import { summariseJourneyItem } from '../validation/rule-summary';
import { filterRules, RULE_FILTER_ALL } from './rule-list.filters';
import { RuleActionsMenu } from './rule-actions-menu.component';
import { rulesForGroup } from './rule-group.helpers';

type LoadState = 'loading' | 'loaded' | 'error' | 'not-found';

type JourneyRow = {
  rule: Rule;
  indexLabel: string;
  timing: string;
  eligibility: string;
  templateName: string;
  categoryLabel: string;
};

@Component({
  selector: 'app-rule-group-page',
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
  templateUrl: './rule-group.page.html',
  styleUrl: './rule-group.page.scss',
})
export class RuleGroupPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ruleService = inject(RuleService);
  private readonly ruleGroupService = inject(RuleGroupService);
  private readonly templateService = inject(TemplateService);
  private readonly metricCatalogService = inject(MetricCatalogService);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  private readonly groupId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('groupId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('groupId') ?? '' },
  );

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly group = signal<RuleGroup | null>(null);
  protected readonly rules = signal<Rule[]>([]);
  protected readonly templates = signal<readonly CommunicationTemplate[]>([]);
  protected readonly metrics = signal<readonly CustomerMetric[]>([]);
  protected readonly query = signal('');
  protected readonly pendingRuleId = signal<string | null>(null);

  protected readonly breadcrumbs = computed((): BreadcrumbItem[] => [
    { label: 'Customer Engagement' },
    { label: 'Rules', routerLink: '/engagement/rules' },
    { label: this.group()?.name ?? 'Rule group' },
  ]);

  private readonly templateNameById = computed(() => {
    const names = new Map<string, string>();
    for (const template of this.templates()) {
      names.set(template.id, template.name);
    }
    return names;
  });

  protected readonly groupRules = computed(() => rulesForGroup(this.rules(), this.groupId()));

  protected readonly visibleRules = computed(() => {
    const members = this.groupRules();
    const query = this.query().trim();
    if (!query) {
      return members;
    }
    const filtered = filterRules(
      members,
      { query, status: RULE_FILTER_ALL, category: RULE_FILTER_ALL },
      this.templateNameById(),
    );
    return rulesForGroup(filtered, this.groupId());
  });

  protected readonly rows = computed((): JourneyRow[] => {
    const metrics = this.metrics();
    const templateNames = this.templateNameById();

    return this.visibleRules().map((rule) => {
      const summary = summariseJourneyItem(rule, metrics);
      return {
        rule,
        indexLabel: String(rule.sequenceOrder).padStart(2, '0'),
        timing: summary.timing,
        eligibility: summary.eligibility,
        templateName: templateNames.get(rule.templateId) ?? 'Unknown template',
        categoryLabel: RULE_CATEGORY_LABELS[rule.category] ?? rule.category,
      };
    });
  });

  constructor() {
    effect(() => {
      const id = this.groupId();
      untracked(() => {
        if (id) {
          this.load();
        }
      });
    });
  }

  protected load(): void {
    const id = this.groupId();
    if (!id) {
      this.loadState.set('not-found');
      return;
    }

    this.loadState.set('loading');
    forkJoin({
      group: this.ruleGroupService.getById(id),
      rules: this.ruleService.list(),
      templates: this.templateService.list(),
      metrics: this.metricCatalogService.list(),
    }).subscribe({
      next: ({ group, rules, templates, metrics }) => {
        this.group.set(group);
        this.rules.set(rules);
        this.templates.set(templates);
        this.metrics.set(metrics);
        this.loadState.set('loaded');
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : '';
        this.loadState.set(message.toLowerCase().includes('not found') ? 'not-found' : 'error');
      },
    });
  }

  protected createRule(): void {
    void this.router.navigate(['/engagement/rules/new'], {
      queryParams: { group: this.groupId() },
    });
  }

  protected backToRules(): void {
    void this.router.navigate(['/engagement/rules']);
  }

  protected editRule(rule: Rule): void {
    void this.router.navigate(['/engagement/rules', rule.id], {
      queryParams: { fromGroup: this.groupId() },
    });
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
