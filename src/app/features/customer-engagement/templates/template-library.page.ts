import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeader } from '../../../layout/page-header/page-header.component';

@Component({
  selector: 'app-template-library-page',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-library.page.html',
  styleUrl: './template-library.page.scss',
})
export class TemplateLibraryPage {}
