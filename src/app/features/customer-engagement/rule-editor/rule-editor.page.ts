import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PageHeader } from '../../../layout/page-header/page-header.component';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.model';

@Component({
  selector: 'app-rule-editor-page',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-editor.page.html',
  styleUrl: './rule-editor.page.scss',
})
export class RuleEditorPage {
  private readonly router = inject(Router);

  private readonly isCreate = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isCreateUrl(this.router.url)),
      startWith(this.isCreateUrl(this.router.url)),
    ),
    { initialValue: this.isCreateUrl(this.router.url) },
  );

  protected readonly title = computed(() => (this.isCreate() ? 'Create Rule' : 'Edit Rule'));

  protected readonly description = computed(() =>
    this.isCreate()
      ? 'Define who should receive a communication and when it should be triggered.'
      : '',
  );

  protected readonly breadcrumbs = computed((): BreadcrumbItem[] => [
    { label: 'Customer Engagement' },
    { label: 'Rules', routerLink: '/engagement/rules' },
    { label: this.isCreate() ? 'Create rule' : 'Edit rule' },
  ]);

  private isCreateUrl(url: string): boolean {
    return url.split('?')[0] === '/engagement/rules/new';
  }
}
