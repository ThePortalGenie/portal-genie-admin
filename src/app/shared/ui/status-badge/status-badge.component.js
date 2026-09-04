import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RULE_STATUS_LABELS } from '../../../core/domain/rule-status';
let StatusBadge = class StatusBadge {
    status = input.required();
    labels = RULE_STATUS_LABELS;
};
StatusBadge = __decorate([
    Component({
        selector: 'ui-status-badge',
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './status-badge.component.html',
        styleUrl: './status-badge.component.scss',
    })
], StatusBadge);
export { StatusBadge };
