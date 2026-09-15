/**
 * Today's date as `YYYY-MM-DD` in the café's local timezone.
 *
 * Event documents store a plain `date` (no time), so "is this event still
 * upcoming?" has to be answered against the local calendar day, not UTC.
 * Deriving it from `new Date().toISOString()` would drop an event dated today
 * as soon as it turns midnight in UTC — 03:00 in Bucharest during summer.
 */
export function todayInBucharest(): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Bucharest',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date());

	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '';

	return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Renders an event's `YYYY-MM-DD` date for display, e.g. "30 iulie 2026".
 *
 * The date is parsed as UTC noon rather than handed straight to `new Date()`:
 * a bare `YYYY-MM-DD` is parsed as midnight UTC, which formats as the previous
 * day in any timezone behind UTC, and noon keeps it on the intended day
 * everywhere.
 */
export function formatEventDate(date: string): string {
	const parsed = new Date(`${date}T12:00:00Z`);

	if (Number.isNaN(parsed.getTime())) return date;

	return new Intl.DateTimeFormat('ro-RO', {
		timeZone: 'Europe/Bucharest',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(parsed);
}
