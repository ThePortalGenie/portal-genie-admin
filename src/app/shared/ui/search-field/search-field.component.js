import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
let searchFieldId = 0;
let SearchField = class SearchField {
    label = input('Search');
    placeholder = input('');
    value = input('');
    valueChange = output();
    fieldId = `ui-search-${++searchFieldId}`;
    onInput(event) {
        this.valueChange.emit(event.target.value);
    }
};
SearchField = __decorate([
    Component({
        selector: 'ui-search-field',
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './search-field.component.html',
        styleUrl: './search-field.component.scss',
    })
], SearchField);
export { SearchField };
