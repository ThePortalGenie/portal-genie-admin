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
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, startWith } from 'rxjs';
import { MetricCatalogService } from '../../../core/data/metric-catalog.service';
import { RuleGroupService } from '../../../core/data/rule-group.service';
import { RuleService } from '../../../core/data/rule.service';
import { TemplateService } from '../../../core/data/template.service';
import { CustomerMetric, MetricOperator, TimingDirection } from '../../../core/domain/metric.types';
import { RULE_CATEGORY_OPTIONS } from '../../../core/domain/rule-category';
import { isAnnouncementGroup, RuleGroup } from '../../../core/domain/rule-group';
import { RULE_STATUS_LABELS, RULE_STATUSES } from '../../../core/domain/rule-status';
import { CommunicationTemplate } from '../../../core/domain/template.types';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.model';
import { UiButton } from '../../../shared/ui/button/button.component';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorState } from '../../../shared/ui/error-state/error-state.component';
import { ValidationMessage } from '../../../shared/ui/validation-message/validation-message.component';
import { ConditionValue, LogicalOperator, Rule, RuleDraft } from '../models/rule.model';
import { ValidationIssue, ValidationResult } from '../models/validation.model';
import { previewRuleDraft } from '../validation/editor-summary';
import { validateRuleDraft } from '../validation/rule-validator';
import { ConditionFormGroup } from './condition-form';
import { ConditionList } from './condition-list.component';
import {
  buildJourneySequence,
  clampPlacementIndex,
  sequenceOrderFromVisualIndex,
  siblingRulesForGroup,
  visualIndexFromSequence,
} from '../rules/journey-sequence';
import {
  announcementTimingFromParts,
  formatScheduledLong,
  localTimeZoneLabel,
  schedulePartsFromIso,
  showsJourneySequencePanel,
  timingForGroupChange,
} from '../rules/announcement-schedule';
import { draftForCreate, sequenceForGroupChange } from './create-defaults';
import { editorReturnCommands, editorReturnContext } from './editor-navigation';
import { JourneySequencePanel } from './journey-sequence-panel.component';
import {
  draftPartsFromEditorRows,
  editorRowFromCondition,
  editorRowsFromDraft,
  extraLifecycleIssues,
  type EditorConditionRow,
} from './lifecycle-authoring';
import {
  draftFromRule,
  draftsAreEqual,
  emptyConditionDraft,
  emptyRuleDraft,
  newConditionId,
} from './rule-draft.helpers';
import { RuleSummaryCard } from './rule-summary-card.component';
import { TemplatePicker } from './template-picker.component';

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
    TemplatePicker,
    RuleSummaryCard,
    JourneySequencePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-editor.page.html',
  styleUrl: './rule-editor.page.scss',
})
export class RuleEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ruleService = inject(RuleService);
  private readonly ruleGroupService = inject(RuleGroupService);
  private readonly templateService = inject(TemplateService);
  private readonly metricCatalogService = inject(MetricCatalogService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  private rootGroupId = newConditionId();

  protected readonly categoryOptions = RULE_CATEGORY_OPTIONS;
  protected readonly statuses = RULE_STATUSES;
  protected readonly statusLabels = RULE_STATUS_LABELS;

  protected readonly loadState = signal<EditorLoadState>('loading');
  protected readonly metrics = signal<readonly CustomerMetric[]>([]);
  protected readonly templates = signal<readonly CommunicationTemplate[]>([]);
  protected readonly groups = signal<readonly RuleGroup[]>([]);
  protected readonly existingRules = signal<Rule[]>([]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  private readonly initialDraft = signal(emptyRuleDraft());
  private readonly placementIndex = signal(0);

  private readonly ruleId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });

  protected readonly isCreate = computed(() => this.ruleId() === null);

  private readonly returnContext = toSignal(
    this.route.queryParamMap.pipe(map((params) => editorReturnContext(params))),
    {
      initialValue: editorReturnContext(this.route.snapshot.queryParamMap),
    },
  );

  protected readonly breadcrumbs = computed((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Customer Engagement' },
      { label: 'Rules', routerLink: '/engagement/rules' },
    ];
    const context = this.returnContext();
    if (context.fromJourney) {
      items.push({
        label: 'Global journey',
        routerLink: '/engagement/rules/journey',
      });
    } else {
      const group = this.groups().find((item) => item.id === context.groupId);
      if (group) {
        items.push({
          label: group.name,
          routerLink: `/engagement/rules/group/${group.id}`,
        });
      }
    }
    items.push({ label: this.isCreate() ? 'Create rule' : 'Edit rule' });
    return items;
  });

  protected readonly form = this.fb.group({
    name: '',
    description: '',
    category: this.fb.control<RuleDraft['category']>(''),
    groupId: '',
    sequenceOrder: this.fb.control<number | null>(null),
    status: this.fb.control<RuleDraft['status']>('disabled'),
    combinator: this.fb.control<LogicalOperator>('and'),
    conditions: this.fb.array<ConditionFormGroup>([]),
    templateId: '',
    scheduleDate: '',
    scheduleTime: '',
  });

  protected readonly title = computed(() => (this.isCreate() ? 'Create Rule' : 'Edit Rule'));
  protected readonly description =
    'Describe who this is for, when it should happen, and which communication to send.';

  protected readonly draft = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.toDraft()),
    ),
    { initialValue: emptyRuleDraft() },
  );

  protected readonly isAnnouncement = computed(() => isAnnouncementGroup(this.draft().groupId));
  protected readonly showJourneySequence = computed(() =>
    showsJourneySequencePanel(this.draft().groupId),
  );
  protected readonly timeZoneLabel = localTimeZoneLabel();

  protected readonly scheduleSummary = computed(() => {
    const scheduledAt = this.draft().timing.scheduledAt;
    return scheduledAt ? formatScheduledLong(scheduledAt) : '';
  });

  protected readonly validation = computed((): ValidationResult => {
    const draft = this.draft();
    const announcement = isAnnouncementGroup(draft.groupId);
    const mapped = validateRuleDraft(draft, this.metrics(), this.templates(), {
      isCreate: this.isCreate(),
      originalScheduledAt: this.initialDraft().timing.scheduledAt,
      scheduleParts: announcement
        ? {
            date: this.form.controls.scheduleDate.value,
            time: this.form.controls.scheduleTime.value,
          }
        : undefined,
    });
    const extras = announcement ? [] : extraLifecycleIssues(this.editorRows(), this.metrics());
    return {
      errors: [...mapped.errors, ...extras],
      warnings: mapped.warnings,
      isValid: mapped.isValid && extras.length === 0,
    };
  });

  protected readonly preview = computed(() =>
    previewRuleDraft(this.draft(), this.metrics(), this.templates()),
  );

  protected readonly journeyView = computed(() =>
    buildJourneySequence({
      groupId: this.draft().groupId,
      groups: this.groups(),
      rules: this.existingRules(),
      currentRuleId: this.ruleId(),
      draft: this.draft(),
      placementIndex: this.placementIndex(),
      isCreate: this.isCreate(),
    }),
  );

  protected readonly dirty = computed(() => !draftsAreEqual(this.draft(), this.initialDraft()));
  protected readonly canSave = computed(() => this.validation().isValid && !this.saving());
  protected readonly allIssues = computed(() => [
    ...this.validation().errors,
    ...this.validation().warnings,
  ]);

  constructor() {
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
      path === 'name'
        ? this.form.controls.name
        : path === 'category'
          ? this.form.controls.category
          : path === 'groupId'
            ? this.form.controls.groupId
            : path === 'timing.scheduledDate'
              ? this.form.controls.scheduleDate
              : path === 'timing.scheduledTime'
                ? this.form.controls.scheduleTime
                : null;
    if (!this.submitted() && control && !control.touched) {
      return undefined;
    }
    return this.validation().errors.find((issue) => issue.path === path);
  }

  protected scheduleIssue(path: string): ValidationIssue | undefined {
    const warning = this.validation().warnings.find((issue) => issue.path === path);
    if (warning) {
      return warning;
    }
    return this.fieldError(path);
  }

  protected onGroupChange(): void {
    const nextGroupId = this.form.controls.groupId.value;
    const nextTiming = timingForGroupChange(nextGroupId, this.initialDraft().timing);
    if (!isAnnouncementGroup(nextGroupId) || nextTiming.mode !== 'scheduled_once') {
      this.form.patchValue({ scheduleDate: '', scheduleTime: '' });
    } else {
      const parts = schedulePartsFromIso(nextTiming.scheduledAt);
      this.form.patchValue({ scheduleDate: parts.date, scheduleTime: parts.time });
    }

    if (!nextGroupId) {
      this.form.controls.sequenceOrder.setValue(null);
      this.placementIndex.set(0);
      return;
    }
    const sequence = sequenceForGroupChange(
      this.existingRules(),
      nextGroupId,
      this.initialDraft().groupId,
      this.form.controls.sequenceOrder.value,
    );
    this.form.controls.sequenceOrder.setValue(sequence);
    this.syncPlacementIndex(nextGroupId, sequence);
  }

  protected moveCurrentToIndex(index: number): void {
    const next = clampPlacementIndex(index, this.journeyView().items.length);
    this.placementIndex.set(next);
    this.form.controls.sequenceOrder.setValue(sequenceOrderFromVisualIndex(next));
    this.form.controls.sequenceOrder.markAsDirty();
  }

  protected addCondition(): void {
    this.conditions.push(this.conditionGroup(editorRowFromCondition(emptyConditionDraft())));
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
    void this.router.navigate(this.returnCommands());
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
        void this.router.navigate(this.returnCommands());
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
      groups: this.ruleGroupService.list(),
      rules: this.ruleService.list(),
    });

    if (!id) {
      catalogs$.subscribe({
        next: ({ metrics, templates, groups, rules }) => {
          this.metrics.set(metrics);
          this.templates.set(templates);
          this.groups.set(groups);
          this.existingRules.set(rules);
          this.applyDraft(
            draftForCreate({
              groupId: this.route.snapshot.queryParamMap.get('group'),
              groups,
              rules,
            }),
          );
          this.loadState.set('ready');
        },
        error: () => this.loadState.set('error'),
      });
      return;
    }

    forkJoin({
      metrics: this.metricCatalogService.list(),
      templates: this.templateService.list(),
      groups: this.ruleGroupService.list(),
      rules: this.ruleService.list(),
      rule: this.ruleService.getById(id),
    }).subscribe({
      next: ({ metrics, templates, groups, rules, rule }) => {
        this.metrics.set(metrics);
        this.templates.set(templates);
        this.groups.set(groups);
        this.existingRules.set(rules);
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
    this.rootGroupId = draft.rootGroup.id;
    this.conditions.clear();
    for (const row of editorRowsFromDraft(draft, this.metrics())) {
      this.conditions.push(this.conditionGroup(row));
    }

    const schedule = schedulePartsFromIso(
      draft.timing.mode === 'scheduled_once' ? draft.timing.scheduledAt : undefined,
    );
    this.form.patchValue({
      name: draft.name,
      description: draft.description,
      category: draft.category,
      groupId: draft.groupId,
      sequenceOrder: draft.sequenceOrder,
      status: draft.status,
      combinator: draft.rootGroup.combinator,
      templateId: draft.templateId,
      scheduleDate: schedule.date,
      scheduleTime: schedule.time,
    });
    this.syncPlacementIndex(draft.groupId, draft.sequenceOrder);
    this.form.markAsPristine();
    this.initialDraft.set(this.toDraft());
  }

  private syncPlacementIndex(groupId: string, sequenceOrder: number | null): void {
    const others = siblingRulesForGroup(this.existingRules(), groupId, this.ruleId());
    this.placementIndex.set(visualIndexFromSequence(others, sequenceOrder));
  }

  private conditionGroup(row: EditorConditionRow): ConditionFormGroup {
    return this.fb.group({
      id: row.id,
      metricKey: row.metricKey,
      operator: this.fb.control<MetricOperator | ''>(row.operator),
      value: new FormControl<ConditionValue>(row.value),
      offsetDays: new FormControl<number | null>(row.offsetDays),
      timingDirection: this.fb.control<TimingDirection | ''>(row.timingDirection),
    }) as ConditionFormGroup;
  }

  private toDraft(): RuleDraft {
    const value = this.form.getRawValue();
    const announcement = isAnnouncementGroup(value.groupId);
    const { children, timing } = draftPartsFromEditorRows(this.editorRows(), this.metrics(), {
      extractLifecycleTiming: !announcement,
    });
    const resolvedTiming = announcement
      ? announcementTimingFromParts(value.scheduleDate, value.scheduleTime)
      : timing.mode === 'scheduled_once'
        ? { mode: 'on_match' as const }
        : timing;

    return {
      name: value.name,
      description: value.description,
      category: value.category,
      groupId: value.groupId,
      sequenceOrder: coerceSequenceOrder(value.sequenceOrder),
      status: value.status,
      rootGroup: {
        id: this.rootGroupId,
        combinator: value.combinator,
        children,
      },
      templateId: value.templateId,
      timing: resolvedTiming,
    };
  }

  private returnCommands(): string[] {
    return editorReturnCommands(this.returnContext());
  }

  private editorRows(): EditorConditionRow[] {
    return this.form.getRawValue().conditions.map((row) => ({
      id: row.id,
      metricKey: row.metricKey,
      operator: row.operator,
      value: row.value ?? null,
      offsetDays: row.offsetDays,
      timingDirection: row.timingDirection,
    }));
  }
}

function coerceSequenceOrder(value: number | string | null): number | null {
  if (value === null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
