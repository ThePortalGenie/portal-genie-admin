import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb.component';
import { BreadcrumbItem } from '../../shared/ui/breadcrumb/breadcrumb.model';

@Component({
  selector: 'app-page-header',
  imports: [Breadcrumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly breadcrumbs = input<readonly BreadcrumbItem[]>([]);
}
