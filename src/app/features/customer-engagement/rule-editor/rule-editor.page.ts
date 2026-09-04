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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, startWith } from 'rxjs';
import { MetricCatalogService } from '../../../core/data/metric-catalog.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { CustomerMetric, MetricOperator, TimingDirection } from '../../../core/domain/metric.types';
import { RULE_CATEGORY_OPTIONS } from '../../../core/domain/rule-category';
import { RULE_STATUS_LABELS, RULE_STATUSES } from '../../../core/domain/rule-status';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ConditionValue, LogicalOperator, RuleDraft, RuleTiming } from '../models/rule.model';
import { ValidationIssue, ValidationResult } from '../models/validation.model';
import { summariseRuleDraft } from '../validation/editor-summary';
import { validateRuleDraft } from '../validation/rule-validator';
import { timingAnchorMetrics } from './condition-draft.helpers';
import { ConditionFormGroup } from './condition-form';
import { ConditionList } from './condition-list.component';
import {
  draftFromRule,
  draftsAreEqual,
  emptyConditionDraft,
  emptyRuleDraft,
  newConditionId,
} from './rule-draft.helpers';
import { RuleSummaryCard } from './rule-summary-card.component';
import { TemplatePicker } from './template-picker.component';
import { TimingFields } from './timing-fields.component';

type EditorLoadState = 'loading' | 'ready' | 'error' | 'not-found';

