import { isAnnouncementGroup } from '../../../core/domain/rule-group';
import { RuleTiming } from '../models/rule.model';
import { ValidationIssue } from '../models/validation.model';

export { ANNOUNCEMENTS_GROUP_ID, isAnnouncementGroup } from '../../../core/domain/rule-group';

export type ScheduleParts = {
  date: string;
  time: string;
};

export type AnnouncementScheduleContext = {
  date: string;
  time: string;
  now?: Date;
  isCreate?: boolean;
  originalScheduledAt?: string;
};

const pad = (value: number): string => String(value).padStart(2, '0');

export function emptyScheduleParts(): ScheduleParts {
  return { date: '', time: '' };
}

export function emptyScheduledOnceTiming(): RuleTiming {
  return { mode: 'scheduled_once' };
}

export function announcementTimingFromParts(date: string, time: string): RuleTiming {
  const scheduledAt = scheduledAtFromParts(date, time);
  return scheduledAt ? { mode: 'scheduled_once', scheduledAt } : emptyScheduledOnceTiming();
}

export function showsJourneySequencePanel(groupId: string): boolean {
  return !isAnnouncementGroup(groupId);
}

export function timingForGroupChange(nextGroupId: string, current: RuleTiming): RuleTiming {
  if (isAnnouncementGroup(nextGroupId)) {
    return current.mode === 'scheduled_once' ? current : emptyScheduledOnceTiming();
  }
  if (current.mode === 'scheduled_once') {
    return { mode: 'on_match' };
  }
  return current;
}

export function schedulePartsFromIso(iso: string | undefined): ScheduleParts {
  if (!iso) {
    return emptyScheduleParts();
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return emptyScheduleParts();
  }
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

export function scheduledAtFromParts(date: string, time: string): string | undefined {
  if (!date.trim() || !time.trim()) {
    return undefined;
  }
  const local = localDateFromParts(date, time);
  if (!local) {
    return undefined;
  }
  return toOffsetIso(local);
}

export function parseScheduledAt(iso: string | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function localTimeZoneLabel(at: Date = new Date()): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const longName = timeZoneName(at, 'long');
  const offset = (timeZoneName(at, 'longOffset') ?? timeZoneName(at, 'shortOffset') ?? '').replace(
    /^GMT/,
    'UTC',
  );
  if (longName && offset && longName !== offset) {
    return `${longName} / ${offset}`;
  }
  return longName || offset || timeZone;
}

export function formatScheduledLong(iso: string): string {
  const parsed = parseScheduledAt(iso);
  if (!parsed) {
    return '';
  }
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
  return `${date} at ${formatClock(parsed)}`;
}

export function formatScheduledCompact(iso: string): string {
  const parsed = parseScheduledAt(iso);
  if (!parsed) {
    return 'Send date not set';
  }
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .toUpperCase();
  return `${date} · ${formatClock(parsed)}`;
}

export function extraScheduleIssues(context: AnnouncementScheduleContext): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const date = context.date.trim();
  const time = context.time.trim();

  if (!date) {
    errors.push(issue('rule.timing.scheduledDate.required', 'Choose a send date', 'timing.scheduledDate'));
  }
  if (!time) {
    errors.push(issue('rule.timing.scheduledTime.required', 'Choose a send time', 'timing.scheduledTime'));
  }
  if (!date || !time) {
    return errors;
  }

  const scheduledAt = scheduledAtFromParts(date, time);
  const parsed = parseScheduledAt(scheduledAt);
  if (!parsed) {
    errors.push(
      issue('rule.timing.scheduledAt.invalid', 'Enter a valid send date and time', 'timing.scheduledAt'),
    );
    return errors;
  }

  const now = context.now ?? new Date();
  if (parsed.getTime() < now.getTime()) {
    const original = parseScheduledAt(context.originalScheduledAt);
    const unchanged = original !== null && original.getTime() === parsed.getTime();
    if (context.isCreate || !unchanged) {
      errors.push(
        issue(
          'rule.timing.scheduledAt.past',
          'Choose a send date and time in the future',
          'timing.scheduledAt',
        ),
      );
    } else {
      warnings.push({
        code: 'rule.timing.scheduledAt.elapsed',
        message:
          'This scheduled time has already passed. The definition is kept for reference and will not send.',
        path: 'timing.scheduledAt',
        severity: 'warning',
      });
    }
  }

  return [...errors, ...warnings];
}

function localDateFromParts(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) {
    return null;
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    Number.isNaN(local.getTime()) ||
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    return null;
  }
  return local;
}

function toOffsetIso(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function timeZoneName(at: Date, type: 'long' | 'longOffset' | 'shortOffset'): string | undefined {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZoneName: type })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value;
  } catch {
    return undefined;
  }
}

function issue(code: string, message: string, path: string): ValidationIssue {
  return { code, message, path, severity: 'error' };
}
