import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal, } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NAV_DRAWER_MEDIA } from '../nav.config';
import { Sidebar } from '../sidebar/sidebar.component';
let AppShell = class AppShell {
    router = inject(Router);
    destroyRef = inject(DestroyRef);
    isNarrow = signal(false);
    sidebarOpen = signal(false);
    constructor() {
        const media = window.matchMedia(NAV_DRAWER_MEDIA);
        this.isNarrow.set(media.matches);
        const onChange = (event) => {
            this.isNarrow.set(event.matches);
            if (!event.matches) {
                this.sidebarOpen.set(false);
            }
        };
        media.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed())
            .subscribe(() => {
            if (this.isNarrow()) {
                this.sidebarOpen.set(false);
            }
        });
    }
    toggleSidebar() {
        this.sidebarOpen.update((open) => !open);
    }
    closeSidebar() {
        this.sidebarOpen.set(false);
    }
    onEscape() {
        if (this.isNarrow() && this.sidebarOpen()) {
            this.closeSidebar();
        }
    }
};
__decorate([
    HostListener('document:keydown.escape')
], AppShell.prototype, "onEscape", null);
AppShell = __decorate([
    Component({
        selector: 'app-shell',
        imports: [RouterOutlet, Sidebar],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './app-shell.component.html',
        styleUrl: './app-shell.component.scss',
    })
], AppShell);
export { AppShell };
