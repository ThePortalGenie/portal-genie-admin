import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { customerEngagementNav } from '../nav.config';
let Sidebar = class Sidebar {
    open = input(true);
    asDrawer = input(false);
    closeNav = output();
    items = customerEngagementNav;
    onNavigate() {
        if (this.asDrawer()) {
            this.closeNav.emit();
        }
    }
};
Sidebar = __decorate([
    Component({
        selector: 'app-sidebar',
        imports: [RouterLink, RouterLinkActive],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './sidebar.component.html',
        styleUrl: './sidebar.component.scss',
    })
], Sidebar);
export { Sidebar };
