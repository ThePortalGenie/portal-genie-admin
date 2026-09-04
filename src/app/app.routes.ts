import { Routes } from '@angular/router';
import { customerEngagementRoutes } from './features/customer-engagement/customer-engagement.routes';
import { AppShell } from './layout/app-shell/app-shell.component';
import { NotFoundPage } from './pages/not-found/not-found.page';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'engagement/rules' },
      { path: 'engagement', children: customerEngagementRoutes },
      { path: '**', component: NotFoundPage },
    ],
  },
];