@Component({
  selector: 'app-rule-editor-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    UiButton,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    ValidationMessage,
    ConditionList,
    TimingFields,
    TemplatePicker,
    RuleSummaryCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-editor.page.html',
  styleUrl: './rule-editor.page.scss',
})
export class RuleEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ruleService = inject(RuleService);
  private readonly templateService = inject(TemplateService);
  private readonly metricCatalogService = inject(MetricCatalogService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  private groupId = newConditionId();

  protected readonly categoryOptions = RULE_CATEGORY_OPTIONS;
  protected readonly statuses = RULE_STATUSES;
  protected readonly statusLabels = RULE_STATUS_LABELS;

  protected readonly loadState = signal<EditorLoadState>('loading');
  protected readonly metrics = signal<readonly CustomerMetric[]>([]);
  protected readonly templates = signal<readonly CommunicationTemplate[]>([]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  private readonly initialDraft = signal(emptyRuleDraft());

  private readonly ruleId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  protected readonly isCreate = computed(() => this.ruleId() === null);

  protected readonly form = this.fb.group({
    name: '',
    description: '',
    category: this.fb.control<RuleDraft['category']>(''),
    status: this.fb.control<RuleDraft['status']>('disabled'),
    combinator: this.fb.control<LogicalOperator>('and'),
    conditions: this.fb.array<ConditionFormGroup>([]),
    templateId: '',
    timingKind: this.fb.control<'on_match' | 'relative'>('on_match'),
    timingAnchor: '',
    timingDirection: this.fb.control<TimingDirection | ''>(''),
    timingDays: new FormControl<number | null>(0),
  });

  protected readonly title = computed(() => (this.isCreate() ? 'Create Rule' : 'Edit Rule'));
  protected readonly description =
    'Define who should qualify, when the communication should send, and which template to use.';
  protected readonly breadcrumbs = computed((): BreadcrumbItem[] => [
    { label: 'Customer Engagement' },
    { label: 'Rules', routerLink: '/engagement/rules' },
    { label: this.isCreate() ? 'Create rule' : 'Edit rule' },
  ]);

  protected readonly draft = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.toDraft()),
    ),
    { initialValue: emptyRuleDraft() },
  );

  protected readonly validation = computed((): ValidationResult =>
    validateRuleDraft(this.draft(), this.metrics(), this.templates()),
  );

  protected readonly summary = computed(() =>
    summariseRuleDraft(this.draft(), this.metrics(), this.templates()),
  );

  protected readonly dirty = computed(() => !draftsAreEqual(this.draft(), this.initialDraft()));
  protected readonly canSave = computed(() => this.validation().isValid && !this.saving());
  protected readonly allIssues = computed(() => [
    ...this.validation().errors,
    ...this.validation().warnings,
  ]);

  constructor() {
    this.form.controls.timingKind.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((kind) => {
        if (kind === 'relative') {
          this.ensureRelativeDefaults();
        }
      });

    this.form.controls.timingAnchor.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ensureDirectionForAnchor());

    effect(() => {
      const id = this.ruleId();
      untracked(() => this.reload(id));
    });
  }

  protected get conditions(): FormArray<ConditionFormGroup> {
    return this.form.controls.conditions;
  }

  protected fieldError(path: string): ValidationIssue | undefined {
    const control =
      path === 'name' ? this.form.controls.name : path === 'category' ? this.form.controls.category : null;
    if (!this.submitted() && control && !control.touched) {
      return undefined;
    }
    return this.validation().errors.find((issue) => issue.path === path);
  }

  protected addCondition(): void {
    this.conditions.push(this.conditionGroup(emptyConditionDraft()));
  }

  protected removeCondition(index: number): void {
    this.conditions.removeAt(index);
  }

  protected retry(): void {
    this.reload(this.ruleId());
  }

  protected async cancel(): Promise<void> {
    if (this.dirty()) {
      const confirmed = await this.confirmDialog().open({
        title: 'Discard unsaved changes?',
        message: 'Your changes to this rule will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }
    void this.router.navigate(['/engagement/rules']);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.saveError.set(false);
    if (!this.validation().isValid) {
      return;
    }

    this.saving.set(true);
    const draft = this.toDraft();
    const id = this.ruleId();
    const request = id ? this.ruleService.update(id, draft) : this.ruleService.create(draft);

    request.subscribe({
      next: () => {
        void this.router.navigate(['/engagement/rules']);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  private reload(id: string | null): void {
    this.loadState.set('loading');
    this.saveError.set(false);
    this.submitted.set(false);

    const catalogs$ = forkJoin({
      metrics: this.metricCatalogService.list(),
      templates: this.templateService.list(),
    });

    if (!id) {
      catalogs$.subscribe({
        next: ({ metrics, templates }) => {
          this.metrics.set(metrics);
          this.templates.set(templates);
          this.applyDraft(emptyRuleDraft());
          this.loadState.set('ready');
        },
        error: () => this.loadState.set('error'),
      });
      return;
    }

    forkJoin({
      metrics: this.metricCatalogService.list(),
      templates: this.templateService.list(),
      rule: this.ruleService.getById(id),
    }).subscribe({
      next: ({ metrics, templates, rule }) => {
        this.metrics.set(metrics);
        this.templates.set(templates);
        this.applyDraft(draftFromRule(rule));
        this.loadState.set('ready');
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : '';
        this.loadState.set(message.toLowerCase().includes('not found') ? 'not-found' : 'error');
      },
    });
  }

  private applyDraft(draft: RuleDraft): void {
    this.groupId = draft.rootGroup.id;
    this.conditions.clear();
    const children = draft.rootGroup.children.length
      ? draft.rootGroup.children
      : [emptyConditionDraft()];
    for (const child of children) {
      this.conditions.push(this.conditionGroup(child));
    }

    const relative = draft.timing.mode !== 'on_match';
    this.form.patchValue({
      name: draft.name,
      description: draft.description,
      category: draft.category,
      status: draft.status,
      combinator: draft.rootGroup.combinator,
      templateId: draft.templateId,
      timingKind: relative ? 'relative' : 'on_match',
      timingAnchor: draft.timing.anchorMetricKey ?? '',
      timingDirection:
        draft.timing.mode === 'days_before_date'
          ? 'before'
          : draft.timing.mode === 'days_after_date'
            ? 'after'
            : '',
      timingDays: draft.timing.delayDays ?? 0,
    });
    if (relative) {
      this.ensureRelativeDefaults();
    }
    this.form.markAsPristine();
    this.initialDraft.set(this.toDraft());
  }

  private conditionGroup(condition: {
    id: string;
    metricKey: string;
    operator: MetricOperator | '';
    value: ConditionValue;
  }): ConditionFormGroup {
    return this.fb.group({
      id: condition.id,
      metricKey: condition.metricKey,
      operator: this.fb.control<MetricOperator | ''>(condition.operator),
      value: new FormControl<ConditionValue>(condition.value),
    }) as ConditionFormGroup;
  }

  private toDraft(): RuleDraft {
    const value = this.form.getRawValue();
    const timing: RuleTiming =
      value.timingKind === 'on_match'
        ? { mode: 'on_match' }
        : {
            mode: value.timingDirection === 'before' ? 'days_before_date' : 'days_after_date',
            delayDays: value.timingDays ?? undefined,
            anchorMetricKey: value.timingAnchor || undefined,
          };

    return {
      name: value.name,
      description: value.description,
      category: value.category,
      status: value.status,
      rootGroup: {
        id: this.groupId,
        combinator: value.combinator,
        children: value.conditions.map((child) => ({
          id: child.id,
          metricKey: child.metricKey,
          operator: child.operator,
          value: child.value ?? null,
        })),
      },
      templateId: value.templateId,
      timing,
    };
  }

  private ensureRelativeDefaults(): void {
    const anchors = timingAnchorMetrics(this.metrics());
    if (!anchors.length) {
      return;
    }
    const current = this.form.controls.timingAnchor.value;
    const anchor = anchors.find((item) => item.key === current) ?? anchors[0];
    this.form.controls.timingAnchor.setValue(anchor.key, { emitEvent: false });
    this.ensureDirectionForAnchor();
    if (this.form.controls.timingDays.value === null) {
      this.form.controls.timingDays.setValue(0);
    }
  }

  private ensureDirectionForAnchor(): void {
    const key = this.form.controls.timingAnchor.value;
    const metric = timingAnchorMetrics(this.metrics()).find((item) => item.key === key);
    const allowed = metric?.timingDirections ?? [];
    const current = this.form.controls.timingDirection.value;
    if (!current || !allowed.includes(current)) {
      this.form.controls.timingDirection.setValue(allowed[0] ?? '');
    }
  }
}
