import type { Trend, WellClass } from '#lib/types.js';

export const MISSING = 'n/a';

/** Upper-cases the first letter of each space-separated word and lower-cases the rest. Keeps spacing. */
export function titleCase(name: string): string {
	return name
		.split(' ')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');
}

/**
 * x rounded to an integer count of tenths, halves away from zero.
 * toPrecision(15) strips binary noise first: 1.45 * 10 is 14.499999999999998 in floating point.
 */
export function tenths(x: number): number {
	return Math.sign(x) * Math.round(Number((Math.abs(x) * 10).toPrecision(15)));
}

/**
 * Exactly one decimal place from tenths(x), no grouping: 122 -> "122.0", 6.25 -> "6.3".
 * Not toFixed, which rounds the binary value: (1.45).toFixed(1) is "1.4". Zero is never signed.
 */
export function fixed1(x: number): string {
	const t = tenths(x);
	const a = Math.abs(t);
	return `${t < 0 ? '-' : ''}${Math.trunc(a / 10)}.${a % 10}`;
}

/** mg/L value or Missing_Text. No unit is appended; headers and labels carry "mg/L". */
export function mgl(x: number | null): string {
	return x === null ? MISSING : fixed1(x);
}

/** fixed1(x) + "%" or Missing_Text. */
export function pct(x: number | null): string {
	return x === null ? MISSING : `${fixed1(x)}%`;
}

// Fixed locale, so prerendered HTML and hydrated output match.
const counts = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Integer with en-US grouping: 856 -> "856", 5672 -> "5,672". */
export function count(n: number): string {
	return counts.format(n);
}

/** part / whole * 100, or null when whole is 0. */
export function percentOf(part: number, whole: number): number | null {
	return whole === 0 ? null : (part / whole) * 100;
}

/** Trend_Label: `insufficient` reads as "not enough data"; other trends pass through. */
export function trendLabel(trend: Trend): string {
	return trend === 'insufficient' ? 'not enough data' : trend;
}

/** Plain name for a water system class, shown in the Well_Table. */
export const WELL_TYPE: Record<WellClass, string> = {
	COM: 'Homes',
	NTNC: 'School or workplace',
	NC: 'Visitor site'
};
