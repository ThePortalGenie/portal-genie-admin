import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { customerEngagementNav } from '../nav.config';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class Sidebar {
  readonly open = input(true);
  readonly asDrawer = input(false);
  readonly closeNav = output<void>();

  readonly items = customerEngagementNav;

  protected onNavigate(): void {
    if (this.asDrawer()) {
      this.closeNav.emit();
    }
  }
}
