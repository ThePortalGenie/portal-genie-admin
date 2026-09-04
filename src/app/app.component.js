import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
let App = class App {
};
App = __decorate([
    Component({
        imports: [RouterOutlet],
        selector: 'app-root',
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './app.component.html',
        styleUrl: './app.component.scss',
    })
], App);
export { App };
