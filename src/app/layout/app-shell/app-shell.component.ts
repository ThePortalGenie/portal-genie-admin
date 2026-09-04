import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NAV_DRAWER_MEDIA } from '../nav.config';
import { Sidebar } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isNarrow = signal(false);
  readonly sidebarOpen = signal(false);

  constructor() {
    const media = window.matchMedia(NAV_DRAWER_MEDIA);
    this.isNarrow.set(media.matches);
    const onChange = (event: MediaQueryListEvent): void => {
      this.isNarrow.set(event.matches);
      if (!event.matches) {
        this.sidebarOpen.set(false);
      }
    };
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.isNarrow()) {
          this.sidebarOpen.set(false);
        }
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isNarrow() && this.sidebarOpen()) {
      this.closeSidebar();
    }
  }
}
