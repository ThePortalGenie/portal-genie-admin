import { describe, expect, it } from 'vitest';
import { nextDuplicateName } from './rule-naming';
describe('nextDuplicateName', () => {
    it('appends (Copy) when that name is unused', () => {
        expect(nextDuplicateName('Trial — 7 Days Remaining', ['Trial — 7 Days Remaining'])).toBe('Trial — 7 Days Remaining (Copy)');
    });
    it('increments the copy suffix when (Copy) already exists', () => {
        const existing = [
            'Trial — 7 Days Remaining',
            'Trial — 7 Days Remaining (Copy)',
        ];
        expect(nextDuplicateName('Trial — 7 Days Remaining', existing)).toBe('Trial — 7 Days Remaining (Copy 2)');
    });
    it('continues incrementing past later copy suffixes', () => {
        const existing = [
            'Welcome to Portal Genie',
            'Welcome to Portal Genie (Copy)',
            'Welcome to Portal Genie (Copy 2)',
        ];
        expect(nextDuplicateName('Welcome to Portal Genie', existing)).toBe('Welcome to Portal Genie (Copy 3)');
    });
});
