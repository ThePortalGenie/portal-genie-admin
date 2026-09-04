const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});
/** Formats an ISO timestamp for table display. Mock dates are UTC. */
export function formatIsoDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return DATE_FORMAT.format(date);
}
