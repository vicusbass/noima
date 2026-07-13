/**
 * Turns the editable, free-text opening-hours rows from Sanity into schema.org
 * `OpeningHoursSpecification` entries for the page's JSON-LD.
 *
 * It's deliberately best-effort: a row whose label isn't a recognisable Romanian
 * day (or day range) or whose value has no clear `HH:MM` times is silently
 * skipped — it still renders on the page, it just doesn't contribute to the
 * structured data. This keeps the visible schedule fully free-form while still
 * feeding Google whenever editors follow the "Luni: 07:30–16:00" convention.
 */

export type OpeningHoursRow = {
	label?: string | null;
	value?: string | null;
};

export type OpeningHoursSpecification = {
	'@type': 'OpeningHoursSpecification';
	dayOfWeek: string | string[];
	opens: string;
	closes: string;
};

const DAY_ORDER = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
] as const;

const RO_DAYS: Record<string, number> = {
	luni: 0,
	marti: 1,
	miercuri: 2,
	joi: 3,
	vineri: 4,
	sambata: 5,
	duminica: 6,
};

/** Lowercase + strip diacritics so "Marți" and "sambata" both match. */
const normalize = (value: string) =>
	value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Longest keys first so a short key can't shadow a longer one.
const DAY_KEYS = Object.keys(RO_DAYS).sort((a, b) => b.length - a.length);

/** Resolve a single label token (e.g. "Marți") to a 0–6 week index. */
function dayIndex(token: string): number | null {
	const normalized = normalize(token);
	for (const key of DAY_KEYS) {
		if (normalized.includes(key)) return RO_DAYS[key];
	}
	return null;
}

/**
 * Expand a label into week indices. Handles single days ("Luni"),
 * comma lists ("Luni, Miercuri") and inclusive ranges ("Marți–Joi").
 */
function parseDays(label: string): number[] {
	const indices: number[] = [];
	for (const segment of label.split(',')) {
		const bounds = segment.split(/[–—-]/);
		if (bounds.length >= 2) {
			const start = dayIndex(bounds[0]);
			const end = dayIndex(bounds[bounds.length - 1]);
			if (start === null || end === null) continue;
			let i = start;
			indices.push(i);
			while (i !== end) {
				i = (i + 1) % 7;
				indices.push(i);
			}
		} else {
			const index = dayIndex(segment);
			if (index !== null) indices.push(index);
		}
	}
	return [...new Set(indices)].sort((a, b) => a - b);
}

/** Pull the first two HH:MM-ish times out of a value; null if closed/unparseable. */
function parseTimes(value: string): { opens: string; closes: string } | null {
	if (/\b(inchis|closed)\b/.test(normalize(value))) return null;

	const matches = [...value.matchAll(/(\d{1,2})[:.h](\d{2})/g)];
	if (matches.length < 2) return null;

	const format = (match: RegExpMatchArray): string | null => {
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (hours > 23 || minutes > 59) return null;
		return `${String(hours).padStart(2, '0')}:${match[2]}`;
	};

	const opens = format(matches[0]);
	const closes = format(matches[1]);
	if (!opens || !closes) return null;
	return { opens, closes };
}

export function toOpeningHoursSpecification(
	rows: OpeningHoursRow[] | null | undefined,
): OpeningHoursSpecification[] {
	if (!rows) return [];

	const specs: OpeningHoursSpecification[] = [];
	for (const row of rows) {
		if (!row?.label || !row?.value) continue;

		const dayIndices = parseDays(row.label);
		if (dayIndices.length === 0) continue;

		const times = parseTimes(row.value);
		if (!times) continue;

		const days = dayIndices.map((index) => DAY_ORDER[index]);
		specs.push({
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: days.length === 1 ? days[0] : days,
			opens: times.opens,
			closes: times.closes,
		});
	}
	return specs;
}
