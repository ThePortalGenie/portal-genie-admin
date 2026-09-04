import { Routes } from '@angular/router';
import { RuleEditorPage } from './rule-editor/rule-editor.page';
import { GlobalJourneyPage } from './rules/global-journey.page';
import { RuleGroupPage } from './rules/rule-group.page';
import { RulesListPage } from './rules/rules-list.page';
import { TemplateLibraryPage } from './templates/template-library.page';

export const customerEngagementRoutes: Routes = [
  {
    path: 'rules',
    children: [
      { path: '', pathMatch: 'full', component: RulesListPage },
      { path: 'new', component: RuleEditorPage },
      { path: 'journey', component: GlobalJourneyPage },
      { path: 'group/:groupId', component: RuleGroupPage },
      { path: ':id', component: RuleEditorPage },
    ],
  },
  { path: 'templates', component: TemplateLibraryPage },
];
