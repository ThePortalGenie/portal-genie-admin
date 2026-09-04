import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { nextDuplicateName } from '../../domain/rule-naming';
import { isRuleConditionGroup, } from '../../../features/customer-engagement/models/rule.model';
import { RuleService } from '../rule.service';
import { RULE_FIXTURES } from './fixtures/rules.fixture';
import { mockNotFound, mockOf, mockVoid } from './mock-async';
let MockRuleService = class MockRuleService extends RuleService {
    rules = structuredClone(RULE_FIXTURES);
    list() {
        return mockOf(this.rules);
    }
    getById(id) {
        const rule = this.rules.find((item) => item.id === id);
        return rule ? mockOf(rule) : mockNotFound('Rule');
    }
    duplicate(id) {
        const source = this.rules.find((item) => item.id === id);
        if (!source) {
            return mockNotFound('Rule');
        }
        const now = new Date().toISOString();
        const copy = {
            ...structuredClone(source),
            id: crypto.randomUUID(),
            name: nextDuplicateName(source.name, this.rules.map((rule) => rule.name)),
            status: 'disabled',
            rootGroup: rematerializeGroup(source.rootGroup),
            createdAt: now,
            updatedAt: now,
        };
        const index = this.rules.findIndex((item) => item.id === id);
        this.rules.splice(index + 1, 0, copy);
        return mockOf(copy);
    }
    setStatus(id, status) {
        const rule = this.rules.find((item) => item.id === id);
        if (!rule) {
            return mockNotFound('Rule');
        }
        rule.status = status;
        rule.updatedAt = new Date().toISOString();
        return mockOf(rule);
    }
    delete(id) {
        const index = this.rules.findIndex((item) => item.id === id);
        if (index < 0) {
            return mockNotFound('Rule');
        }
        this.rules.splice(index, 1);
        return mockVoid();
    }
};
MockRuleService = __decorate([
    Injectable()
], MockRuleService);
export { MockRuleService };
function rematerializeGroup(group) {
    return {
        id: crypto.randomUUID(),
        combinator: group.combinator,
        children: group.children.map((child) => isRuleConditionGroup(child) ? rematerializeGroup(child) : rematerializeCondition(child)),
    };
}
function rematerializeCondition(condition) {
    return { ...condition, id: crypto.randomUUID() };
}
